import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminAuth } from '@/lib/admin/auth';

const DEFAULT_PAGE_SIZE = 10;

function getNumber(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function GET(request: NextRequest) {
  const guard = await requireAdminAuth(request);
  if ('response' in guard) {
    return guard.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = getNumber(searchParams.get('page'), 1);
    const pageSize = getNumber(searchParams.get('pageSize'), DEFAULT_PAGE_SIZE);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const supabase = createAdminClient();
    const { data, count, error } = await supabase
      .from('consultants_identity')
      .select(
        'id, full_name, email, practitioner_id, bague_connectee_enabled, last_bague_connectee_sync_at, last_bague_connectee_sync_status, practitioners_public(full_name)',
        { count: 'exact' }
      )
      .eq('bague_connectee_enabled', true)
      .order('last_bague_connectee_sync_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('[admin] bague-connectee fetch error:', error);
      return NextResponse.json({ error: 'Erreur lors du chargement bague connectée.' }, { status: 500 });
    }

    return NextResponse.json({ consultants: data ?? [], total: count ?? 0 });
  } catch (error) {
    console.error('[admin] bague-connectee fetch exception:', error);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
