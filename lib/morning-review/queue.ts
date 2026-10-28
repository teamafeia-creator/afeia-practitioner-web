// File de la revue du matin : règles communes au tableau de bord, à la barre latérale et à la page.

import type { ConsultantSummary, SignalCategory } from './types';

export const REVIEW_THRESHOLD = 40;
export const REVIEW_MAX = 8;

/** Consultants à regarder ce matin (même seuil partout). */
export function getReviewQueue(
  summaries: ConsultantSummary[],
  treatedIds: Set<string> = new Set()
): ConsultantSummary[] {
  return summaries
    .filter((s) => s.attentionScore >= REVIEW_THRESHOLD)
    .sort((a, b) => b.attentionScore - a.attentionScore)
    .slice(0, REVIEW_MAX)
    .filter((s) => !treatedIds.has(s.consultant.id));
}

export const FACE_COLORS = ['#6DD4B8', '#E8A87C', '#7B93DB', '#E8A5C6', '#A8E6CF', '#F0C2D8', '#A9B8EC', '#F6C9A6'];

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return ((parts[0][0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] ?? '' : '')).toUpperCase();
}

export function displayName(s: ConsultantSummary): string {
  const c = s.consultant as typeof s.consultant & { first_name?: string | null; last_name?: string | null };
  return c.name || [c.first_name, c.last_name].filter(Boolean).join(' ') || 'Consultant';
}

export function firstNameOf(s: ConsultantSummary): string {
  const c = s.consultant as typeof s.consultant & { first_name?: string | null };
  return c.first_name || displayName(s).split(' ')[0];
}

type Tag = { label: string; bg: string; fg: string };

export const SIGNAL_TAGS: Record<SignalCategory, Tag> = {
  sleep: { label: 'Sommeil', bg: '#23383B', fg: '#6DD4B8' },
  recovery: { label: 'Variabilité cardiaque', bg: '#1F2640', fg: '#A9B8EC' },
  presence: { label: 'Journal silencieux', bg: '#373131', fg: '#E8A87C' },
  adherence: { label: 'Habitudes', bg: '#373131', fg: '#E8A87C' },
  emotional: { label: 'Humeur', bg: '#3A2733', fg: '#F0C2D8' },
  energy: { label: 'Énergie', bg: '#1F2640', fg: '#A9B8EC' },
  progress: { label: 'Progression', bg: '#23383B', fg: '#6DD4B8' },
  balance: { label: 'Équilibre', bg: '#23383B', fg: '#6DD4B8' },
};

const SENTENCE_PARTS: Record<SignalCategory, [string, string]> = {
  sleep: ['nuits plus courtes', 'nuits plus courtes'],
  recovery: ['besoin de récupération', 'besoins de récupération'],
  presence: ['journal en pause', 'journaux en pause'],
  adherence: ['difficulté avec les habitudes', 'difficultés avec les habitudes'],
  emotional: ['humeur difficile', 'humeurs difficiles'],
  energy: ['énergie en retrait', 'énergies en retrait'],
  progress: ['belle progression', 'belles progressions'],
  balance: ['bel équilibre', 'beaux équilibres'],
};

/** « Ce matin, 4 consultants ont besoin d'un coup d'œil : 2 nuits plus courtes, 1 journal en pause. » */
export function reviewSentence(queue: ConsultantSummary[]): string {
  const n = queue.length;
  const head = n === 1
    ? 'Ce matin, 1 consultant a besoin d’un coup d’œil'
    : `Ce matin, ${n} consultants ont besoin d’un coup d’œil`;
  const counts = new Map<SignalCategory, number>();
  let messages = 0;
  for (const s of queue) {
    const cat = s.primarySignal?.category;
    if (!cat) continue;
    if (cat === 'presence' && s.primarySignal?.iconName === 'MessageSquare') {
      messages += 1;
      continue;
    }
    counts.set(cat, (counts.get(cat) ?? 0) + 1);
  }
  const parts = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([cat, k]) => `${k} ${SENTENCE_PARTS[cat][k > 1 ? 1 : 0]}`);
  if (messages > 0) parts.push(`${messages} message${messages > 1 ? 's' : ''} en attente`);
  return parts.length > 0 ? `${head} : ${parts.join(', ')}.` : `${head}.`;
}

/** Estimation affichée sur le bouton « Commencer » (environ 1 min 30 par consultant). */
export function reviewMinutes(n: number): number {
  return Math.max(1, Math.round(n * 1.5));
}
