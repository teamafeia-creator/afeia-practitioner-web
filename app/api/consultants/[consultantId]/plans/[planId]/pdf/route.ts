import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { createSupabaseAdminClient, createSupabaseAuthClient } from '@/lib/server/supabaseAdmin';
import { PlanPdfDocument, type PlanPdfData } from '@/lib/pdf/plan-pdf-template';

/**
 * GET /api/consultants/[consultantId]/plans/[planId]/pdf
 *
 * Génère et renvoie le PDF du conseillancier.
 * Auth requise : le praticien doit être propriétaire du consultant.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ consultantId: string; planId: string }> }
) {
  try {
    const { consultantId, planId } = await params;

    // 1. Vérifier l'authentification
    const token = request.headers.get('authorization')?.replace('Bearer ', '').trim();
    if (!token) {
      return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
    }

    const supabaseAuth = createSupabaseAuthClient();
    const { data: authData, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Session invalide.' }, { status: 401 });
    }

    const practitionerId = authData.user.id;
    const supabase = createSupabaseAdminClient();

    // 2. Récupérer le consultant et vérifier l'accès
    const { data: consultant, error: consultantError } = await supabase
      .from('consultants')
      .select('id, practitioner_id, name, full_name, first_name, last_name')
      .eq('id', consultantId)
      .single();

    if (consultantError || !consultant) {
      return NextResponse.json({ error: 'Consultant non trouvé.' }, { status: 404 });
    }

    if (consultant.practitioner_id !== practitionerId) {
      return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
    }

    // 3. Récupérer le plan
    const { data: plan, error: planError } = await supabase
      .from('consultant_plans')
      .select('*')
      .eq('id', planId)
      .eq('consultant_id', consultantId)
      .single();

    if (planError || !plan) {
      return NextResponse.json({ error: 'Conseillancier non trouvé.' }, { status: 404 });
    }

    // 4. Récupérer le nom du praticien
    const { data: practitioner } = await supabase
      .from('practitioners')
      .select('full_name')
      .eq('id', practitionerId)
      .single();

    // 5. Construire les données du PDF
    const consultantName =
      consultant.full_name ||
      [consultant.first_name, consultant.last_name].filter(Boolean).join(' ') ||
      consultant.name ||
      'Consultant';

    const pdfData: PlanPdfData = {
      consultantName,
      practitionerName: practitioner?.full_name || 'Naturopathe',
      date: plan.shared_at || plan.updated_at || plan.created_at,
      version: plan.version || 1,
      status: plan.status || 'draft',
      content: plan.content as Record<string, string> | null,
    };

    // 6. Générer le PDF
    const pdfElement = React.createElement(PlanPdfDocument, { data: pdfData });
    // @react-pdf/renderer types don't fully align with React 18 types, cast is needed
    const pdfBuffer = await renderToBuffer(pdfElement as Parameters<typeof renderToBuffer>[0]);

    // 7. Retourner le PDF
    const filename = `conseillancier-${consultantName.replace(/[^a-zA-Z0-9àâäéèêëïîôùûüÿçæœ\s-]/g, '').replace(/\s+/g, '-').toLowerCase()}-v${plan.version || 1}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('Exception PDF generation:', err);
    return NextResponse.json(
      { error: 'Erreur lors de la génération du PDF.' },
      { status: 500 }
    );
  }
}
