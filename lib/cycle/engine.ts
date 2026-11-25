// Moteur de l'onglet Cycle (maquette actée le 22 nov. 2026).
//
// Tout travaille sur des dates ISO (AAAA-MM-JJ) pour éviter les décalages de fuseau.
// Règles (voir « Règles de calcul » dans l'onglet) :
//  - Un nouveau cycle commence à un jour de règles précédé d'au moins 14 jours sans règles.
//  - Phases (4) : Règles = jours de règles déclarés (sinon durée habituelle des règles),
//    Ovulation = autour de (durée du cycle − 14) ± 1 jour, Folliculaire entre les deux, Lutéale après.
//  - Durées « calculées » : moyenne des 3 derniers cycles complets (cycle) / 3 derniers cycles (règles).
//  - Écarts à l'habitude : le cycle en cours (J1 → aujourd'hui) comparé à la moyenne des
//    3 cycles précédents sur les mêmes jours. Seuils :
//      durée des règles  : écart ≥ 2 j ;
//      jours (flux abondant, douleur, douleur forte, chaque symptôme) :
//        +2 j et ≥ 1,5× l'habitude (ou ≥ 2 j si presque jamais noté : habitude < 0,5 j), ou −2 j et ≤ habitude/1,5 ;
//      température moyenne : écart ≥ 0,3 °C ;
//      durée du cycle : règles en retard de 5 j ou plus sur la date estimée.
//    Données minimales : 2 cycles précédents et au moins la moitié des jours saisis.
//  - Ressentis selon la phase : sur les 3 derniers cycles, nombre de cycles où le ressenti est noté
//    au moins une fois pendant la phase (1 parfois, 2 souvent, 3 à chaque cycle). 4 ressentis les plus notés.

import type { CycleEntry, CycleProfile, SymptomKey } from '../types';
import { SYMPTOM_LABELS, SYMPTOM_KEYS } from '../cycle-constants';

export type Phase4 = 'menstrual' | 'follicular' | 'ovulation' | 'luteal';

export const PHASE4_LABELS: Record<Phase4, string> = {
  menstrual: 'Règles',
  follicular: 'Phase folliculaire',
  ovulation: 'Ovulation',
  luteal: 'Phase lutéale',
};

export const NEW_CYCLE_MIN_GAP_DAYS = 14;
const DEFAULT_CYCLE_LENGTH = 28;
const DEFAULT_PERIOD_LENGTH = 5;
const LUTEAL_LENGTH = 14;
const CYCLES_FOR_AVERAGES = 3;
const CYCLES_FOR_COMPARISON = 2;
const MAX_FLAGS = 5;
const TEMP_THRESHOLD = 0.3;
const LATE_PERIOD_DAYS = 5;
const PAIN_STRONG = 7; // period_pain 0..10 : ≥ 7 forte, 4..6 modérée, 1..3 légère

/* ---------- dates ---------- */

export function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10)) - Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10))) / 864e5);
}

