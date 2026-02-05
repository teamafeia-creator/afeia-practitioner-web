import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/server/supabaseAdmin';
import { requireAdmin } from '@/lib/server/adminGuard';

const DEFAULT_PAGE_SIZE = 10;

function getNumber(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function GET(request: NextRequest) {
  const guard = await requireAdmin(request);
  if ('response' in guard) {
    return guard.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = getNumber(searchParams.get('page'), 1);
    const pageSize = getNumber(searchParams.get('pageSize'), DEFAULT_PAGE_SIZE);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const supabase = createSupabaseAdminClient();
    const { data, count, error } = await supabase
      .from('patients')
      .select(
        'id, full_name, name, email, practitioner_id, circular_enabled, last_circular_sync_at, last_circular_sync_status, practitioners(full_name)',
        { count: 'exact' }
      )
      .eq('circular_enabled', true)
      .order('last_circular_sync_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('[admin] circular fetch error:', error);
      return NextResponse.json({ error: 'Erreur lors du chargement Circular.' }, { status: 500 });
    }

    const rows = (data ?? []).map((patient) => ({
      ...patient,
      full_name: patient.full_name ?? patient.name ?? ''
    }));

    return NextResponse.json({ patients: rows, total: count ?? 0 });
  } catch (error) {
    console.error('[admin] circular fetch exception:', error);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
