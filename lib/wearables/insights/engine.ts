// lib/wearables/insights/engine.ts
// Règles de l'écran « Objet connecté » côté praticien, reprises à l'identique de la maquette
// (canvas Espace praticien, écrans 19a à 19f) et des règles écrites dans ses fils de commentaires :
// habituel, semaine, graphique, points à aborder, avant / après le conseillancier,
// conseils suivis × mesures, ressenti & cycle.
// Fonctions pures, sans accès réseau.
import type { WearableSummaryDay } from '../summary';
import type { TrackFrequency } from '../../observance-tracking';
import {
  BETTER,
  METRICS,
  METRIC_LABEL,
  METRIC_SHORT,
  METRIC_TITLE,
  NIGHT_METRICS,
  Series,
  THRESHOLDS,
  addDays,
  dayDate,
  dayRange,
  fmtDuration,
  fmtGap,
  fmtSigned,
  fmtValue,
  listFr,
  mean,
  plural,
  sd,
  shortDate,
  type Metric,
} from './series';

/** Nombre minimal de nuits valides de chaque côté pour comparer deux périodes. */
export const MIN_NIGHTS = 7;
/** Habituel : 28 nuits. */
export const BASELINE_DAYS = 28;
/** « Depuis » plafonné à 28 jours. */
export const MAX_SINCE_DAYS = 28;

export type Stat = { mean: number; sd: number; n: number };
export type Phase = 'm' | 'f' | 'o' | 'l';

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
  firstName: string;
  /** Genre renseigné dans le dossier : accorde « elle » / « il » ; inconnu → le prénom. */
  gender?: 'female' | 'male' | null;
  /** Jour de la dernière séance : rendez-vous passé non annulé le plus récent. */
  lastSessionDate: string | null;
  /** Jour de la prochaine séance prévue, s'il y en a une. */
  nextSessionDate?: string | null;
  /** Partages du conseillancier (jour, numéro de version), croissants. */
  planShares: { date: string; version: number }[];
  /** Jour où le consultant a donné son accord de partage. */
  consentDate?: string | null;
  items: InsightItem[];
  logs: InsightLog[];
  /** Journal : énergie notée (1 à 10) et note libre, par jour. */
  journal?: { date: string; energy: number | null; note: string | null }[];
  /** Phase du cycle par jour (si le cycle est suivi). */
  phases?: Record<string, Phase>;
};

// ─── Formulations selon la personne ─────────────────

export type Who = {
  /** « Elle », « Il » ou le prénom, en début de phrase. */
  Subj: string;
  /** « elle », « il » ou le prénom, dans la phrase. */
  subj: string;
  /** « qu’elle », « qu’il », « qu’Amina », « que Léo ». */
  que: string;
  /** « pour elle », « pour lui », « pour Amina ». */
  pour: string;
  first: string;
};

export function who(firstName: string, gender?: 'female' | 'male' | null): Who {
  const first = firstName.trim() || 'Le consultant';
  if (gender === 'female') return { Subj: 'Elle', subj: 'elle', que: 'qu’elle', pour: 'pour elle', first };
  if (gender === 'male') return { Subj: 'Il', subj: 'il', que: 'qu’il', pour: 'pour lui', first };
  const elide = /^[aeiouyhàâéèêîïôûAEIOUYHÀÂÉÈÊÎÏÔÛ]/.test(first);
  return { Subj: first, subj: first, que: elide ? `qu’${first}` : `que ${first}`, pour: `pour ${first}`, first };
}

function statOf(xs: number[]): Stat | null {
  if (!xs.length) return null;
  return { mean: mean(xs)!, sd: sd(xs)!, n: xs.length };
}

/** Jour de référence de l'habituel : la dernière séance ; sans séance, le début des 7 derniers jours. */
export function referenceDay(input: Pick<InsightsInput, 'lastSessionDate' | 'today'>): string {
  return input.lastSessionDate ?? addDays(input.today, -7);
}

