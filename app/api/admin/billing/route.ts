import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
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
    const status = searchParams.get('status')?.trim() ?? '';
    const paymentFailed = searchParams.get('paymentFailed')?.trim() ?? '';
    const practitionerId = searchParams.get('practitioner')?.trim() ?? '';

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const supabase = createAdminClient();
    let query = supabase
      .from('stripe_subscriptions')
      .select(
        'id, practitioner_id, status, price_id, current_period_end, payment_failed, latest_invoice_id, practitioners_public(full_name, email)',
        { count: 'exact' }
      );

    if (status) {
      query = query.eq('status', status);
    }

    if (paymentFailed) {
      query = query.eq('payment_failed', paymentFailed === 'failed');
    }

    if (practitionerId) {
      query = query.eq('practitioner_id', practitionerId);
    }

    query = query.order('current_period_end', { ascending: true }).range(from, to);

    const { data, count, error } = await query;

    if (error) {
      console.error('[admin] billing fetch error:', error);
      return NextResponse.json({ error: 'Erreur lors du chargement du billing.' }, { status: 500 });
    }

    return NextResponse.json({ billing: data ?? [], total: count ?? 0 });
  } catch (error) {
    console.error('[admin] billing fetch exception:', error);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
