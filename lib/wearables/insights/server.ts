// lib/wearables/insights/server.ts
// Traitements serveur (service_role, sans session) : coches par l'objet et récaps planifiés.
// Lancé par /api/cron/wearable-recaps chaque matin, et après une synchronisation manuelle.
// La RLS ne s'applique pas ici : chaque requête filtre explicitement sur le consultant.
import type { SupabaseClient } from '@supabase/supabase-js';
import { frequencyFromDb } from '../../observance-tracking';
import type { ObservanceItem } from '../../types';
import type { WearableSummaryDay } from '../summary';
import { autoDecision, autoRuleFor, minutesSince } from './autocheck';
import type { InsightItem, InsightLog } from './engine';
import { buildRecapText, computeRecap, type RecapPointId } from './recap';
import { isRecapDay, validUntil, type RecapSettings } from './schedule';
import { addDays, dayRange, parisDay } from './series';

const HISTORY_DAYS = 70;

/** Même agrégation que wearable_daily_summary (moyenne des fournisseurs, maximum des pas). */
export async function serverDays(db: SupabaseClient, consultantId: string, today: string, days = HISTORY_DAYS): Promise<WearableSummaryDay[]> {
  const from = addDays(today, -(days - 1));
  const [sleep, hrv, act] = await Promise.all([
    db.from('sleep_sessions').select('night_date, total_sleep_s').eq('consultant_id', consultantId).gte('night_date', from).lte('night_date', today),
    db.from('hrv_nightly').select('night_date, hrv_rmssd_avg_ms, hr_avg_bpm').eq('consultant_id', consultantId).gte('night_date', from).lte('night_date', today),
    db.from('daily_activity').select('activity_date, steps').eq('consultant_id', consultantId).gte('activity_date', from).lte('activity_date', today),
  ]);
  for (const r of [sleep, hrv, act]) if (r.error) throw new Error(`Lecture objet connecté impossible (${r.error.code ?? 'inconnu'})`);
  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
  const group = <T,>(rows: T[], key: (r: T) => string) => {
    const m = new Map<string, T[]>();
    for (const r of rows) m.set(key(r), [...(m.get(key(r)) ?? []), r]);
    return m;
  };
  type S = { night_date: string; total_sleep_s: number | null };
  type H = { night_date: string; hrv_rmssd_avg_ms: number | null; hr_avg_bpm: number | null };
  type A = { activity_date: string; steps: number | null };
  const s = group((sleep.data ?? []) as S[], (r) => r.night_date);
  const h = group((hrv.data ?? []) as H[], (r) => r.night_date);
  const a = group((act.data ?? []) as A[], (r) => r.activity_date);
  const nums = (xs: (number | null)[]) => xs.filter((x): x is number => typeof x === 'number');
  return dayRange(from, today).map((date) => {
    const sv = nums((s.get(date) ?? []).map((r) => r.total_sleep_s));
    const steps = nums((a.get(date) ?? []).map((r) => r.steps));
    return {
      date,
      sleepMin: sv.length ? Math.round(sv.reduce((x, y) => x + y, 0) / sv.length / 60) : null,
      hrvMs: avg(nums((h.get(date) ?? []).map((r) => r.hrv_rmssd_avg_ms))),
      nightHrBpm: avg(nums((h.get(date) ?? []).map((r) => r.hr_avg_bpm))),
      steps: steps.length ? Math.max(...steps) : null,
    };
  });
}

async function checklist(db: SupabaseClient, consultantId: string, from: string, to: string) {
  const [items, logs] = await Promise.all([
    db.from('plan_observance_items').select('*').eq('consultant_id', consultantId).eq('is_active', true),
    db.from('plan_observance_logs').select('observance_item_id, date, done').eq('consultant_id', consultantId).gte('date', from).lte('date', to),
  ]);
  const raw = (items.data ?? []) as (ObservanceItem & { auto_check?: boolean })[];
  const insightItems: InsightItem[] = raw.map((it) => ({ id: it.id, label: it.label, category: it.category, freq: frequencyFromDb(it) }));
  const insightLogs: InsightLog[] = ((logs.data ?? []) as { observance_item_id: string; date: string; done: boolean }[]).map((l) => ({ itemId: l.observance_item_id, date: l.date.slice(0, 10), done: l.done }));
  return { raw, items: insightItems, logs: insightLogs };
}

