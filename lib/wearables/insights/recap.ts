// lib/wearables/insights/recap.ts
// Récap envoyé au consultant : uniquement des encouragements, validés par le praticien.
//
// Règles (validées) :
// 1. Période : se termine hier. Chaque jour = la nuit et la journée d'hier ; semaine = 7 j ;
//    2 semaines = 14 j ; mois = 28 j.
// 2. Référence glissante : les 28 nuits qui précèdent la période.
// 3. Au moins 60 % de nuits mesurées, sinon pas de récap : un simple rappel de porter l'objet.
// 4. Points possibles, un seul par mesure (seuils ci-dessous ; « plus régulier » doit aussi faire mieux
//    que la référence, sinon il serait proposé presque à chaque fois) ; rappel « porter l'objet » si
//    au moins 30 % des nuits manquent, jamais coché d'office.
// 5. 3 points cochés d'office au maximum, les plus marqués par rapport à la variation habituelle.
// 6. Jamais de chiffre, de baisse, de terme médical ni de comparaison avec d'autres personnes.
// 7. Rien de positif : aucun brouillon.
// 8. Phrases fixes, deux variantes par point ; la variante utilisée la dernière fois n'est pas reprise.
import { plannedDays } from '../../observance-tracking';
import type { InsightItem, InsightLog } from './engine';
import { Series, THRESHOLDS, addDays, dayRange, mean, sd, type Metric } from './series';

export type RecapFrequency = '1d' | '1w' | '2w' | '1m';

export const RECAP_PERIOD: Record<RecapFrequency, { days: number; label: string; within: string; bye: string }> = {
  '1d': { days: 1, label: 'Récap du jour', within: 'hier', bye: 'Belle journée' },
  '1w': { days: 7, label: 'Récap de la semaine', within: 'cette semaine', bye: 'Belle semaine' },
  '2w': { days: 14, label: 'Récap des deux semaines', within: 'ces deux dernières semaines', bye: 'Bonne continuation' },
  '1m': { days: 28, label: 'Récap du mois', within: 'ce mois-ci', bye: 'Bonne continuation' },
};

export type RecapPointId = 'sleepLong' | 'sleepReg' | 'move' | 'hrv' | 'hr' | 'check' | 'wear';

export const RECAP_LABEL: Record<RecapPointId, string> = {
  sleepLong: 'Sommeil plus long',
  sleepReg: 'Sommeil plus régulier',
  move: 'Plus de mouvement',
  hrv: 'Meilleure récupération la nuit',
  hr: 'Cœur plus calme la nuit',
  check: 'Checklist bien suivie',
  wear: 'Penser à porter l’objet la nuit',
};

/** Deux variantes par point. `{in}` = « cette semaine », « hier »… */
export const RECAP_LINES: Record<RecapPointId, [string, string]> = {
  sleepLong: ['Vos nuits ont été plus longues {in} : continuez à vous accorder ce temps de repos.', 'Vous avez dormi davantage {in}, c’est une belle évolution.'],
  sleepReg: ['Votre sommeil a été plus régulier {in} : gardez ce rythme le soir, il vous réussit.', 'Vos nuits ont gardé un bon rythme {in}, bravo.'],
  move: ['Vous avez bougé davantage {in}, bravo.', 'Belle dose de mouvement {in} : continuez sur cette lancée.'],
  hrv: ['Votre corps a mieux récupéré la nuit {in} : vos rituels du soir portent leurs fruits.', 'Vos nuits ont été plus reposantes {in}, c’est encourageant.'],
  hr: ['Votre cœur a été plus calme la nuit {in}, signe que vous récupérez bien.', 'Vos nuits ont été plus apaisées {in}, continuez ainsi.'],
  check: ['Vous avez bien suivi vos conseils {in} : bravo pour votre régularité.', 'Belle régularité dans vos conseils {in}, continuez comme ça.'],
  wear: ['Pensez à garder votre objet connecté la nuit : cela m’aide à mieux vous accompagner.', 'N’oubliez pas de porter votre objet connecté la nuit, il me permet de mieux suivre vos progrès.'],
};

