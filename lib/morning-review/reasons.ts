// Raisons de présence dans la Revue du matin.
//
// Chaque règle du score d'attention (scoring.ts) produit ici une « raison »
// lisible : catégorie (pastille), points apportés au score, phrase.
// Le score est la somme des points ; la raison principale est la plus forte.
// Ainsi, un consultant présent dans la file a TOUJOURS une raison affichable
// (objet connecté, checklist, rendez-vous à préparer, journal, message…).

import type { ConsultantForReview, Signal, SignalCategory, SignalSeverity } from './types';
import {
  daysSince,
  getAdherenceLast7Days,
  getAdherencePrevious7Days,
  getDaysWithZeroAdherenceLastWeek,
  getLowEnergyDaysLastWeek,
  getLowMoodDaysLastWeek,
  getNightsUnder6Hours,
  getSleepScoreChange,
  getHRVChange,
  getActivityChange,
} from './trends';
import { RECAP_PERIOD } from '../wearables/insights/recap';

export interface Reason extends Signal {
  /** Identifiant stable de la règle (tests, dédoublonnage). */
  id: string;
  /** Points apportés au score d'attention (déjà pondérés). */
  points: number;
}

const DISCOURAGE_KEYWORDS = [
  'difficile', 'dur', 'abandon', 'decourage', 'demotive',
  'fatigue', 'epuise', 'craqu', 'plus envie', 'trop dur',
  'n\'y arrive', 'pas capable', 'lache', 'impossible',
];

const timeFmt = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });

function firstNameOf(c: ConsultantForReview): string {
  return (c as typeof c & { first_name?: string | null }).first_name || (c.name ?? '').split(' ')[0] || 'Ce consultant';
}

function plural(n: number, one: string, many: string): string {
  return n > 1 ? many : one;
}

