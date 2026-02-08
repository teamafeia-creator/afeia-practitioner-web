import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminAuth } from '@/lib/admin/auth';
import { fetchDashboardMetrics, fetchRecentActivity } from '@/lib/admin/metrics';
import { generateAlerts } from '@/lib/admin/alerts';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const guard = await requireAdminAuth(request);
  if ('response' in guard) {
    return guard.response;
  }

  try {
    const supabase = createAdminClient();

    const [metrics, activity, practitionersForAlerts] = await Promise.all([
      fetchDashboardMetrics(),
      fetchRecentActivity(20),
      fetchPractitionersForAlerts(supabase),
    ]);

    const alerts = generateAlerts(practitionersForAlerts);

    return NextResponse.json({
      metrics,
      alerts,
      activity,
    });
  } catch (error) {
    console.error('[admin] dashboard error:', error);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

async function fetchPractitionersForAlerts(supabase: ReturnType<typeof createAdminClient>) {
  const { data: practitioners, error } = await supabase
    .from('practitioners_public')
    .select('id, full_name, email, last_login_at, created_at, subscription_status, status');

  if (error || !practitioners) {
    console.error('[admin] alert practitioners fetch error:', error);
    return [];
  }

  const practitionerIds = practitioners.map((p) => p.id);

  const [consultantCountsResult, failedSubsResult] = await Promise.all([
    supabase
      .from('consultants_identity')
      .select('practitioner_id')
      .in('practitioner_id', practitionerIds.length > 0 ? practitionerIds : ['__none__']),
    supabase
      .from('stripe_subscriptions')
      .select('practitioner_id, payment_failed, updated_at')
      .eq('payment_failed', true),
  ]);

  const countMap = new Map<string, number>();
  for (const c of consultantCountsResult.data ?? []) {
    countMap.set(c.practitioner_id, (countMap.get(c.practitioner_id) ?? 0) + 1);
  }

  const failedMap = new Map<string, string>();
  for (const s of failedSubsResult.data ?? []) {
    failedMap.set(s.practitioner_id, s.updated_at);
  }

  return practitioners.map((p) => ({
    id: p.id,
    full_name: p.full_name,
    email: p.email,
    last_login_at: p.last_login_at,
    created_at: p.created_at,
    subscription_status: p.subscription_status,
    consultants_count: countMap.get(p.id) ?? 0,
    payment_failed: failedMap.has(p.id),
    payment_failed_since: failedMap.get(p.id) ?? null,
  }));
}
