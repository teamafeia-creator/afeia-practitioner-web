// GET /api/wearables/status
// État de connexion des objets connectés du consultant connecté (web ou mobile, Bearer).
// Lu dans la vue wearable_connection_overview (POL-04), qui n'expose pas le jeton.
import { NextRequest, NextResponse } from 'next/server';
import { resolveConsultantId } from '@/lib/mobile-auth';
import { createSupabaseAdminClient } from '@/lib/server/supabaseAdmin';
import { WEARABLES_CONSENT_VERSION } from '@/lib/wearables/consent-text';
import { consultantCanUseWearables, getActiveConsent } from '@/lib/wearables/consents';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const consultantId = await resolveConsultantId(request);
  if (!consultantId) {
    return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
  }

  const { data, error } = await createSupabaseAdminClient()
    .from('wearable_connection_overview')
    .select('provider, status, connected_at, last_sync_at, last_error, backfill_status, backfill_cursor, interrupted_at')
    .eq('consultant_id', consultantId);

  if (error) {
    console.error('[wearables/status] lecture impossible', { consultantId, code: error.code });
    return NextResponse.json({ error: "État de l'objet connecté indisponible." }, { status: 500 });
  }

  const [enabled, consent] = await Promise.all([
    consultantCanUseWearables(consultantId),
    getActiveConsent(consultantId, WEARABLES_CONSENT_VERSION),
  ]);

  return NextResponse.json(
    {
      // false : fonctionnalité non ouverte à ce compte (WEARABLES_ENABLED_FOR=internal), la carte est masquée.
      enabled,
      consent: { version: WEARABLES_CONSENT_VERSION, accepted: consent !== null, acceptedAt: consent?.acceptedAt ?? null },
      connections: data ?? [],
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