// ─── Coches par l'objet ─────────────────

/** Coche les items activés pour les `back` derniers jours complets. Renvoie le nombre de coches ajoutées. */
export async function applyAutoChecks(db: SupabaseClient, consultantId: string, today: string, back = 3): Promise<number> {
  const { data: itemsData } = await db
    .from('plan_observance_items')
    .select('id, label, category, auto_check')
    .eq('consultant_id', consultantId)
    .eq('is_active', true)
    .eq('auto_check', true);
  const items = ((itemsData ?? []) as { id: string; label: string; category: string }[])
    .map((it) => ({ ...it, rule: autoRuleFor(it) }))
    .filter((it) => it.rule);
  if (!items.length) return 0;

  const days = dayRange(addDays(today, -back), addDays(today, -1));
  const [act, sleep, logs] = await Promise.all([
    db.from('daily_activity').select('activity_date, active_s').eq('consultant_id', consultantId).in('activity_date', days),
    db.from('sleep_sessions').select('night_date, sleep_start_at').eq('consultant_id', consultantId).in('night_date', days.map((d) => addDays(d, 1))),
    db.from('plan_observance_logs').select('observance_item_id, date').eq('consultant_id', consultantId).in('date', days),
  ]);
  const active = new Map<string, number>();
  for (const r of (act.data ?? []) as { activity_date: string; active_s: number | null }[]) {
    if (typeof r.active_s === 'number') active.set(r.activity_date, Math.max(active.get(r.activity_date) ?? 0, Math.round(r.active_s / 60)));
  }
  const starts = new Map<string, string>();
  for (const r of (sleep.data ?? []) as { night_date: string; sleep_start_at: string | null }[]) if (r.sleep_start_at) starts.set(r.night_date, r.sleep_start_at);
  // La saisie du consultant a toujours priorité : on n'écrit que là où rien n'existe.
  const existing = new Set(((logs.data ?? []) as { observance_item_id: string; date: string }[]).map((l) => `${l.observance_item_id}|${l.date.slice(0, 10)}`));

  const rows: { observance_item_id: string; consultant_id: string; date: string; done: boolean; source: 'object' }[] = [];
  for (const it of items) {
    for (const day of days) {
      if (existing.has(`${it.id}|${day}`)) continue;
      const start = starts.get(addDays(day, 1));
      const decision = autoDecision(it.rule!, { activeMin: active.get(day) ?? null, sleepStartMin: start ? minutesSince(day, start) : null });
      if (decision === true) rows.push({ observance_item_id: it.id, consultant_id: consultantId, date: day, done: true, source: 'object' });
    }
  }
  if (!rows.length) return 0;
  const { error } = await db.from('plan_observance_logs').upsert(rows, { onConflict: 'observance_item_id,date', ignoreDuplicates: true });
  if (error) throw new Error(`Coches par l'objet impossibles (${error.code ?? 'inconnu'})`);
  return rows.length;
}

// ─── Récaps planifiés ─────────────────

type SettingsRow = { consultant_id: string; practitioner_id: string; enabled: boolean; frequency: RecapSettings['frequency']; weekdays: number[]; anchor: string };

function firstName(row: { first_name?: string | null; full_name?: string | null; name?: string | null } | null): string {
  return (row?.first_name || (row?.full_name ?? row?.name ?? '').split(' ')[0] || '').trim();
}

/** Peut-on préparer un récap ? Accord actif et objet connecté (sinon, plus aucun brouillon). */
async function canPrepare(db: SupabaseClient, consultantId: string): Promise<boolean> {
  const [consent, conn] = await Promise.all([
    db.from('wearable_consents').select('id').eq('consultant_id', consultantId).is('withdrawn_at', null).limit(1),
    db.from('wearable_connections').select('id').eq('consultant_id', consultantId).eq('status', 'active').limit(1),
  ]);
  return Boolean(consent.data?.length) && Boolean(conn.data?.length);
}

