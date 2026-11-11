// GET /api/cron/wearable-recaps — chaque matin à 7 h (Europe/Paris) :
//   1. coches de la checklist par l'objet (items activés par le praticien) ;
//   2. brouillons de récap des consultants dont c'est le jour prévu.
// Rien n'est envoyé : le praticien valide chaque récap (dossier ou Revue du matin).
// Vercel Cron est en UTC : la route est appelée à 5 h et 6 h UTC et ne travaille qu'à 7 h à Paris
// (été comme hiver). ?force=1 permet de la lancer à la main.
// Protégé par `Authorization: Bearer ${CRON_SECRET}`, comme /api/cron/polar-sync.
import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getCronSecret } from '@/lib/wearables/polar/config';
import { readPolarConfig } from '@/lib/wearables/polar/unavailable';
import { runDailyWearableJobs } from '@/lib/wearables/insights/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function authorized(header: string | null, secret: string): boolean {
  if (!header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

function parisHour(now: Date): number {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', hour: '2-digit', hourCycle: 'h23' }).format(now));
}

export async function GET(request: NextRequest) {
  const secret = readPolarConfig('cron', getCronSecret);
  if (!secret.ok) return secret.response;
  if (!authorized(request.headers.get('authorization'), secret.value)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  const now = new Date();
  if (request.nextUrl.searchParams.get('force') !== '1' && parisHour(now) !== 7) {
    return NextResponse.json({ ok: true, skipped: 'pas 7 h à Paris' });
  }
  try {
    const summary = await runDailyWearableJobs(getSupabaseAdmin(), now);
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    console.error('[cron/wearable-recaps] échec', { message: (error as Error).message });
    return NextResponse.json({ ok: false, error: 'Traitement impossible' }, { status: 500 });
  }
}
