// lib/wearables/insights/engine.ts
// Règles de l'écran « Objet connecté » côté praticien : habituel, semaine, points à aborder,
// avant / après le conseillancier, conseils suivis × mesures.
// Fonctions pures, sans accès réseau : tout est testable avec des séries fabriquées.
import type { WearableSummaryDay } from '../summary';
import type { TrackFrequency } from '../../observance-tracking';
import {
  BETTER,
  METRICS,
  METRIC_LABEL,
  NIGHT_METRICS,
  Series,
  THRESHOLDS,
  addDays,
  dayRange,
  fmtGap,
  fmtSigned,
  fmtValue,
  mean,
  sd,
  shortDate,
  type Metric,
} from './series';

/** Nombre minimal de nuits valides pour calculer un habituel ou comparer deux périodes. */
export const MIN_NIGHTS = 7;
/** Taille de l'habituel : les 28 nuits qui précèdent la date de référence. */
export const BASELINE_DAYS = 28;
/** « Depuis » plafonné à 28 jours. */
export const MAX_SINCE_DAYS = 28;

export type Stat = { mean: number; sd: number; n: number };

export type InsightItem = {
  id: string;
  label: string;
  category: string;
  freq: TrackFrequency;
  /** Coché automatiquement par l'objet (activé par le praticien). */
  autoCheck?: boolean;
};

export type InsightLog = { itemId: string; date: string; done: boolean };

export type InsightsInput = {
  /** Série quotidienne, jours croissants, jusqu'à aujourd'hui inclus. */
  days: WearableSummaryDay[];
  /** Aujourd'hui (Europe/Paris). */
  today: string;
  /** Prénom du consultant, pour les phrases. */
  firstName: string;
  /** Jour de la dernière séance : rendez-vous passé non annulé le plus récent. */
  lastSessionDate: string | null;
  /** Jours de partage des versions du conseillancier, croissants. */
  planShares: string[];
  items: InsightItem[];
  logs: InsightLog[];
};

function statOf(xs: number[]): Stat | null {
  if (xs.length < MIN_NIGHTS) return null;
  return { mean: mean(xs)!, sd: sd(xs)!, n: xs.length };
}

/** Habituel figé : les 28 nuits qui précèdent `refDay` (exclu). */
export function baseline(series: Series, metric: Metric, refDay: string): Stat | null {
  return statOf(series.values(metric, dayRange(addDays(refDay, -BASELINE_DAYS), addDays(refDay, -1))));
}

// ─── Cette semaine, comparée à d'habitude (4 tuiles) ─────────────────

export type WeekTile = {
  metric: Metric;
  label: string;
  /** Moyenne des 7 derniers jours complets, ou null si moins de 4 valeurs. */
  value: string | null;
  usual: string | null;
  /** « ▲ 51 min de plus », « = Comme d'habitude »… */
  delta: string | null;
  tone: 'good' | 'watch' | 'flat';
  nights: number;
};

export function weekTiles(series: Series, refDay: string): WeekTile[] {
  const yesterday = addDays(series.today, -1);
  const week = dayRange(addDays(yesterday, -6), yesterday);
  return METRICS.map((metric) => {
    const vals = series.values(metric, week);
    const base = baseline(series, metric, refDay);
    const v = vals.length >= 4 ? mean(vals)! : null;
    if (v === null || !base) {
      return { metric, label: METRIC_LABEL[metric], value: v === null ? null : fmtValue(metric, v), usual: base ? fmtValue(metric, base.mean) : null, delta: null, tone: 'flat', nights: vals.length };
    }
    const d = v - base.mean;
    const same = Math.abs(d) < base.sd * 0.5 || Math.abs(d) < THRESHOLDS[metric] / 2;
    return {
      metric,
      label: METRIC_LABEL[metric],
      value: fmtValue(metric, v),
      usual: fmtValue(metric, base.mean),
      delta: same ? '= Comme d’habitude' : `${d > 0 ? '▲' : '▼'} ${fmtGap(metric, d)} de ${d > 0 ? 'plus' : 'moins'}`,
      tone: same ? 'flat' : d * BETTER[metric] > 0 ? 'good' : 'watch',
      nights: vals.length,
    };
  });
}

// ─── Points à aborder depuis la dernière séance ─────────────────

export type PointKind = 'fav' | 'att' | 'data' | 'plan';
export type Point = { id: string; metric: Metric | 'plan' | 'wear'; kind: PointKind; text: string; how: string; score: number };

export type PointsResult =
  | { status: 'no_session' }
  | { status: 'not_enough'; nights: number; needed: number; sessionDate: string }
  | { status: 'ok'; sessionDate: string; points: Point[]; candidates: Point[] };

