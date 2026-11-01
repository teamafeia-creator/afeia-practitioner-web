// GET /api/wearables/polar/connect?returnTo=/consultant/home
// Authentification : `Authorization: Bearer` (JWT mobile ou jeton Supabase du web consultant).
// Les sessions ne sont pas dans des cookies : une simple navigation ne pourrait pas
// s'authentifier. La route renvoie donc l'URL Polar en JSON ; le client y navigue
// (web : window.location.assign ; mobile : WebBrowser.openAuthSessionAsync).
import { NextRequest, NextResponse } from 'next/server';
import { resolveConsultantId } from '@/lib/mobile-auth';
import { WEARABLES_CONSENT_VERSION } from '@/lib/wearables/consent-text';
import { consultantCanUseWearables, getActiveConsent } from '@/lib/wearables/consents';
import { getPolarConfig } from '@/lib/wearables/polar/config';
import { buildAuthorizeUrl } from '@/lib/wearables/polar/oauth';
import { signState } from '@/lib/wearables/polar/state';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const consultantId = await resolveConsultantId(request);
  if (!consultantId) {
    return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
  }

  // Ouverture progressive (WEARABLES_ENABLED_FOR) : en « internal », seuls les comptes de l'équipe.
  if (!(await consultantCanUseWearables(consultantId))) {
    return NextResponse.json({ error: 'not_enabled' }, { status: 403 });
  }
  // Aucune connexion sans consentement actif sur la version courante du texte.
  if (!(await getActiveConsent(consultantId, WEARABLES_CONSENT_VERSION))) {
    return NextResponse.json({ error: 'consent_required', version: WEARABLES_CONSENT_VERSION }, { status: 403 });
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
