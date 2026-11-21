// « Mes nuits » côté patient : trois thèmes lisibles, calculés depuis les insights du praticien
// mais filtrés : des valeurs, l'habituel, un écart en mots. Module pur.
import type { Insights } from './insights';
import type { Metric } from './insights/series';

export type PatientTheme = {
  key: 'sleep' | 'recovery' | 'activity';
  title: string;
  /** Valeur mise en avant (dernière nuit / veille). */
  value: string;
  usual: string;
  /** Une phrase, sans jugement : « 45 min de moins que d'habitude ». */
  note: string;
  tone: 'good' | 'watch' | 'flat';
  /** Seconde valeur du thème (récupération : FC de nuit). */
  secondary?: { label: string; value: string; usual: string };
};

export type PatientOverview = {
  enabled: boolean;
  themes: PatientTheme[];
  rhythm: { bedtime: string; wake: string | null; regular: number; known: number } | null;
  recap: { text: string; sentAt: string; from: string; to: string } | null;
  lastNightDay: string | null;
};

const noteOf = (delta: string): string => {
  if (!delta) return 'Pas encore d’habituel pour comparer.';
  if (delta.startsWith('=')) return 'Comme d’habitude.';
  return delta.replace(/^[▲▼] /, '').replace(/^(.)/, (c) => c.toUpperCase()) + ' que d’habitude.';
};

export function patientThemes(ins: Insights): PatientTheme[] {
  const n = ins.lastNight;
  const tile = (m: Metric) => (n.status === 'ok' ? n.tiles.find((t) => t.metric === m) ?? null : null);
  const sleep = tile('sleep');
  const hrv = tile('hrv');
  const hr = tile('hr');
  const steps = tile('steps');
  const none = { value: '—', usual: '—', note: 'Pas encore de nuit mesurée.', tone: 'flat' as const };
  return [
    {
      key: 'sleep',
      title: 'Sommeil',
      ...(sleep ? { value: sleep.value, usual: sleep.usual, note: noteOf(sleep.delta), tone: sleep.tone } : none),
    },
    {
      key: 'recovery',
      title: 'Récupération',
      ...(hrv ? { value: hrv.value, usual: hrv.usual, note: noteOf(hrv.delta), tone: hrv.tone } : none),
      ...(hr ? { secondary: { label: 'Cœur la nuit', value: hr.value, usual: hr.usual } } : {}),
    },
    {
      key: 'activity',
      title: 'Activité',
      ...(steps ? { value: steps.value, usual: steps.usual, note: noteOf(steps.delta), tone: steps.tone } : { ...none, note: 'Pas encore de journée mesurée.' }),
    },
  ];
}