const KIND_ORDER: PointKind[] = ['fav', 'att', 'data'];

export function sinceWindow(refDay: string, today: string, nextRef?: string | null) {
  const yesterday = addDays(today, -1);
  let end = addDays(refDay, MAX_SINCE_DAYS);
  if (end > yesterday) end = yesterday;
  if (nextRef && addDays(nextRef, -1) < end) end = addDays(nextRef, -1);
  const after = dayRange(addDays(refDay, 1), end);
  const before = after.length ? dayRange(addDays(refDay, -after.length), addDays(refDay, -1)) : [];
  return { after, before };
}

function changeText(first: string, metric: Metric, d: number): string {
  const gap = fmtGap(metric, d);
  if (metric === 'sleep') return `${first} dort ${gap} de ${d > 0 ? 'plus' : 'moins'} par nuit depuis la séance.`;
  if (metric === 'hrv') return `Sa VFC de la nuit est plus ${d > 0 ? 'haute' : 'basse'} depuis la séance : ${fmtSigned(metric, d)}.`;
  if (metric === 'hr') return `Sa fréquence cardiaque de la nuit est plus ${d < 0 ? 'basse' : 'haute'} depuis la séance : ${fmtSigned(metric, d)}.`;
  return `${first} marche ${d > 0 ? 'plus' : 'moins'} depuis la séance : ${fmtSigned(metric, d)} par jour.`;
}

const RUN_LABEL: Record<Metric, string> = { sleep: 'Sommeil', hrv: 'VFC de la nuit', hr: 'FC de la nuit', steps: 'Pas' };

export function pointsToDiscuss(input: InsightsInput, series: Series): PointsResult {
  const s = input.lastSessionDate;
  if (!s) return { status: 'no_session' };
  const { after, before } = sinceWindow(s, input.today);
  const validAfter = after.filter((d) => series.nightValid(d)).length;
  if (validAfter < MIN_NIGHTS) return { status: 'not_enough', nights: validAfter, needed: MIN_NIGHTS, sessionDate: s };

  const yesterday = addDays(input.today, -1);
  const last7 = dayRange(addDays(yesterday, -6), yesterday);
  const cand: Point[] = [];

  for (const metric of METRICS) {
    const base = baseline(series, metric, s);
    if (!base) continue;
    const a = series.values(metric, after);
    const b = series.values(metric, before);
    // a. Changement depuis la séance : double seuil (moitié de la variation habituelle ET seuil fixe).
    if (a.length >= MIN_NIGHTS && b.length >= MIN_NIGHTS) {
      const d = mean(a)! - mean(b)!;
      if (Math.abs(d) >= base.sd * 0.5 && Math.abs(d) >= THRESHOLDS[metric]) {
        const good = d * BETTER[metric] > 0;
        cand.push({
          id: `${metric}-change`,
          metric,
          kind: good ? 'fav' : 'att',
          score: Math.abs(d) / Math.max(base.sd, 1e-6),
          text: changeText(input.firstName, metric, d),
          how: `${fmtValue(metric, mean(b)!)} en moyenne sur les ${b.length} nuits d’avant, ${fmtValue(metric, mean(a)!)} sur les ${a.length} nuits depuis.`,
        });
      }
    }
    // b. Écart en cours : au moins 4 des 7 dernières nuits hors de son habituel, du même côté.
    const last = series.values(metric, last7);
    const up = last.filter((v) => v > base.mean + base.sd).length;
    const down = last.filter((v) => v < base.mean - base.sd).length;
    const side = up >= 4 ? 1 : down >= 4 ? -1 : 0;
    if (side) {
      const n = Math.max(up, down);
      cand.push({
        id: `${metric}-run`,
        metric,
        kind: side * BETTER[metric] > 0 ? 'fav' : 'att',
        score: n / 7,
        text: `${RUN_LABEL[metric]} ${side > 0 ? 'au-dessus' : 'en dessous'} de son habituel ${n} nuits sur les 7 dernières.`,
        how: `Son habituel : de ${fmtValue(metric, base.mean - base.sd)} à ${fmtValue(metric, base.mean + base.sd)}, calculé sur les 28 nuits d’avant la séance.`,
      });
    }
  }

  // e. Conseillancier partagé depuis la séance (jour de la séance compris).
  const shared = input.planShares.filter((d) => d >= s && d <= yesterday);
  if (shared.length) {
    const d = shared[shared.length - 1];
    cand.push({
      id: 'plan',
      metric: 'plan',
      kind: 'plan',
      score: 0,
      text: d === s ? 'Le conseillancier a été partagé le jour de la séance.' : `Le conseillancier a été partagé le ${shortDate(d)}.`,
      how: 'Voir « Avant / après le conseillancier » pour le détail mesure par mesure.',
    });
  }

  // f. Port de l'objet : 3 nuits non portées ou plus depuis la séance.
  const unworn = after.filter((d) => series.unworn(d));
  if (unworn.length >= 3) {
    cand.push({
      id: 'wear',
      metric: 'wear',
      kind: 'data',
      score: 0,
      text: `Objet non porté ${unworn.length} nuits depuis la séance.`,
      how: `Nuits sans mesure : ${unworn.map(shortDate).join(', ')}. Elles sont exclues des moyennes.`,
    });
  }

  return { status: 'ok', sessionDate: s, points: pickPoints(cand), candidates: cand };
}

