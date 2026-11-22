import { describe, expect, it } from 'vitest';
import { listReasons, primaryReason } from '@/lib/morning-review/reasons';
import { calculateAttentionScore } from '@/lib/morning-review/scoring';
import { identifyPrimarySignal } from '@/lib/morning-review/signals';
import { getReviewQueue, SIGNAL_TAGS } from '@/lib/morning-review/queue';
import type { ConsultantForReview, ConsultantSummary, LastWeekStats } from '@/lib/morning-review/types';

const iso = (daysAgo: number, hour = 9) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};
const day = (daysAgo: number) => iso(daysAgo).slice(0, 10);

function consultant(over: Partial<ConsultantForReview> = {}): ConsultantForReview {
  return {
    id: 'c1',
    practitioner_id: 'p1',
    name: 'Amina Diallo',
    first_name: 'Amina',
    email: 'amina@example.com',
    activated: true,
    created_at: iso(120),
    journalEntries: [],
    wearableSummaries: [],
    wearableInsights: [],
    pendingRecap: null,
    consultantPlans: [],
    messages: [],
    unreadMessagesCount: 0,
    lastConsultationDate: iso(10),
    nextConsultationDate: null,
    lastMessageFromPractitioner: null,
    lastSessionNoteDate: iso(9),
    isSnoozed: false,
    snoozeUntil: null,
    hasBagueConnectee: false,
    ...over,
  } as ConsultantForReview;
}

const quietWeek: LastWeekStats = { journalEntriesCount: 7, averageAdherence: 0.6, moodTrend: 'stable', energyTrend: 'stable', adherenceTrend: 'stable' };

/** Journal rempli chaque jour (aucune règle « journal » ne se déclenche). */
const dailyJournal = Array.from({ length: 8 }, (_, i) => ({
  id: `j${i}`,
  consultant_id: 'c1',
  date: day(i),
  energy_level: 3,
  mood: 'ok',
  stress_level: 4,
  adherence_hydratation: true,
  adherence_respiration: false,
  adherence_mouvement: true,
  adherence_plantes: false,
}));

