// lib/wearables/insights/recap.ts
// Récap envoyé au consultant, repris de la maquette (fenêtre « Récap ») et des règles du fil
// « Défini dès à présent les règles … pour le récap » :
// 1. Période : se termine hier. 1 jour, 7, 14 ou 28 jours selon la fréquence.
// 2. Référence glissante : les 28 nuits qui précèdent la période.
// 3. Au moins 60 % de nuits mesurées (5 sur 7, 9 sur 14, 17 sur 28, la nuit d'hier pour « chaque jour ») ;
//    sinon pas de récap : un simple rappel de porter l'objet est proposé, à valider.
// 4. Points possibles (un seul par mesure) ; rappel « porter l'objet » si au moins 30 % des nuits
//    manquent, jamais coché d'office.
// 5. 3 points cochés d'office au maximum, les plus marqués par rapport à la variation habituelle.
// 6. Aucun chiffre, aucune baisse, aucun terme médical, aucune comparaison.
// 7. Rien de positif : aucun brouillon.
// 8. Phrases fixes, deux variantes par point ; la variante de la fois précédente n'est pas reprise.
import { plannedDays } from '../../observance-tracking';
import type { InsightItem, InsightLog } from './engine';
import { Series, THRESHOLDS, addDays, dayRange, fmtGap, mean, plural, sd, shortDate, type Metric } from './series';
import type { WearableSummaryDay } from '../summary';

export type RecapFrequency = '1d' | '1w' | '2w' | '1m';

/** Tableau PER de la maquette. */
export const RECAP_PERIOD: Record<RecapFrequency, { days: number; title: string; within: string; phone: string; hero: string; bye: string; queue: string }> = {
  '1d': { days: 1, title: 'Récap du jour', within: 'aujourd’hui', phone: 'Votre journée', hero: 'Journée du', bye: 'Belle journée', queue: 'du jour' },
  '1w': { days: 7, title: 'Récap de la semaine', within: 'cette semaine', phone: 'Votre semaine', hero: 'Semaine du', bye: 'Belle semaine', queue: 'de la semaine' },
  '2w': { days: 14, title: 'Récap des deux dernières semaines', within: 'ces deux dernières semaines', phone: 'Vos deux semaines', hero: 'Deux semaines, du', bye: 'Bonne continuation', queue: 'des deux dernières semaines' },
  '1m': { days: 28, title: 'Récap du mois', within: 'ce mois-ci', phone: 'Votre mois', hero: 'Mois du', bye: 'Bonne continuation', queue: 'du mois' },
};

export type RecapPointId = 'sleepLong' | 'sleepReg' | 'move' | 'calm' | 'heart' | 'check' | 'wear';

export const RECAP_LABEL: Record<RecapPointId, string> = {
  sleepLong: 'Sommeil plus long',
  sleepReg: 'Sommeil plus régulier',
  move: 'Plus de mouvement',
  calm: 'Meilleure récupération la nuit',
  heart: 'Cœur plus calme la nuit',
  check: 'Checklist bien suivie',
  wear: 'Penser à porter l’objet la nuit',
};

/**
 * Deux variantes par point. La première est celle de la maquette, mot pour mot.
 * La seconde n'existe pas dans la maquette (une seule variante y était montrée) : à valider.
 * `{in}` = « cette semaine », « aujourd’hui »…
 */
export const RECAP_LINES: Record<RecapPointId, [string, string]> = {
  sleepLong: ['Vos nuits sont plus longues {in} : continuez à vous accorder ce temps de repos.', 'Vous dormez davantage {in} : ce temps de repos vous fait du bien, gardez-le.'],
  sleepReg: ['Votre sommeil est plus régulier {in} : gardez ce rythme le soir, il vous réussit.', 'Vos nuits gardent un bon rythme {in} : continuez ainsi le soir.'],
  move: ['Vous avez bougé davantage {in}, bravo.', 'Belle dose de mouvement {in} : continuez sur cette lancée.'],
  calm: ['Votre corps récupère mieux la nuit : vos rituels du soir portent leurs fruits.', 'Vos nuits sont plus réparatrices : vos rituels du soir vous réussissent.'],
  heart: ['Votre cœur est plus calme la nuit, signe que vous récupérez bien.', 'Vos nuits sont plus apaisées, signe que vous récupérez bien.'],
  check: ['Vous avez bien suivi vos conseils {in} : bravo pour votre régularité.', 'Belle régularité dans vos conseils {in}, continuez comme ça.'],
  wear: ['Pensez à garder votre objet connecté la nuit : cela m’aide à mieux vous accompagner.', 'N’oubliez pas de porter votre objet connecté la nuit : il m’aide à mieux suivre vos progrès.'],
};

export type RecapOption = { id: RecapPointId; label: string; why: string; score: number; checked: boolean };

export type RecapResult = {
  frequency: RecapFrequency;
  period: { from: string; to: string; days: number };
  status: 'ok' | 'not_enough' | 'nothing';
  nightsMeasured: number;
  options: RecapOption[];
  /** Texte de l'encart quand aucun point positif n'est proposé. */
  noneText: string;
};

export type RecapInput = { days: WearableSummaryDay[]; today: string; items: InsightItem[]; logs: InsightLog[] };

export function recapPeriod(today: string, frequency: RecapFrequency) {
  const n = RECAP_PERIOD[frequency].days;
  const to = addDays(today, -1);
  return { from: addDays(to, -(n - 1)), to, days: n };
}

/** « Semaine du 27 oct. au 2 nov. », « Journée du 2 nov. » */
export function recapHeroPeriod(frequency: RecapFrequency, period: { from: string; to: string }): string {
  const p = RECAP_PERIOD[frequency];
  return p.days === 1 ? `${p.hero} ${shortDate(period.to)}` : `${p.hero} ${shortDate(period.from)} au ${shortDate(period.to)}`;
}

