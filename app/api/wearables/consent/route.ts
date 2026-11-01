// POST /api/wearables/consent   { "version": "v1" }
// Le patient accepte le texte de consentement (content/consents/wearables-v1.md) avant la
// redirection vers Polar. Authentification Bearer (web ou mobile) ; le consultant vient du jeton.
import { NextRequest, NextResponse } from 'next/server';
import { resolveConsultantId } from '@/lib/mobile-auth';
import { WEARABLES_CONSENT_VERSION } from '@/lib/wearables/consent-text';
import { consultantCanUseWearables, recordConsent } from '@/lib/wearables/consents';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const consultantId = await resolveConsultantId(request);
  if (!consultantId) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
  if (!(await consultantCanUseWearables(consultantId))) {
    return NextResponse.json({ error: 'not_enabled' }, { status: 403 });
  }

  let version: unknown;
  try {
    version = ((await request.json()) as { version?: unknown })?.version;
  } catch {
    version = undefined;
  }
  // Le patient doit avoir accepté le texte actuellement affiché, pas une ancienne version.
  if (version !== WEARABLES_CONSENT_VERSION) {
    return NextResponse.json({ error: 'version_mismatch', version: WEARABLES_CONSENT_VERSION }, { status: 409 });
  }

  const consent = await recordConsent(consultantId, WEARABLES_CONSENT_VERSION);
  return NextResponse.json({ ok: true, consent }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
}