describe('Raisons de présence dans la Revue du matin', () => {
  it('un rendez-vous aujourd’hui donne une raison « Rendez-vous à préparer »', () => {
    const c = consultant({ journalEntries: dailyJournal as never, nextConsultationDate: iso(0, 23) });
    const reasons = listReasons(c);
    expect(reasons.map((r) => r.id)).toContain('appointment_today');
    const appt = reasons.find((r) => r.id === 'appointment_today')!;
    expect(appt.category).toBe('appointment');
    expect(appt.message).toMatch(/Rendez-vous avec Amina aujourd’hui à \d{2}:\d{2} : à préparer/);
    expect(SIGNAL_TAGS.appointment.label).toBe('Rendez-vous à préparer');
  });

  it('les signaux de l’objet connecté sont une raison « Objet connecté », sans condition Premium', () => {
    const summaries = Array.from({ length: 14 }, (_, i) => ({
      id: `w${i}`,
      consultant_id: 'c1',
      date: day(i),
      sleep_duration: i < 7 ? 5.2 : 7.4,
      sleep_score: i < 7 ? 55 : 80,
      hrv_avg: 40,
      activity_score: 60,
    }));
    const insights = [
      { id: 'i1', consultant_id: 'c1', type: 'sleep', level: 'attention', message: 'Sommeil : 4 des 7 dernières nuits sous son habituel', created_at: iso(0) },
    ];
    const c = consultant({ journalEntries: dailyJournal as never, hasBagueConnectee: true, is_premium: false, wearableSummaries: summaries as never, wearableInsights: insights as never });
    const reasons = listReasons(c);
    const ids = reasons.map((r) => r.id);
    expect(ids).toContain('short_nights');
    expect(ids).toContain('sleep_score_drop');
    expect(ids).toContain('insight_i1');
    expect(reasons.every((r) => r.category === 'wearable')).toBe(true);
    expect(reasons.find((r) => r.id === 'insight_i1')!.message).toBe('Sommeil : 4 des 7 dernières nuits sous son habituel');
  });

  it('un récap préparé le jour prévu reprend le texte de l’encart « Message à … »', () => {
    const c = consultant({
      journalEntries: dailyJournal as never,
      hasBagueConnectee: true,
      wearableSummaries: [{ id: 'w', consultant_id: 'c1', date: day(1), sleep_duration: 7 }] as never,
      pendingRecap: {
        id: 'r1',
        consultant_id: 'c1',
        frequency: '1w',
        prepared_for: day(0),
        period_from: day(7),
        period_to: day(1),
        valid_until: day(-6),
        status: 'draft',
        options: [
          { id: 'sleep', label: 'Des nuits plus longues', why: '', checked: true },
          { id: 'hrv', label: 'Un cœur plus calme la nuit', why: '', checked: true },
          { id: 'wear', label: 'Objet porté', why: '', checked: true },
        ],
        points: ['sleep', 'hrv', 'wear'],
        variants: {},
        body: null,
        sent_at: null,
      } as never,
    });
    const r = listReasons(c).find((x) => x.id === 'recap_due')!;
    expect(r.category).toBe('wearable');
    expect(r.message).toBe('Récap de la semaine de Amina à relire avant l’envoi : des nuits plus longues, un cœur plus calme la nuit');
  });

  it('la checklist en recul est une raison « Checklist »', () => {
    const entries = Array.from({ length: 14 }, (_, i) => ({
      id: `j${i}`,
      consultant_id: 'c1',
      date: day(i),
      energy_level: 3,
      mood: 'ok',
      adherence_hydratation: i >= 7,
      adherence_respiration: i >= 7,
      adherence_mouvement: i >= 7,
      adherence_plantes: i >= 7 ? true : false,
    }));
    const c = consultant({ journalEntries: entries as never });
    const r = listReasons(c).find((x) => x.id === 'adherence_drop')!;
    expect(r.category).toBe('adherence');
    expect(SIGNAL_TAGS.adherence.label).toBe('Checklist');
  });

  it('tout consultant dans la file a une raison principale, et le score est la somme des raisons', () => {
    // Rien d'habituel (journal au jour le jour) mais : séance il y a 50 jours, conseillancier en brouillon, RDV demain.
    const c = consultant({
      journalEntries: dailyJournal as never,
      lastConsultationDate: iso(50),
      lastSessionNoteDate: iso(50),
      consultantPlans: [{ id: 'p', consultant_id: 'c1', status: 'draft', updated_at: iso(12) }] as never,
      nextConsultationDate: iso(-1, 10),
      created_at: iso(200),
    });
    const reasons = listReasons(c);
    expect(reasons.map((r) => r.id)).toEqual(['no_consultation_45d', 'plan_draft', 'appointment_48h']);
    const score = calculateAttentionScore(c);
    // 60 + 10 + 5, moins « journal rempli hier » (−5) ; pattern stable (−20) selon le journal.
    expect(score).toBeGreaterThanOrEqual(40);

    const signal = identifyPrimarySignal(c, quietWeek, undefined);
    expect(signal).toBeDefined();
    expect(signal!.category).toBe('followup');
    expect(primaryReason(reasons)!.id).toBe('no_consultation_45d');

    const summary: ConsultantSummary = { consultant: c, attentionScore: score, attentionLevel: 'progress', lastWeekStats: quietWeek, primarySignal: signal, reasons, suggestedActions: [] };
    expect(getReviewQueue([summary]).length).toBe(1);
  });

  it('le message non lu reste la raison principale même face à un signal plus lourd', () => {
    const c = consultant({ unreadMessagesCount: 1, lastConsultationDate: iso(60), lastSessionNoteDate: iso(60) });
    const reasons = listReasons(c);
    expect(primaryReason(reasons)!.id).toBe('unread_messages');
  });
});
