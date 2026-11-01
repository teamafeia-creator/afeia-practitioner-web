// GET /api/wearables/polar/connect?returnTo=/consultant/home
// Authentification : `Authorization: Bearer` (JWT mobile ou jeton Supabase du web consultant).
// Les sessions ne sont pas dans des cookies : une simple navigation ne pourrait pas
// s'authentifier. La route renvoie donc l'URL Polar en JSON ; le client y navigue
// (web : window.location.assign ; mobile : WebBrowser.openAuthSessionAsync).
import { NextRequest, NextResponse } from 'next/server';
import { resolveConsultantId } from '@/lib/mobile-auth';
import { getPolarConfig } from '@/lib/wearables/polar/config';
import { buildAuthorizeUrl } from '@/lib/wearables/polar/oauth';
import { signState } from '@/lib/wearables/polar/state';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const consultantId = await resolveConsultantId(request);
  if (!consultantId) {
    return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
  }

  const { state } = signState(
    { consultantId, returnTo: request.nextUrl.searchParams.get('returnTo') },
    getPolarConfig().stateSecret
  );

  return NextResponse.json(
    { authorizeUrl: buildAuthorizeUrl(state) },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
