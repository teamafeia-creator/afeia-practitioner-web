// lib/wearables/insights/autocheck.ts
// Items de la checklist cochés par l'objet (règles 9 à 12 de « Conseils suivis × mesures ») :
// - Activité (catégorie activité) : coché si l'objet mesure au moins 30 min de temps actif dans
//   la journée, ou la durée écrite dans l'item (« 20 min »).
// - Heure de coucher : coché si l'endormissement mesuré a lieu au plus tard 1 h après l'heure
//   écrite dans l'item (« écrans coupés à 22 h 30 » → endormie avant 23 h 30). Sans heure, non éligible.
// - Désactivé par défaut, activé item par item par le praticien.
// - L'objet ne remplace jamais une saisie du consultant ; s'il ne mesure rien, l'item reste à cocher.

export type AutoRule = { kind: 'activity'; minutes: number } | { kind: 'bedtime'; minutes: number };

const BEDTIME_WORDS = /(coucher|couché|écran|ecran|lit\b|dormir|endormi|extinction|lumière|lumiere|soir)/i;

/** Heure écrite dans le texte (« 22 h 30 », « 22h », « 22:30 »), en minutes depuis minuit. */
export function timeInText(text: string): number | null {
  const m = text.match(/\b([01]?\d|2[0-3])\s*(?:h|:)\s*([0-5]\d)?\b/i);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2] ?? 0);
}

/** Durée écrite dans le texte (« 30 min », « 1 h »), en minutes. */
export function durationInText(text: string): number | null {
  const min = text.match(/(\d+)\s*(?:min|minutes)\b/i);
  if (min) return Number(min[1]);
  const h = text.match(/(\d+)\s*(?:h|heures?)\b(?!\s*\d)/i);
  return h ? Number(h[1]) * 60 : null;
}

export function autoRuleFor(item: { label: string; category: string }): AutoRule | null {
  if (item.category === 'activite') return { kind: 'activity', minutes: durationInText(item.label) ?? 30 };
  const t = timeInText(item.label);
  if (t !== null && BEDTIME_WORDS.test(item.label)) return { kind: 'bedtime', minutes: t };
  return null;
}

/** Texte de la maquette, au survol de l'interrupteur. `subj` : « elle », « il » ou le prénom. */
export function describeAutoRule(rule: AutoRule, subj: string): string {
  if (rule.kind === 'activity') return `Coché si l’objet mesure au moins ${rule.minutes} min de temps actif dans la journée`;
  const limit = rule.minutes + 60;
  const hh = Math.floor(limit / 60) % 24;
  const mm = limit % 60;
  return `Coché si ${subj} s’endort au plus tard 1 h après l’heure écrite (avant ${hh} h${mm ? ` ${String(mm).padStart(2, '0')}` : ''})`;
}

/**
 * Décision pour un jour J. Données de l'objet :
 * - activeMin : temps actif du jour J (minutes), null si non mesuré ;
 * - sleepStartMin : endormissement de la nuit qui suit J, en minutes depuis minuit du jour J
 *   (ex. 23 h 10 → 1390 ; 0 h 30 le lendemain → 1470), null si non mesuré.
 * Renvoie true (coché), false (non fait) ou null (rien mesuré : reste à cocher à la main).
 */
export function autoDecision(rule: AutoRule, data: { activeMin: number | null; sleepStartMin: number | null }): boolean | null {
  if (rule.kind === 'activity') return data.activeMin === null ? null : data.activeMin >= rule.minutes;
  if (data.sleepStartMin === null) return null;
  // Un coucher écrit avant midi (« 0 h 30 ») se lit le lendemain.
  const target = rule.minutes < 12 * 60 ? rule.minutes + 24 * 60 : rule.minutes;
  return data.sleepStartMin <= target + 60;
}

/** Minutes depuis minuit du jour `day` (Europe/Paris) pour un instant. */
export function minutesSince(day: string, instant: string, timeZone = 'Europe/Paris'): number {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(instant));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '0';
  const localDay = `${get('year')}-${get('month')}-${get('day')}`;
  const offsetDays = Math.round((Date.parse(`${localDay}T00:00:00Z`) - Date.parse(`${day}T00:00:00Z`)) / 86_400_000);
  return offsetDays * 1440 + Number(get('hour')) * 60 + Number(get('minute'));
}