/**
 * Habituel figé : les 28 nuits qui se terminent par la nuit du jour de la séance
 * (la nuit est rattachée au réveil, donc avant la séance).
 */
export function baseline(series: Series, metric: Metric, refDay: string): Stat | null {
  return statOf(series.values(metric, dayRange(addDays(refDay, -(BASELINE_DAYS - 1)), refDay)));
}

const yesterdayOf = (today: string) => addDays(today, -1);

// ─── Cette semaine, comparée à d'habitude (4 tuiles) ─────────────────

export type WeekTile = {
  metric: Metric;
  label: string;
  value: string;
  usual: string;
  delta: string;
  tone: 'good' | 'watch' | 'flat';
};

export function weekTiles(series: Series, refDay: string): WeekTile[] {
  const y = yesterdayOf(series.today);
  const week = dayRange(addDays(y, -6), y);
  return METRICS.map((metric) => {
    const vals = series.values(metric, week);
    const base = baseline(series, metric, refDay);
    if (!vals.length || !base) {
      return { metric, label: METRIC_LABEL[metric], value: vals.length ? fmtValue(metric, mean(vals)!) : '—', usual: base ? fmtValue(metric, base.mean) : '—', delta: '', tone: 'flat' };
    }
    const last = mean(vals)!;
    const d = last - base.mean;
    const same = Math.abs(d) < base.sd * 0.5;
    const txt = fmtGap(metric, d);
    return {
      metric,
      label: METRIC_LABEL[metric],
      value: fmtValue(metric, last),
      usual: fmtValue(metric, base.mean),
      delta: same ? '= Comme d’habitude' : d > 0 ? `▲ ${txt} de plus` : `▼ ${txt} de moins`,
      tone: same ? 'flat' : d * BETTER[metric] > 0 ? 'good' : 'watch',
    };
  });
}

// ─── Graphique des 28 dernières nuits ─────────────────

export type ChartBar = { day: string; value: number | null; tone: 'usual' | 'bad' | 'gap'; title: string };

export type OverviewChart = {
  metric: Metric;
  title: string;
  head: string;
  bars: ChartBar[];
  band: { lo: number; hi: number; label: string } | null;
  badLabel: string;
  mark: { day: string; label: string } | null;
  aria: string;
};

export type ChartData = Omit<OverviewChart, 'head' | 'title' | 'metric'>;

/** Barres d'une mesure sur des jours donnés, avec la bande de son habituel (CHART de la maquette). */
export function chartData(input: InsightsInput, series: Series, metric: Metric, days: string[]): ChartData {
  const w = who(input.firstName, input.gender);
  const base = baseline(series, metric, referenceDay(input));
  const bars: ChartBar[] = days.map((day) => {
    const v = series.value(metric, day);
    if (v === null) return { day, value: null, tone: 'gap', title: `Objet non porté : ${dayDate(day)}` };
    const out = base ? (v < base.mean - base.sd ? -1 : v > base.mean + base.sd ? 1 : 0) : 0;
    const bad = out !== 0 && out * BETTER[metric] < 0;
    return {
      day,
      value: v,
      tone: bad ? 'bad' : 'usual',
      title: `${dayDate(day)} · ${fmtValue(metric, v)} · ${out === 0 ? `habituel ${w.pour}` : out < 0 ? 'moins que d’habitude' : 'plus que d’habitude'}`,
    };
  });
  const win = bars.map((b) => b.value).filter((v): v is number => v !== null);
  const band = base ? { lo: base.mean - base.sd, hi: base.mean + base.sd, label: `de ${fmtValue(metric, base.mean - base.sd)} à ${fmtValue(metric, base.mean + base.sd)}` } : null;
  const share = input.planShares.length ? input.planShares[input.planShares.length - 1] : null;
  const last = days[days.length - 1];
  return {
    bars,
    band,
    badLabel: BETTER[metric] > 0 ? 'En dessous de son habituel' : 'Au-dessus de son habituel',
    mark: share && share.date >= days[0] && share.date < last ? { day: share.date, label: `Conseillancier v${share.version} partagé →` } : null,
    aria: `${METRIC_TITLE[metric]} du ${shortDate(days[0])} au ${shortDate(last)}${win.length ? `, moyenne ${fmtValue(metric, mean(win)!)}` : ''}${band ? `, habituel ${band.label}` : ''}`,
  };
}

