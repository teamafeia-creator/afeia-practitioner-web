// GET /api/wearables/status
// État de connexion des objets connectés du consultant connecté (web ou mobile, Bearer).
// Lu dans la vue wearable_connection_overview (POL-04), qui n'expose pas le jeton.
import { NextRequest, NextResponse } from 'next/server';
import { resolveConsultantId } from '@/lib/mobile-auth';
import { createSupabaseAdminClient } from '@/lib/server/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const consultantId = await resolveConsultantId(request);
  if (!consultantId) {
    return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
  }

  const { data, error } = await createSupabaseAdminClient()
    .from('wearable_connection_overview')
    .select('provider, status, connected_at, last_sync_at, last_error')
    .eq('consultant_id', consultantId);

  if (error) {
    console.error('[wearables/status] lecture impossible', { consultantId, code: error.code });
    return NextResponse.json({ error: "État de l'objet connecté indisponible." }, { status: 500 });
  }

  return NextResponse.json({ connections: data ?? [] }, { headers: { 'Cache-Control': 'no-store' } });
}
