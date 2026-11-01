// GET /api/cron/polar-sync — rattrapage quotidien Polar (POL-09), déclaré dans vercel.json.
// Protégé par `Authorization: Bearer ${CRON_SECRET}` (convention Vercel Cron).
// Contrairement au cron existant, refuse tout appel si CRON_SECRET n'est pas défini.
import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { runPolarSync } from '@/lib/wearables/polar/sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** Durée max de la fonction (s). Le traitement s'arrête de lui-même 60 s avant. */
export const maxDuration = 300;

function authorized(header: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export async function GET(request: NextRequest) {
  if (!authorized(request.headers.get('authorization'))) {
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
