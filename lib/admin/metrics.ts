import { createAdminClient } from '@/lib/supabase/admin';

export type DashboardMetrics = {
  activePractitioners: number;
  totalPractitioners: number;
  activePercentage: number;
  mrr: number;
  mrrTrend: number;
  newSignups: number;
  newSignupsTrend: number;
  failedPayments: number;
  activityRate: number;
  totalPatients: number;
  patientsAwaitingActivation: number;
};

/**
 * Ensures practitioners_public is in sync with practitioners table.
 * This upserts all practitioners into practitioners_public.
 */
async function syncPractitionersPublic(supabase: ReturnType<typeof createAdminClient>) {
  try {
    const { data: practitioners } = await supabase
      .from('practitioners')
      .select('id, email, full_name, calendly_url, created_at, updated_at');

    if (!practitioners || practitioners.length === 0) return;

    for (const p of practitioners) {
      await supabase.from('practitioners_public').upsert(
        {
          id: p.id,
          email: p.email,
          full_name: p.full_name,
          status: 'active',
          calendly_url: p.calendly_url,
          created_at: p.created_at,
          updated_at: p.updated_at,
        },
        { onConflict: 'id' }
      );
    }
  } catch (err) {
    console.error('[metrics] sync practitioners_public error:', err);
  }
}

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const supabase = createAdminClient();
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();

  // Sync practitioners_public from practitioners to ensure data is fresh
  await syncPractitionersPublic(supabase);

  // Query practitioners (the real table) for reliable counts
  const [
    totalResult,
    newThisMonthResult,
    newPrevMonthResult,
    failedPaymentsResult,
    activeSubsResult,
    prevActiveSubsResult,
    activeByLoginResult,
    activeByUpdatedResult,
    totalPatientsResult,
    awaitingActivationResult,
  ] = await Promise.all([
    // Total practitioners from the real table
    supabase.from('practitioners').select('id', { count: 'exact', head: true }),
    // New this month
    supabase.from('practitioners').select('id', { count: 'exact', head: true }).gte('created_at', startOfMonth),
    // New previous month
    supabase.from('practitioners').select('id', { count: 'exact', head: true }).gte('created_at', startOfPrevMonth).lt('created_at', endOfPrevMonth),
    // Failed payments
    supabase.from('stripe_subscriptions').select('id', { count: 'exact', head: true }).eq('payment_failed', true),
    // Active subscriptions
    supabase.from('stripe_subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    // Previous active subscriptions (approximation)
    supabase.from('stripe_subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    // Active practitioners: try last_login_at on practitioners_public
    supabase.from('practitioners_public').select('id', { count: 'exact', head: true }).gte('last_login_at', sevenDaysAgo),
    // Fallback: practitioners with recent updated_at
    supabase.from('practitioners').select('id', { count: 'exact', head: true }).gte('updated_at', sevenDaysAgo),
    // Total patients
    supabase.from('consultants').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    // Patients awaiting activation (invitation pending)
    supabase.from('consultant_invitations').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ]);

  const totalPractitioners = totalResult.count ?? 0;
  // Use last_login_at if available, otherwise fall back to updated_at
  const activeByLogin = activeByLoginResult.count ?? 0;
  const activeByUpdated = activeByUpdatedResult.count ?? 0;
  const activePractitioners = activeByLogin > 0 ? activeByLogin : activeByUpdated;
  const newSignups = newThisMonthResult.count ?? 0;
  const prevNewSignups = newPrevMonthResult.count ?? 0;
  const failedPayments = failedPaymentsResult.count ?? 0;
  const activeSubsCount = activeSubsResult.count ?? 0;

  const ESTIMATED_MONTHLY_PRICE = 49;
  const mrr = activeSubsCount * ESTIMATED_MONTHLY_PRICE;
  const prevMrr = (prevActiveSubsResult.count ?? 0) * ESTIMATED_MONTHLY_PRICE;
  const mrrTrend = prevMrr > 0 ? Math.round(((mrr - prevMrr) / prevMrr) * 100) : 0;

  const newSignupsTrend = prevNewSignups > 0
    ? Math.round(((newSignups - prevNewSignups) / prevNewSignups) * 100)
    : 0;

  const activityRate = totalPractitioners > 0
    ? Math.round((activePractitioners / totalPractitioners) * 100)
    : 0;

  return {
    activePractitioners,
    totalPractitioners,
    activePercentage: activityRate,
    mrr,
    mrrTrend,
    newSignups,
    newSignupsTrend,
    failedPayments,
    activityRate,
    totalPatients: totalPatientsResult.count ?? 0,
    patientsAwaitingActivation: awaitingActivationResult.count ?? 0,
  };
}

export type ActivityEvent = {
  id: string;
  practitionerName: string;
  practitionerId: string;
  eventType: string;
  description: string;
  createdAt: string;
};

export async function fetchRecentActivity(limit: number = 20): Promise<ActivityEvent[]> {
  const supabase = createAdminClient();

  // Try practitioner_activity_log first
  const { data, error } = await supabase
    .from('practitioner_activity_log')
    .select('id, practitioner_id, event_type, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[metrics] activity fetch error:', error);
    // Fall back to admin_audit_log if practitioner_activity_log fails or is empty
    return fetchRecentActivityFromAuditLog(supabase, limit);
  }

  if (!data || data.length === 0) {
    return fetchRecentActivityFromAuditLog(supabase, limit);
  }

  // Get practitioner names
  const practitionerIds = [...new Set(data.map((d) => d.practitioner_id))];
  const { data: practitioners } = await supabase
    .from('practitioners')
    .select('id, full_name')
    .in('id', practitionerIds.length > 0 ? practitionerIds : ['__none__']);

  const nameMap = new Map<string, string>();
  for (const p of practitioners ?? []) {
    nameMap.set(p.id, p.full_name ?? 'Inconnu');
  }

  const EVENT_LABELS: Record<string, string> = {
    'login': 's\'est connecte',
    'consultant.create': 'a cree un nouveau consultant',
    'conseillancier.create': 'a cree un conseillancier',
    'questionnaire.send': 'a envoye un questionnaire',
    'circular.activate': 'a active Circular pour un consultant',
  };

  return data.map((row) => {
    const name = nameMap.get(row.practitioner_id) ?? 'Inconnu';
    const label = EVENT_LABELS[row.event_type] ?? row.event_type;
    return {
      id: row.id,
      practitionerName: name,
      practitionerId: row.practitioner_id,
      eventType: row.event_type,
      description: `${name} ${label}`,
      createdAt: row.created_at,
    };
  });
}

async function fetchRecentActivityFromAuditLog(
  supabase: ReturnType<typeof createAdminClient>,
  limit: number
): Promise<ActivityEvent[]> {
  const { data, error } = await supabase
    .from('admin_audit_log')
    .select('id, admin_email, action, target_type, target_id, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data || data.length === 0) {
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    practitionerName: row.admin_email,
    practitionerId: '',
    eventType: row.action,
    description: `${row.admin_email} — ${row.action}${row.target_type ? ` (${row.target_type})` : ''}`,
    createdAt: row.created_at,
  }));
}
