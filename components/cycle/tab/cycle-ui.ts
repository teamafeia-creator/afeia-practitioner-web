import type { Phase4 } from '@/lib/cycle/engine';

/** Couleurs des phases (thème sombre, identiques à la maquette) : case du calendrier, pastille, bordure « estimé ». */
export const PHASE_UI: Record<Phase4, { label: string; bg: string; border: string; dot: string }> = {
  menstrual: { label: 'Règles', bg: '#3A2224', border: '#E57B7B', dot: '#E57B7B' },
  follicular: { label: 'Folliculaire', bg: '#1C2E2A', border: '#3E7D6D', dot: '#3E7D6D' },
  ovulation: { label: 'Ovulation', bg: '#33291A', border: '#D4A574', dot: '#D4A574' },
  luteal: { label: 'Lutéale', bg: '#2A2433', border: '#7E6A99', dot: '#7E6A99' },
};

export const FLOW_COLOR = '#E57B7B';
export const PAIN_COLOR = { light: '#D9B08C', strong: '#E8A87C', off: '#3A4252' };
/** Teinte « à surveiller » (rose) de la maquette. */
export const ALERT_UI = { fg: '#F0C2D8', bg: '#2A1E25', border: '#6B3A4E', pill: '#4A2E3A' };

const MONTHS_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const MONTHS_LONG = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const DOW_LONG = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

export function fmtShort(iso: string): string {
  const d = +iso.slice(8, 10);
  return `${d === 1 ? '1er' : d} ${MONTHS_SHORT[+iso.slice(5, 7) - 1]}`;
}

export function fmtLong(iso: string): string {
  const date = new Date(iso + 'T00:00:00Z');
  const d = date.getUTCDate();
  return `${DOW_LONG[date.getUTCDay()]} ${d === 1 ? '1er' : d} ${MONTHS_LONG[date.getUTCMonth()]}`;
}

export function fmtMonth(year: number, month0: number): string {
  return `${MONTHS_LONG[month0][0].toUpperCase()}${MONTHS_LONG[month0].slice(1)} ${year}`;
}

export function fmtDateTime(iso: string): string {
  return fmtShort(iso.slice(0, 10));
}

export const SYMPTOM_SHORT: Record<string, string> = {
  cramps: 'crampes',
  bloating: 'ballonnée',
  headache: 'migraine',
  breast_tenderness: 'seins',
  mood_swings: 'humeur',
  fatigue: 'fatigue',
  acne: 'acné',
  cravings: 'fringales',
  insomnia: 'sommeil',
  water_retention: 'rétention',
  back_pain: 'lombaires',
  nausea: 'nausée',
  libido_high: 'libido',
};

export const LEGEND_KEY = 'afeia:cycle:legende-ouverte';

/** « de Amina » → « d’Amina ». */
export function deName(name: string): string {
  return /^[aeiouyàâäéèêëîïôöùûüh]/i.test(name) ? `d’${name}` : `de ${name}`;
}
