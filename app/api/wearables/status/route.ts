// GET /api/wearables/status
// État de connexion des objets connectés du consultant connecté (web ou mobile, Bearer).
// Lu dans la vue wearable_connection_overview (POL-04), qui n'expose pas le jeton.
import { NextRequest, NextResponse } from 'next/server';
import { resolveConsultantId } from '@/lib/mobile-auth';
import { createSupabaseAdminClient } from '@/lib/server/supabaseAdmin';
import { WEARABLES_CONSENT_VERSION } from '@/lib/wearables/consent-text';
import { consultantCanUseWearables, getActiveConsent } from '@/lib/wearables/consents';
import { parisDay } from '@/lib/wearables/insights/series';
import { CALIBRATION_WINDOW_DAYS, type WearNights } from '@/lib/wearables/display';

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

  const today = parisDay(new Date());
  const from = new Date(Date.parse(`${today}T00:00:00Z`) - (CALIBRATION_WINDOW_DAYS - 1) * 86_400_000).toISOString().slice(0, 10);
  const [enabled, consent, nightsRes] = await Promise.all([
    consultantCanUseWearables(consultantId),
    getActiveConsent(consultantId, WEARABLES_CONSENT_VERSION),
    // Nuits mesurées sur la fenêtre d'habituel : sommeil ≥ 3 h, ou récupération nocturne présente.
    createSupabaseAdminClient().rpc('wearable_daily_summary', { p_consultant_id: consultantId, p_days: CALIBRATION_WINDOW_DAYS, p_today: today }),
  ]);
  const nights = summarizeNights((nightsRes.data ?? []) as { day: string; sleep_min: number | null; hrv_ms: number | null; night_hr_bpm: number | null }[], today, from);

  return NextResponse.json(
    {
      // false : fonctionnalité non ouverte à ce compte (WEARABLES_ENABLED_FOR=internal), la carte est masquée.
      enabled,
      consent: { version: WEARABLES_CONSENT_VERSION, accepted: consent !== null, acceptedAt: consent?.acceptedAt ?? null },
      connections: data ?? [],
      nights,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

function summarizeNights(
  rows: { day: string; sleep_min: number | null; hrv_ms: number | null; night_hr_bpm: number | null }[],
  today: string,
  from: string
): WearNights {
  const valid = rows.filter((r) => r.day >= from && r.day <= today && ((r.sleep_min !== null && r.sleep_min >= 180) || r.hrv_ms !== null || r.night_hr_bpm !== null));
  const last = valid.map((r) => r.day).sort().pop() ?? null;
  const daysSinceLast = last ? Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${last}T00:00:00Z`)) / 86_400_000) : null;
  return { validInWindow: valid.length, windowDays: CALIBRATION_WINDOW_DAYS, lastNight: last, daysSinceLast };
}