export function overviewChart(input: InsightsInput, series: Series, metric: Metric, ba: BeforeAfterResult): OverviewChart {
  const w = who(input.firstName, input.gender);
  const y = yesterdayOf(input.today);
  const days = dayRange(addDays(y, -27), y);
  const data = chartData(input, series, metric, days);
  const win = data.bars.map((b) => b.value).filter((v): v is number => v !== null);
  const nm = { sleep: `${w.Subj} dort`, hrv: 'Sa VFC est à', hr: 'Sa fréquence cardiaque la nuit est à', steps: `${w.Subj} fait` }[metric];
  let head = win.length ? `${nm} ${fmtValue(metric, mean(win)!)} en moyenne sur les 28 dernières nuits.` : 'Aucune nuit mesurée sur les 28 dernières nuits.';
  if (ba.status === 'ok') {
    const row = ba.rows.find((r) => r.metric === metric)!;
    if (row.status === 'ok') {
      head = row.verdict === 'flat'
        ? `${nm} ${row.afterText} en moyenne, comme avant le ${shortDate(ba.shareDate)}.`.replace(/\.\.+/g, '.')
        : `${nm} ${row.afterText} en moyenne depuis le ${shortDate(ba.shareDate)}, contre ${row.beforeText} avant.`;
    }
  }
  return { metric, title: METRIC_TITLE[metric], head, ...data };
}

// ─── Points à aborder depuis la dernière séance ─────────────────

export type PointKind = 'fav' | 'att' | 'data' | 'plan';
export type Point = { id: string; metric: Metric | 'plan' | 'wear'; kind: PointKind; text: string; how: string; score: number };

export type PointsResult =
  | { status: 'no_session' }
  | { status: 'not_enough'; sessionDate: string; title: string; text: string }
  | { status: 'none'; sessionDate: string; title: string; text: string }
  | { status: 'ok'; sessionDate: string; points: Point[]; candidates: Point[] };

export function sinceWindow(refDay: string, today: string, nextRef?: string | null) {
  const yesterday = yesterdayOf(today);
  let end = addDays(refDay, MAX_SINCE_DAYS);
  if (end > yesterday) end = yesterday;
  if (nextRef && addDays(nextRef, -1) < end) end = addDays(nextRef, -1);
  const after = dayRange(addDays(refDay, 1), end);
  const before = after.length ? dayRange(addDays(refDay, -after.length), addDays(refDay, -1)) : [];
  return { after, before };
}

function changeText(w: Who, metric: Metric, d: number): string {
  if (metric === 'sleep') return `${w.Subj} dort ${fmtGap(metric, d)}${d > 0 ? ' de plus' : ' de moins'} par nuit depuis la séance.`;
  if (metric === 'hrv') return `Sa VFC de la nuit est ${d > 0 ? 'plus haute' : 'plus basse'} depuis la séance : ${fmtSigned(metric, d)}.`;
  if (metric === 'hr') return `Sa fréquence cardiaque de la nuit a changé depuis la séance : ${fmtSigned(metric, d)}.`;
  return `${w.Subj} marche ${d > 0 ? 'plus' : 'moins'} depuis la séance : ${fmtSigned(metric, d)} par jour.`;
}

