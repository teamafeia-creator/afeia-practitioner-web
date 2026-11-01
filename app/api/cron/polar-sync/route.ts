// GET /api/cron/polar-sync — rattrapage quotidien Polar (POL-09), déclaré dans vercel.json.
// Protégé par `Authorization: Bearer ${CRON_SECRET}` (convention Vercel Cron).
// CRON_SECRET lu à la demande : absent → 503 (aucun traitement) ; présent mais en-tête faux → 401.
import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getCronSecret } from '@/lib/wearables/polar/config';
import { runPolarSync } from '@/lib/wearables/polar/sync';
import { readPolarConfig } from '@/lib/wearables/polar/unavailable';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** Durée max de la fonction (s). Le traitement s'arrête de lui-même 60 s avant. */
export const maxDuration = 300;

function authorized(header: string | null, secret: string): boolean {
  if (!header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export async function GET(request: NextRequest) {
  const secret = readPolarConfig('cron', getCronSecret);
  if (!secret.ok) return secret.response;
  if (!authorized(request.headers.get('authorization'), secret.value)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  try {
    const summary = await runPolarSync({ budgetMs: (maxDuration - 60) * 1000 });
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    console.error('[cron/polar-sync] échec', { message: (error as Error).message });
    return NextResponse.json({ ok: false, error: 'Synchronisation impossible' }, { status: 500 });
  }
}