export type RecapOption = {
  id: RecapPointId;
  label: string;
  /** Pourquoi le point est proposé (pour le praticien uniquement, peut contenir des chiffres). */
  why: string;
  score: number;
  checked: boolean;
};

export type RecapResult = {
  frequency: RecapFrequency;
  period: { from: string; to: string; days: number };
  status: 'ok' | 'not_enough' | 'nothing';
  nightsMeasured: number;
  nightsNeeded: number;
  options: RecapOption[];
};

export type RecapInput = {
  days: import('../summary').WearableSummaryDay[];
  today: string;
  items: InsightItem[];
  logs: InsightLog[];
};

export function recapPeriod(today: string, frequency: RecapFrequency) {
  const n = RECAP_PERIOD[frequency].days;
  const to = addDays(today, -1);
  return { from: addDays(to, -(n - 1)), to, days: n };
}

/** Taux de suivi de la checklist sur des jours donnés (coches / jours prévus), plafonné à 1. */
export function checklistRate(items: InsightItem[], logs: InsightLog[], days: string[]): number | null {
  if (!items.length || !days.length) return null;
  const set = new Set(days);
  const ids = new Set(items.map((i) => i.id));
  const done = logs.filter((l) => l.done && set.has(l.date) && ids.has(l.itemId)).length;
  const planned = items.reduce((s, it) => s + plannedDays(it.freq, days.length), 0);
  return planned ? Math.min(1, done / planned) : null;
}