export function pointsToDiscuss(input: InsightsInput, series: Series): PointsResult {
  const s = input.lastSessionDate;
  if (!s) return { status: 'no_session' };
  const w = who(input.firstName, input.gender);
  const { after, before } = sinceWindow(s, input.today);
  const measured = after.filter((d) => series.nightValid(d)).length;
  if (measured < MIN_NIGHTS) {
    return {
      status: 'not_enough',
      sessionDate: s,
      title: 'Pas encore assez de recul.',
      text: `${plural(measured, 'nuit mesurée', 'nuits mesurées')} depuis la séance du ${shortDate(s)} : il en faut ${MIN_NIGHTS} pour proposer un point. Les premiers apparaîtront vers le ${shortDate(addDays(input.today, MIN_NIGHTS - measured))}.`.replace(/\.\.+/g, '.'),
    };
  }

  const y = yesterdayOf(input.today);
  const last7 = dayRange(addDays(y, -6), y);
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
          id: metric,
          metric,
          kind: good ? 'fav' : 'att',
          score: Math.abs(d) / (base.sd || 1),
          text: changeText(w, metric, d),
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
        text: `${METRIC_SHORT[metric]}${side > 0 ? ' au-dessus' : ' en dessous'} de son habituel ${n} nuits sur les 7 dernières.`,
        how: `Son habituel : de ${fmtValue(metric, base.mean - base.sd)} à ${fmtValue(metric, base.mean + base.sd)}, calculé sur les 28 nuits d’avant la séance.`,
      });
    }
  }

  // e. Conseillancier partagé depuis la séance (jour de la séance compris).
  const shared = input.planShares.filter((p) => p.date >= s && p.date <= y);
  if (shared.length) {
    const p = shared[shared.length - 1];
    cand.push({
      id: 'plan',
      metric: 'plan',
      kind: 'plan',
      score: 0,
      text: p.date === s ? `Le conseillancier v${p.version} a été partagé le jour de la séance.` : `Le conseillancier v${p.version} a été partagé le ${shortDate(p.date)}.`.replace(/\.\.+/g, '.'),
      how: 'Voir l’onglet « Avant / après le conseillancier » pour le détail mesure par mesure.',
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
      text: `Objet non porté ${plural(unworn.length, 'nuit')} depuis la séance : ${listFr(unworn.map(shortDate))}.`.replace(/\.\.+/g, '.'),
      how: 'Ces nuits sont exclues des moyennes pour ne pas les fausser.',
    });
  }

  const points = pickPoints(cand);
  if (!points.length) {
    return {
      status: 'none',
      sessionDate: s,
      title: 'Rien de marquant depuis la séance.',
      text: 'Ses mesures sont restées dans son habituel, et aucun changement ne dépasse les seuils. Rien n’est affiché plutôt qu’un point forcé.',
    };
  }
  return { status: 'ok', sessionDate: s, points, candidates: cand };
}

/** 3 points au maximum, un seul par mesure : une évolution favorable, puis un point d'attention, puis les données, puis le reste par ampleur. */
export function pickPoints(cand: Point[]): Point[] {
  const byScore = (x: Point, y: Point) => y.score - x.score;
  const picked: Point[] = [];
  const take = (c?: Point) => {
    if (c && picked.length < 3 && !picked.some((p) => p.metric === c.metric)) picked.push(c);
  };
  take(cand.filter((c) => c.kind === 'fav').sort(byScore)[0]);
  take(cand.filter((c) => c.kind === 'att').sort(byScore)[0]);
  take(cand.filter((c) => c.kind === 'data')[0]);
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
  verdictLabel: string;
  sentence: string;
};

export type BeforeAfterResult =
  | { status: 'no_plan' }
  | { status: 'ok'; shareDate: string; version: number; days: number; subtitle: string; rows: BeforeAfterRow[] };

/** « Pas » : total du jour, arrondi à la dizaine (règle 4 de « Avant et depuis »). */
function baValue(metric: Metric, v: number): string {
  return metric === 'steps' ? fmtValue('steps', Math.round(v / 10) * 10) : fmtValue(metric, v);
}

