// Types pour la Revue Matinale AFEIA
// Scoring, signaux, et résumés consultant

import type { Consultant, JournalEntry, WearableSummary, WearableInsight, ConsultantPlan, Message } from '../types';

// === Niveaux d'attention ===

export type AttentionLevel = 'urgent' | 'attention' | 'progress' | 'stable' | 'insufficient';

export const ATTENTION_COLORS: Record<AttentionLevel, string> = {
  urgent: '#E74C3C',
  attention: '#F39C12',
  progress: '#89A889',
  stable: '#1A6C6C',
  insufficient: '#9CA3AF',
};

export const ATTENTION_LABELS: Record<AttentionLevel, string> = {
  urgent: 'Attention requise',
  attention: 'A surveiller',
  progress: 'En progression',
  stable: 'Sur la bonne voie',
  insufficient: 'Donnees insuffisantes',
};

// === Tendances ===

export type Trend = 'up' | 'down' | 'stable';

// === Signaux ===

export type SignalCategory =
  | 'presence'
  | 'adherence'
  | 'emotional'
  | 'energy'
  | 'sleep'
  | 'recovery'
  | 'progress'
  | 'balance';

export type SignalSeverity = 'urgent' | 'attention' | 'info' | 'positive';

export interface Signal {
  category: SignalCategory;
  severity: SignalSeverity;
  message: string;
  iconName: string;
}

// === Actions suggerees ===

export type ActionType =
  | 'send_message'
  | 'note_observation'
  | 'adjust_conseillancier'
  | 'schedule_call'
  | 'celebrate'
  | 'open_dossier';

export interface SuggestedAction {
  type: ActionType;
  label: string;
  description: string;
  templateMessage?: string;
  iconName: string;
}

// === Stats hebdomadaires ===

export interface LastWeekStats {
  journalEntriesCount: number;
  averageAdherence: number; // 0-1
  moodTrend: Trend;
  energyTrend: Trend;
  adherenceTrend: Trend;
}

// === Stats Bague connectée (Premium) ===

export interface BagueConnecteeStats {
  averageSleep: number; // heures
  sleepTrend: Trend;
  averageHRV: number;
  hrvTrend: Trend;
  insights: WearableInsight[];
}

// === Resume consultant ===

export interface ConsultantSummary {
  consultant: ConsultantForReview;
  attentionScore: number;
  attentionLevel: AttentionLevel;
  lastWeekStats: LastWeekStats;
  bagueConnecteeStats?: BagueConnecteeStats;
  primarySignal?: Signal;
  suggestedActions: SuggestedAction[];
}

// Consultant enrichi avec les donnees necessaires au scoring
export interface ConsultantForReview extends Consultant {
  journalEntries: JournalEntry[];
  wearableSummaries: WearableSummary[];
  wearableInsights: WearableInsight[];
  consultantPlans: ConsultantPlan[];
  messages: Message[];
  unreadMessagesCount: number;
  lastConsultationDate: string | null;
  nextConsultationDate: string | null;
  lastMessageFromPractitioner: string | null;
  lastSessionNoteDate: string | null;
  isSnoozed: boolean;
  snoozeUntil: string | null;
  snoozeReason: string | null;
  hasBagueConnectee: boolean;
}

// === Donnees revue matinale ===

export interface MorningReviewData {
  consultantsSummary: ConsultantSummary[];
  practitionerName: string;
  generatedAt: string;
}

// === Metriques globales ===

export interface GlobalMetricsData {
  activeThisWeek: number;
  activeThisWeekTrend: Trend;
  presenceRate: number;
  presenceRateTrend: Trend;
  averageAdherence: number;
  adherenceTrend: Trend;
  attentionSignals: number;
  attentionSignalsDiff: number;
  consultationsThisWeek: number;
  nextConsultation: string | null;
  progressCount: number;
}

// === Snooze ===

export type SnoozeReason = 'vacation' | 'spaced_followup' | 'other';

export interface SnoozePayload {
  reason: SnoozeReason;
  until: string; // ISO date
}
