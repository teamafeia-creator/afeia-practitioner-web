// Utilitaires de calcul de tendances pour la Revue Matinale
import type { JournalEntry, WearableSummary } from '../types';
import type { Trend, LastWeekStats, CircularStats } from './types';

// Seuil en pourcentage pour qualifier un changement de "significatif"
const TREND_THRESHOLD = 0.1;

export function getTrend(current: number, previous: number): Trend {
  if (previous === 0) return current > 0 ? 'up' : 'stable';
  const change = (current - previous) / Math.abs(previous);
  if (change > TREND_THRESHOLD) return 'up';
  if (change < -TREND_THRESHOLD) return 'down';
  return 'stable';
}

// Convertit le mood emoji en score numerique (1-5)
export function moodToScore(mood: string | undefined | null): number {
  switch (mood) {
    case '🙂': return 5;
    case '😐': return 3;
    case '🙁': return 1;
    default: return 0;
  }
}

// Convertit le niveau d'energie en score numerique (1-5)
export function energyToScore(energy: string | undefined | null): number {
  switch (energy) {
    case 'Élevé': return 5;
    case 'Eleve': return 5;
    case 'Moyen': return 3;
    case 'Bas': return 1;
    default: return 0;
  }
}

// Score d'adherence pour une entree journal (0-1, moyenne des 4 piliers)
export function getAdherenceScore(entry: JournalEntry): number {
  const pillars = [
    entry.adherence_hydratation,
    entry.adherence_respiration,
    entry.adherence_mouvement,
    entry.adherence_plantes,
  ];
  const trueCount = pillars.filter(Boolean).length;
  return trueCount / 4;
}

function isWithinDays(dateStr: string, daysAgo: number, daysEnd: number): boolean {
  const now = new Date();
  const date = new Date(dateStr);
  const start = new Date(now);
  start.setDate(start.getDate() - daysAgo);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setDate(end.getDate() - daysEnd);
  end.setHours(23, 59, 59, 999);
  return date >= start && date <= end;
}

function isWithinLastDays(dateStr: string, days: number): boolean {
  const now = new Date();
  const date = new Date(dateStr);
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days);
  cutoff.setHours(0, 0, 0, 0);
  return date >= cutoff;
}

export function calculateLastWeekStats(entries: JournalEntry[]): LastWeekStats {
  const last7 = entries.filter(e => isWithinLastDays(e.date, 7));
  const prev7 = entries.filter(e => isWithinDays(e.date, 14, 7));

  const avgAdherence = last7.length > 0
    ? last7.reduce((sum, e) => sum + getAdherenceScore(e), 0) / last7.length
    : 0;

  const avgMood = last7.filter(e => e.mood).length > 0
    ? last7.reduce((sum, e) => sum + moodToScore(e.mood), 0) / last7.filter(e => e.mood).length
    : 0;

  const avgEnergy = last7.filter(e => e.energy).length > 0
    ? last7.reduce((sum, e) => sum + energyToScore(e.energy), 0) / last7.filter(e => e.energy).length
    : 0;

  const prevAvgAdherence = prev7.length > 0
    ? prev7.reduce((sum, e) => sum + getAdherenceScore(e), 0) / prev7.length
    : 0;

  const prevAvgMood = prev7.filter(e => e.mood).length > 0
    ? prev7.reduce((sum, e) => sum + moodToScore(e.mood), 0) / prev7.filter(e => e.mood).length
    : 0;

  const prevAvgEnergy = prev7.filter(e => e.energy).length > 0
    ? prev7.reduce((sum, e) => sum + energyToScore(e.energy), 0) / prev7.filter(e => e.energy).length
    : 0;

  return {
    journalEntriesCount: last7.length,
    averageAdherence: avgAdherence,
    moodTrend: getTrend(avgMood, prevAvgMood),
    energyTrend: getTrend(avgEnergy, prevAvgEnergy),
    adherenceTrend: getTrend(avgAdherence, prevAvgAdherence),
  };
}

