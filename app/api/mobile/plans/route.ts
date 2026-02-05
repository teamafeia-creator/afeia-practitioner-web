/**
 * GET /api/mobile/plans
 * Get patient's care plans shared by their practitioner
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { resolvePatientId } from '@/lib/mobile-auth';

export async function GET(request: NextRequest) {
  try {
    const patientId = await resolvePatientId(request);

    if (!patientId) {
      return NextResponse.json(
        { message: 'Non autorisé' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'shared', 'all'

    // Get patient's shared plans from patient_plans table
    let query = getSupabaseAdmin()
      .from('patient_plans')
      .select(`
        id,
        version,
        status,
        content,
        shared_at,
        created_at,
        updated_at,
        practitioner:practitioners(
          id,
          full_name,
          email
        )
      `)
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    // By default, only show shared plans to patients
    if (status !== 'all') {
      query = query.eq('status', 'shared');
    }

    const { data: plans, error } = await query;

    if (error) {
      console.error('Error fetching plans:', error);
      throw error;
    }

    const formattedPlans = plans?.map((plan) => ({
      id: plan.id,
      version: plan.version,
      status: plan.status,
      content: plan.content,
      sharedAt: plan.shared_at,
      createdAt: plan.created_at,
      updatedAt: plan.updated_at,
      practitioner: plan.practitioner ? {
        id: (plan.practitioner as any).id,
        name: (plan.practitioner as any).full_name,
        email: (plan.practitioner as any).email,
      } : null,
    })) || [];

    return NextResponse.json({
      plans: formattedPlans,
      total: formattedPlans.length,
    });
  } catch (error) {
    console.error('Error getting plans:', error);
    return NextResponse.json(
      { message: 'Erreur lors de la récupération des plans' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/mobile/plans
 * Mark a plan as viewed by the patient
 */
export async function PATCH(request: NextRequest) {
  try {
    const patientId = await resolvePatientId(request);

    if (!patientId) {
      return NextResponse.json(
        { message: 'Non autorisé' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { planId } = body;

    if (!planId) {
      return NextResponse.json(
        { message: 'Plan ID requis' },
        { status: 400 }
      );
    }

    // Verify the plan belongs to this patient
    const { data: plan, error: findError } = await getSupabaseAdmin()
      .from('patient_plans')
      .select('id, status')
      .eq('id', planId)
      .eq('patient_id', patientId)
      .single();

    if (findError || !plan) {
      return NextResponse.json(
        { message: 'Plan non trouvé' },
        { status: 404 }
      );
    }

    // Update the plan status to viewed (if it was shared but not yet viewed)
    // Note: We might want to add a 'viewed' status or viewed_at timestamp
    // For now, we'll just update the updated_at timestamp to track viewing
    const { error: updateError } = await getSupabaseAdmin()
      .from('patient_plans')
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq('id', planId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: 'Plan marqué comme vu',
    });
  } catch (error) {
    console.error('Error updating plan:', error);
    return NextResponse.json(
      { message: 'Erreur lors de la mise à jour du plan' },
      { status: 500 }
    );
  }
}
