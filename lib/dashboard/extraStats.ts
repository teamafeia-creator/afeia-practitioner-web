// Indicateurs du tableau de bord qui ne sont pas fournis par get_practitioner_stats.
// Chaque valeur vaut null quand la donnée n'existe pas : l'interface affiche alors « — ».

import { supabase } from '../supabase';

export interface DashboardExtraStats {
  messagesCount: number | null;
  questionnairesCount: number | null;
  wearableConsultants: number | null;
  avgSleepHours: number | null;
  avgHrv: number | null;
  reviewsDone: number | null;
  reviewDays: number;
  alertsHandled: number | null;
  cycleTracking: number | null;
}

/** Jours ouvrés (lun.–ven.) écoulés dans la période, aujourd'hui compris. */
export function workingDays(start: Date, end: Date): number {
  let n = 0;
  const d = new Date(start);
  d.setHours(0, 0, 0, 0);
  while (d <= end) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) n += 1;
    d.setDate(d.getDate() + 1);
  }
  return n;
}

const avg = (vals: number[]) => (vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null);

export async function fetchDashboardExtraStats(
  practitionerId: string,
  consultantIds: string[],
  start: Date,
  end: Date
): Promise<DashboardExtraStats> {
  const from = start.toISOString();
  const to = end.toISOString();
  const fromDate = from.slice(0, 10);
  const hasConsultants = consultantIds.length > 0;

  const [messages, questionnaires, wearables, reviews, alerts, cycles] = await Promise.all([
    hasConsultants
      ? supabase.from('messages').select('id', { count: 'exact', head: true }).in('consultant_id', consultantIds).gte('sent_at', from).lte('sent_at', to)
      : Promise.resolve({ count: 0, error: null }),
    supabase
      .from('preliminary_questionnaires')
      .select('id', { count: 'exact', head: true })
      .eq('naturopath_id', practitionerId)
      .gte('created_at', from)
      .lte('created_at', to),
    hasConsultants
      ? supabase.from('wearable_summaries').select('consultant_id, sleep_duration, hrv_avg').in('consultant_id', consultantIds).gte('date', fromDate)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from('practitioner_actions')
      .select('created_at')
      .eq('practitioner_id', practitionerId)
      .eq('type', 'review_completed')
      .gte('created_at', from)
      .lte('created_at', to),
    supabase
      .from('practitioner_actions')
      .select('id', { count: 'exact', head: true })
      .eq('practitioner_id', practitionerId)
      .in('type', ['review_seen', 'remind_tomorrow', 'note_observation', 'send_message'])
      .gte('created_at', from)
      .lte('created_at', to),
    supabase.from('cycle_profiles').select('id', { count: 'exact', head: true }).eq('practitioner_id', practitionerId).eq('is_tracking', true),
  ]);

  const wearRows = (wearables.error ? null : (wearables.data as { consultant_id: string; sleep_duration: number | null; hrv_avg: number | null }[] | null)) ?? null;
  const reviewDaysDone = reviews.error
    ? null
    : new Set((reviews.data ?? []).map((r: { created_at: string }) => r.created_at.slice(0, 10))).size;

  return {
    messagesCount: messages.error ? null : messages.count ?? 0,
    questionnairesCount: questionnaires.error ? null : questionnaires.count ?? 0,
    wearableConsultants: wearRows ? new Set(wearRows.map((r) => r.consultant_id)).size : null,
    avgSleepHours: wearRows ? avg(wearRows.map((r) => r.sleep_duration).filter((v): v is number => typeof v === 'number' && v > 0)) : null,
    avgHrv: wearRows ? avg(wearRows.map((r) => r.hrv_avg).filter((v): v is number => typeof v === 'number' && v > 0)) : null,
    reviewsDone: reviewDaysDone,
    reviewDays: workingDays(start, end),
    alertsHandled: alerts.error ? null : alerts.count ?? 0,
    cycleTracking: cycles.error ? null : cycles.count ?? 0,
  };
}
