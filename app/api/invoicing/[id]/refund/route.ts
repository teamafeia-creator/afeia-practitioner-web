import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient, createSupabaseAuthClient } from '@/lib/server/supabaseAdmin';
import { createAvoirSchema } from '@/lib/invoicing/schemas';
import { getCurrentFiscalYear } from '@/lib/invoicing/utils';
import type { ConsultationInvoice } from '@/lib/invoicing/types';
import { ZodError } from 'zod';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.headers.get('authorization')?.replace('Bearer ', '').trim();
    if (!token) {
      return NextResponse.json({ message: 'Non authentifie' }, { status: 401 });
    }

    const supabaseAuth = createSupabaseAuthClient();
    const { data: authData, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !authData.user) {
      return NextResponse.json({ message: 'Session invalide' }, { status: 401 });
    }
    const userId = authData.user.id;

    const body = await request.json();
    const validatedData = createAvoirSchema.parse(body);

    const supabase = createSupabaseAdminClient();

    // Recuperer la facture originale
    const { data: factureData, error: factureError } = await supabase
      .from('consultation_invoices')
      .select('*')
      .eq('id', validatedData.facture_origine_id)
      .eq('practitioner_id', userId)
      .single();

    if (factureError || !factureData) {
      return NextResponse.json(
        { message: 'Facture originale introuvable' },
        { status: 404 }
      );
    }

    const factureOriginale = factureData as ConsultationInvoice;

    if (factureOriginale.status !== 'paid') {
      return NextResponse.json(
        { message: 'Seules les factures payees peuvent etre remboursees' },
        { status: 400 }
      );
    }

    // Construire le motif
    const motifLabels: Record<string, string> = {
      consultation_annulee: 'Consultation annulee',
      erreur_facturation: 'Erreur de facturation',
      geste_commercial: 'Geste commercial',
      autre: validatedData.motif_detail || 'Autre',
    };
    const motifLabel = motifLabels[validatedData.motif_remboursement];

    // Creer l'Avoir
    const { data: avoir, error: avoirError } = await supabase
      .from('consultation_invoices')
      .insert({
        practitioner_id: userId,
        consultant_id: factureOriginale.consultant_id,
        consultation_id: factureOriginale.consultation_id,
        description: `Avoir relatif a la facture ${factureOriginale.numero}`,
        montant: -Math.abs(Number(factureOriginale.montant)),
        annee_fiscale: getCurrentFiscalYear(),
        status: 'paid',
        payment_method: factureOriginale.payment_method,
        payment_date: new Date().toISOString(),
        is_avoir: true,
        facture_origine_id: factureOriginale.id,
        motif_remboursement: motifLabel,
        practitioner_snapshot: factureOriginale.practitioner_snapshot,
        consultant_snapshot: factureOriginale.consultant_snapshot,
      })
      .select()
      .single();

    if (avoirError) throw avoirError;

    // Mettre a jour la facture originale
    await supabase
      .from('consultation_invoices')
      .update({ status: 'refunded' })
      .eq('id', factureOriginale.id);

    // Logger les actions
    await supabase.from('invoice_history').insert([
      {
        invoice_id: avoir.id,
        action: 'avoir_created',
        user_id: userId,
        metadata: {
          facture_origine_id: factureOriginale.id,
          motif: motifLabel,
        },
      },
      {
        invoice_id: factureOriginale.id,
        action: 'refunded',
        user_id: userId,
        metadata: { avoir_id: avoir.id },
      },
    ]);

    // Envoyer l'Avoir par email
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    fetch(`${appUrl}/api/invoicing/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ invoice_id: avoir.id }),
    }).catch(console.error);

    return NextResponse.json({ avoir }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      const messages = error.errors.map((err) => err.message).join(', ');
      return NextResponse.json({ message: messages }, { status: 400 });
    }
    console.error('Erreur creation avoir:', error);
    return NextResponse.json(
      { message: "Erreur lors de la creation de l'avoir" },
      { status: 500 }
    );
  }
}