export type RecapRunSummary = { considered: number; prepared: number; skipped: number; autoChecks: number; errors: number };

export async function prepareRecap(db: SupabaseClient, s: SettingsRow, today: string): Promise<'prepared' | 'skipped'> {
  if (!(await canPrepare(db, s.consultant_id))) return 'skipped';
  const [days, list, consultant, practitioner, last] = await Promise.all([
    serverDays(db, s.consultant_id, today),
    checklist(db, s.consultant_id, addDays(today, -70), today),
    db.from('consultants').select('*').eq('id', s.consultant_id).maybeSingle(),
    db.from('practitioners').select('*').eq('id', s.practitioner_id).maybeSingle(),
    db.from('wearable_recaps').select('variants').eq('consultant_id', s.consultant_id).eq('status', 'sent').order('sent_at', { ascending: false }).limit(1),
  ]);
  const recap = computeRecap({ days, today, items: list.items, logs: list.logs }, s.frequency);
  // Pas assez de nuits : le brouillon proposé est le seul rappel de porter l'objet, à valider (règle 3).
  const points = recap.status === 'not_enough' ? (['wear'] as RecapPointId[]) : recap.options.filter((o) => o.checked).map((o) => o.id as RecapPointId);
  const lastVariants = ((last.data ?? [])[0]?.variants ?? {}) as Partial<Record<RecapPointId, 0 | 1>>;
  const built = points.length
    ? buildRecapText({ firstName: firstName(consultant.data), practitionerFirstName: firstName(practitioner.data), frequency: s.frequency, points, lastVariants })
    : { text: null, variants: {} };

  // Le brouillon précédent est remplacé.
  await db.from('wearable_recaps').update({ status: 'expired', updated_at: new Date().toISOString() }).eq('consultant_id', s.consultant_id).in('status', ['draft', 'not_enough', 'nothing']).lt('prepared_for', today);
  const { error } = await db.from('wearable_recaps').upsert(
    {
      consultant_id: s.consultant_id,
      practitioner_id: s.practitioner_id,
      frequency: s.frequency,
      prepared_for: today,
      period_from: recap.period.from,
      period_to: recap.period.to,
      valid_until: validUntil(s, today),
      status: recap.status === 'ok' ? 'draft' : recap.status,
      options: recap.options,
      points,
      variants: built.variants,
      body: built.text,
    },
    { onConflict: 'consultant_id,prepared_for', ignoreDuplicates: true }
  );
  if (error) throw new Error(`Récap non enregistré (${error.code ?? 'inconnu'})`);
  return 'prepared';
}

export async function runDailyWearableJobs(db: SupabaseClient, now = new Date()): Promise<RecapRunSummary> {
  const today = parisDay(now);
  const out: RecapRunSummary = { considered: 0, prepared: 0, skipped: 0, autoChecks: 0, errors: 0 };

  // 1. Coches par l'objet (avant les récaps, qui comptent la checklist).
  const { data: autoItems } = await db.from('plan_observance_items').select('consultant_id').eq('auto_check', true).eq('is_active', true);
  for (const id of Array.from(new Set(((autoItems ?? []) as { consultant_id: string }[]).map((r) => r.consultant_id)))) {
    try {
      out.autoChecks += await applyAutoChecks(db, id, today);
    } catch (e) {
      out.errors += 1;
      console.error('[wearable-jobs] coches', { consultantId: id, message: (e as Error).message });
    }
  }

  // 2. Récaps des jours prévus.
  const { data: settings, error } = await db.from('wearable_recap_settings').select('*').eq('enabled', true);
  if (error) throw new Error(`Réglages des récaps illisibles (${error.code ?? 'inconnu'})`);
  for (const s of (settings ?? []) as SettingsRow[]) {
    if (!isRecapDay({ enabled: s.enabled, frequency: s.frequency, weekdays: s.weekdays, anchor: s.anchor }, today)) continue;
    out.considered += 1;
    try {
      const r = await prepareRecap(db, s, today);
      out[r] += 1;
    } catch (e) {
      out.errors += 1;
      console.error('[wearable-jobs] récap', { consultantId: s.consultant_id, message: (e as Error).message });
    }
  }
  return out;
}
