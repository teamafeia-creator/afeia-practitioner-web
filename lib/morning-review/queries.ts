// Requetes Supabase pour la Revue Matinale
// Recupere toutes les donnees necessaires au calcul du scoring

import { supabase } from '../supabase';
import type { ConsultantForReview, ConsultantSummary, MorningReviewData } from './types';
import { calculateAttentionScore, getAttentionCategory } from './scoring';
import { calculateLastWeekStats, calculateBagueConnecteeStats } from './trends';
import { identifyPrimarySignal, generateSuggestedActions } from './signals';

export async function fetchMorningReviewData(): Promise<MorningReviewData> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Non authentifie');
  }

  // Nom du praticien
  const { data: practitioner } = await supabase
    .from('practitioners')
    .select('full_name, name')
    .eq('id', user.id)
    .single();

  const practitionerName = practitioner?.name
    ?? practitioner?.full_name
    ?? '';

  // Tous les consultants actifs du praticien
  const { data: consultants, error: consultantsError } = await supabase
    .from('consultants')
    .select('*')
    .eq('practitioner_id', user.id)
    .is('deleted_at', null);

  if (consultantsError) {
    throw new Error('Erreur lors du chargement des consultants');
  }

  const consultantList = consultants ?? [];
  if (consultantList.length === 0) {
    return {
      consultantsSummary: [],
      practitionerName,
      generatedAt: new Date().toISOString(),
    };
  }

  const consultantIds = consultantList.map(c => c.id);

  // Charger toutes les donnees en parallele (30 derniers jours)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

  const [
    journalResult,
    messagesResult,
    wearableSummariesResult,
    wearableInsightsResult,
    consultantPlansResult,
    consultationsResult,
    appointmentsResult,
    practitionerNotesResult,
  ] = await Promise.all([
    // Journal entries (30 derniers jours)
    supabase
      .from('journal_entries')
      .select('*')
      .in('consultant_id', consultantIds)
      .gte('date', thirtyDaysAgoStr.split('T')[0])
      .order('date', { ascending: false }),

    // Messages (tous les non-lus + les 30 derniers jours pour contexte)
    supabase
      .from('messages')
      .select('*')
      .in('consultant_id', consultantIds)
      .gte('sent_at', thirtyDaysAgoStr)
      .order('sent_at', { ascending: false }),

    // Wearable summaries (30 derniers jours)
    supabase
      .from('wearable_summaries')
      .select('*')
      .in('consultant_id', consultantIds)
      .gte('date', thirtyDaysAgoStr.split('T')[0])
      .order('date', { ascending: false }),

    // Wearable insights (30 derniers jours)
    supabase
      .from('wearable_insights')
      .select('*')
      .in('consultant_id', consultantIds)
      .gte('created_at', thirtyDaysAgoStr)
      .order('created_at', { ascending: false }),

    // Consultant plans
    supabase
      .from('consultant_plans')
      .select('*')
      .in('consultant_id', consultantIds)
      .order('version', { ascending: false }),

    // Consultations (pour trouver la derniere et la prochaine)
    supabase
      .from('consultations')
      .select('*')
      .in('consultant_id', consultantIds)
      .order('date', { ascending: false }),

    // Appointments (a venir)
    supabase
      .from('appointments')
      .select('*')
      .in('consultant_id', consultantIds)
      .eq('status', 'scheduled')
      .gte('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: true }),

    // Notes de seance
    supabase
      .from('practitioner_notes')
      .select('*')
      .in('consultant_id', consultantIds)
      .order('updated_at', { ascending: false }),
  ]);

  // Regrouper les donnees par consultant
  const journalByConsultant = groupBy(journalResult.data ?? [], 'consultant_id');
  const messagesByConsultant = groupBy(messagesResult.data ?? [], 'consultant_id');
  const wearableByConsultant = groupBy(wearableSummariesResult.data ?? [], 'consultant_id');
  const insightsByConsultant = groupBy(wearableInsightsResult.data ?? [], 'consultant_id');
  const plansByConsultant = groupBy(consultantPlansResult.data ?? [], 'consultant_id');
  const consultationsByConsultant = groupBy(consultationsResult.data ?? [], 'consultant_id');
  const appointmentsByConsultant = groupBy(appointmentsResult.data ?? [], 'consultant_id');
  const notesByConsultant = groupBy(practitionerNotesResult.data ?? [], 'consultant_id');

  // Construire les ConsultantForReview
  const consultantsForReview: ConsultantForReview[] = consultantList.map(c => {
    const messages = messagesByConsultant[c.id] ?? [];
    const unreadMessages = messages.filter(
      m => m.sender === 'consultant' && !m.read_at
    );

    // Trouver le dernier message du praticien
    const lastPractMsg = messages.find(m => m.sender === 'praticien');

    // Derniere consultation
    const consultations = consultationsByConsultant[c.id] ?? [];
    const lastConsultation = consultations[0] ?? null;

    // Prochain RDV
    const appointments = appointmentsByConsultant[c.id] ?? [];
    const nextAppointment = appointments[0] ?? null;

    // Derniere note de seance
    const notes = notesByConsultant[c.id] ?? [];
    const lastNote = notes[0] ?? null;

    // Detecter si le consultant a des donnees bague connectee
    const wearables = wearableByConsultant[c.id] ?? [];
    const hasBagueConnecteeData = wearables.length > 0 || (c.has_bague_connectee ?? false);

    return {
      ...c,
      journalEntries: journalByConsultant[c.id] ?? [],
      wearableSummaries: wearables,
      wearableInsights: insightsByConsultant[c.id] ?? [],
      consultantPlans: plansByConsultant[c.id] ?? [],
      messages,
      unreadMessagesCount: unreadMessages.length,
      lastConsultationDate: lastConsultation?.date ?? null,
      nextConsultationDate: nextAppointment?.starts_at ?? null,
      lastMessageFromPractitioner: lastPractMsg?.sent_at ?? null,
      lastSessionNoteDate: lastNote?.updated_at ?? null,
      isSnoozed: c.is_snoozed ?? false,
      snoozeUntil: c.snooze_until ?? null,
      snoozeReason: c.snooze_reason ?? null,
      hasBagueConnectee: hasBagueConnecteeData,
    };
  });

  // Calculer les scores et resumes
  const consultantsSummary: ConsultantSummary[] = consultantsForReview.map(consultant => {
    // Exclure les consultants en snooze actif
    if (consultant.isSnoozed && consultant.snoozeUntil && new Date(consultant.snoozeUntil) > new Date()) {
      return createSnoozedSummary(consultant);
    }

    const attentionScore = calculateAttentionScore(consultant);
    const attentionLevel = consultant.journalEntries.length === 0 && !consultant.lastConsultationDate
      ? 'insufficient'
      : getAttentionCategory(attentionScore);

    const lastWeekStats = calculateLastWeekStats(consultant.journalEntries);
    const bagueConnecteeStats = consultant.is_premium && consultant.hasBagueConnectee
      ? calculateBagueConnecteeStats(consultant.wearableSummaries, consultant.wearableInsights)
      : undefined;

    const primarySignal = identifyPrimarySignal(consultant, lastWeekStats, bagueConnecteeStats);
    const suggestedActions = generateSuggestedActions(consultant, primarySignal);

    return {
      consultant,
      attentionScore,
      attentionLevel,
      lastWeekStats,
      bagueConnecteeStats,
      primarySignal,
      suggestedActions,
    };
  });

  // Trier par score decroissant
  consultantsSummary.sort((a, b) => b.attentionScore - a.attentionScore);

  return {
    consultantsSummary,
    practitionerName,
    generatedAt: new Date().toISOString(),
  };
}

