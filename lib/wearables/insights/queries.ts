// lib/wearables/insights/queries.ts
// Lectures et écritures côté praticien (session, RLS) pour l'écran « Objet connecté »
// et la Revue du matin : réglage et brouillons du récap, coches par l'objet, points épinglés,
// objectifs reliés à une mesure.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { RecapFrequency, RecapOption, RecapPointId } from './recap';
import { DEFAULT_RECAP_SETTINGS, type RecapSettings } from './schedule';
import { parisDay, type Metric } from './series';

async function me(db: SupabaseClient): Promise<string> {
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) throw new Error('Veuillez vous reconnecter.');
  return data.user.id;
}

function fail(what: string, error: { message?: string } | null): never {
  throw new Error(`${what} : ${error?.message ?? 'erreur inconnue'}`);
}

// ─── Réglage du récap ─────────────────

export async function getRecapSettings(db: SupabaseClient, consultantId: string): Promise<RecapSettings & { saved: boolean }> {
  const { data } = await db.from('wearable_recap_settings').select('*').eq('consultant_id', consultantId).maybeSingle();
  if (!data) return { ...DEFAULT_RECAP_SETTINGS, anchor: parisDay(new Date()), saved: false };
  const r = data as { enabled: boolean; frequency: RecapFrequency; weekdays: number[]; anchor: string };
  return { enabled: r.enabled, frequency: r.frequency, weekdays: r.weekdays, anchor: r.anchor, saved: true };
}

export async function saveRecapSettings(db: SupabaseClient, consultantId: string, s: RecapSettings): Promise<void> {
  const { error } = await db.from('wearable_recap_settings').upsert(
    { consultant_id: consultantId, practitioner_id: await me(db), enabled: s.enabled, frequency: s.frequency, weekdays: s.weekdays, anchor: s.anchor, updated_at: new Date().toISOString() },
    { onConflict: 'consultant_id' }
  );
  if (error) fail('Réglage du récap non enregistré', error);
}

// ─── Brouillons et envois ─────────────────

export type RecapRow = {
  id: string;
  consultant_id: string;
  frequency: RecapFrequency;
  prepared_for: string;
  period_from: string;
  period_to: string;
  valid_until: string;
  status: 'draft' | 'sent' | 'skipped' | 'expired' | 'nothing' | 'not_enough';
  options: RecapOption[];
  points: RecapPointId[];
  variants: Partial<Record<RecapPointId, 0 | 1>>;
  body: string | null;
  sent_at: string | null;
};

export const PENDING_STATUSES = ['draft', 'not_enough', 'nothing'] as const;

/** Brouillon en cours de validité pour ce consultant, s'il y en a un. */
export async function getCurrentRecap(db: SupabaseClient, consultantId: string): Promise<RecapRow | null> {
  const { data } = await db
    .from('wearable_recaps')
    .select('*')
    .eq('consultant_id', consultantId)
    .in('status', [...PENDING_STATUSES])
    .gte('valid_until', parisDay(new Date()))
    .order('prepared_for', { ascending: false })
    .limit(1);
  return ((data ?? [])[0] as RecapRow | undefined) ?? null;
}

/** Variantes de phrase du dernier récap envoyé (pour ne pas les reprendre). */
export async function getLastVariants(db: SupabaseClient, consultantId: string): Promise<Partial<Record<RecapPointId, 0 | 1>>> {
  const { data } = await db.from('wearable_recaps').select('variants').eq('consultant_id', consultantId).eq('status', 'sent').order('sent_at', { ascending: false }).limit(1);
  return ((data ?? [])[0]?.variants as Partial<Record<RecapPointId, 0 | 1>>) ?? {};
}

/**
 * Envoie le récap dans la messagerie du consultant puis garde la trace des points envoyés.
 * Sans brouillon (récap préparé à la main), une ligne « sent » est créée pour la journée.
 */