/** Toutes les raisons (une par règle déclenchée), triées par points décroissants. */
export function listReasons(consultant: ConsultantForReview): Reason[] {
  const out: Reason[] = [];
  const name = firstNameOf(consultant);
  const add = (id: string, category: SignalCategory, severity: SignalSeverity, points: number, message: string, iconName: string) =>
    out.push({ id, category, severity, points, message, iconName });

  // === A. SIGNAUX DE LIEN (x3) ===

  if (consultant.unreadMessagesCount > 0) {
    const n = consultant.unreadMessagesCount;
    add('unread_messages', 'presence', 'urgent', 30 * 3, `${name} a envoyé ${n} message${plural(n, '', 's')} en attente de réponse`, 'MessageSquare');
  }

  const daysJournal = daysSince(consultant.journalEntries.length > 0 ? consultant.journalEntries[0]?.date : null);
  const isActive = consultant.activated !== false && !consultant.deleted_at;
  if (daysJournal >= 7 && isActive) {
    add(
      'journal_silent_7d',
      'presence',
      'urgent',
      25 * 3,
      daysJournal === Infinity ? `${name} n’a encore jamais rempli son journal` : `${name} n’a pas partagé son journal depuis ${daysJournal} jours`,
      'FileText'
    );
  }

  const daysConsultation = daysSince(consultant.lastConsultationDate);
  if (daysConsultation > 45 && daysConsultation !== Infinity) {
    add('no_consultation_45d', 'followup', 'attention', 20 * 3, `Dernière séance avec ${name} il y a ${daysConsultation} jours`, 'CalendarClock');
  }

  const wasActiveLastWeek = consultant.journalEntries.some((e) => {
    const d = daysSince(e.date);
    return d >= 3 && d <= 10;
  });
  if (daysJournal >= 3 && daysJournal < 7 && wasActiveLastWeek) {
    add('journal_paused_3d', 'presence', 'attention', 15 * 3, `${name} n’a pas rempli son journal depuis ${daysJournal} jours, après une semaine régulière`, 'FileText');
  }

  if (consultant.lastMessageFromPractitioner) {
    const daysSinceMsg = daysSince(consultant.lastMessageFromPractitioner);
    const lastPractMsg = new Date(consultant.lastMessageFromPractitioner).getTime();
    const hasResponse = consultant.messages.some((m) => m.sender === 'consultant' && new Date(m.sent_at).getTime() > lastPractMsg);
    if (daysSinceMsg >= 5 && !hasResponse) {
      add('no_reply_5d', 'followup', 'attention', 15 * 3, `${name} n’a pas répondu à votre message envoyé il y a ${daysSinceMsg} jours`, 'MessageSquare');
    }
  }

  // === B. SIGNAUX D'ADHÉSION — CHECKLIST (x2) ===

  const currentAdherence = getAdherenceLast7Days(consultant.journalEntries);
  const previousAdherence = getAdherencePrevious7Days(consultant.journalEntries);
  if (currentAdherence < 0.5 && previousAdherence > 0.7) {
    add(
      'adherence_drop',
      'adherence',
      'attention',
      20 * 2,
      `La checklist de ${name} passe de ${Math.round(previousAdherence * 100)} % à ${Math.round(currentAdherence * 100)} % cette semaine`,
      'AlertTriangle'
    );
  }

  const daysZero = getDaysWithZeroAdherenceLastWeek(consultant.journalEntries);
  if (daysZero >= 3) {
    add('adherence_zero_3d', 'adherence', 'attention', 15 * 2, `${name} remplit son journal mais n’a coché aucun conseil ${daysZero} jours sur 7`, 'AlertTriangle');
  }

  const lowEnergy = getLowEnergyDaysLastWeek(consultant.journalEntries);
  if (lowEnergy >= 4) {
    add('low_energy', 'energy', 'attention', 15 * 2, `L’énergie de ${name} est basse ${lowEnergy} jours sur 7`, 'Zap');
  }

  const lowMood = getLowMoodDaysLastWeek(consultant.journalEntries);
  if (lowMood >= 4) {
    add('low_mood', 'emotional', 'attention', 15 * 2, `${name} partage une humeur difficile ${lowMood} jours sur 7`, 'Frown');
  }

  const recentNotes = consultant.journalEntries
    .filter((e) => daysSince(e.date) <= 7 && e.text)
    .map((e) => (e.text ?? '').toLowerCase());
  if (recentNotes.some((note) => DISCOURAGE_KEYWORDS.some((kw) => note.includes(kw)))) {
    add('discouragement', 'emotional', 'attention', 20 * 2, `${name} exprime une difficulté ou du découragement dans son journal cette semaine`, 'Frown');
  }

  // === C. OBJET CONNECTÉ (x1.5) ===

  // Récap préparé le jour prévu par le praticien (réglage « Me le proposer régulièrement »).
  // C'est le même texte que l'encart « Message à … » de l'onglet Objet connecté.
  const recap = consultant.pendingRecap;
  if (recap) {
    const labels = recap.options
      .filter((o) => recap.points.includes(o.id) && o.id !== 'wear')
      .map((o) => o.label.charAt(0).toLowerCase() + o.label.slice(1));
    const period = RECAP_PERIOD[recap.frequency]?.queue ?? 'de la semaine';
    const message =
      recap.status === 'draft' && labels.length
        ? `Récap ${period} de ${name} à relire avant l’envoi : ${labels.join(', ')}`
        : recap.status === 'not_enough'
          ? `Récap ${period} de ${name} : trop peu de nuits mesurées, un mot pour l’encourager à porter l’objet ?`
          : `Récap ${period} de ${name} : rien de marquant cette fois, un mot libre si vous le souhaitez`;
    add('recap_due', 'wearable', 'info', 12 * 1.5, message, 'MessageSquare');
  }

  // Un objet connecté actif suffit (l'accès est déjà filtré par WEARABLES_ENABLED_FOR), plus de condition Premium.
  if (consultant.hasBagueConnectee && consultant.wearableSummaries.length > 0) {
    const nightsShort = getNightsUnder6Hours(consultant.wearableSummaries);
    if (nightsShort >= 5) {
      add('short_nights', 'wearable', 'attention', 15 * 1.5, `L’objet connecté de ${name} mesure ${nightsShort} nuits de moins de 6 h sur 7`, 'Moon');
    }

    const sleepChange = getSleepScoreChange(consultant.wearableSummaries);
    if (sleepChange <= -20) {
      add('sleep_score_drop', 'wearable', 'attention', 12 * 1.5, `Le score de sommeil de ${name} baisse de ${Math.abs(Math.round(sleepChange))} % par rapport à la semaine précédente`, 'Moon');
    }

    const hrvChange = getHRVChange(consultant.wearableSummaries);
    if (hrvChange <= -15) {
      add('hrv_drop', 'wearable', 'info', 12 * 1.5, `La variabilité cardiaque de ${name} baisse de ${Math.abs(Math.round(hrvChange))} % : besoin de récupération`, 'Heart');
    }

    const actChange = getActivityChange(consultant.wearableSummaries);
    if (actChange <= -30) {
      add('activity_drop', 'wearable', 'info', 10 * 1.5, `L’activité de ${name} recule de ${Math.abs(Math.round(actChange))} % cette semaine`, 'Footprints');
    }

    consultant.wearableInsights.forEach((insight, i) => {
      if (insight.level !== 'attention' && insight.level !== 'info') return;
      const pts = insight.level === 'attention' ? 10 * 1.5 : 5 * 1.5;
      const fallback = insight.type === 'hrv' ? 'variabilité cardiaque' : insight.type === 'activity' ? 'activité' : 'sommeil';
      add(`insight_${insight.id ?? i}`, 'wearable', insight.level, pts, insight.message?.trim().replace(/\.$/, '') || `L’objet connecté de ${name} signale un écart de ${fallback}`, 'Watch');
    });
  }

  // === D. ADMINISTRATIF (x1) ===

  const draftPlan = consultant.consultantPlans.find((p) => p.status === 'draft');
  if (draftPlan && daysSince(draftPlan.updated_at) > 7) {
    add('plan_draft', 'admin', 'info', 10, `Le conseillancier de ${name} est en brouillon depuis ${daysSince(draftPlan.updated_at)} jours`, 'ClipboardList');
  }

  if (consultant.nextConsultationDate) {
    const next = new Date(consultant.nextConsultationDate);
    const today = new Date();
    if (next.toDateString() === today.toDateString()) {
      add('appointment_today', 'appointment', 'info', 8, `Rendez-vous avec ${name} aujourd’hui à ${timeFmt.format(next)} : à préparer`, 'CalendarCheck');
    } else {
      const hoursUntil = (next.getTime() - today.getTime()) / (1000 * 60 * 60);
      if (hoursUntil > 0 && hoursUntil <= 48) {
        add('appointment_48h', 'appointment', 'info', 5, `Rendez-vous avec ${name} ${hoursUntil <= 24 ? 'demain' : 'dans 2 jours'} à ${timeFmt.format(next)} : à préparer`, 'CalendarCheck');
      }
    }
  }

  if (daysConsultation <= 3 && !consultant.lastSessionNoteDate) {
    add('missing_session_note', 'admin', 'info', 8, `Pas encore de note de séance après la séance avec ${name}`, 'FileEdit');
  }

  return out.sort((a, b) => b.points - a.points);
}

/** Somme brute des raisons (avant modérateurs). */
export function reasonsTotal(reasons: Reason[]): number {
  return reasons.reduce((sum, r) => sum + r.points, 0);
}

/** Raison principale : le message non lu d'abord, sinon la plus forte. */
export function primaryReason(reasons: Reason[]): Reason | undefined {
  return reasons.find((r) => r.id === 'unread_messages') ?? reasons[0];
}