function createSnoozedSummary(consultant: ConsultantForReview): ConsultantSummary {
  return {
    consultant,
    attentionScore: 0,
    attentionLevel: 'stable',
    lastWeekStats: {
      journalEntriesCount: 0,
      averageAdherence: 0,
      moodTrend: 'stable',
      energyTrend: 'stable',
      adherenceTrend: 'stable',
    },
    primarySignal: undefined,
    suggestedActions: [],
  };
}

function groupBy<T extends Record<string, unknown>>(items: T[], key: string): Record<string, T[]> {
  return items.reduce((acc, item) => {
    const groupKey = String(item[key] ?? '');
    if (!acc[groupKey]) acc[groupKey] = [];
    acc[groupKey].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

// === Actions ===

export async function snoozeConsultant(
  consultantId: string,
  reason: string,
  until: string
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non authentifie');

  const { error } = await supabase
    .from('consultants')
    .update({
      is_snoozed: true,
      snooze_until: until,
      snooze_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', consultantId)
    .eq('practitioner_id', user.id);

  if (error) {
    throw new Error('Erreur lors de la mise en pause');
  }

  // Log action
  await supabase.from('practitioner_actions').insert({
    practitioner_id: user.id,
    consultant_id: consultantId,
    type: 'snooze',
    metadata: { reason, until },
  });
}

export async function unsnoozeConsultant(consultantId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non authentifie');

  const { error } = await supabase
    .from('consultants')
    .update({
      is_snoozed: false,
      snooze_until: null,
      snooze_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', consultantId)
    .eq('practitioner_id', user.id);

  if (error) {
    throw new Error('Erreur lors de la reprise du suivi');
  }
}

export async function sendMessageFromReview(
  consultantId: string,
  message: string
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non authentifie');

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('messages')
    .insert({
      consultant_id: consultantId,
      sender: 'praticien',
      sender_role: 'practitioner',
      text: message,
      body: message,
      sent_at: now,
      created_at: now,
    });

  if (error) {
    throw new Error('Erreur lors de l\'envoi du message');
  }

  // Log action
  await supabase.from('practitioner_actions').insert({
    practitioner_id: user.id,
    consultant_id: consultantId,
    type: 'send_message',
    metadata: {},
  });
}

export async function saveObservationNote(
  consultantId: string,
  content: string
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non authentifie');

  // Upsert practitioner note
  const { error } = await supabase
    .from('practitioner_notes')
    .upsert(
      {
        consultant_id: consultantId,
        practitioner_id: user.id,
        content,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'consultant_id,practitioner_id' }
    );

  if (error) {
    throw new Error('Erreur lors de l\'enregistrement de la note');
  }

  // Log action
  await supabase.from('practitioner_actions').insert({
    practitioner_id: user.id,
    consultant_id: consultantId,
    type: 'note_observation',
    metadata: {},
  });
}