export function computeRecap(input: RecapInput, frequency: RecapFrequency): RecapResult {
  const series = new Series(input.days, input.today);
  const period = recapPeriod(input.today, frequency);
  const days = dayRange(period.from, period.to);
  const refDays = dayRange(addDays(period.from, -28), addDays(period.from, -1));
  const measured = days.filter((d) => series.nightValid(d)).length;
  const needed = Math.ceil(period.days * 0.6);
  const missing = period.days - measured;

  const wear: RecapOption = {
    id: 'wear',
    label: RECAP_LABEL.wear,
    why: `${missing} ${missing > 1 ? 'nuits non mesurées' : 'nuit non mesurée'} sur ${period.days}`,
    score: -1,
    checked: false,
  };

  if (measured < needed) {
    // Pas de récap : on propose seulement le rappel, à valider (jamais envoyé sans clic).
    return { frequency, period, status: 'not_enough', nightsMeasured: measured, nightsNeeded: needed, options: [{ ...wear, checked: true }] };
  }

  const ref = (m: Metric) => {
    const xs = series.values(m, refDays);
    return xs.length >= 7 ? { mean: mean(xs)!, sd: Math.max(sd(xs)!, 1e-6) } : null;
  };
  const cand: Omit<RecapOption, 'checked'>[] = [];

  // a / b. Sommeil plus long, sinon plus régulier.
  const sRef = ref('sleep');
  const sVals = series.values('sleep', days);
  if (sRef && sVals.length) {
    const d = mean(sVals)! - sRef.mean;
    const floor = sRef.mean - sRef.sd;
    const inOrAbove = sVals.filter((v) => v >= floor).length;
    const refVals = series.values('sleep', refDays);
    const refShare = refVals.filter((v) => v >= floor).length / refVals.length;
    // « Plus régulier » : au moins 80 % des nuits dans son habituel ou au-dessus, et mieux que sur la référence.
    if (d >= THRESHOLDS.sleep) cand.push({ id: 'sleepLong', label: RECAP_LABEL.sleepLong, why: `${Math.round(d)} min de plus par nuit que son habituel récent`, score: d / sRef.sd });
    else if (inOrAbove / sVals.length >= 0.8 && inOrAbove / sVals.length > refShare) cand.push({ id: 'sleepReg', label: RECAP_LABEL.sleepReg, why: `${inOrAbove} nuits sur ${sVals.length} dans son habituel ou au-dessus`, score: 0.5 });
  }
  // c. Plus de mouvement.
  const pRef = ref('steps');
  const pVals = series.values('steps', days);
  if (pRef && pVals.length) {
    const d = mean(pVals)! - pRef.mean;
    const above = pVals.filter((v) => v > pRef.mean).length;
    if (d >= THRESHOLDS.steps || above / pVals.length >= 0.6) {
      cand.push({
        id: 'move',
        label: RECAP_LABEL.move,
        why: d >= THRESHOLDS.steps ? `${Math.round(d / 10) * 10} pas de plus par jour que son habituel récent` : `${above} jours sur ${pVals.length} au-dessus de sa moyenne`,
        score: Math.max(d / pRef.sd, 0.3),
      });
    }
  }
  // d. Meilleure récupération.
  const vRef = ref('hrv');
  const vVals = series.values('hrv', days);
  if (vRef && vVals.length) {
    const d = mean(vVals)! - vRef.mean;
    if (d >= THRESHOLDS.hrv) cand.push({ id: 'hrv', label: RECAP_LABEL.hrv, why: `VFC ${Math.round(d)} ms au-dessus de son habituel récent`, score: d / vRef.sd });
  }
  // e. Cœur plus calme la nuit.
  const hRef = ref('hr');
  const hVals = series.values('hr', days);
  if (hRef && hVals.length) {
    const d = mean(hVals)! - hRef.mean;
    if (d <= -THRESHOLDS.hr) cand.push({ id: 'hr', label: RECAP_LABEL.hr, why: `FC de la nuit ${Math.round(-d)} bpm sous son habituel récent`, score: -d / hRef.sd });
  }
  // f. Checklist bien suivie : ≥ 70 %, ou +15 points par rapport à la période précédente.
  const rate = checklistRate(input.items, input.logs, days);
  const prev = checklistRate(input.items, input.logs, dayRange(addDays(period.from, -period.days), addDays(period.from, -1)));
  if (rate !== null && (rate >= 0.7 || (prev !== null && rate - prev >= 0.15))) {
    cand.push({ id: 'check', label: RECAP_LABEL.check, why: `${Math.round(rate * 100)} % de suivi${prev !== null ? ` (${Math.round(prev * 100)} % la période d’avant)` : ''}`, score: 0.4 });
  }

  cand.sort((a, b) => b.score - a.score);
  const options: RecapOption[] = cand.map((c, i) => ({ ...c, checked: i < 3 }));
  if (missing >= Math.ceil(period.days * 0.3)) options.push(wear);
  return { frequency, period, status: cand.length ? 'ok' : 'nothing', nightsMeasured: measured, nightsNeeded: needed, options };
}

/** Variante à utiliser : jamais celle de la fois précédente. */
export function pickVariant(id: RecapPointId, lastVariants: Partial<Record<RecapPointId, 0 | 1>> = {}): 0 | 1 {
  return lastVariants[id] === 0 ? 1 : 0;
}

export function buildRecapText(params: {
  firstName: string;
  practitionerFirstName: string;
  frequency: RecapFrequency;
  points: RecapPointId[];
  lastVariants?: Partial<Record<RecapPointId, 0 | 1>>;
}): { text: string; variants: Partial<Record<RecapPointId, 0 | 1>> } {
  const p = RECAP_PERIOD[params.frequency];
  const variants: Partial<Record<RecapPointId, 0 | 1>> = {};
  const lines = params.points.map((id) => {
    const v = pickVariant(id, params.lastVariants);
    variants[id] = v;
    return RECAP_LINES[id][v].replace('{in}', p.within);
  });
  const text = [`Bonjour ${params.firstName},`, '', ...lines, '', `${p.bye},`, params.practitionerFirstName].join('\n').trim();
  return { text, variants };
}