function baSentence(w: Who, metric: Metric, d: number, counts: boolean, same: boolean): string {
  if (counts) {
    const gap = fmtGap(metric, d);
    if (metric === 'sleep') return `${w.Subj} dort ${gap}${d > 0 ? ' de plus' : ' de moins'} par nuit.`;
    if (metric === 'hrv') return `Sa VFC la nuit est ${d > 0 ? 'plus haute' : 'plus basse'} de ${gap}.`;
    if (metric === 'hr') return `Son cœur bat ${gap}${d > 0 ? ' plus vite' : ' moins vite'} la nuit.`;
    return `${w.Subj} fait ${gap}${d > 0 ? ' de plus' : ' de moins'} par jour.`;
  }
  if (same) return 'Comme avant.';
  return `${d > 0 ? 'Un peu plus' : 'Un peu moins'}, dans ses variations habituelles.`;
}

export function beforeAfter(input: InsightsInput, series: Series): BeforeAfterResult {
  const shares = input.planShares;
  if (!shares.length) return { status: 'no_plan' };
  const w = who(input.firstName, input.gender);
  const share = shares[shares.length - 1];
  const { after, before } = sinceWindow(share.date, input.today);
  const rows = METRICS.map<BeforeAfterRow>((metric) => {
    const a = series.values(metric, after);
    const b = series.values(metric, before);
    const base: BeforeAfterRow = { metric, label: METRIC_SHORT[metric], status: 'not_enough', nightsBefore: b.length, nightsAfter: a.length, before: null, after: null, beforeText: null, afterText: null, verdict: null, verdictLabel: 'Pas assez de recul', sentence: '' };
    if (a.length < MIN_NIGHTS || b.length < MIN_NIGHTS) {
      return { ...base, sentence: `Pas encore assez de recul (${Math.min(a.length, b.length)} nuits sur ${MIN_NIGHTS}).` };
    }
    const ma = mean(a)!;
    const mb = mean(b)!;
    const d = ma - mb;
    const counts = Math.abs(d) >= sd(b)! * 0.5 && Math.abs(d) >= THRESHOLDS[metric];
    const good = d * BETTER[metric] > 0;
    const verdict = counts ? (good ? 'fav' : 'watch') : 'flat';
    return {
      ...base,
      status: 'ok',
      before: mb,
      after: ma,
      beforeText: baValue(metric, mb),
      afterText: baValue(metric, ma),
      verdict,
      verdictLabel: verdict === 'fav' ? 'Évolution favorable' : verdict === 'watch' ? 'À surveiller' : 'Peu de changement',
      sentence: baSentence(w, metric, d, counts, Math.abs(d) < 1e-9 || baValue(metric, ma) === baValue(metric, mb)),
    };
  });
  const sleep = rows[0];
  return {
    status: 'ok',
    shareDate: share.date,
    version: share.version,
    days: after.length,
    subtitle: `${after.length} jours de chaque côté · ${plural(sleep.nightsBefore, 'nuit mesurée', 'nuits mesurées')} avant, ${sleep.nightsAfter} depuis`,
    rows,
  };
}

// ─── Conseils suivis × mesures ─────────────────

export const HABIT_WINDOW = 14;
export const HABIT_MIN_SIDE = 4;

export type HabitRow = {
  itemId: string;
  label: string;
  done: number;
  counted: number;
  /** « 6 jours sur 10 » */
  doneLabel: string;
  /** Phrase de la colonne « Sur ses nuits ». */
  effect: string;
  /** Détail au survol. */
  how: string;
  metric: Metric | null;
  delta: number | null;
};

/** Seuls les items quotidiens ou « plusieurs fois par semaine » sont comparés (règle 2). */
export function habitEligible(freq: TrackFrequency): boolean {
  if (freq.mode === 'daily' || freq.unit === 'day') return true;
  return freq.unit === 'week' && freq.count >= 2;
}