export function todayIso(now: Date = new Date()): string {
  // Jour civil à Paris.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/* ---------- niveaux ---------- */

export type PainLevel = 0 | 1 | 2 | 3;
export function painLevel(p: number | null | undefined): PainLevel {
  if (!p || p <= 0) return 0;
  if (p >= PAIN_STRONG) return 3;
  if (p >= 4) return 2;
  return 1;
}
export const PAIN_LABELS: Record<PainLevel, string> = { 0: 'Aucune', 1: 'Légère', 2: 'Modérée', 3: 'Forte' };

export type FlowLevel = 0 | 1 | 2 | 3;
export function flowLevel(e: Pick<CycleEntry, 'is_period' | 'flow_intensity'>): FlowLevel {
  if (!e.is_period) return 0;
  switch (e.flow_intensity) {
    case 'heavy': return 3;
    case 'medium': return 2;
    case 'light':
    case 'spotting': return 1;
    default: return 0;
  }
}
export const FLOW_LEVEL_LABELS: Record<FlowLevel, string> = { 0: '—', 1: 'Légères', 2: 'Moyennes', 3: 'Abondantes' };

export function entrySymptoms(e: CycleEntry): SymptomKey[] {
  return SYMPTOM_KEYS.filter((k) => Boolean((e as unknown as Record<string, unknown>)[`symptom_${k}`]));
}

/* ---------- cycles ---------- */

export interface Cycle {
  start: string;
  /** Jour de début du cycle suivant (exclu), ou null pour le cycle en cours. */
  end: string | null;
  length: number | null;
  /** Nombre de jours de règles déclarés dans ce cycle. */
  periodDays: number;
  /** Dernier jour de règles déclaré (début des règles de ce cycle). */
  periodEnd: string;
}

export function cycleStarts(entries: CycleEntry[]): string[] {
  const period = entries.filter((e) => e.is_period).map((e) => e.date).sort();
  const starts: string[] = [];
  let last: string | null = null;
  for (const d of period) {
    if (last === null || daysBetween(last, d) >= NEW_CYCLE_MIN_GAP_DAYS) starts.push(d);
    last = d;
  }
  return starts;
}

export function buildCycles(entries: CycleEntry[]): Cycle[] {
  const starts = cycleStarts(entries);
  const period = new Set(entries.filter((e) => e.is_period).map((e) => e.date));
  return starts.map((start, i) => {
    const end = starts[i + 1] ?? null;
    let periodEnd = start;
    let periodDays = 0;
    for (const d of period) {
      if (d >= start && (end === null || d < end) && daysBetween(start, d) < NEW_CYCLE_MIN_GAP_DAYS) {
        periodDays += 1;
        if (d > periodEnd) periodEnd = d;
      }
    }
    return { start, end, length: end ? daysBetween(start, end) : null, periodDays, periodEnd };
  });
}

/* ---------- durées ---------- */

export interface Durations {
  cycleLength: number;
  periodLength: number;
  /** Les cycles qui ont servi au calcul (du plus récent au plus ancien). */
  cycleSamples: number[];
  periodSamples: number[];
  regularity: 'regular' | 'somewhat_irregular' | 'irregular' | 'unknown';
}

export function computeDurations(cycles: Cycle[], profile: Pick<CycleProfile, 'average_cycle_length' | 'average_period_length' | 'cycle_length_manual' | 'period_length_manual'> | null): Durations {
  const complete = cycles.filter((c) => c.length !== null).slice(-CYCLES_FOR_AVERAGES).reverse();
  const cycleSamples = complete.map((c) => c.length as number);
  const withPeriod = cycles.filter((c) => c.periodDays > 0).slice(-CYCLES_FOR_AVERAGES).reverse();
  const periodSamples = withPeriod.map((c) => c.periodDays);
  const avg = (xs: number[]) => Math.round(xs.reduce((s, x) => s + x, 0) / xs.length);
  const cycleLength = profile?.cycle_length_manual ? profile.average_cycle_length : cycleSamples.length ? avg(cycleSamples) : profile?.average_cycle_length ?? DEFAULT_CYCLE_LENGTH;
  const periodLength = profile?.period_length_manual ? profile.average_period_length : periodSamples.length ? avg(periodSamples) : profile?.average_period_length ?? DEFAULT_PERIOD_LENGTH;
  let regularity: Durations['regularity'] = 'unknown';
  if (cycleSamples.length >= 2) {
    const spread = Math.max(...cycleSamples) - Math.min(...cycleSamples);
    regularity = spread <= 3 ? 'regular' : spread <= 7 ? 'somewhat_irregular' : 'irregular';
  }
  return { cycleLength, periodLength, cycleSamples, periodSamples, regularity };
}

/* ---------- phases ---------- */

export function phaseForDay(cycleDay: number, cycleLength: number, periodLength: number, declaredPeriod?: boolean): Phase4 {
  if (declaredPeriod) return 'menstrual';
  const ovulation = Math.max(periodLength + 3, cycleLength - LUTEAL_LENGTH);
  if (declaredPeriod === undefined && cycleDay <= periodLength) return 'menstrual';
  if (cycleDay >= ovulation - 1 && cycleDay <= ovulation + 1) return 'ovulation';
  if (cycleDay < ovulation - 1) return 'follicular';
  return 'luteal';
}

export interface DayInfo {
  date: string;
  cycleDay: number | null;
  phase: Phase4 | null;
  /** Phase projetée (après aujourd'hui, ou règles non encore déclarées). */
  estimated: boolean;
  entry: CycleEntry | null;
}

/**
 * Infos d'un jour : jour du cycle, phase, estimation.
 * Les jours de règles sont ceux déclarés ; au-delà d'aujourd'hui, tout est estimé à partir des durées.
 */
export function dayInfo(date: string, cycles: Cycle[], durations: Durations, entriesByDate: Map<string, CycleEntry>, today: string): DayInfo {
  const entry = entriesByDate.get(date) ?? null;
  const future = date > today;
  // Cycle contenant la date (réel), sinon projection à partir du dernier.
  let cycle = [...cycles].reverse().find((c) => c.start <= date && (c.end === null || date < c.end)) ?? null;
  let estimated = future;
  if (!cycle) {
    const last = cycles[cycles.length - 1];
    if (!last || date < last.start) return { date, cycleDay: null, phase: null, estimated: false, entry };
    cycle = last;
  }
  let cycleDay = daysBetween(cycle.start, date) + 1;
  // Au-delà de la durée habituelle sans nouvelles règles : cycles projetés.
  if (cycle.end === null && cycleDay > durations.cycleLength) {
    const projected = Math.floor((cycleDay - 1) / durations.cycleLength);
    cycleDay = cycleDay - projected * durations.cycleLength;
    estimated = true;
  }
  const declared = entry?.is_period === true;
  const phase = declared ? 'menstrual' : phaseForDay(cycleDay, durations.cycleLength, durations.periodLength, future || cycleDay > durations.periodLength ? undefined : false);
  if (!declared && phase === 'menstrual') estimated = true;
  return { date, cycleDay, phase, estimated, entry };
}

/* ---------- écarts à l'habitude ---------- */

export interface Flag {
  label: string;
  /** Valeur de ce cycle, formatée. */
  value: string;
  /** Sous-titre : « d’habitude 2 j », « presque jamais noté avant »… */
  usual: string;
  gap: string;
  ratio: number;
}

export interface Comparison {
  /** Aucune comparaison possible (moins de 2 cycles précédents). */
  possible: boolean;
  cycleDay: number;
  lastPeriodStart: string;
  previousCycles: number;
  flags: Flag[];
  /** Critères restés dans l'habitude, en minuscules. */
  okNames: string[];
  /** Moins de la moitié des jours saisis. */
  lowData: boolean;
  /** Règles en retard de N jours sur la date estimée (0 si non). */
  lateDays: number;
}

function fmtDays(n: number): string {
  return n < 1 ? 'moins d’1 j' : `${Math.round(n)} j`;
}

function daysRule(cur: number, hab: number): { gap: string; ratio: number; isNew: boolean } | null {
  const up = cur - hab >= 2 && (hab < 0.5 ? cur >= 2 : cur >= 1.5 * hab);
  const down = hab - cur >= 2 && cur <= hab / 1.5;
  if (!up && !down) return null;
  return {
    gap: `${cur > hab ? '+' : '−'}${Math.round(Math.abs(cur - hab))} j`,
    ratio: hab < 0.5 ? 9 : Math.max(cur / hab, hab / Math.max(cur, 0.1)),
    isNew: hab < 0.5,
  };
}

interface CycleStats {
  days: number;
  noted: number;
  periodDays: number;
  heavyDays: number;
  painDays: number;
  strongPainDays: number;
  symptoms: Record<string, number>;
  temps: number[];
}

function statsFor(entries: CycleEntry[], from: string, toExclusive: string | null, maxDays: number | null): CycleStats {
  const s: CycleStats = { days: 0, noted: 0, periodDays: 0, heavyDays: 0, painDays: 0, strongPainDays: 0, symptoms: {}, temps: [] };
  const limit = maxDays !== null ? addDays(from, maxDays) : null;
  const end = [toExclusive, limit].filter((x): x is string => x !== null).sort()[0] ?? null;
  s.days = end ? daysBetween(from, end) : 0;
  for (const e of entries) {
    if (e.date < from || (end && e.date >= end)) continue;
    s.noted += 1;
    if (e.is_period) {
      s.periodDays += 1;
      if (e.flow_intensity === 'heavy') s.heavyDays += 1;
    }
    const pl = painLevel(e.period_pain);
    if (pl > 0) s.painDays += 1;
    if (pl === 3) s.strongPainDays += 1;
    for (const k of entrySymptoms(e)) s.symptoms[k] = (s.symptoms[k] ?? 0) + 1;
    if (e.temperature !== null && e.temperature !== undefined) s.temps.push(Number(e.temperature));
  }
  return s;
}

export function compareToUsual(entries: CycleEntry[], cycles: Cycle[], durations: Durations, today: string): Comparison | null {
  const current = cycles[cycles.length - 1];
  if (!current) return null;
  const cycleDay = daysBetween(current.start, today) + 1;
  const previous = cycles.filter((c) => c.end !== null).slice(-CYCLES_FOR_AVERAGES);
  const base: Comparison = { possible: previous.length >= CYCLES_FOR_COMPARISON, cycleDay, lastPeriodStart: current.start, previousCycles: previous.length, flags: [], okNames: [], lowData: false, lateDays: 0 };
  const lateDays = Math.max(0, cycleDay - durations.cycleLength);
  base.lateDays = lateDays >= LATE_PERIOD_DAYS ? lateDays : 0;
  if (!base.possible) return base;

  // Ce cycle, J1 → aujourd'hui inclus ; les précédents sur les mêmes jours (J1 → J{cycleDay}).
  const cur = statsFor(entries, current.start, addDays(today, 1), null);
  const prev = previous.map((c) => statsFor(entries, c.start, c.end, cycleDay));
  const mean = (f: (s: CycleStats) => number) => prev.reduce((a, s) => a + f(s), 0) / prev.length;
  base.lowData = cur.noted / Math.max(cycleDay, 1) < 0.5;

  const flagged: Flag[] = [];
  const ok: string[] = [];
  const push = (label: string, curV: number, hab: number, r: { gap: string; ratio: number; isNew: boolean } | null) => {
    if (r) flagged.push({ label, value: `${curV} j`, usual: r.isNew ? 'presque jamais noté avant' : `d’habitude ${fmtDays(hab)}`, gap: r.gap, ratio: r.ratio });
    else if (curV > 0 || hab >= 1) ok.push(label.toLowerCase());
  };

  // Durée des règles : seulement une fois les règles terminées (au moins 1 jour sans règles après).
  const periodOver = current.periodDays > 0 && today > current.periodEnd;
  const habPeriod = mean((s) => s.periodDays);
  if (periodOver) {
    const diff = current.periodDays - habPeriod;
    if (Math.abs(diff) >= 2) flagged.push({ label: 'Durée des règles', value: `${current.periodDays} j`, usual: `d’habitude ${fmtDays(habPeriod)}`, gap: `${diff > 0 ? '+' : '−'}${Math.round(Math.abs(diff))} j`, ratio: (Math.abs(diff) / Math.max(habPeriod, 1)) * 3 });
    else ok.push('durée des règles');
  }
  push('Flux abondant', cur.heavyDays, mean((s) => s.heavyDays), daysRule(cur.heavyDays, mean((s) => s.heavyDays)));
  push('Jours avec douleur', cur.painDays, mean((s) => s.painDays), daysRule(cur.painDays, mean((s) => s.painDays)));
  push('Douleur forte', cur.strongPainDays, mean((s) => s.strongPainDays), daysRule(cur.strongPainDays, mean((s) => s.strongPainDays)));
  const symptomKeys = new Set<string>([...Object.keys(cur.symptoms), ...prev.flatMap((s) => Object.keys(s.symptoms))]);
  for (const k of symptomKeys) {
    const label = SYMPTOM_LABELS[k as SymptomKey] ?? k;
    const c = cur.symptoms[k] ?? 0;
    const h = mean((s) => s.symptoms[k] ?? 0);
    push(label, c, h, daysRule(c, h));
  }
  if (cur.temps.length) {
    const tCur = cur.temps.reduce((a, b) => a + b, 0) / cur.temps.length;
    const prevTemps = prev.flatMap((s) => s.temps);
    if (prevTemps.length) {
      const tHab = prevTemps.reduce((a, b) => a + b, 0) / prevTemps.length;
      const dt = tCur - tHab;
      if (Math.abs(dt) >= TEMP_THRESHOLD) flagged.push({ label: 'Température moyenne', value: `${tCur.toFixed(1).replace('.', ',')} °C`, usual: `d’habitude ${tHab.toFixed(1).replace('.', ',')} °C`, gap: `${dt > 0 ? '+' : '−'}${Math.abs(dt).toFixed(1).replace('.', ',')} °C`, ratio: 2 });
      else ok.push('température');
    }
  }
  if (base.lateDays) flagged.push({ label: 'Durée du cycle', value: `J${cycleDay}`, usual: `règles estimées à J${durations.cycleLength}`, gap: `+${base.lateDays} j`, ratio: 2.5 });
  flagged.sort((a, b) => b.ratio - a.ratio);
  base.flags = flagged.slice(0, MAX_FLAGS);
  base.okNames = ok;
  return base;
}

/* ---------- ressentis selon la phase ---------- */

export interface PhaseFeel {
  symptom: SymptomKey;
  label: string;
  /** Pour chaque phase (règles, folliculaire, ovulation, lutéale), nombre de cycles (0..3) où noté. */
  counts: [number, number, number, number];
  total: number;
}

export interface FeelHighlight {
  symptom: SymptomKey;
  phase: Phase4;
  hits: number;
  total: number;
  sentence: string;
}

const PHASE_ORDER: Phase4[] = ['menstrual', 'follicular', 'ovulation', 'luteal'];

export function feelsByPhase(entries: CycleEntry[], cycles: Cycle[], durations: Durations, today: string): { rows: PhaseFeel[]; cyclesUsed: number; highlight: FeelHighlight | null } {
  const used = cycles.slice(-CYCLES_FOR_AVERAGES);
  if (used.length === 0) return { rows: [], cyclesUsed: 0, highlight: null };
  const byDate = new Map(entries.map((e) => [e.date, e]));
  const perSymptom = new Map<SymptomKey, { cycles: Set<number>[]; total: number; firstDays: number; inPhase: Record<Phase4, number> }>();
  used.forEach((c, ci) => {
    const end = c.end ?? addDays(today, 1);
    for (let d = c.start; d < end; d = addDays(d, 1)) {
      const e = byDate.get(d);
      if (!e) continue;
      const info = dayInfo(d, cycles, durations, byDate, today);
      if (!info.phase) continue;
      for (const k of entrySymptoms(e)) {
        let rec = perSymptom.get(k);
        if (!rec) { rec = { cycles: PHASE_ORDER.map(() => new Set<number>()), total: 0, firstDays: 0, inPhase: { menstrual: 0, follicular: 0, ovulation: 0, luteal: 0 } }; perSymptom.set(k, rec); }
        rec.cycles[PHASE_ORDER.indexOf(info.phase)].add(ci);
        rec.total += 1;
        rec.inPhase[info.phase] += 1;
        if (info.phase === 'menstrual' && (info.cycleDay ?? 9) <= 2) rec.firstDays += 1;
      }
    }
  });
  const rows: PhaseFeel[] = [...perSymptom.entries()]
    .map(([symptom, r]) => ({ symptom, label: SYMPTOM_LABELS[symptom], counts: r.cycles.map((s) => s.size) as [number, number, number, number], total: r.total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 4);
  // Point saillant : un ressenti concentré (≥ 70 %, ≥ 3 occurrences) sur les 2 premiers jours des règles
  // (prioritaire : c'est le motif le plus parlant), sinon sur une phase. À égalité, le plus noté.
  let highlight: FeelHighlight | null = null;
  const consider = (cand: FeelHighlight & { kind: number }) => {
    const cur = highlight as (FeelHighlight & { kind: number }) | null;
    if (!cur || cand.kind > cur.kind || (cand.kind === cur.kind && cand.total > cur.total)) highlight = cand;
  };
  for (const [symptom, r] of perSymptom) {
    if (r.total < 3) continue;
    const label = SYMPTOM_LABELS[symptom].toLowerCase();
    const verb = r.total > 1 ? 'sont notées' : 'est notée';
    if (r.firstDays / r.total >= 0.7) {
      consider({ kind: 2, symptom, phase: 'menstrual', hits: r.firstDays, total: r.total, sentence: `${r.firstDays} ${label} sur ${r.total} ${verb} pendant les 2 premiers jours des règles.` });
      continue;
    }
    for (const p of PHASE_ORDER) {
      if (r.inPhase[p] / r.total >= 0.7) consider({ kind: 1, symptom, phase: p, hits: r.inPhase[p], total: r.total, sentence: `${r.inPhase[p]} ${label} sur ${r.total} ${verb} en ${PHASE4_LABELS[p].toLowerCase()}.` });
    }
  }
  if (highlight) { const h = highlight as FeelHighlight & { kind?: number }; delete h.kind; }
  return { rows, cyclesUsed: used.length, highlight };
}

/* ---------- vue d'ensemble ---------- */

export type TrackingMode = 'off' | 'waiting' | 'on' | 'paused';

export function trackingMode(profile: CycleProfile | null, cycles: Cycle[]): TrackingMode {
  if (!profile) return 'off';
  if (!profile.is_tracking) return profile.tracking_paused_at ? 'paused' : 'off';
  return cycles.length ? 'on' : 'waiting';
}

export interface CycleOverview {
  mode: TrackingMode;
  cycles: Cycle[];
  durations: Durations;
  today: string;
  current: { cycleDay: number; phase: Phase4; estimated: boolean } | null;
  nextPeriod: { date: string; inDays: number } | null;
  comparison: Comparison | null;
  feels: ReturnType<typeof feelsByPhase>;
  /** Situation (grossesse, allaitement, périménopause) : pas de phases ni d'estimations. */
  estimatesPaused: boolean;
}

export function computeOverview(entries: CycleEntry[], profile: CycleProfile | null, today: string = todayIso()): CycleOverview {
  const cycles = buildCycles(entries);
  const durations = computeDurations(cycles, profile);
  const mode = trackingMode(profile, cycles);
  const estimatesPaused = !!profile?.situation && ['grossesse', 'allaitement', 'perimenopause'].includes(profile.situation);
  const byDate = new Map(entries.map((e) => [e.date, e]));
  let current: CycleOverview['current'] = null;
  let nextPeriod: CycleOverview['nextPeriod'] = null;
  if (mode === 'on' && !estimatesPaused) {
    const info = dayInfo(today, cycles, durations, byDate, today);
    if (info.cycleDay && info.phase) current = { cycleDay: info.cycleDay, phase: info.phase, estimated: info.estimated };
    const last = cycles[cycles.length - 1];
    const date = addDays(last.start, durations.cycleLength);
    nextPeriod = { date, inDays: daysBetween(today, date) };
  }
  return {
    mode,
    cycles,
    durations,
    today,
    current,
    nextPeriod,
    comparison: mode === 'on' && !estimatesPaused ? compareToUsual(entries, cycles, durations, today) : null,
    feels: mode === 'on' ? feelsByPhase(entries, cycles, durations, today) : { rows: [], cyclesUsed: 0, highlight: null },
    estimatesPaused,
  };
}

/** Effet d'une date de règles notée par le praticien (aperçu avant enregistrement). */
export function previewPeriodNote(start: string, end: string | null, cycles: Cycle[], fixingStart: string | null): string {
  const fmt = (iso: string) => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(iso + 'T00:00:00Z'));
  const end_ = (t: string) => (t.endsWith('.') ? t : t + '.');
  if (fixingStart) return `Le cycle qui commençait le ${fmt(fixingStart)} commencera le ${end_(fmt(start))} Les phases et l’historique seront recalculés.`;
  const prevStart = [...cycles].reverse().find((c) => c.start < start)?.start ?? null;
  const prevLen = prevStart ? daysBetween(prevStart, start) : 0;
  const perLen = end ? daysBetween(start, end) + 1 : null;
  if (prevLen > 0 && prevLen < NEW_CYCLE_MIN_GAP_DAYS) {
    return `Moins de 14 jours après le début des règles précédentes (${fmt(prevStart as string)}) : ces jours seront comptés comme la suite des mêmes règles, pas comme un nouveau cycle.`;
  }
  const tail = `${prevLen > 0 ? ` · le cycle précédent aura duré ${prevLen} jours` : ''}${perLen ? ` · règles de ${perLen} jours` : ''}`;
  return `Nouveau cycle à partir du ${tail ? fmt(start) + tail + '.' : end_(fmt(start))} Les phases suivantes seront recalculées.`;
}

export const COMPARISON_RULES: { c: string; r: string }[] = [
  { c: 'Durée des règles', r: 'écart de 2 jours ou plus avec sa durée habituelle' },
  { c: 'Flux abondant, jours avec douleur, douleur forte', r: '2 jours de plus (ou de moins) et au moins 1,5 fois plus (ou moins) que d’habitude' },
  { c: 'Chaque symptôme', r: 'même règle ; un symptôme presque jamais noté avant ressort dès 2 jours' },
  { c: 'Température moyenne', r: 'écart de 0,3 °C ou plus' },
  { c: 'Durée du cycle', r: 'règles en retard de 5 jours ou plus sur la date estimée' },
  { c: 'Données minimales', r: '2 cycles précédents notés et au moins la moitié des jours saisis ; sinon, pas de comparaison' },
];