export function calculateCircularStats(
  summaries: WearableSummary[],
  insights: import('../types').WearableInsight[]
): CircularStats | undefined {
  const last7 = summaries.filter(s => isWithinLastDays(s.date, 7));
  const prev7 = summaries.filter(s => isWithinDays(s.date, 14, 7));

  if (last7.length === 0) return undefined;

  const sleepEntries = last7.filter(s => s.sleep_duration != null);
  const avgSleep = sleepEntries.length > 0
    ? sleepEntries.reduce((sum, s) => sum + (s.sleep_duration ?? 0), 0) / sleepEntries.length
    : 0;

  const hrvEntries = last7.filter(s => s.hrv_avg != null);
  const avgHRV = hrvEntries.length > 0
    ? hrvEntries.reduce((sum, s) => sum + (s.hrv_avg ?? 0), 0) / hrvEntries.length
    : 0;

  const prevSleepEntries = prev7.filter(s => s.sleep_duration != null);
  const prevAvgSleep = prevSleepEntries.length > 0
    ? prevSleepEntries.reduce((sum, s) => sum + (s.sleep_duration ?? 0), 0) / prevSleepEntries.length
    : 0;

  const prevHrvEntries = prev7.filter(s => s.hrv_avg != null);
  const prevAvgHRV = prevHrvEntries.length > 0
    ? prevHrvEntries.reduce((sum, s) => sum + (s.hrv_avg ?? 0), 0) / prevHrvEntries.length
    : 0;

  // Filtrer les insights recents (7 derniers jours)
  const recentInsights = insights.filter(i => isWithinLastDays(i.created_at, 7));

  return {
    averageSleep: avgSleep,
    sleepTrend: getTrend(avgSleep, prevAvgSleep),
    averageHRV: avgHRV,
    hrvTrend: getTrend(avgHRV, prevAvgHRV),
    insights: recentInsights,
  };
}

// Nombre de jours depuis une date ISO
export function daysSince(dateStr: string | null | undefined): number {
  if (!dateStr) return Infinity;
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// Nombre de jours avec adherence a 0% sur les 7 derniers jours
export function getDaysWithZeroAdherenceLastWeek(entries: JournalEntry[]): number {
  const last7 = entries.filter(e => isWithinLastDays(e.date, 7));
  return last7.filter(e => getAdherenceScore(e) === 0).length;
}

// Nombre de jours avec energie "basse" sur les 7 derniers jours
export function getLowEnergyDaysLastWeek(entries: JournalEntry[]): number {
  const last7 = entries.filter(e => isWithinLastDays(e.date, 7));
  return last7.filter(e => e.energy === 'Bas').length;
}

// Nombre de jours avec humeur "difficile" sur les 7 derniers jours
export function getLowMoodDaysLastWeek(entries: JournalEntry[]): number {
  const last7 = entries.filter(e => isWithinLastDays(e.date, 7));
  return last7.filter(e => e.mood === '🙁').length;
}

// Adherence sur les 7 derniers jours (0-1)
export function getAdherenceLast7Days(entries: JournalEntry[]): number {
  const last7 = entries.filter(e => isWithinLastDays(e.date, 7));
  if (last7.length === 0) return 0;
  return last7.reduce((sum, e) => sum + getAdherenceScore(e), 0) / last7.length;
}

// Adherence sur les 7 jours precedents (jours 8-14) (0-1)
export function getAdherencePrevious7Days(entries: JournalEntry[]): number {
  const prev7 = entries.filter(e => isWithinDays(e.date, 14, 7));
  if (prev7.length === 0) return 0;
  return prev7.reduce((sum, e) => sum + getAdherenceScore(e), 0) / prev7.length;
}

// Verifie si le consultant avait un journal rempli hier
export function hasJournalYesterday(entries: JournalEntry[]): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().split('T')[0];
  return entries.some(e => e.date.startsWith(yStr));
}

