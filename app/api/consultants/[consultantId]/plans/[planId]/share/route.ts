import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, createSupabaseAuthClient } from '@/lib/server/supabaseAdmin';

/**
 * POST /api/consultants/[consultantId]/plans/[planId]/share
 * Partager un plan avec le consultant (le rendre visible dans son app mobile)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ consultantId: string; planId: string }> }
) {
  try {
    const { consultantId, planId } = await params;

    // 1. Authentification
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

    // 2. Vérifier que le consultant appartient à ce praticien
    const { data: consultant, error: consultantError } = await supabase
      .from('consultants')
      .select('id, practitioner_id, name')
      .eq('id', consultantId)
      .single();

    if (consultantError || !consultant) {
      return NextResponse.json({ error: 'Consultant non trouvé.' }, { status: 404 });
    }

    if (consultant.practitioner_id !== practitionerId) {
      return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
    }

    // 3. Vérifier que le plan existe et appartient à ce consultant
    const { data: plan, error: planError } = await supabase
      .from('consultant_plans')
      .select('*')
      .eq('id', planId)
      .eq('consultant_id', consultantId)
      .single();

    if (planError || !plan) {
      return NextResponse.json({ error: 'Plan non trouvé.' }, { status: 404 });
    }

    // Vérifier que le plan appartient bien au praticien
    if (plan.practitioner_id !== practitionerId) {
      return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
    }

    // 4. Vérifier que le plan est en brouillon
    if (plan.status === 'shared') {
      return NextResponse.json({
        error: 'Ce plan a déjà été partagé.',
        plan
      }, { status: 400 });
    }

    // 5. Mettre à jour le statut du plan à "shared"
    const now = new Date().toISOString();
    const { data: updatedPlan, error: updateError } = await supabase
      .from('consultant_plans')
      .update({
        status: 'shared',
        shared_at: now,
        updated_at: now
      })
      .eq('id', planId)
      .select()
      .single();

    if (updateError) {
      console.error('Erreur partage plan:', updateError);
      return NextResponse.json({ error: 'Erreur lors du partage du plan.' }, { status: 500 });
    }

    // 6. Créer une notification pour le praticien (historique)
    try {
      await supabase.from('notifications').insert({
        practitioner_id: practitionerId,
        consultant_id: consultantId,
        type: 'general',
        title: 'Plan partagé',
        description: `Le plan a été partagé avec ${consultant.name}.`,
        level: 'info',
        read: false,
        metadata: { plan_id: planId }
      });
    } catch (notifError) {
      console.warn('Erreur notification:', notifError);
    }

    return NextResponse.json({
      success: true,
      plan: updatedPlan,
      message: 'Plan partagé avec succès.'
    });
  } catch (err) {
    console.error('Exception share plan:', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
