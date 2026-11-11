// lib/wearables/insights/load.ts
// Charge les données de l'écran « Objet connecté » avec la session du praticien (RLS appliquée).
import type { SupabaseClient } from '@supabase/supabase-js';
import { frequencyFromDb } from '../../observance-tracking';
import { buildPhaseMap, identifyCycleStarts } from '../../cycle-utils';
import type { CycleEntry, CycleProfile, ObservanceItem } from '../../types';
import type { WearableSummaryDay } from '../summary';
import type { InsightItem, InsightLog, InsightsInput, Phase } from './engine';
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

export type LoadedInsights = InsightsInput & {
  consultantId: string;
  lastSyncAt: string | null;
  lastJournalDate: string | null;
};

function genderOf(raw: string | null | undefined): 'female' | 'male' | null {
  const g = (raw ?? '').toLowerCase();
  if (/^(f|femme|female|woman)/.test(g)) return 'female';
  if (/^(h|m|homme|male|man)/.test(g)) return 'male';
  return null;
}

function toPhase(p: string): Phase {
  return p === 'menstrual' ? 'm' : p === 'follicular' ? 'f' : p === 'ovulation' ? 'o' : 'l';
}

export async function loadInsightsInput(client: SupabaseClient, consultantId: string, now = new Date()): Promise<LoadedInsights> {
  const today = parisDay(now);
  const from = addDays(today, -HISTORY_DAYS);
  const nowIso = now.toISOString();

  const [summary, consultant, past, next, plans, items, logs, consent, conn, journal, cycleProfile, cycleEntries] = await Promise.all([
    client.rpc('wearable_daily_summary', { p_consultant_id: consultantId, p_days: HISTORY_DAYS, p_today: today }),
    client.from('consultants').select('*').eq('id', consultantId).maybeSingle(),
    // Dernière séance = rendez-vous passé non annulé le plus récent.
    client.from('appointments').select('starts_at').eq('consultant_id', consultantId).lt('starts_at', nowIso).not('status', 'in', '(cancelled,rescheduled)').order('starts_at', { ascending: false }).limit(1),
    client.from('appointments').select('starts_at').eq('consultant_id', consultantId).gte('starts_at', nowIso).not('status', 'in', '(cancelled,rescheduled)').order('starts_at', { ascending: true }).limit(1),
    client.from('consultant_plans').select('shared_at, version').eq('consultant_id', consultantId).not('shared_at', 'is', null).order('shared_at', { ascending: true }),
    client.from('plan_observance_items').select('*').eq('consultant_id', consultantId).eq('is_active', true).order('sort_order'),
    client.from('plan_observance_logs').select('observance_item_id, date, done').eq('consultant_id', consultantId).gte('date', from).lte('date', today),
    client.from('wearable_consents').select('accepted_at').eq('consultant_id', consultantId).is('withdrawn_at', null).order('accepted_at', { ascending: true }).limit(1),
    client.from('wearable_connection_overview').select('last_sync_at').eq('consultant_id', consultantId).eq('provider', 'polar').maybeSingle(),
    client.from('journal_entries').select('date, energy_level, text').eq('consultant_id', consultantId).gte('date', from).lte('date', today).order('date'),
    client.from('cycle_profiles').select('*').eq('consultant_id', consultantId).maybeSingle(),
    client.from('cycle_entries').select('*').eq('consultant_id', consultantId).order('date', { ascending: false }).limit(180),
  ]);

  if (summary.error) throw new InsightsLoadError('mesures', summary.error);
  const days: WearableSummaryDay[] = ((summary.data ?? []) as Row[])
    .slice()
    .sort((a, b) => a.day.localeCompare(b.day))
    .map((r) => ({ date: r.day, sleepMin: r.sleep_min, hrvMs: r.hrv_ms, nightHrBpm: r.night_hr_bpm, steps: r.steps }));

  // Les autres lectures sont facultatives : en cas d'erreur, la section concernée affiche son état vide.
  const c = consultant.data as { name?: string | null; first_name?: string | null; gender?: string | null } | null;
  const firstName = (c?.first_name || (c?.name ?? '').split(' ')[0] || '').trim();
  const lastAppt = (past.data ?? [])[0] as { starts_at: string } | undefined;
  const nextAppt = (next.data ?? [])[0] as { starts_at: string } | undefined;
  const byDay = new Map<string, number>();
  for (const p of (plans.data ?? []) as { shared_at: string | null; version: number }[]) {
    if (!p.shared_at) continue;
    const d = parisDay(p.shared_at);
    byDay.set(d, Math.max(byDay.get(d) ?? 0, p.version));
  }
  const planShares = Array.from(byDay, ([date, version]) => ({ date, version })).sort((a, b) => a.date.localeCompare(b.date));

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
  const journalRows = ((journal.data ?? []) as { date: string; energy_level: number | null; text: string | null }[]).map((j) => ({
    date: j.date.slice(0, 10),
    energy: j.energy_level ?? null,
    note: j.text ?? null,
  }));

  let phases: Record<string, Phase> | undefined;
  const profile = cycleProfile.data as CycleProfile | null;
  if (profile?.is_tracking && cycleEntries.data?.length) {
    const starts = identifyCycleStarts(cycleEntries.data as CycleEntry[]);
    if (starts.length) {
      const map = buildPhaseMap(starts, profile.average_cycle_length, profile.average_period_length, addDays(today, -40), today);
      const out: Record<string, Phase> = {};
      map.forEach((v, k) => (out[k] = toPhase(v.phase)));
      phases = out;
    }
  }

  const consentAt = ((consent.data ?? [])[0] as { accepted_at: string } | undefined)?.accepted_at ?? null;
  return {
    consultantId,
    days,
    today,
    firstName,
    gender: genderOf(c?.gender),
    lastSessionDate: lastAppt ? parisDay(lastAppt.starts_at) : null,
    nextSessionDate: nextAppt ? parisDay(nextAppt.starts_at) : null,
    planShares,
    consentDate: consentAt ? parisDay(consentAt) : null,
    items: insightItems,
    logs: insightLogs,
    journal: journalRows,
    phases,
    lastSyncAt: (conn.data as { last_sync_at?: string | null } | null)?.last_sync_at ?? null,
    lastJournalDate: journalRows.length ? journalRows[journalRows.length - 1].date : null,
  };
}

/** Prénom et nom du praticien connecté (signature du récap : « Claire », « Claire Martin · via AFEIA »). */
export async function loadPractitionerName(client: SupabaseClient): Promise<{ first: string; full: string }> {
  const { data: auth } = await client.auth.getUser();
  if (!auth.user) return { first: '', full: '' };
  const { data } = await client.from('practitioners').select('*').eq('id', auth.user.id).maybeSingle();
  const row = data as { full_name?: string | null; first_name?: string | null; last_name?: string | null } | null;
  const first = (row?.first_name || row?.full_name?.split(' ')[0] || '').trim();
  const full = (row?.full_name || [row?.first_name, row?.last_name].filter(Boolean).join(' ')).trim();
  return { first, full };
}