/** 3 points au maximum, un seul par mesure : une évolution favorable, un point d'attention, les données, puis le reste par ampleur. */
export function pickPoints(cand: Point[]): Point[] {
  const byScore = (x: Point, y: Point) => y.score - x.score;
  const picked: Point[] = [];
  const take = (c?: Point) => {
    if (c && picked.length < 3 && !picked.some((p) => p.metric === c.metric)) picked.push(c);
  };
  for (const k of KIND_ORDER) take(cand.filter((c) => c.kind === k).sort(byScore)[0]);
  cand.filter((c) => c.kind === 'fav' || c.kind === 'att').sort(byScore).forEach(take);
  cand.filter((c) => c.kind === 'plan').forEach(take);
  return picked;
}

// ─── Avant / après le conseillancier ─────────────────

export type BeforeAfterRow = {
  metric: Metric;
  label: string;
  status: 'ok' | 'not_enough';
  nightsBefore: number;
  nightsAfter: number;
  before: number | null;
  after: number | null;
  beforeText: string | null;
  afterText: string | null;
  verdict: 'fav' | 'watch' | 'flat' | null;
  sentence: string;
};

export type BeforeAfterResult =
  | { status: 'no_plan' }
  | { status: 'ok'; shareDate: string; days: number; rows: BeforeAfterRow[] };

function baSentence(first: string, metric: Metric, d: number, counts: boolean): string {
  if (Math.round(d) === 0) return 'Comme avant.';
  if (!counts) return `Un peu ${d > 0 ? 'plus' : 'moins'}, dans ses variations habituelles.`;
  const gap = fmtGap(metric, d);
  if (metric === 'sleep') return `${first} dort ${gap} de ${d > 0 ? 'plus' : 'moins'} par nuit.`;
  if (metric === 'hrv') return `Sa VFC la nuit est plus ${d > 0 ? 'haute' : 'basse'} de ${gap}.`;
  if (metric === 'hr') return `Son cœur bat ${gap} ${d < 0 ? 'moins' : 'plus'} vite la nuit.`;
  return `${first} fait ${gap} de ${d > 0 ? 'plus' : 'moins'} par jour.`;
}

export function beforeAfter(input: InsightsInput, series: Series): BeforeAfterResult {
  const shares = input.planShares;
  if (!shares.length) return { status: 'no_plan' };
  const share = shares[shares.length - 1];
  const { after, before } = sinceWindow(share, input.today);
  const rows = METRICS.map<BeforeAfterRow>((metric) => {
    const a = series.values(metric, after);
    const b = series.values(metric, before);
    const base: BeforeAfterRow = { metric, label: METRIC_LABEL[metric], status: 'not_enough', nightsBefore: b.length, nightsAfter: a.length, before: null, after: null, beforeText: null, afterText: null, verdict: null, sentence: '' };
    if (a.length < MIN_NIGHTS || b.length < MIN_NIGHTS) {
      return { ...base, sentence: `Pas encore assez de recul (${Math.min(a.length, b.length)} nuits sur ${MIN_NIGHTS}).` };
    }
    const ma = mean(a)!;
    const mb = mean(b)!;
    const d = ma - mb;
    const variation = sd(b)!;
    const counts = Math.abs(d) >= variation * 0.5 && Math.abs(d) >= THRESHOLDS[metric];
    return {
      ...base,
      status: 'ok',
      before: mb,
      after: ma,
      beforeText: fmtValue(metric, mb),
      afterText: fmtValue(metric, ma),
      verdict: counts ? (d * BETTER[metric] > 0 ? 'fav' : 'watch') : 'flat',
      sentence: baSentence(input.firstName, metric, d, counts),
    };
  });
  return { status: 'ok', shareDate: share, days: after.length, rows };
}

// ─── Conseils suivis × mesures ─────────────────

export const HABIT_WINDOW = 14;
export const HABIT_MIN_SIDE = 4;

export type HabitRow = {
  itemId: string;
  label: string;
  done: number;
  counted: number;
  eligible: boolean;
  /** Phrase affichée dans la colonne « Sur ses nuits ». */
  effect: string;
  /** Détail au survol. */
  how: string;
  /** Mesure de l'effet mis en avant, s'il y en a un. */
  metric: Metric | null;
  delta: number | null;
};

