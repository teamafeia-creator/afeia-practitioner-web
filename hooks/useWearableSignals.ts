'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { consultantSignal, parisDay, type Signal } from '@/lib/wearables/insights';
import { loadInsightsInput } from '@/lib/wearables/insights/load';
import { listSignalReviews } from '@/lib/wearables/insights/queries';

export type ConsultantSignalRow = {
  consultantId: string;
  name: string;
  firstName: string;
  signal: Signal;
  status: 'seen' | 'sent' | null;
};

/** Un signal par consultant ayant connecté un objet (page « Objets connectés » et pastille du menu). */
export async function fetchWearableSignals(): Promise<ConsultantSignalRow[]> {
  const { data: conns } = await supabase.from('wearable_connection_overview').select('consultant_id, last_sync_at');
  const rows = (conns ?? []) as { consultant_id: string; last_sync_at: string | null }[];
  if (!rows.length) return [];
  const [{ data: people }, reviews] = await Promise.all([
    supabase.from('consultants').select('id, name, first_name').in('id', rows.map((r) => r.consultant_id)),
    listSignalReviews(supabase).catch(() => ({}) as Record<string, 'seen' | 'sent'>),
  ]);
  const names = new Map(((people ?? []) as { id: string; name: string | null; first_name: string | null }[]).map((p) => [p.id, p]));
  const out = await Promise.all(
    rows.map(async (r): Promise<ConsultantSignalRow | null> => {
      try {
        const input = await loadInsightsInput(supabase, r.consultant_id);
        const p = names.get(r.consultant_id);
        const signal = consultantSignal(input, r.last_sync_at ? parisDay(r.last_sync_at) : null);
        return {
          consultantId: r.consultant_id,
          name: p?.name || input.firstName || 'Consultant',
          firstName: p?.first_name || (p?.name ?? '').split(' ')[0] || input.firstName,
          signal,
          status: reviews[`${r.consultant_id}|${signal.key}`] ?? null,
        };
      } catch {
        return null;
      }
    })
  );
  const order = { gap: 0, wear: 1, good: 2, ok: 3 } as const;
  return out.filter((x): x is ConsultantSignalRow => x !== null).sort((a, b) => order[a.signal.kind] - order[b.signal.kind]);
}

export function useWearableSignals(enabled = true) {
  return useQuery({ queryKey: ['wearable-signals'], queryFn: fetchWearableSignals, staleTime: 10 * 60 * 1000, gcTime: 30 * 60 * 1000, enabled });
}
