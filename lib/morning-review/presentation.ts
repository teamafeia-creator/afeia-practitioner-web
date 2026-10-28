// Mise en forme d'une carte de la revue du matin à partir des données réelles.

import type { ConsultantSummary } from './types';
import type { JournalEntry, WearableSummary } from '../types';

export interface Spark {
  points: string;
  baseY: number;
  label: string;
  caption: string;
}

const W = 140;

function buildSpark(vals: number[], base: number, label: string, caption: string): Spark | null {
  const clean = vals.filter((v) => Number.isFinite(v));
  if (clean.length < 3) return null;
  const lo = Math.min(...clean, base);
  const hi = Math.max(...clean, base);
  const span = hi - lo || 1;
  const y = (v: number) => Math.round(40 - ((v - lo) / span) * 36);
  const n = clean.length;
  const points = clean.map((v, i) => `${Math.round((i / (n - 1)) * (W - 4)) + 2},${y(v)}`).join(' ');
  return { points, baseY: y(base), label, caption };
}

const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

function byDateAsc<T extends { date: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.date.localeCompare(b.date));
}

function sleepSpark(rows: WearableSummary[]): Spark | null {
  const vals = byDateAsc(rows).map((r) => r.sleep_duration ?? NaN).filter(Number.isFinite).slice(-9);
  return buildSpark(vals, mean(vals.slice(0, Math.max(1, vals.length - 4))), `Sommeil sur ${vals.length} nuits`, `Sommeil · ${vals.length} nuits`);
}

function hrvSpark(rows: WearableSummary[]): Spark | null {
  const vals = byDateAsc(rows).map((r) => r.hrv_avg ?? NaN).filter(Number.isFinite).slice(-9);
  return buildSpark(vals, mean(vals.slice(0, Math.max(1, vals.length - 4))), 'Variabilité cardiaque nocturne', 'VFC · ms');
}

function journalWeeksSpark(entries: JournalEntry[]): Spark | null {
  const now = Date.now();
  const weeks = [0, 0, 0, 0, 0];
  for (const e of entries) {
    const age = Math.floor((now - new Date(e.date).getTime()) / (7 * 86400000));
    if (age >= 0 && age < 5) weeks[4 - age] += 1;
  }
  if (weeks.every((w) => w === 0)) return null;
  return buildSpark(weeks, mean(weeks.slice(0, 3)), 'Entrées de journal par semaine', 'Entrées / semaine');
}

function entrySpark(entries: JournalEntry[], pick: (e: JournalEntry) => number | null | undefined, label: string, caption: string): Spark | null {
  const vals = byDateAsc(entries).map((e) => pick(e)).filter((v): v is number => typeof v === 'number').slice(-9);
  return buildSpark(vals, mean(vals.slice(0, Math.max(1, vals.length - 4))), label, caption);
}

const adherenceOf = (e: JournalEntry) =>
  [e.adherence_hydratation, e.adherence_respiration, e.adherence_mouvement, e.adherence_plantes].filter(Boolean).length;

export function sparkFor(s: ConsultantSummary): Spark | null {
  const c = s.consultant;
  switch (s.primarySignal?.category) {
    case 'sleep':
      return sleepSpark(c.wearableSummaries);
    case 'recovery':
      return hrvSpark(c.wearableSummaries);
    case 'presence':
      return s.primarySignal?.iconName === 'MessageSquare' ? null : journalWeeksSpark(c.journalEntries);
    case 'energy':
      return entrySpark(c.journalEntries, (e) => e.energy_level, 'Énergie déclarée', 'Énergie · journal');
    case 'emotional':
      return entrySpark(c.journalEntries, (e) => (typeof e.stress_level === 'number' ? -e.stress_level : null), 'Stress déclaré (inversé)', 'Stress · journal');
    case 'adherence':
    case 'progress':
      return entrySpark(c.journalEntries, adherenceOf, 'Habitudes suivies par jour', 'Habitudes / jour');
    default:
      return null;
  }
}

const dayFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const timeFmt = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

/** Ligne de contexte : prochaine séance, dernière séance, messages non lus. */
export function contextFor(s: ConsultantSummary): string {
  const c = s.consultant;
  const parts: string[] = [];
  if (c.nextConsultationDate) {
    const d = new Date(c.nextConsultationDate);
    const today = new Date();
    const sameDay = d.toDateString() === today.toDateString();
    parts.push(sameDay ? `Séance aujourd’hui à ${timeFmt.format(d)}` : `Prochaine séance ${dayFmt.format(d)}`);
  } else if (c.lastConsultationDate) {
    parts.push(`Dernière séance ${dayFmt.format(new Date(c.lastConsultationDate))}`);
  }
  if (c.unreadMessagesCount > 0 && s.primarySignal?.iconName !== 'MessageSquare') {
    parts.push(`${c.unreadMessagesCount} message${c.unreadMessagesCount > 1 ? 's' : ''} non lu${c.unreadMessagesCount > 1 ? 's' : ''}`);
  }
  if (s.lastWeekStats.journalEntriesCount > 0) {
    parts.push(`${s.lastWeekStats.journalEntriesCount} entrée${s.lastWeekStats.journalEntriesCount > 1 ? 's' : ''} de journal sur 7 jours`);
  }
  return parts.join(' · ');
}
