// lib/wearables/summary.ts
// Lecture agrégée des données d'objets connectés pour les écrans (POL-15).
// Les écrans ne lisent jamais les tables brutes ni normalisées directement : ils appellent
// getWearableSummary, qui s'appuie sur la fonction SQL wearable_daily_summary.
//
// Exécutée avec le client Supabase de la SESSION (jamais service_role) : la RLS s'applique.
// Un praticien sans lien avec le patient reçoit une liste vide.
import type { SupabaseClient } from '@supabase/supabase-js';

export type WearableSummaryDay = {
  /** Jour civil Europe/Paris (YYYY-MM-DD). La nuit est rattachée au jour du réveil. */
  date: string;
  sleepMin: number | null;
  hrvMs: number | null;
  nightHrBpm: number | null;
  steps: number | null;
};

export type WearableMetricAverages = {
  sleepMin: number | null;
  hrvMs: number | null;
  nightHrBpm: number | null;
  steps: number | null;
};

export type WearableSummary = {
  /** Un élément par jour, du plus ancien au plus récent ; null = pas de donnée (trou). */
  days: WearableSummaryDay[];
  /**
   * Jour en cours (dernier jour de la série, aujourd'hui en Europe/Paris) : journée incomplète.
   * Ses pas sont exclus des moyennes et de la comparaison.
   */
  partialDay: string | null;
  averages: {
    /** Moyenne des jours renseignés de la période affichée (pas : jour en cours exclu). */
    current: WearableMetricAverages;
    /** Même calcul sur la période précédente de même longueur. */
    previous: WearableMetricAverages;
  };
};

export type WearableSummaryOptions = {
  days: 7 | 30;
  /** Client Supabase de la session ; par défaut celui du navigateur (lib/supabase). */
  client?: SupabaseClient;
  /** Dernier jour inclus (YYYY-MM-DD) ; par défaut aujourd'hui en Europe/Paris (calculé en base). */
  today?: string;
};

type Row = {
  day: string;
  sleep_min: number | null;
  hrv_ms: number | null;
  night_hr_bpm: number | null;
  steps: number | null;
};

const METRICS = ['sleepMin', 'hrvMs', 'nightHrBpm', 'steps'] as const;

const EMPTY_AVERAGES: WearableMetricAverages = { sleepMin: null, hrvMs: null, nightHrBpm: null, steps: null };

/** Moyenne des valeurs renseignées (les trous sont ignorés, pas comptés comme 0), à 0,1 près. */
export function averageOf(values: (number | null)[]): number | null {
  const present = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  if (!present.length) return null;
  return Math.round((present.reduce((a, b) => a + b, 0) / present.length) * 10) / 10;
}

/** Métriques cumulées sur la journée : la journée en cours est incomplète. */
export const CUMULATIVE_METRICS: readonly (typeof METRICS)[number][] = ['steps'];

function averages(days: WearableSummaryDay[], partialDay: string | null = null): WearableMetricAverages {
  return Object.fromEntries(
    METRICS.map((m) => [
      m,
      averageOf(days.filter((d) => !(CUMULATIVE_METRICS.includes(m) && d.date === partialDay)).map((d) => d[m])),
    ])
  ) as WearableMetricAverages;
}

const toDay = (r: Row): WearableSummaryDay => ({
  date: r.day,
  sleepMin: r.sleep_min,
  hrvMs: r.hrv_ms,
  nightHrBpm: r.night_hr_bpm,
  steps: r.steps,
});

export class WearableSummaryError extends Error {
  constructor(cause: { message?: string; code?: string }) {
    super(`Lecture des données de l'objet connecté impossible${cause.code ? ` (${cause.code})` : ''}`);
    this.name = 'WearableSummaryError';
  }
}

export async function getWearableSummary(patientId: string, options: WearableSummaryOptions): Promise<WearableSummary> {
  const n = options.days;
  const client = options.client ?? (await import('@/lib/supabase')).supabase;

  // Période affichée + période précédente en une requête.
  const { data, error } = await client.rpc('wearable_daily_summary', {
    p_consultant_id: patientId,
    p_days: n * 2,
    ...(options.today ? { p_today: options.today } : {}),
  });
  if (error) throw new WearableSummaryError(error);

  const rows = ((data ?? []) as Row[]).slice().sort((a, b) => a.day.localeCompare(b.day));
  if (!rows.length) {
    // Pas d'accès (RLS) : liste vide, pas une série de trous.
    return { days: [], partialDay: null, averages: { current: { ...EMPTY_AVERAGES }, previous: { ...EMPTY_AVERAGES } } };
  }

  const all = rows.map(toDay);
  const current = all.slice(-n);
  const previous = all.slice(0, Math.max(0, all.length - n));
  // La série se termine toujours par aujourd'hui (Europe/Paris, ou options.today) : jour en cours.
  const partialDay = current[current.length - 1]?.date ?? null;
  return { days: current, partialDay, averages: { current: averages(current, partialDay), previous: averages(previous) } };
}
