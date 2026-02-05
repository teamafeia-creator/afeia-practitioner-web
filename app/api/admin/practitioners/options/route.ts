import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/server/supabaseAdmin';
import { requireAdmin } from '@/lib/server/adminGuard';

export async function GET(request: NextRequest) {
  const guard = await requireAdmin(request);
  if ('response' in guard) {
    return guard.response;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('practitioners')
      .select('id, full_name')
      .order('full_name', { ascending: true });

    if (error) {
      console.error('[admin] practitioners options error:', error);
      return NextResponse.json({ error: 'Erreur lors de la récupération des praticiens.' }, { status: 500 });
    }

    return NextResponse.json({ practitioners: data ?? [] });
  } catch (error) {
    console.error('[admin] practitioners options exception:', error);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