/** « Votre semaine · 27 oct. – 2 nov. » */
export function recapPhonePeriod(frequency: RecapFrequency, period: { from: string; to: string }): string {
  const p = RECAP_PERIOD[frequency];
  return p.days === 1 ? `${p.phone} · ${shortDate(period.to)}` : `${p.phone} · ${shortDate(period.from)} – ${shortDate(period.to)}`;
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
  const P = RECAP_PERIOD[frequency];
  const days = dayRange(period.from, period.to);
  const refDays = dayRange(addDays(period.from, -28), addDays(period.from, -1));
  const worn = days.filter((d) => series.nightValid(d)).length;
  const enough = worn >= Math.ceil(period.days * 0.6);
  const missing = period.days - worn;

  const ref = (m: Metric) => {
    const xs = series.values(m, refDays);
    return xs.length ? { mean: mean(xs)!, sd: sd(xs)! || 1 } : null;
  };
  const cand: Omit<RecapOption, 'checked'>[] = [];

  if (enough) {
    // a / b. Sommeil plus long, sinon plus régulier.
    const sl = ref('sleep');
    const slP = series.values('sleep', days);
    if (sl && slP.length) {
      const d = mean(slP)! - sl.mean;
      const inOrAbove = slP.filter((v) => v >= sl.mean - sl.sd).length;
      if (d >= THRESHOLDS.sleep) cand.push({ id: 'sleepLong', label: RECAP_LABEL.sleepLong, why: `en moyenne ${fmtGap('sleep', d)} de plus que son habituel`, score: d / sl.sd });
      else if (inOrAbove / slP.length >= 0.8) cand.push({ id: 'sleepReg', label: RECAP_LABEL.sleepReg, why: `${inOrAbove} nuits sur ${slP.length} dans son habituel ou au-dessus`, score: 0.5 });
    }
    // c. Plus de mouvement.
    const st = ref('steps');
    const stP = series.values('steps', days);
    if (st && stP.length) {
      const d = mean(stP)! - st.mean;
      const above = stP.filter((v) => v > st.mean).length;
      if (d >= THRESHOLDS.steps || above / stP.length >= 0.6) {
        cand.push({
          id: 'move',
          label: RECAP_LABEL.move,
          why: d >= THRESHOLDS.steps ? `${fmtGap('steps', d)} de plus par jour que son habituel` : `${above} jours sur ${stP.length} au-dessus de sa moyenne`,
          score: d / st.sd,
        });
      }
    }
    // d. Meilleure récupération.
    const hv = ref('hrv');
    const hvP = series.values('hrv', days);
    if (hv && hvP.length) {
      const d = mean(hvP)! - hv.mean;
      if (d >= THRESHOLDS.hrv) cand.push({ id: 'calm', label: RECAP_LABEL.calm, why: `VFC ${fmtGap('hrv', d)} au-dessus de son habituel`, score: d / hv.sd });
    }
    // e. Cœur plus calme la nuit.
    const hr = ref('hr');
    const hrP = series.values('hr', days);
    if (hr && hrP.length) {
      const d = mean(hrP)! - hr.mean;
      if (d <= -THRESHOLDS.hr) cand.push({ id: 'heart', label: RECAP_LABEL.heart, why: `FC de la nuit ${fmtGap('hr', d)} sous son habituel`, score: -d / hr.sd });
    }
    // f. Checklist bien suivie : au moins 70 %, ou 15 points de plus que la période précédente.
    const rate = checklistRate(input.items, input.logs, days);
    const prev = checklistRate(input.items, input.logs, dayRange(addDays(period.from, -period.days), addDays(period.from, -1)));
    if (rate !== null && (rate >= 0.7 || (prev !== null && rate - prev >= 0.15))) {
      cand.push({ id: 'check', label: RECAP_LABEL.check, why: `${Math.round(rate * 100)} % des conseils cochés`, score: 0.4 });
    }
  }

  cand.sort((a, b) => b.score - a.score);
  const top = cand.slice(0, 3).map((c) => c.id);
  const options: RecapOption[] = cand.map((c) => ({ ...c, checked: top.includes(c.id) }));
  // Rappel « porter l'objet » : jamais coché d'office.
  if (missing >= Math.ceil(period.days * 0.3) || !enough) {
    options.push({ id: 'wear', label: RECAP_LABEL.wear, why: `${plural(missing, 'nuit non portée', 'nuits non portées')} ${P.within}`, score: -1, checked: false });
  }
  return {
    frequency,
    period,
    status: !enough ? 'not_enough' : cand.length ? 'ok' : 'nothing',
    nightsMeasured: worn,
    options,
    noneText: enough
      ? 'Pas de récap cette fois : rien de nouveau à encourager. Vous pouvez écrire un message libre.'
      : `Pas assez de nuits mesurées pour un récap (${worn} sur ${period.days}). Un rappel de porter l’objet vous est proposé.`,
  };
}

/** Variante à utiliser : jamais celle de la fois précédente. */
export function pickVariant(id: RecapPointId, lastVariants: Partial<Record<RecapPointId, 0 | 1>> = {}): 0 | 1 {
  return lastVariants[id] === 0 ? 1 : 0;
}

/** « Bonjour Amina,\n\n…\n\nBelle semaine,\nClaire » — points séparés par une ligne vide, comme la maquette. */
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
  const text = `Bonjour ${params.firstName},\n\n${lines.join('\n\n')}\n\n${p.bye},\n${params.practitionerFirstName}`;
  return { text, variants };
}
