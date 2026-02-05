import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, createSupabaseAuthClient } from '@/lib/server/supabaseAdmin';

/**
 * POST /api/patients/[patientId]/plans/[planId]/share
 * Partager un plan avec le patient (le rendre visible dans son app mobile)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ patientId: string; planId: string }> }
) {
  try {
    const { patientId, planId } = await params;

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

    // 2. Vérifier que le patient appartient à ce praticien
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id, practitioner_id, name')
      .eq('id', patientId)
      .single();

    if (patientError || !patient) {
      return NextResponse.json({ error: 'Patient non trouvé.' }, { status: 404 });
    }

    if (patient.practitioner_id !== practitionerId) {
      return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
    }

    // 3. Vérifier que le plan existe et appartient à ce patient
    const { data: plan, error: planError } = await supabase
      .from('patient_plans')
      .select('*')
      .eq('id', planId)
      .eq('patient_id', patientId)
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
      .from('patient_plans')
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
        patient_id: patientId,
        type: 'general',
        title: 'Plan partagé',
        description: `Le plan a été partagé avec ${patient.name}.`,
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
