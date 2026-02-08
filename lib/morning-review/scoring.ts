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
import {
  daysSince,
  getAdherenceLast7Days,
  getAdherencePrevious7Days,
  getDaysWithZeroAdherenceLastWeek,
  getLowEnergyDaysLastWeek,
  getLowMoodDaysLastWeek,
  hasJournalYesterday,
  isStablePattern,
  hasProgressionLastWeek,
  getNightsUnder6Hours,
  getSleepScoreChange,
  getHRVChange,
  getActivityChange,
} from './trends';

export function calculateAttentionScore(consultant: ConsultantForReview): number {
  let score = 0;

  // === A. SIGNAUX DE LIEN (poids x3) ===

  // Message non lu du consultant
  if (consultant.unreadMessagesCount > 0) {
    score += 30 * 3;
  }

  // Pas de journal depuis 7+ jours (consultant actif)
  const daysJournal = daysSince(
    consultant.journalEntries.length > 0 ? consultant.journalEntries[0]?.date : null
  );
  const isActive = consultant.activated !== false && !consultant.deleted_at;

  if (daysJournal >= 7 && isActive) {
    score += 25 * 3;
  }

  // Derniere consultation > 45 jours
  const daysConsultation = daysSince(consultant.lastConsultationDate);
  if (daysConsultation > 45) {
    score += 20 * 3;
  }

  // Pas de journal depuis 3 jours (apres phase active = avait un journal la semaine derniere)
  const wasActiveLastWeek = consultant.journalEntries.some(e => {
    const d = daysSince(e.date);
    return d >= 3 && d <= 10;
  });
  if (daysJournal >= 3 && daysJournal < 7 && wasActiveLastWeek) {
    score += 15 * 3;
  }

  // Pas de reponse au message praticien depuis 5+ jours
  if (consultant.lastMessageFromPractitioner) {
    const daysSinceMsg = daysSince(consultant.lastMessageFromPractitioner);
    // Verifier s'il y a une reponse du consultant apres le dernier message praticien
    const lastPractMsg = new Date(consultant.lastMessageFromPractitioner).getTime();
    const hasResponse = consultant.messages.some(
      m => m.sender === 'consultant' && new Date(m.sent_at).getTime() > lastPractMsg
    );
    if (daysSinceMsg >= 5 && !hasResponse) {
      score += 15 * 3;
    }
  }

  // === B. SIGNAUX D'ADHESION (poids x2) ===

  const currentAdherence = getAdherenceLast7Days(consultant.journalEntries);
  const previousAdherence = getAdherencePrevious7Days(consultant.journalEntries);

  // Adhesion < 50% sur 7 jours (apres avoir ete > 70%)
  if (currentAdherence < 0.5 && previousAdherence > 0.7) {
    score += 20 * 2;
  }

  // Journal rempli mais adherence a 0% pendant 3 jours
  const daysZero = getDaysWithZeroAdherenceLastWeek(consultant.journalEntries);
  if (daysZero >= 3) {
    score += 15 * 2;
  }

  // Energie basse 4+ jours sur 7
  const lowEnergy = getLowEnergyDaysLastWeek(consultant.journalEntries);
  if (lowEnergy >= 4) {
    score += 15 * 2;
  }

  // Humeur difficile 4+ jours sur 7
  const lowMood = getLowMoodDaysLastWeek(consultant.journalEntries);
  if (lowMood >= 4) {
    score += 15 * 2;
  }

  // Note du consultant exprimant difficulte/decouragement
  const discourageKeywords = [
    'difficile', 'dur', 'abandon', 'decourage', 'demotive',
    'fatigue', 'epuise', 'craqu', 'plus envie', 'trop dur',
    'n\'y arrive', 'pas capable', 'lache', 'impossible'
  ];
  const recentNotes = consultant.journalEntries
    .filter(e => daysSince(e.date) <= 7 && e.text)
    .map(e => (e.text ?? '').toLowerCase());
  const hasDiscouragement = recentNotes.some(note =>
    discourageKeywords.some(kw => note.includes(kw))
  );
  if (hasDiscouragement) {
    score += 20 * 2;
  }

  // === C. SIGNAUX PHYSIOLOGIQUES (poids x1.5) — Premium uniquement ===

  if (consultant.is_premium && consultant.hasBagueConnectee && consultant.wearableSummaries.length > 0) {
    // Sommeil < 6h pendant 5 jours
    const nightsShort = getNightsUnder6Hours(consultant.wearableSummaries);
    if (nightsShort >= 5) {
      score += 15 * 1.5;
    }

    // Score sommeil en baisse de 20%+
    const sleepChange = getSleepScoreChange(consultant.wearableSummaries);
    if (sleepChange <= -20) {
      score += 12 * 1.5;
    }

    // HRV en baisse de 15%+
    const hrvChange = getHRVChange(consultant.wearableSummaries);
    if (hrvChange <= -15) {
      score += 12 * 1.5;
    }

    // Activite physique en baisse de 30%+
    const actChange = getActivityChange(consultant.wearableSummaries);
    if (actChange <= -30) {
      score += 10 * 1.5;
    }

    // Insights bague connectée
    consultant.wearableInsights.forEach(insight => {
      if (insight.level === 'attention') score += 10 * 1.5;
      if (insight.level === 'info') score += 5 * 1.5;
    });
  }

  // === D. SIGNAUX ADMINISTRATIFS (poids x1) ===

  // Conseillancier en brouillon depuis > 7 jours
  const draftPlan = consultant.consultantPlans.find(p => p.status === 'draft');
  if (draftPlan && daysSince(draftPlan.updated_at) > 7) {
    score += 10;
  }

  // Consultation aujourd'hui
  if (consultant.nextConsultationDate) {
    const nextDate = new Date(consultant.nextConsultationDate);
    const today = new Date();
    const isToday = nextDate.toDateString() === today.toDateString();
    if (isToday) {
      score += 8;
    } else {
      // Consultation dans 48h
      const hoursUntil = (nextDate.getTime() - today.getTime()) / (1000 * 60 * 60);
      if (hoursUntil > 0 && hoursUntil <= 48) {
        score += 5;
      }
    }
  }

  // Pas de note de seance depuis derniere consultation (> 3 jours)
  if (daysConsultation <= 3 && !consultant.lastSessionNoteDate) {
    score += 8;
  }

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
