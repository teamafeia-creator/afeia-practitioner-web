import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/server/supabaseAdmin';
import { requireAdmin } from '@/lib/server/adminGuard';

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
    const supabase = createSupabaseAdminClient();

    const { data: practitioners, error } = await supabase
      .from('practitioners')
      .select('id, email, full_name, phone, calendly_url, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur liste praticiens:', error);
      return NextResponse.json({ error: 'Erreur lors de la récupération des praticiens.' }, { status: 500 });
    }

    return NextResponse.json({ practitioners: practitioners || [] });
  } catch (err) {
    console.error('Exception GET practitioners:', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