export function habitsVsMeasures(input: InsightsInput, series: Series): { counted: number; window: string[]; rows: HabitRow[] } {
  const w = who(input.firstName, input.gender);
  const y = yesterdayOf(input.today);
  const window = dayRange(addDays(y, -(HABIT_WINDOW - 1)), y);
  const doneSet = new Set(input.logs.filter((l) => l.done).map((l) => `${l.itemId}|${l.date}`));
  // Jours comptés : au moins une coche ce jour-là, tous items confondus (règle 4).
  const anyTick = new Set(input.logs.filter((l) => l.done).map((l) => l.date));
  const counted = window.filter((d) => anyTick.has(d));
  const EFF: Record<Metric, (d: number) => string> = {
    sleep: (d) => `${w.Subj} dort ${fmtGap('sleep', d)}${d > 0 ? ' de plus' : ' de moins'} les nuits qui suivent`,
    hrv: (d) => `Sa VFC est plus ${d > 0 ? 'haute' : 'basse'} la nuit qui suit (${fmtSigned('hrv', d)})`,
    hr: (d) => `Son cœur est plus ${d < 0 ? 'calme' : 'rapide'} la nuit qui suit (${fmtSigned('hr', d)})`,
    steps: (d) => `${w.Subj} fait ${fmtGap('steps', d)}${d > 0 ? ' de plus' : ' de moins'} ces jours-là`,
  };

  const rows = input.items
    .filter((it) => habitEligible(it.freq))
    .map<HabitRow>((it) => {
      const done = counted.filter((d) => doneSet.has(`${it.id}|${d}`));
      const notDone = counted.filter((d) => !doneSet.has(`${it.id}|${d}`));
      // Jour J comparé à la nuit qui suit (réveil J+1) ; les pas, réservés aux items d'activité, au jour J (règles 3 et 7).
      const metrics: Metric[] = it.category === 'activite' ? [...NIGHT_METRICS, 'steps'] : [...NIGHT_METRICS];
      let best: { metric: Metric; d: number; r: number; my: number; mn: number; ny: number; nn: number } | null = null;
      let anyOk = false;
      let minSide = 99;
      for (const metric of metrics) {
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
      const effect = best
        ? `${EFF[best.metric](best.d)}.`
        : done.length === counted.length
          ? 'Fait tous les jours : rien à comparer.'
          : anyOk
            ? 'Pas de différence nette sur ses nuits.'
            : 'Pas encore assez de jours pour comparer.';
      const how = best
        ? `${fmtValue(best.metric, best.my)} les jours où ${w.subj} le fait (${best.ny} j), ${fmtValue(best.metric, best.mn)} les autres (${best.nn} j).`
        : anyOk
          ? 'Écart sous les seuils (20 min, 3 ms, 3 bpm).'
          : `Il faut au moins ${HABIT_MIN_SIDE} jours faits et ${HABIT_MIN_SIDE} non faits (actuellement ${minSide === 99 ? 0 : minSide}).`;
      return { itemId: it.id, label: it.label, done: done.length, counted: counted.length, doneLabel: `${done.length} jours sur ${counted.length}`, effect, how, metric: best?.metric ?? null, delta: best?.d ?? null };
    });
  return { counted: counted.length, window, rows };
}

// ─── Ressenti & cycle ─────────────────

/** Énergie notée sur 1 à 10 dans le journal : « basse » ≤ 4, « haute » ≥ 8 (2 et 4 sur 5 dans la maquette). */
export const ENERGY_LOW = 4;
export const ENERGY_HIGH = 8;
export const ENERGY_MAX = 10;

export type FeelDay = { day: string; energy: number | null; hrv: number | null; gap: boolean };
export type FeelGap = { date: string; text: string; sub: string };
export type PhaseRow = { phase: Phase; label: string; nights: string; cells: { metric: Metric; value: string; delta: string; strong: boolean }[] };

export const PHASE_LABEL: Record<Phase, string> = { m: 'Règles', f: 'Folliculaire', o: 'Ovulation', l: 'Lutéale' };

export function feelAndCycle(input: InsightsInput, series: Series) {
  const y = yesterdayOf(input.today);
  const ref = referenceDay(input);
  const hs = baseline(series, 'hrv', ref);
  const journal = new Map((input.journal ?? []).map((j) => [j.date, j]));
  const days14 = dayRange(addDays(y, -13), y);
  const isGap = (e: number | null, h: number | null) => {
    if (e === null || h === null || !hs || !hs.sd) return false;
    const z = (h - hs.mean) / hs.sd;
    return (e <= ENERGY_LOW && z > -0.75) || (e >= ENERGY_HIGH && z < -1);
  };
  const feel: FeelDay[] = days14.map((day) => {
    const e = journal.get(day)?.energy ?? null;
    const h = series.value('hrv', day);
    return { day, energy: e, hrv: h, gap: isGap(e, h) };
  });
  const gaps: FeelGap[] = [];
  for (const f of feel) {
    const note = journal.get(f.day)?.note?.trim();
    if (f.gap) {
      gaps.push({
        date: shortDate(f.day),
        text: f.energy! <= ENERGY_LOW
          ? `Énergie notée basse (${f.energy} / ${ENERGY_MAX}), alors que la VFC de la nuit est dans sa plage (${f.hrv} ms).`
          : `Énergie notée haute (${f.energy} / ${ENERGY_MAX}), alors que la VFC de la nuit est sous sa plage (${f.hrv} ms).`,
        sub: note ? `Sa note : « ${note} »` : 'Pas de note ce jour-là.',
      });
    } else if (f.energy === null && f.hrv !== null) {
      const sl = series.value('sleep', f.day);
      gaps.push({
        date: shortDate(f.day),
        text: `Rien noté dans le journal, mais la nuit a été mesurée : ${sl !== null ? `${fmtDuration(sl)}, ` : ''}VFC ${f.hrv} ms.`,
        sub: 'À demander : que s’est-il passé ce jour-là ?',
      });
    }
  }
  if (!gaps.length) gaps.push({ date: '—', text: 'Ressenti et mesures vont dans le même sens sur ces 14 jours.', sub: '' });

  let phaseRows: PhaseRow[] | null = null;
  if (input.phases && Object.keys(input.phases).length) {
    const days28 = dayRange(addDays(y, -27), y);
    phaseRows = (['m', 'f', 'o', 'l'] as Phase[]).map((ph) => {
      const idx = days28.filter((d) => input.phases![d] === ph && series.value('sleep', d) !== null);
      return {
        phase: ph,
        label: PHASE_LABEL[ph],
        nights: plural(idx.length, 'nuit'),
        cells: (['sleep', 'hrv', 'hr'] as Metric[]).map((metric) => {
          const base = baseline(series, metric, ref);
          if (idx.length < 3 || !base) return { metric, value: '—', delta: 'pas assez de nuits', strong: false };
          const v = mean(series.values(metric, idx));
          if (v === null) return { metric, value: '—', delta: 'pas assez de nuits', strong: false };
          const d = v - base.mean;
          return { metric, value: fmtValue(metric, v), delta: Math.abs(d) < base.sd * 0.15 ? 'comme sa moyenne' : `${fmtSigned(metric, d)} vs sa moyenne`, strong: Math.abs(d) > base.sd * 0.5 };
        }),
      };
    });
  }
  return { feel, hrvBand: hs ? { lo: hs.mean - hs.sd, hi: hs.mean + hs.sd, label: `${fmtValue('hrv', hs.mean - hs.sd)} à ${fmtValue('hrv', hs.mean + hs.sd)}` } : null, gaps, phaseRows };
}

/** Nuits portées sur les 28 dernières. */
export function wornNights(series: Series, today: string): number {
  const y = yesterdayOf(today);
  return dayRange(addDays(y, -27), y).filter((d) => !series.unworn(d)).length;
}