/** Seuls les items quotidiens ou « plusieurs fois par semaine » sont comparés. */
export function habitEligible(freq: TrackFrequency): boolean {
  if (freq.mode === 'daily' || freq.unit === 'day') return true;
  return freq.unit === 'week' && freq.count >= 2;
}

const HABIT_EFFECT: Record<Metric, (d: number) => string> = {
  sleep: (d) => `Dort ${fmtGap('sleep', d)} de ${d > 0 ? 'plus' : 'moins'} les nuits qui suivent.`,
  hrv: (d) => `VFC plus ${d > 0 ? 'haute' : 'basse'} la nuit qui suit (${fmtSigned('hrv', d)}).`,
  hr: (d) => `Cœur plus ${d < 0 ? 'calme' : 'rapide'} la nuit qui suit (${fmtSigned('hr', d)}).`,
  steps: (d) => `${fmtGap('steps', d)} de ${d > 0 ? 'plus' : 'moins'} ces jours-là.`,
};

export function habitsVsMeasures(input: InsightsInput, series: Series): { counted: number; window: string[]; rows: HabitRow[] } {
  const yesterday = addDays(input.today, -1);
  const window = dayRange(addDays(yesterday, -(HABIT_WINDOW - 1)), yesterday);
  const doneSet = new Set(input.logs.filter((l) => l.done).map((l) => `${l.itemId}|${l.date}`));
  // Jours comptés : au moins une coche ce jour-là, tous items confondus.
  const anyTick = new Set(input.logs.filter((l) => l.done).map((l) => l.date));
  const counted = window.filter((d) => anyTick.has(d));

  const rows = input.items.map<HabitRow>((it) => {
    const done = counted.filter((d) => doneSet.has(`${it.id}|${d}`));
    const notDone = counted.filter((d) => !doneSet.has(`${it.id}|${d}`));
    const base: HabitRow = { itemId: it.id, label: it.label, done: done.length, counted: counted.length, eligible: habitEligible(it.freq), effect: '', how: '', metric: null, delta: null };
    if (!base.eligible) return { ...base, effect: 'Conseil trop espacé pour comparer.', how: 'Seuls les conseils quotidiens ou plusieurs fois par semaine sont comparés.' };
    if (counted.length && done.length === counted.length) return { ...base, effect: 'Fait tous les jours : rien à comparer.', how: 'Il faut des jours avec et sans pour comparer.' };

    const metrics: Metric[] = it.category === 'activite' ? [...NIGHT_METRICS, 'steps'] : [...NIGHT_METRICS];
    let best: { metric: Metric; d: number; r: number; my: number; mn: number; ny: number; nn: number } | null = null;
    let anyOk = false;
    let minSide = Infinity;
    for (const metric of metrics) {
      // Jour J comparé à la nuit qui suit (réveil J+1) ; pour les pas, le jour J.
      const at = (d: string) => (metric === 'steps' ? series.value('steps', d) : series.value(metric, addDays(d, 1)));
      const yes = done.map(at).filter((v): v is number => v !== null);
      const no = notDone.map(at).filter((v): v is number => v !== null);
      minSide = Math.min(minSide, yes.length, no.length);
      if (yes.length < HABIT_MIN_SIDE || no.length < HABIT_MIN_SIDE) continue;
      anyOk = true;
      const my = mean(yes)!;
      const mn = mean(no)!;
      const d = my - mn;
      const r = (d * BETTER[metric]) / THRESHOLDS[metric];
      if (r >= 1 && (!best || r > best.r)) best = { metric, d, r, my, mn, ny: yes.length, nn: no.length };
    }
    if (best) {
      return {
        ...base,
        metric: best.metric,
        delta: best.d,
        effect: HABIT_EFFECT[best.metric](best.d),
        how: `Les jours où c’est coché, ${fmtValue(best.metric, best.my)} contre ${fmtValue(best.metric, best.mn)} les autres jours (${best.ny} jours contre ${best.nn}).`,
      };
    }
    if (anyOk) return { ...base, effect: 'Pas de différence nette sur ses nuits.', how: 'Écarts sous les seuils (20 min, 3 ms, 3 bpm, 1 000 pas).' };
    const have = Number.isFinite(minSide) ? minSide : 0;
    return { ...base, effect: 'Pas encore assez de jours pour comparer.', how: `Il faut au moins ${HABIT_MIN_SIDE} jours cochés et ${HABIT_MIN_SIDE} non cochés (${have} sur ${HABIT_MIN_SIDE}).` };
  });
  return { counted: counted.length, window, rows };
}
