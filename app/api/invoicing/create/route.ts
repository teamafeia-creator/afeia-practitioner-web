import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient, createSupabaseAuthClient } from '@/lib/server/supabaseAdmin';
import { createInvoiceSchema } from '@/lib/invoicing/schemas';
import { getCurrentFiscalYear } from '@/lib/invoicing/utils';
import { ZodError } from 'zod';

export async function POST(request: NextRequest) {
  try {
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
    const validatedData = createInvoiceSchema.parse(body);

    const supabase = createSupabaseAdminClient();

    // Recuperer les parametres de facturation du praticien
    const { data: settings, error: settingsError } = await supabase
      .from('practitioner_billing_settings')
      .select('*')
      .eq('practitioner_id', userId)
      .single();

    if (settingsError || !settings) {
      return NextResponse.json(
        { message: 'Veuillez d\'abord configurer vos parametres de facturation' },
        { status: 400 }
      );
    }

    // Recuperer le praticien
    const { data: practitioner } = await supabase
      .from('practitioners')
      .select('name, email')
      .eq('id', userId)
      .single();

    // Recuperer les infos du consultant
    const { data: consultant, error: consultantError } = await supabase
      .from('consultants')
      .select('first_name, last_name, email')
      .eq('id', validatedData.consultant_id)
      .single();

    if (consultantError || !consultant) {
      return NextResponse.json({ message: 'Consultant introuvable' }, { status: 404 });
    }

    // Extraire nom/prenom du praticien
    const nameParts = (practitioner?.name || '').split(' ');
    const practitionerPrenom = nameParts[0] || '';
    const practitionerNom = nameParts.slice(1).join(' ') || '';

    const practitionerSnapshot = {
      nom: practitionerNom,
      prenom: practitionerPrenom,
      adresse: settings.adresse_facturation,
      siret: settings.siret,
      mention_tva: settings.mention_tva,
      statut_juridique: settings.statut_juridique,
    };

    const consultantSnapshot = {
      nom: consultant.last_name || '',
      prenom: consultant.first_name || '',
      email: consultant.email || '',
    };

    // Creer la facture
    const { data: invoice, error: invoiceError } = await supabase
      .from('consultation_invoices')
      .insert({
        practitioner_id: userId,
        consultant_id: validatedData.consultant_id,
        consultation_id: validatedData.consultation_id,
        template_id: validatedData.template_id,
        description: validatedData.description,
        montant: validatedData.montant,
        annee_fiscale: getCurrentFiscalYear(),
        status: validatedData.status,
        payment_method: validatedData.payment_method,
        payment_date: validatedData.payment_date,
        payment_notes: validatedData.payment_notes,
        practitioner_snapshot: practitionerSnapshot,
        consultant_snapshot: consultantSnapshot,
      })
      .select()
      .single();

    if (invoiceError) {
      console.error('Erreur creation facture:', invoiceError);
      throw invoiceError;
    }

    // Logger l'action dans l'historique
    await supabase.from('invoice_history').insert({
      invoice_id: invoice.id,
      action: 'created',
      user_id: userId,
      metadata: { status: validatedData.status },
    });

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      const messages = error.errors.map((e) => e.message).join(', ');
      return NextResponse.json({ message: messages }, { status: 400 });
    }
    console.error('Erreur creation facture:', error);
    return NextResponse.json(
      { message: 'Erreur lors de la creation de la facture' },
      { status: 500 }
    );
  }
}
