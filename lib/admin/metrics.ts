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
};

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const supabase = createAdminClient();
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();

  const [
    totalResult,
    activeResult,
    newThisMonthResult,
    newPrevMonthResult,
    failedPaymentsResult,
    activeSubsResult,
    prevActiveSubsResult,
  ] = await Promise.all([
    supabase.from('practitioners_public').select('id', { count: 'exact', head: true }),
    supabase.from('practitioners_public').select('id', { count: 'exact', head: true }).gte('last_login_at', sevenDaysAgo),
    supabase.from('practitioners_public').select('id', { count: 'exact', head: true }).gte('created_at', startOfMonth),
    supabase.from('practitioners_public').select('id', { count: 'exact', head: true }).gte('created_at', startOfPrevMonth).lt('created_at', endOfPrevMonth),
    supabase.from('stripe_subscriptions').select('id', { count: 'exact', head: true }).eq('payment_failed', true),
    supabase.from('stripe_subscriptions').select('id, price_id', { count: 'exact' }).eq('status', 'active'),
    supabase.from('stripe_subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
  ]);

  const totalPractitioners = totalResult.count ?? 0;
  const activePractitioners = activeResult.count ?? 0;
  const newSignups = newThisMonthResult.count ?? 0;
  const prevNewSignups = newPrevMonthResult.count ?? 0;
  const failedPayments = failedPaymentsResult.count ?? 0;
  const activeSubsCount = activeSubsResult.count ?? 0;

  // MRR estimation: count active subs * monthly price (simplified)
  // In production, would sum actual price amounts from Stripe
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

  const { data, error } = await supabase
    .from('practitioner_activity_log')
    .select('id, practitioner_id, event_type, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    console.error('[metrics] activity fetch error:', error);
    return [];
  }

  // Get practitioner names for the activity entries
  const practitionerIds = [...new Set(data.map((d) => d.practitioner_id))];
  const { data: practitioners } = await supabase
    .from('practitioners_public')
    .select('id, full_name')
    .in('id', practitionerIds);

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
