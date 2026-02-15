/**
 * GET /api/mobile/plans
 * Get consultant's care plans shared by their practitioner
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { resolveConsultantId } from '@/lib/mobile-auth';

export async function GET(request: NextRequest) {
  try {
    const consultantId = await resolveConsultantId(request);

    if (!consultantId) {
      return NextResponse.json(
        { message: 'Non autorisé' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'shared', 'all'

    // Get consultant's shared plans from consultant_plans table
    let query = getSupabaseAdmin()
      .from('consultant_plans')
      .select(`
        id,
        version,
        status,
        content,
        shared_at,
        viewed_at,
        created_at,
        updated_at,
        practitioner:practitioners(
          id,
          full_name,
          email
        )
      `)
      .eq('consultant_id', consultantId)
      .order('created_at', { ascending: false });

    // By default, only show shared plans to consultants
    if (status !== 'all') {
      query = query.eq('status', 'shared');
    }

    const { data: plans, error } = await query;

    if (error) {
      console.error('Error fetching plans:', error);
      throw error;
    }

    // Fetch resource assignments for all plans
    const planIds = (plans ?? []).map((p) => p.id);
    let assignmentsByPlan: Record<string, any[]> = {};
    if (planIds.length > 0) {
      const { data: assignments } = await getSupabaseAdmin()
        .from('resource_assignments')
        .select(`
          id,
          resource_id,
          plan_section_key,
          message,
          read_at,
          sent_at,
          resource:educational_resources(
            id,
            title,
            summary,
            content_type,
            category
          )
        `)
        .in('consultant_plan_id', planIds);

      for (const a of assignments ?? []) {
        // Group by plan — we need to re-query with plan id info
        // Since the assignment has consultant_plan_id, we'll query per plan
      }

      // Re-fetch with plan id included
      const { data: assignmentsWithPlan } = await getSupabaseAdmin()
        .from('resource_assignments')
        .select(`
          id,
          resource_id,
          consultant_plan_id,
          plan_section_key,
          message,
          read_at,
          sent_at,
          resource:educational_resources(
            id,
            title,
            summary,
            content_type,
            category
          )
        `)
        .in('consultant_plan_id', planIds);

      for (const a of assignmentsWithPlan ?? []) {
        const pid = a.consultant_plan_id;
        if (!pid) continue;
        if (!assignmentsByPlan[pid]) assignmentsByPlan[pid] = [];
        assignmentsByPlan[pid].push({
          resource_id: a.resource_id,
          title: (a.resource as any)?.title ?? null,
          summary: (a.resource as any)?.summary ?? null,
          content_type: (a.resource as any)?.content_type ?? null,
          category: (a.resource as any)?.category ?? null,
          plan_section_key: a.plan_section_key,
          message: a.message,
          read_at: a.read_at,
          sent_at: a.sent_at,
        });
      }
    }

    const formattedPlans = plans?.map((plan) => ({
      id: plan.id,
      version: plan.version,
      status: plan.status,
      content: plan.content,
      sharedAt: plan.shared_at,
      viewedAt: plan.viewed_at,
      createdAt: plan.created_at,
      updatedAt: plan.updated_at,
      practitioner: plan.practitioner ? {
        id: (plan.practitioner as any).id,
        name: (plan.practitioner as any).full_name,
        email: (plan.practitioner as any).email,
      } : null,
      linked_resources: assignmentsByPlan[plan.id] ?? [],
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
 * Mark a plan as viewed by the consultant
 */
export async function PATCH(request: NextRequest) {
  try {
    const consultantId = await resolveConsultantId(request);

    if (!consultantId) {
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

    // Verify the plan belongs to this consultant
    const { data: plan, error: findError } = await getSupabaseAdmin()
      .from('consultant_plans')
      .select('id, status')
      .eq('id', planId)
      .eq('consultant_id', consultantId)
      .single();

    if (findError || !plan) {
      return NextResponse.json(
        { message: 'Plan non trouvé' },
        { status: 404 }
      );
    }

    // Set viewed_at to mark the plan as seen by the consultant
    const now = new Date().toISOString();
    const { error: updateError } = await getSupabaseAdmin()
      .from('consultant_plans')
      .update({
        viewed_at: now,
        updated_at: now,
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
