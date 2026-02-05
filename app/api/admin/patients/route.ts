import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/server/adminGuard';

const DEFAULT_PAGE_SIZE = 10;

function getNumber(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const SORT_FIELDS = new Set(['created_at', 'full_name', 'status']);

export async function GET(request: NextRequest) {
  const guard = await requireAdmin(request);
  if ('response' in guard) {
    return guard.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = getNumber(searchParams.get('page'), 1);
    const pageSize = getNumber(searchParams.get('pageSize'), DEFAULT_PAGE_SIZE);
    const search = searchParams.get('search')?.trim() ?? '';
    const status = searchParams.get('status')?.trim() ?? '';
    const practitionerId = searchParams.get('practitioner')?.trim() ?? '';
    const sortField = SORT_FIELDS.has(searchParams.get('sortField') ?? '')
      ? (searchParams.get('sortField') as string)
      : 'created_at';
    const sortDirection = searchParams.get('sortDirection') === 'asc' ? 'asc' : 'desc';

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const supabase = createAdminClient();

    let query = supabase
      .from('patients_identity')
      .select(
        'id, practitioner_id, full_name, email, phone, city, status, is_premium, created_at, practitioners_public(full_name)',
        { count: 'exact' }
      );

    if (status) {
      query = query.eq('status', status);
    }

    if (practitionerId) {
      query = query.eq('practitioner_id', practitionerId);
    }

    if (search) {
      const term = `%${search}%`;
      query = query.or(`full_name.ilike.${term},email.ilike.${term}`);
    }

    query = query.order(sortField, { ascending: sortDirection === 'asc' }).range(from, to);

    const { data, count, error } = await query;

    if (error) {
      console.error('[admin] patients list error:', error);
      return NextResponse.json({ error: 'Erreur lors de la récupération des patients.' }, { status: 500 });
    }

    const patients = (data ?? []).map((patient) => ({
      ...patient,
      practitioner_name: patient.practitioners_public?.[0]?.full_name ?? null
    }));

    return NextResponse.json({ patients, total: count ?? 0 });
  } catch (error) {
    console.error('[admin] patients list exception:', error);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
