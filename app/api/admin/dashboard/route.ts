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
  // Query practitioners (real table) for reliable data
  const { data: practitioners, error } = await supabase
    .from('practitioners')
    .select('id, full_name, email, created_at, updated_at');

  if (error || !practitioners) {
    console.error('[admin] alert practitioners fetch error:', error);
    return [];
  }

  const practitionerIds = practitioners.map((p) => p.id);
  if (practitionerIds.length === 0) return [];

  // Get additional data from practitioners_public (last_login_at, status, subscription_status)
  const [publicDataResult, consultantCountsResult, failedSubsResult] = await Promise.all([
    supabase
      .from('practitioners_public')
      .select('id, last_login_at, status, subscription_status')
      .in('id', practitionerIds),
    supabase
      .from('consultants')
      .select('practitioner_id')
      .in('practitioner_id', practitionerIds)
      .is('deleted_at', null),
    supabase
      .from('stripe_subscriptions')
      .select('practitioner_id, payment_failed, updated_at')
      .eq('payment_failed', true),
  ]);

  const publicMap = new Map<string, { last_login_at: string | null; status: string | null; subscription_status: string | null }>();
  for (const p of publicDataResult.data ?? []) {
    publicMap.set(p.id, {
      last_login_at: p.last_login_at,
      status: p.status,
      subscription_status: p.subscription_status,
    });
  }

  const countMap = new Map<string, number>();
  for (const c of consultantCountsResult.data ?? []) {
    countMap.set(c.practitioner_id, (countMap.get(c.practitioner_id) ?? 0) + 1);
  }

  const failedMap = new Map<string, string>();
  for (const s of failedSubsResult.data ?? []) {
    failedMap.set(s.practitioner_id, s.updated_at);
  }

  return practitioners.map((p) => {
    const pub = publicMap.get(p.id);
    return {
      id: p.id,
      full_name: p.full_name,
      email: p.email,
      last_login_at: pub?.last_login_at ?? null,
      created_at: p.created_at,
      subscription_status: pub?.subscription_status ?? null,
      consultants_count: countMap.get(p.id) ?? 0,
      payment_failed: failedMap.has(p.id),
      payment_failed_since: failedMap.get(p.id) ?? null,
    };
  });
}
