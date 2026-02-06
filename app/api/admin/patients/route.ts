import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/server/adminGuard';
import { queryWithFallback } from '@/lib/server/supabaseFallback';

const DEFAULT_PAGE_SIZE = 10;

function getNumber(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const SORT_FIELDS = new Set(['created_at', 'full_name', 'status']);

type PatientRecord = {
  id: string;
  practitioner_id: string | null;
  full_name: string | null;
  name?: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  status: string | null;
  is_premium: boolean | null;
  created_at: string | null;
  practitioners_public?: { full_name: string | null }[] | { full_name: string | null } | null;
  practitioners?: { full_name: string | null }[] | { full_name: string | null } | null;
};

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

    const sortFieldLegacy = sortField === 'full_name' ? 'name' : sortField;

    const { data, count, error } = await queryWithFallback(
      () => {
        let query = supabase
          .from('patients_identity')
          .select(
            'id, practitioner_id, full_name, email, phone, city, status, is_premium, created_at, practitioners_public(full_name)',
            { count: 'exact' }
          )
          .order(sortField, { ascending: sortDirection === 'asc' });

        if (status === 'premium') {
          query = query.or('status.eq.premium,is_premium.eq.true');
        } else if (status === 'standard') {
          query = query.or('status.eq.standard,is_premium.eq.false');
        }

        if (practitionerId) {
          query = query.eq('practitioner_id', practitionerId);
        }

        if (search) {
          const term = `%${search}%`;
          query = query.or(`full_name.ilike.${term},email.ilike.${term}`);
        }

        return query.range(from, to);
      },
      () => {
        let query = supabase
          .from('patients')
          .select(
            'id, practitioner_id, name, email, phone, city, status, is_premium, created_at, practitioners(full_name)',
            { count: 'exact' }
          )
          .is('deleted_at', null)
          .order(sortFieldLegacy, { ascending: sortDirection === 'asc' });

        if (status === 'premium') {
          query = query.or('status.eq.premium,is_premium.eq.true');
        } else if (status === 'standard') {
          query = query.or('status.eq.standard,is_premium.eq.false');
        }

        if (practitionerId) {
          query = query.eq('practitioner_id', practitionerId);
        }

        if (search) {
          const term = `%${search}%`;
          query = query.or(`name.ilike.${term},email.ilike.${term}`);
        }

        return query.range(from, to);
      }
    );

    if (error) {
      console.error('[admin] patients list error:', error);
      return NextResponse.json({ error: 'Erreur lors de la récupération des patients.' }, { status: 500 });
    }

    const patients = ((data ?? []) as PatientRecord[]).map((patient) => ({
      ...patient,
      full_name: patient.full_name ?? patient.name ?? null,
      practitioner_name: Array.isArray(patient.practitioners_public ?? patient.practitioners)
        ? (patient.practitioners_public ?? patient.practitioners)?.[0]?.full_name ?? null
        : (patient.practitioners_public ?? patient.practitioners)?.full_name ?? null
    }));

    return NextResponse.json({ patients, total: count ?? 0 });
  } catch (error) {
    console.error('[admin] patients list exception:', error);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
