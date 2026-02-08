// Identification des signaux et generation des actions suggerees
// pour la Revue Matinale

import type { ConsultantForReview, Signal, SuggestedAction, LastWeekStats, BagueConnecteeStats } from './types';
import { daysSince } from './trends';

export function identifyPrimarySignal(
  consultant: ConsultantForReview,
  lastWeekStats: LastWeekStats,
  bagueConnecteeStats?: BagueConnecteeStats
): Signal | undefined {
  const name = consultant.name ?? 'Ce consultant';

  // Priorite 1 : Messages non lus
  if (consultant.unreadMessagesCount > 0) {
    const plural = consultant.unreadMessagesCount > 1;
    return {
      category: 'presence',
      severity: 'urgent',
      message: `${name} a envoye ${consultant.unreadMessagesCount} message${plural ? 's' : ''} en attente de reponse`,
      iconName: 'MessageSquare',
    };
  }

  // Priorite 2 : Absence de journal prolongee
  const daysJournal = consultant.journalEntries.length > 0
    ? daysSince(consultant.journalEntries[0]?.date)
    : Infinity;
  if (daysJournal >= 7 && daysJournal !== Infinity) {
    return {
      category: 'presence',
      severity: 'urgent',
      message: `${name} n'a pas partage son journal depuis ${daysJournal} jours`,
      iconName: 'FileText',
    };
  }

  // Priorite 3 : Baisse d'adhesion significative
  if (lastWeekStats.adherenceTrend === 'down' && lastWeekStats.averageAdherence < 0.5) {
    return {
      category: 'adherence',
      severity: 'attention',
      message: `${name} semble rencontrer des difficultes avec les nouvelles habitudes (adhesion a ${Math.round(lastWeekStats.averageAdherence * 100)}% cette semaine)`,
      iconName: 'AlertTriangle',
    };
  }

  // Priorite 4 : Humeur basse persistante
  if (lastWeekStats.moodTrend === 'down') {
    return {
      category: 'emotional',
      severity: 'attention',
      message: `${name} partage une humeur difficile depuis plusieurs jours`,
      iconName: 'Frown',
    };
  }

  // Priorite 5 : Energie en baisse
  if (lastWeekStats.energyTrend === 'down') {
    return {
      category: 'energy',
      severity: 'attention',
      message: `L'energie de ${name} est en retrait cette semaine`,
      iconName: 'Zap',
    };
  }

  // Priorite 6 : Sommeil perturbe (Premium)
  if (bagueConnecteeStats && bagueConnecteeStats.sleepTrend === 'down' && bagueConnecteeStats.averageSleep < 6.5) {
    return {
      category: 'sleep',
      severity: 'attention',
      message: `Le sommeil de ${name} montre des nuits courtes depuis plusieurs jours (${bagueConnecteeStats.averageSleep.toFixed(1)}h en moyenne)`,
      iconName: 'Moon',
    };
  }

  // Priorite 7 : HRV en baisse (Premium)
  if (bagueConnecteeStats && bagueConnecteeStats.hrvTrend === 'down') {
    return {
      category: 'recovery',
      severity: 'info',
      message: `La variabilite cardiaque de ${name} suggere un besoin de recuperation accru`,
      iconName: 'Heart',
    };
  }

  // Priorite 8 : Progression (positif)
  if (lastWeekStats.adherenceTrend === 'up' && lastWeekStats.averageAdherence > 0.75) {
    return {
      category: 'progress',
      severity: 'positive',
      message: `Belle progression de ${name} : adhesion a ${Math.round(lastWeekStats.averageAdherence * 100)}%`,
      iconName: 'TrendingUp',
    };
  }

  // Priorite 9 : Equilibre stable
  if (lastWeekStats.adherenceTrend === 'stable' && lastWeekStats.averageAdherence > 0.7) {
    return {
      category: 'balance',
      severity: 'positive',
      message: `${name} maintient un bel equilibre depuis plusieurs semaines`,
      iconName: 'Leaf',
    };
  }

  return undefined;
}

export function generateSuggestedActions(
  consultant: ConsultantForReview,
  primarySignal?: Signal
): SuggestedAction[] {
  const actions: SuggestedAction[] = [];
  const name = consultant.name ?? 'votre consultant';

  if (primarySignal) {
    switch (primarySignal.category) {
      case 'presence':
        actions.push({
          type: 'send_message',
          label: 'Prendre des nouvelles',
          description: 'Envoyer un message pour prendre de ses nouvelles',
          templateMessage: `Bonjour ${name}, j'ai remarque que vous n'avez pas partage votre journal depuis quelques jours. Tout va bien de votre cote ? Je suis la si vous avez besoin.`,
          iconName: 'MessageSquare',
        });
        break;

      case 'adherence':
        actions.push({
          type: 'adjust_conseillancier',
          label: 'Ajuster le conseillancier',
          description: 'Simplifier ou adapter les recommandations',
          iconName: 'ClipboardList',
        });
        actions.push({
          type: 'send_message',
          label: 'Proposer un ajustement',
          description: 'Discuter des difficultes rencontrees',
          templateMessage: `Bonjour ${name}, je remarque que l'adhesion semble un peu difficile ces derniers temps. Que diriez-vous qu'on ajuste ensemble votre programme pour le rendre plus adapte ?`,
          iconName: 'MessageSquare',
        });
        break;

      case 'emotional':
      case 'energy':
        actions.push({
          type: 'send_message',
          label: 'Message d\'ecoute',
          description: 'Apporter du soutien et de l\'ecoute',
          templateMessage: `Bonjour ${name}, je vois que vous traversez un moment un peu difficile. N'hesitez pas a m'en parler, je suis la pour vous accompagner.`,
          iconName: 'MessageSquare',
        });
        actions.push({
          type: 'schedule_call',
          label: 'Proposer un appel',
          description: 'Planifier un point telephonique',
          iconName: 'Phone',
        });
        break;

      case 'sleep':
      case 'recovery':
        actions.push({
          type: 'note_observation',
          label: 'Noter l\'observation',
          description: 'Documenter pour le prochain RDV',
          iconName: 'FileEdit',
        });
        actions.push({
          type: 'send_message',
          label: 'Conseils sommeil/recuperation',
          description: 'Partager des conseils adaptes',
          templateMessage: `Bonjour ${name}, j'ai remarque que votre sommeil/recuperation semble perturbe ces derniers jours. Prenez-vous le temps de vous reposer ? N'hesitez pas si vous souhaitez qu'on en discute.`,
          iconName: 'MessageSquare',
        });
        break;

      case 'progress':
      case 'balance':
        actions.push({
          type: 'celebrate',
          label: 'Feliciter',
          description: 'Envoyer un message d\'encouragement',
          templateMessage: `Bravo ${name} ! Je vois que vous maintenez un bel equilibre et que les nouvelles habitudes s'ancrent bien. Continuez comme ca !`,
          iconName: 'PartyPopper',
        });
        break;
    }
  }

  // Action "ouvrir dossier" toujours disponible
  actions.push({
    type: 'open_dossier',
    label: 'Ouvrir le dossier',
    description: 'Voir le dossier complet',
    iconName: 'FolderOpen',
  });

  return actions;
}
