// Algorithme de scoring d'attention pour la Revue Matinale
//
// Chaque consultant recoit un score 0-100 calcule quotidiennement.
// Le score determine la priorite d'attention du praticien.
//
// Categories de signaux et ponderations :
//   A. Signaux de lien (x3) : messages, journal, consultation
//   B. Signaux d'adhesion (x2) : adherence, energie, humeur
//   C. Signaux physiologiques (x1.5) : sommeil, HRV, activite (Premium)
//   D. Signaux administratifs (x1) : conseillancier, RDV
//
// Le score brut est ensuite modere par des facteurs stabilisants
// (consultant nouveau, pattern stable, progression, etc.)

import type { ConsultantForReview } from './types';
import type { AttentionLevel } from './types';
import { daysSince, hasJournalYesterday, isStablePattern, hasProgressionLastWeek } from './trends';
import { listReasons, reasonsTotal } from './reasons';

export function calculateAttentionScore(consultant: ConsultantForReview): number {
  // Chaque règle A→D vit dans reasons.ts : elle apporte des points ET une phrase.
  let score = reasonsTotal(listReasons(consultant));
  const daysConsultation = daysSince(consultant.lastConsultationDate);

  // === MODERATEURS (reduction du score) ===

  // Consultant nouveau (< 14 jours)
  if (daysSince(consultant.created_at) < 14) {
    score = score / 2;
  }

  // Pattern stable sur 14 jours
  if (isStablePattern(consultant.journalEntries)) {
    score -= 20;
  }

  // Progression sur la derniere semaine
  if (hasProgressionLastWeek(consultant.journalEntries)) {
    score -= 15;
  }

  // Journal rempli hier
  if (hasJournalYesterday(consultant.journalEntries)) {
    score -= 5;
  }

  // Consultation recente (< 7 jours)
  if (daysConsultation < 7) {
    score -= 10;
  }

  // Snooze actif
  if (consultant.isSnoozed && consultant.snoozeUntil && new Date(consultant.snoozeUntil) > new Date()) {
    score = 0;
  }

  // Clamper entre 0 et 100
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function getAttentionCategory(score: number): AttentionLevel {
  if (score >= 85) return 'urgent';
  if (score >= 60) return 'attention';
  if (score >= 40) return 'progress';
  return 'stable';
}