// Verifie si le consultant est dans un pattern stable (±10% sur 14 jours)
export function isStablePattern(entries: JournalEntry[]): boolean {
  const last14 = entries.filter(e => isWithinLastDays(e.date, 14));
  if (last14.length < 7) return false;

  const scores = last14.map(e => getAdherenceScore(e));
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  if (avg === 0) return false;

  return scores.every(s => Math.abs(s - avg) / avg <= 0.1);
}

// Progression sur la derniere semaine
export function hasProgressionLastWeek(entries: JournalEntry[]): boolean {
  const last7 = entries.filter(e => isWithinLastDays(e.date, 7));
  const prev7 = entries.filter(e => isWithinDays(e.date, 14, 7));

  if (last7.length === 0 || prev7.length === 0) return false;

  const avgAdherence = last7.reduce((s, e) => s + getAdherenceScore(e), 0) / last7.length;
  const prevAdherence = prev7.reduce((s, e) => s + getAdherenceScore(e), 0) / prev7.length;

  const avgMood = last7.reduce((s, e) => s + moodToScore(e.mood), 0) / last7.length;
  const prevMood = prev7.reduce((s, e) => s + moodToScore(e.mood), 0) / prev7.length;

  const avgEnergy = last7.reduce((s, e) => s + energyToScore(e.energy), 0) / last7.length;
  const prevEnergy = prev7.reduce((s, e) => s + energyToScore(e.energy), 0) / prev7.length;

  return avgAdherence > prevAdherence || avgMood > prevMood || avgEnergy > prevEnergy;
}

// Nuits avec moins de 6h de sommeil sur les 7 derniers jours
export function getNightsUnder6Hours(summaries: WearableSummary[]): number {
  const last7 = summaries.filter(s => isWithinLastDays(s.date, 7));
  return last7.filter(s => s.sleep_duration != null && s.sleep_duration < 6).length;
}

// Changement du score sommeil en pourcentage sur 7 jours
export function getSleepScoreChange(summaries: WearableSummary[]): number {
  const last7 = summaries.filter(s => isWithinLastDays(s.date, 7) && s.sleep_score != null);
  const prev7 = summaries.filter(s => isWithinDays(s.date, 14, 7) && s.sleep_score != null);

  if (last7.length === 0 || prev7.length === 0) return 0;

  const avgCurrent = last7.reduce((s, d) => s + (d.sleep_score ?? 0), 0) / last7.length;
  const avgPrev = prev7.reduce((s, d) => s + (d.sleep_score ?? 0), 0) / prev7.length;

  if (avgPrev === 0) return 0;
  return ((avgCurrent - avgPrev) / avgPrev) * 100;
}

// Changement du HRV en pourcentage sur 7 jours
export function getHRVChange(summaries: WearableSummary[]): number {
  const last7 = summaries.filter(s => isWithinLastDays(s.date, 7) && s.hrv_avg != null);
  const prev7 = summaries.filter(s => isWithinDays(s.date, 14, 7) && s.hrv_avg != null);

  if (last7.length === 0 || prev7.length === 0) return 0;

  const avgCurrent = last7.reduce((s, d) => s + (d.hrv_avg ?? 0), 0) / last7.length;
  const avgPrev = prev7.reduce((s, d) => s + (d.hrv_avg ?? 0), 0) / prev7.length;

  if (avgPrev === 0) return 0;
  return ((avgCurrent - avgPrev) / avgPrev) * 100;
}

// Changement de l'activite physique en pourcentage sur 7 jours
export function getActivityChange(summaries: WearableSummary[]): number {
  const last7 = summaries.filter(s => isWithinLastDays(s.date, 7) && s.activity_level != null);
  const prev7 = summaries.filter(s => isWithinDays(s.date, 14, 7) && s.activity_level != null);

  if (last7.length === 0 || prev7.length === 0) return 0;

  const avgCurrent = last7.reduce((s, d) => s + (d.activity_level ?? 0), 0) / last7.length;
  const avgPrev = prev7.reduce((s, d) => s + (d.activity_level ?? 0), 0) / prev7.length;

  if (avgPrev === 0) return 0;
  return ((avgCurrent - avgPrev) / avgPrev) * 100;
}
