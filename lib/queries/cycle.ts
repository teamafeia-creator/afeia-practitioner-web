import { supabase } from '../supabase';
import type { CycleProfile, CycleEntry } from '../types';

// ============================================
// CYCLE PROFILE
// ============================================

export async function getCycleProfile(
  consultantId: string
): Promise<CycleProfile | null> {
  const { data, error } = await supabase
    .from('cycle_profiles')
    .select('*')
    .eq('consultant_id', consultantId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching cycle profile:', error);
    return null;
  }
  return data;
}

export async function upsertCycleProfile(
  consultantId: string,
  practitionerId: string,
  data: Partial<CycleProfile>
): Promise<CycleProfile | null> {
  const { id, created_at, updated_at, ...rest } = data as any;

  const { data: result, error } = await supabase
    .from('cycle_profiles')
    .upsert(
      {
        consultant_id: consultantId,
        practitioner_id: practitionerId,
        ...rest,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'consultant_id' }
    )
    .select()
    .single();

  if (error) {
    console.error('Error upserting cycle profile:', error);
    return null;
  }
  return result;
}

// ============================================
// CYCLE ENTRIES
// ============================================

export async function getCycleEntries(
  consultantId: string,
  startDate?: string,
  endDate?: string
): Promise<CycleEntry[]> {
  let query = supabase
    .from('cycle_entries')
    .select('*')
    .eq('consultant_id', consultantId)
    .order('date', { ascending: false });

  if (startDate) {
    query = query.gte('date', startDate);
  }
  if (endDate) {
    query = query.lte('date', endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching cycle entries:', error);
    return [];
  }
  return data || [];
}

export async function upsertCycleEntry(
  consultantId: string,
  entry: Partial<CycleEntry> & { date: string }
): Promise<CycleEntry | null> {
  const { id, created_at, ...rest } = entry as any;

  // Check if entry exists for this date
  const { data: existing } = await supabase
    .from('cycle_entries')
    .select('id')
    .eq('consultant_id', consultantId)
    .eq('date', entry.date)
    .maybeSingle();

  if (existing) {
    const { data: result, error } = await supabase
      .from('cycle_entries')
      .update({ ...rest })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating cycle entry:', error);
      return null;
    }
    return result;
  }

  const { data: result, error } = await supabase
    .from('cycle_entries')
    .insert({
      consultant_id: consultantId,
      ...rest,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating cycle entry:', error);
    return null;
  }
  return result;
}

export async function deleteCycleEntry(
  consultantId: string,
  date: string
): Promise<boolean> {
  const { error } = await supabase
    .from('cycle_entries')
    .delete()
    .eq('consultant_id', consultantId)
    .eq('date', date);

  if (error) {
    console.error('Error deleting cycle entry:', error);
    return false;
  }
  return true;
}

// ============================================
// ONGLET CYCLE v2 — actions du praticien
// ============================================

import { addDays, daysBetween, NEW_CYCLE_MIN_GAP_DAYS } from '../cycle/engine';

export interface PeriodNoteInput {
  start: string;
  end?: string | null;
  /** light | medium | heavy | other */
  flow?: 'light' | 'medium' | 'heavy' | 'other' | null;
  flowDetails?: string | null;
  /** Autres critères (Caillots, Couleur, critère libre…) : libellé → valeur. */
  criteria?: Record<string, string>;
  /** Note visible par le praticien seul. */
  note?: string | null;
  /** Correction : ancien premier jour des règles à déplacer. */
  fixingStart?: string | null;
}

/**
 * Note (ou corrige) des règles côté praticien.
 * - Chaque jour de `start` à `end` (ou `start` seul) passe à is_period = true, source practitioner.
 * - Les autres critères, la note et la précision d'abondance sont posés sur le premier jour.
 * - Correction : les jours de règles de l'ancienne série (dans les 14 jours suivant `fixingStart`)
 *   qui ne sont pas dans la nouvelle plage repassent à is_period = false.
 */
export async function notePeriod(consultantId: string, input: PeriodNoteInput): Promise<{ ok: boolean; error?: string }> {
  const end = input.end && input.end >= input.start ? input.end : input.start;
  const days: string[] = [];
  for (let d = input.start; d <= end; d = addDays(d, 1)) days.push(d);

  // Fenêtre lue : la plage notée, élargie à l'ancienne série de règles en cas de correction.
  const fixWindowEnd = input.fixingStart ? addDays(input.fixingStart, NEW_CYCLE_MIN_GAP_DAYS) : null;
  const readFrom = input.fixingStart && input.fixingStart < input.start ? input.fixingStart : input.start;
  const readTo = fixWindowEnd && fixWindowEnd > end ? fixWindowEnd : end;
  const { data: existing, error: readErr } = await supabase
    .from('cycle_entries')
    .select('*')
    .eq('consultant_id', consultantId)
    .gte('date', readFrom)
    .lte('date', readTo);
  if (readErr) return { ok: false, error: readErr.message };
  const byDate = new Map((existing ?? []).map((e) => [e.date as string, e]));

  const rows = days.map((date, i) => {
    const prev = byDate.get(date) ?? {};
    return {
      ...prev,
      consultant_id: consultantId,
      date,
      is_period: true,
      flow_intensity: input.flow ?? (prev as { flow_intensity?: string | null }).flow_intensity ?? null,
      flow_details: input.flow === 'other' ? input.flowDetails ?? null : (prev as { flow_details?: string | null }).flow_details ?? null,
      ...(i === 0
        ? {
            extra_criteria: { ...((prev as { extra_criteria?: Record<string, string> }).extra_criteria ?? {}), ...(input.criteria ?? {}) },
            practitioner_note: input.note ?? (prev as { practitioner_note?: string | null }).practitioner_note ?? null,
          }
        : {}),
      source: 'practitioner',
    };
  });
  const { error: upErr } = await supabase.from('cycle_entries').upsert(rows, { onConflict: 'consultant_id,date' });
  if (upErr) return { ok: false, error: upErr.message };

  if (input.fixingStart) {
    const windowEnd = addDays(input.fixingStart, NEW_CYCLE_MIN_GAP_DAYS);
    const toClear = (existing ?? [])
      .filter((e) => e.is_period && e.date >= input.fixingStart! && e.date < windowEnd && !days.includes(e.date))
      .map((e) => e.date);
    if (toClear.length) {
      const { error } = await supabase
        .from('cycle_entries')
        .update({ is_period: false, flow_intensity: null, flow_details: null })
        .eq('consultant_id', consultantId)
        .in('date', toClear);
      if (error) return { ok: false, error: error.message };
    }
  }
  return { ok: true };
}

export interface CycleSettingsInput {
  contraception: 'aucune' | 'pilule' | 'sterilet' | 'implant' | 'autre';
  contraceptionDetails?: string | null;
  cycleLengthManual: boolean;
  cycleLength: number;
  periodLengthManual: boolean;
  periodLength: number;
  situation: 'aucune' | 'grossesse' | 'allaitement' | 'perimenopause' | 'autre';
  situationDetails?: string | null;
}

export async function saveCycleSettings(consultantId: string, practitionerId: string, s: CycleSettingsInput): Promise<CycleProfile | null> {
  return upsertCycleProfile(consultantId, practitionerId, {
    contraception: s.contraception,
    contraception_details: s.contraception === 'autre' ? s.contraceptionDetails ?? null : null,
    cycle_length_manual: s.cycleLengthManual,
    average_cycle_length: Math.min(45, Math.max(21, Math.round(s.cycleLength) || 28)),
    period_length_manual: s.periodLengthManual,
    average_period_length: Math.min(10, Math.max(2, Math.round(s.periodLength) || 5)),
    situation: s.situation,
    situation_details: s.situation === 'autre' ? s.situationDetails ?? null : null,
  });
}

/** Désactive le suivi (données conservées) ou le réactive, côté praticien. */
export async function setCycleTracking(consultantId: string, practitionerId: string, on: boolean): Promise<CycleProfile | null> {
  const now = new Date().toISOString();
  return upsertCycleProfile(
    consultantId,
    practitionerId,
    on
      ? { is_tracking: true, tracking_activated_at: now, tracking_activated_by: 'practitioner', tracking_paused_at: null, tracking_paused_by: null }
      : { is_tracking: false, tracking_paused_at: now, tracking_paused_by: 'practitioner' }
  );
}

/**
 * Propose le suivi à la consultante : message dans sa messagerie (avec le marqueur qui affiche
 * le bouton « Activer le suivi du cycle » dans son app) et date d'invitation sur le profil.
 */
export async function inviteToCycleTracking(consultantId: string, practitionerId: string, text: string): Promise<{ ok: boolean; error?: string }> {
  const now = new Date().toISOString();
  const { error } = await supabase.from('messages').insert({
    consultant_id: consultantId,
    sender: 'praticien',
    sender_role: 'practitioner',
    text,
    body: text,
    metadata: { action: 'cycle_tracking_invite' },
    sent_at: now,
    created_at: now,
    read_at: null,
  });
  if (error) {
    // Colonne metadata absente sur d'anciens schémas : on envoie sans marqueur.
    const retry = await supabase.from('messages').insert({ consultant_id: consultantId, sender: 'praticien', sender_role: 'practitioner', text, body: text, sent_at: now, created_at: now, read_at: null });
    if (retry.error) return { ok: false, error: retry.error.message };
  }
  await upsertCycleProfile(consultantId, practitionerId, { invite_sent_at: now, is_tracking: false });
  return { ok: true };
}

export { daysBetween as cycleDaysBetween };
