// lib/wearables/insights/load.ts
// Charge les données de l'écran « Objet connecté » avec la session du praticien (RLS appliquée).
import type { SupabaseClient } from '@supabase/supabase-js';
import { frequencyFromDb } from '../../observance-tracking';
import type { ObservanceItem } from '../../types';
import type { WearableSummaryDay } from '../summary';
import type { InsightItem, InsightLog, InsightsInput } from './engine';
import { addDays, parisDay } from './series';

/** Historique lu : 28 jours « depuis » + 28 « avant » + 28 d'habituel, avec de la marge. */
export const HISTORY_DAYS = 120;

type Row = { day: string; sleep_min: number | null; hrv_ms: number | null; night_hr_bpm: number | null; steps: number | null };

export class InsightsLoadError extends Error {
  constructor(what: string, cause?: { code?: string }) {
    super(`Objet connecté : lecture impossible (${what}${cause?.code ? `, ${cause.code}` : ''})`);
    this.name = 'InsightsLoadError';
  }
}

export async function loadInsightsInput(client: SupabaseClient, consultantId: string, firstName: string, now = new Date()): Promise<InsightsInput> {
  const today = parisDay(now);
  const from = addDays(today, -HISTORY_DAYS);

  const [summary, appts, plans, items, logs] = await Promise.all([
    client.rpc('wearable_daily_summary', { p_consultant_id: consultantId, p_days: HISTORY_DAYS, p_today: today }),
    // Dernière séance = rendez-vous passé non annulé le plus récent.
    client
      .from('appointments')
      .select('starts_at, status')
      .eq('consultant_id', consultantId)
      .lt('starts_at', now.toISOString())
      .not('status', 'in', '(cancelled,rescheduled)')
      .order('starts_at', { ascending: false })
      .limit(1),
    client.from('consultant_plans').select('shared_at, status').eq('consultant_id', consultantId).not('shared_at', 'is', null).order('shared_at', { ascending: true }),
    client.from('plan_observance_items').select('*').eq('consultant_id', consultantId).eq('is_active', true),
    client.from('plan_observance_logs').select('observance_item_id, date, done').eq('consultant_id', consultantId).gte('date', from).lte('date', today),
  ]);

  if (summary.error) throw new InsightsLoadError('mesures', summary.error);
  const days: WearableSummaryDay[] = ((summary.data ?? []) as Row[])
    .slice()
    .sort((a, b) => a.day.localeCompare(b.day))
    .map((r) => ({ date: r.day, sleepMin: r.sleep_min, hrvMs: r.hrv_ms, nightHrBpm: r.night_hr_bpm, steps: r.steps }));

  // Les autres lectures sont facultatives : en cas d'erreur, la section concernée affiche son état vide.
  const lastAppt = (appts.data ?? [])[0] as { starts_at: string } | undefined;
  const planShares = Array.from(
    new Set(((plans.data ?? []) as { shared_at: string | null }[]).filter((p) => p.shared_at).map((p) => parisDay(p.shared_at as string)))
  ).sort();
  const insightItems: InsightItem[] = ((items.data ?? []) as ObservanceItem[]).map((it) => ({
    id: it.id,
    label: it.label,
    category: it.category,
    freq: frequencyFromDb(it),
    autoCheck: Boolean(it.auto_check),
  }));
  const insightLogs: InsightLog[] = ((logs.data ?? []) as { observance_item_id: string; date: string; done: boolean }[]).map((l) => ({
    itemId: l.observance_item_id,
    date: l.date.slice(0, 10),
    done: l.done,
  }));

  return {
    days,
    today,
    firstName,
    lastSessionDate: lastAppt ? parisDay(lastAppt.starts_at) : null,
    planShares,
    items: insightItems,
    logs: insightLogs,
  };
}

/** Prénom du praticien connecté, pour signer le récap. */
export async function loadPractitionerFirstName(client: SupabaseClient): Promise<string> {
  const { data: auth } = await client.auth.getUser();
  if (!auth.user) return '';
  const { data } = await client.from('practitioners').select('*').eq('id', auth.user.id).maybeSingle();
  const row = data as { full_name?: string | null; first_name?: string | null } | null;
  return (row?.first_name || row?.full_name?.split(' ')[0] || '').trim();
}
