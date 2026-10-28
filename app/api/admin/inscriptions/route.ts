import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminAuth } from '@/lib/admin/auth';
import { purgeDecidedIdDocuments, type VerificationRow } from '@/lib/server/verification';

/** Liste des demandes d'inscription (et nombre en attente pour le badge). */
export async function GET(request: NextRequest) {
  const guard = await requireAdminAuth(request);
  if ('response' in guard) return guard.response;

  const supabase = createAdminClient();
  const countOnly = new URL(request.url).searchParams.get('count') === '1';
  if (countOnly) {
    const { count } = await supabase
      .from('practitioners')
      .select('id', { count: 'exact', head: true })
      .eq('account_status', 'pending_validation');
    return NextResponse.json({ pending: count ?? 0 });
  }

  await purgeDecidedIdDocuments().catch(() => undefined);

  const { data: rows, error } = await supabase
    .from('practitioner_verifications')
    .select('practitioner_id, city, school, training_year, siret, pappers, concordance, decision_status, decided_at, created_at, replied_at')
    .order('created_at', { ascending: false })
    .limit(300);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = (rows ?? []).map((r) => r.practitioner_id);
  const { data: people } = ids.length
    ? await supabase.from('practitioners').select('id, email, full_name, first_name, last_name, account_status').in('id', ids)
    : { data: [] };
  const byId = new Map((people ?? []).map((p) => [p.id, p]));

  const items = (rows ?? []).map((r) => {
    const v = r as Pick<VerificationRow, 'practitioner_id' | 'city' | 'school' | 'training_year' | 'siret' | 'pappers' | 'concordance' | 'decided_at' | 'created_at' | 'replied_at'>;
    const p = byId.get(v.practitioner_id);
    return {
      id: v.practitioner_id,
      name: p?.full_name || [p?.first_name, p?.last_name].filter(Boolean).join(' ') || p?.email || '—',
      email: p?.email ?? '',
      status: p?.account_status ?? 'pending_validation',
      city: v.city,
      siretStatus: v.pappers?.status ?? 'unavailable',
      createdAt: v.replied_at ?? v.created_at,
      decidedAt: v.decided_at,
    };
  });
  return NextResponse.json({ items });
}
