'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { computeActivity, type RawActivity } from '@/lib/statistics/activity';

const PAGE = 1000;
const CHUNK = 80;
const DROPOUT_TYPES = ['dropout_survey', 'dropout_answer', 'dropout_relance', 'followup_closed'];

type Page<T> = { data: T[] | null; error: unknown };

/** Lit toutes les pages d'une requête (Supabase limite à 1 000 lignes par appel). */
async function all<T>(make: (from: number, to: number) => PromiseLike<Page<T>>, max = 20): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < max; i++) {
    const { data, error } = await make(i * PAGE, i * PAGE + PAGE - 1);
    if (error || !data) break;
    out.push(...data);
    if (data.length < PAGE) break;
  }
  return out;
}

/** Même requête découpée par paquets d'identifiants de consultants. */
async function byConsultants<T>(ids: string[], make: (chunk: string[], from: number, to: number) => PromiseLike<Page<T>>) {
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    out.push(...(await all<T>((from, to) => make(chunk, from, to))));
  }
  return out;
}

/**
 * Activité des consultants (vue « Activité des consultants » des statistiques).
 * Chargée seulement quand la vue est ouverte (`enabled`).
 */
export function useConsultantActivity(range: { start: Date; end: Date }, enabled: boolean) {
  const [raw, setRaw] = useState<RawActivity | null>(null);
  const [practitioner, setPractitioner] = useState<{ id: string; name: string; slug: string | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: u } = await supabase.auth.getUser();
      const pid = u.user?.id;
      if (!pid) throw new Error('Non authentifié');
      const since = new Date(Date.now() - 400 * 86400000);
      const sinceDay = since.toISOString().slice(0, 10);

      const [{ data: prac }, consultants] = await Promise.all([
        supabase.from('practitioners').select('name, full_name, booking_slug').eq('id', pid).maybeSingle(),
        all<{ id: string; name: string | null; first_name: string | null; last_name: string | null; created_at: string; main_concern: string | null; consultation_reason: string | null }>((f, t) =>
          supabase.from('consultants').select('id, name, first_name, last_name, created_at, main_concern, consultation_reason').eq('practitioner_id', pid).is('deleted_at', null).range(f, t)
        ),
      ]);
      setPractitioner({ id: pid, name: prac?.full_name || prac?.name || '', slug: prac?.booking_slug ?? null });
      const ids = consultants.map((c) => c.id);

      const [appointments, messages, journal, cases, objet, plans, actions] = await Promise.all([
        all<RawActivity['appointments'][number]>((f, t) => supabase.from('appointments').select('consultant_id, starts_at, status').eq('practitioner_id', pid).not('consultant_id', 'is', null).range(f, t)),
        byConsultants<RawActivity['messages'][number]>(ids, (c, f, t) =>
          supabase.from('messages').select('consultant_id, sender, sent_at, text').in('consultant_id', c).gte('sent_at', since.toISOString()).order('sent_at').range(f, t)
        ),
        byConsultants<RawActivity['journal'][number]>(ids, (c, f, t) => supabase.from('journal_entries').select('consultant_id, date').in('consultant_id', c).gte('date', sinceDay).range(f, t)),
        byConsultants<RawActivity['cases'][number]>(ids, (c, f, t) =>
          supabase.from('plan_observance_logs').select('consultant_id, date').in('consultant_id', c).eq('done', true).gte('date', sinceDay).range(f, t)
        ),
        byConsultants<RawActivity['objet'][number]>(ids, (c, f, t) => supabase.from('wearable_summaries').select('consultant_id, date').in('consultant_id', c).gte('date', sinceDay).range(f, t)),
        all<RawActivity['plans'][number]>((f, t) => supabase.from('consultant_plans').select('consultant_id, shared_at').eq('practitioner_id', pid).not('shared_at', 'is', null).range(f, t)),
        all<RawActivity['actions'][number]>((f, t) =>
          supabase.from('practitioner_actions').select('consultant_id, type, metadata, created_at').eq('practitioner_id', pid).in('type', DROPOUT_TYPES).gte('created_at', since.toISOString()).range(f, t)
        ),
      ]);

      setRaw({
        consultants: consultants.map((c) => ({
          id: c.id,
          name: c.name || [c.first_name, c.last_name].filter(Boolean).join(' ') || 'Consultant',
          created_at: c.created_at,
          concern: c.main_concern || c.consultation_reason || null,
        })),
        appointments,
        messages,
        journal,
        cases,
        objet,
        plans,
        actions,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled && !raw) void load();
  }, [enabled, raw, load]);

  const result = useMemo(() => (raw ? computeActivity(raw, range) : null), [raw, range]);
  return { result, practitioner, loading, error, reload: load };
}