export async function sendRecap(
  db: SupabaseClient,
  params: {
    consultantId: string;
    recapId: string | null;
    text: string;
    points: RecapPointId[];
    variants: Partial<Record<RecapPointId, 0 | 1>>;
    frequency: RecapFrequency;
    period: { from: string; to: string };
    options: RecapOption[];
  }
): Promise<void> {
  const now = new Date().toISOString();
  const { data: msg, error: msgError } = await db
    .from('messages')
    .insert({ consultant_id: params.consultantId, text: params.text, body: params.text, sender: 'praticien', sender_role: 'practitioner', sent_at: now, created_at: now })
    .select('id')
    .single();
  if (msgError || !msg) fail('Le récap n’a pas pu être envoyé', msgError);

  const trace = { status: 'sent', points: params.points, variants: params.variants, body: params.text, message_id: (msg as { id: string }).id, sent_at: now, updated_at: now };
  if (params.recapId) {
    const { error } = await db.from('wearable_recaps').update(trace).eq('id', params.recapId);
    if (error) fail('Récap envoyé, mais sa trace n’a pas été enregistrée', error);
    return;
  }
  const today = parisDay(new Date());
  const { error } = await db.from('wearable_recaps').upsert(
    {
      consultant_id: params.consultantId,
      practitioner_id: await me(db),
      frequency: params.frequency,
      prepared_for: today,
      period_from: params.period.from,
      period_to: params.period.to,
      valid_until: today,
      options: params.options,
      ...trace,
    },
    { onConflict: 'consultant_id,prepared_for' }
  );
  if (error) fail('Récap envoyé, mais sa trace n’a pas été enregistrée', error);
}

/** « Pas cette fois » : le brouillon est écarté sans rien envoyer. */
export async function skipRecap(db: SupabaseClient, recapId: string): Promise<void> {
  const { error } = await db.from('wearable_recaps').update({ status: 'skipped', updated_at: new Date().toISOString() }).eq('id', recapId);
  if (error) fail('Impossible d’écarter le récap', error);
}

export type PendingRecap = RecapRow & { consultantName: string; consultantFullName: string };

/** Récaps à valider pour la Revue du matin. */
export async function listPendingRecaps(db: SupabaseClient): Promise<PendingRecap[]> {
  const { data, error } = await db
    .from('wearable_recaps')
    .select('*, consultants(name, first_name)')
    .in('status', [...PENDING_STATUSES])
    .gte('valid_until', parisDay(new Date()))
    .order('prepared_for', { ascending: false });
  if (error) return [];
  return ((data ?? []) as (RecapRow & { consultants?: { name?: string | null; first_name?: string | null } | null })[]).map((r) => ({
    ...r,
    consultantName: r.consultants?.first_name || (r.consultants?.name ?? '').split(' ')[0] || 'Consultant',
    consultantFullName: r.consultants?.name || r.consultants?.first_name || 'Consultant',
  }));
}

// ─── Coches par l'objet ─────────────────

export async function setItemAutoCheck(db: SupabaseClient, itemId: string, on: boolean): Promise<void> {
  const { error } = await db.from('plan_observance_items').update({ auto_check: on }).eq('id', itemId);
  if (error) fail('Réglage non enregistré', error);
}

/** Répartition des coches des 14 derniers jours par origine, par item. */
export async function getLogSources(db: SupabaseClient, consultantId: string, from: string): Promise<Record<string, { consultant: number; object: number }>> {
  const { data } = await db.from('plan_observance_logs').select('observance_item_id, source, done').eq('consultant_id', consultantId).eq('done', true).gte('date', from);
  const out: Record<string, { consultant: number; object: number }> = {};
  for (const r of (data ?? []) as { observance_item_id: string; source?: string | null }[]) {
    const o = (out[r.observance_item_id] ??= { consultant: 0, object: 0 });
    if (r.source === 'object') o.object += 1;
    else o.consultant += 1;
  }
  return out;
}

// ─── Points à aborder (onglet Rendez-vous) ─────────────────

export type SessionTopic = { id: string; text: string; detail: string | null; source: 'wearable' | 'practitioner'; source_key: string | null; done_at: string | null; created_at: string };

