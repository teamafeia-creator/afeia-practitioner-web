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

/**
 * GET /api/admin/practitioners
 * Liste tous les praticiens (admin seulement)
 */
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
    const sortField = SORT_FIELDS.has(searchParams.get('sortField') ?? '')
      ? (searchParams.get('sortField') as string)
      : 'created_at';
    const sortDirection = searchParams.get('sortDirection') === 'asc' ? 'asc' : 'desc';

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const supabase = createAdminClient();

    let query = supabase
      .from('practitioners_public')
      .select('id, email, full_name, status, subscription_status, created_at', { count: 'exact' });

    if (status) {
      query = query.eq('status', status);
    }

    if (search) {
      const term = `%${search}%`;
      query = query.or(`full_name.ilike.${term},email.ilike.${term}`);
    }

    query = query.order(sortField, { ascending: sortDirection === 'asc' }).range(from, to);

    const { data, count, error } = await query;

    if (error) {
      console.error('Erreur liste praticiens:', error);
      return NextResponse.json({ error: 'Erreur lors de la récupération des praticiens.' }, { status: 500 });
    }

    return NextResponse.json({ practitioners: data || [], total: count ?? 0 });
  } catch (err) {
    console.error('Exception GET practitioners:', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
