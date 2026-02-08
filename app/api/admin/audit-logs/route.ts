import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminAuth } from '@/lib/admin/auth';

const DEFAULT_PAGE_SIZE = 20;

function getNumber(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const guard = await requireAdminAuth(request);
  if ('response' in guard) {
    return guard.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = getNumber(searchParams.get('page'), 1);
    const pageSize = getNumber(searchParams.get('pageSize'), DEFAULT_PAGE_SIZE);
    const adminEmail = searchParams.get('admin')?.trim() ?? '';
    const action = searchParams.get('action')?.trim() ?? '';
    const targetId = searchParams.get('targetId')?.trim() ?? '';
    const period = searchParams.get('period')?.trim() ?? '';

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const supabase = createAdminClient();

    let query = supabase
      .from('admin_audit_log')
      .select('*', { count: 'exact' });

    if (adminEmail) {
      query = query.eq('admin_email', adminEmail);
    }

    if (action) {
      query = query.like('action', `${action}%`);
    }

    if (targetId) {
      query = query.eq('target_id', targetId);
    }

    if (period) {
      const now = new Date();
      let startDate: Date;
      switch (period) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0);
      }
      query = query.gte('created_at', startDate.toISOString());
    }

    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data, count, error } = await query;

    if (error) {
      console.error('[admin] audit log fetch error:', error);
      return NextResponse.json({ error: 'Erreur lors du chargement des logs.' }, { status: 500 });
    }

    return NextResponse.json({ logs: data ?? [], total: count ?? 0 });
  } catch (error) {
    console.error('[admin] audit log fetch exception:', error);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
