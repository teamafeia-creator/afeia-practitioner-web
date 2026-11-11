// lib/wearables/insights/signals.ts
// Page « Objets connectés » (menu Suivi) : un signal par consultant, repris de la maquette ObjetTri.
// « Un signal apparaît quand une mesure sort de la plage habituelle du consultant au moins 4 nuits
//   sur 7, ou quand l’objet n’a pas synchronisé depuis 5 jours. Chaque consultant est comparé à
//   lui-même, jamais à une norme. »
import { BETTER, METRICS, METRIC_SHORT, Series, addDays, dayRange, diffDays, shortDate, type Metric } from './series';
import { baseline, beforeAfter, referenceDay, type InsightsInput } from './engine';

export type SignalKind = 'gap' | 'wear' | 'good' | 'ok';

export const SIGNAL_LABEL: Record<SignalKind, string> = { gap: 'Écart durable', wear: 'Objet non porté', good: 'Bonne évolution', ok: 'Rien à signaler' };
export const SIGNAL_CTA: Record<SignalKind, string> = { gap: 'Prendre des nouvelles', wear: 'Rappeler de porter l’objet', good: 'Féliciter', ok: '' };

export type Signal = {
  kind: SignalKind;
  /** Clé stable pour « Vu, rien à faire » : type, mesure et semaine. */
  key: string;
  metric: Metric;
  text: string;
  meta: string;
  /** 14 dernières nuits de la mesure concernée, avec sa plage habituelle. */
  values: (number | null)[];
  band: [number, number] | null;
  better: 1 | -1;
};

/** Brouillons de message (maquette), sans chiffre ni terme médical. */
export function signalMessage(kind: SignalKind, firstName: string, practitioner: string): string {
  const end = `\n\nBien à vous,\n${practitioner}`;
  if (kind === 'gap')
    return `Bonjour ${firstName},\n\nJe pense à vous cette semaine : comment vous sentez-vous en ce moment, et comment se passent vos nuits ?\n\nDites-moi en quelques mots, on pourra ajuster vos rituels du soir si besoin.${end}`;
  if (kind === 'wear')
    return `Bonjour ${firstName},\n\nJe n’ai plus de mesures de votre objet connecté depuis quelques jours. Pensez à le recharger et à le garder la nuit : cela m’aide à suivre vos progrès.\n\nSi quelque chose vous gêne pour le porter, dites-le-moi.${end}`;
  if (kind === 'good')
    return `Bonjour ${firstName},\n\nBravo : vos efforts portent leurs fruits depuis la mise en place de vos conseils. Continuez ainsi !\n\nOn en reparle à notre prochaine séance.${end}`;
  return '';
}

function nextSessionText(next?: string | null) {
  return next ? `prochain rendez-vous le ${shortDate(next)}` : 'pas de rendez-vous prévu';
}

export function consultantSignal(input: InsightsInput & { lastJournalDate?: string | null }, lastSyncDay: string | null): Signal {
  const series = new Series(input.days, input.today);
  const y = addDays(input.today, -1);
  const last14 = dayRange(addDays(y, -13), y);
  const last7 = last14.slice(-7);
  const ref = referenceDay(input);
  const week = addDays(input.today, 1 - (new Date(`${input.today}T00:00:00Z`).getUTCDay() || 7));
  const make = (kind: SignalKind, metric: Metric, text: string, meta: string): Signal => {
    const base = baseline(series, metric, ref);
    return { kind, key: `${kind}:${metric}:${week}`, metric, text, meta, values: last14.map((d) => series.value(metric, d)), band: base ? [base.mean - base.sd, base.mean + base.sd] : null, better: BETTER[metric] };
  };

  // Objet non porté : pas de synchronisation depuis 5 jours.
  const lastMeasured = [...input.days].reverse().find((d) => d.sleepMin !== null || d.hrvMs !== null || d.steps !== null)?.date ?? null;
  const since = lastSyncDay ?? lastMeasured;
  if (!since || diffDays(input.today, since) >= 5) {
    const n = since ? diffDays(input.today, since) : null;
    return make('wear', 'sleep', n ? `Pas de synchronisation depuis ${n} jours.` : 'Aucune donnée reçue de l’objet pour l’instant.', `${lastMeasured ? `Dernière nuit mesurée le ${shortDate(lastMeasured)}` : 'Aucune nuit mesurée'} · ${nextSessionText(input.nextSessionDate)}`);
  }

  // Écart durable : une mesure hors de sa plage habituelle, dans le mauvais sens, au moins 4 nuits sur 7.
  let worst: { metric: Metric; n: number; side: 1 | -1 } | null = null;
  for (const metric of METRICS) {
    const base = baseline(series, metric, ref);
    if (!base) continue;
    const vals = series.values(metric, last7);
    const up = vals.filter((v) => v > base.mean + base.sd).length;
    const down = vals.filter((v) => v < base.mean - base.sd).length;
    const bad = BETTER[metric] > 0 ? down : up;
    if (bad >= 4 && (!worst || bad > worst.n)) worst = { metric, n: bad, side: BETTER[metric] > 0 ? -1 : 1 };
  }
  if (worst) {
    const journal = input.lastJournalDate && diffDays(input.today, input.lastJournalDate) > 3 ? `Rien noté dans le journal depuis le ${shortDate(input.lastJournalDate)}` : null;
    const phase = input.phases?.[y];
    const phaseTxt = phase ? `Phase ${{ m: 'des règles', f: 'folliculaire', o: 'd’ovulation', l: 'lutéale' }[phase]}` : null;
    return make(
      'gap',
      worst.metric,
      `${METRIC_SHORT[worst.metric]} ${worst.side < 0 ? 'sous' : 'au-dessus de'} sa plage habituelle ${worst.n} nuits sur les 7 dernières.`,
      [phaseTxt ?? journal, nextSessionText(input.nextSessionDate)].filter(Boolean).join(' · ')
    );
  }

  // Bonne évolution : une mesure en « Évolution favorable » depuis le dernier conseillancier.
  const ba = beforeAfter(input, series);
  if (ba.status === 'ok') {
    const fav = ba.rows.filter((r) => r.verdict === 'fav').sort((a, b) => Math.abs((b.after! - b.before!) / (b.before || 1)) - Math.abs((a.after! - a.before!) / (a.before || 1)))[0];
    if (fav) {
      return make('good', fav.metric, `${fav.sentence.replace(/\.$/, '')} depuis le conseillancier v${ba.version}.`, `Partagé le ${shortDate(ba.shareDate)} · ${nextSessionText(input.nextSessionDate)}`);
    }
  }

  const ago = diffDays(input.today, since);
  return make('ok', 'sleep', 'Toutes ses mesures sont dans ses plages habituelles.', `${ago === 0 ? 'Synchronisé ce matin' : ago === 1 ? 'Synchronisé hier' : `Synchronisé il y a ${ago} jours`} · ${nextSessionText(input.nextSessionDate)}`);
}