/** Points ouverts, et points abordés depuis `since` (dernière séance). */
export async function listTopics(db: SupabaseClient, consultantId: string, since?: string | null): Promise<SessionTopic[]> {
  let q = db.from('consultant_session_topics').select('*').eq('consultant_id', consultantId).order('created_at');
  q = since ? q.or(`done_at.is.null,done_at.gte.${since}`) : q.is('done_at', null);
  const { data } = await q;
  return (data ?? []) as SessionTopic[];
}

export async function listOpenTopics(db: SupabaseClient, consultantId: string): Promise<SessionTopic[]> {
  return listTopics(db, consultantId, null);
}

export async function pinTopic(db: SupabaseClient, consultantId: string, t: { text: string; detail?: string | null; key: string }): Promise<void> {
  const { error } = await db.from('consultant_session_topics').insert({ consultant_id: consultantId, practitioner_id: await me(db), text: t.text, detail: t.detail ?? null, source: 'wearable', source_key: t.key });
  if (error && error.code !== '23505') fail('Point non épinglé', error);
}

export async function unpinTopic(db: SupabaseClient, consultantId: string, key: string): Promise<void> {
  const { error } = await db.from('consultant_session_topics').delete().eq('consultant_id', consultantId).eq('source_key', key).is('done_at', null);
  if (error) fail('Point non retiré', error);
}

/** « Ajouter un point à aborder… » */
export async function addTopic(db: SupabaseClient, consultantId: string, text: string): Promise<SessionTopic> {
  const { data, error } = await db.from('consultant_session_topics').insert({ consultant_id: consultantId, practitioner_id: await me(db), text, source: 'practitioner' }).select().single();
  if (error || !data) fail('Point non ajouté', error);
  return data as SessionTopic;
}

/** Case « abordé ». */
export async function setTopicDone(db: SupabaseClient, id: string, done: boolean): Promise<void> {
  const { error } = await db.from('consultant_session_topics').update({ done_at: done ? new Date().toISOString() : null }).eq('id', id);
  if (error) fail('Point non mis à jour', error);
}

export async function deleteTopic(db: SupabaseClient, id: string): Promise<void> {
  const { error } = await db.from('consultant_session_topics').delete().eq('id', id);
  if (error) fail('Point non retiré', error);
}

// ─── Objectifs reliés à une mesure ─────────────────

export async function setGoalMetric(db: SupabaseClient, goalId: string, metric: Metric | null, target: string | null): Promise<void> {
  const { error } = await db.from('consultant_goals').update({ metric, metric_target: metric ? target || null : null, updated_at: new Date().toISOString() }).eq('id', goalId);
  if (error) fail('Objectif non enregistré', error);
}

// ─── Page « Objets connectés » ─────────────────

export async function listSignalReviews(db: SupabaseClient): Promise<Record<string, 'seen' | 'sent'>> {
  const { data } = await db.from('wearable_signal_reviews').select('consultant_id, signal_key, status');
  const out: Record<string, 'seen' | 'sent'> = {};
  for (const r of (data ?? []) as { consultant_id: string; signal_key: string; status: 'seen' | 'sent' }[]) out[`${r.consultant_id}|${r.signal_key}`] = r.status;
  return out;
}

export async function reviewSignal(db: SupabaseClient, consultantId: string, key: string, status: 'seen' | 'sent'): Promise<void> {
  const { error } = await db.from('wearable_signal_reviews').upsert({ consultant_id: consultantId, practitioner_id: await me(db), signal_key: key, status }, { onConflict: 'consultant_id,signal_key' });
  if (error) fail('Action non enregistrée', error);
}

export async function sendPractitionerMessage(db: SupabaseClient, consultantId: string, text: string): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await db.from('messages').insert({ consultant_id: consultantId, text, body: text, sender: 'praticien', sender_role: 'practitioner', sent_at: now, created_at: now });
  if (error) fail('Message non envoyé', error);
}
