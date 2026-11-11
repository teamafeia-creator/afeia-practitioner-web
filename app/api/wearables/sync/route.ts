// POST /api/wearables/sync — synchronisation Polar à la demande (bouton « Synchroniser »).
//
// Deux appelants, toujours avec `Authorization: Bearer <jeton Supabase>` :
//  - le consultant lui-même (espace web ou mobile) : corps vide ;
//  - son praticien : corps `{ consultantId }`, vérifié comme appartenant au praticien.
//
// Récupère les derniers jours (défaut : 3, max 7) des ressources MVP, de façon idempotente.
// Anti-rafale : une synchro par consultant par minute (en mémoire, par instance).
import { NextRequest, NextResponse } from 'next/server';
import { resolveConsultantId } from '@/lib/mobile-auth';
import { createSupabaseAdminClient, createSupabaseAuthClient } from '@/lib/server/supabaseAdmin';
import { syncConsultantConnection } from '@/lib/wearables/polar/sync';
import { readPolarConfig } from '@/lib/wearables/polar/unavailable';
import { getPolarApiCredentials } from '@/lib/wearables/polar/config';
import { applyAutoChecks } from '@/lib/wearables/insights/server';
import { parisDay } from '@/lib/wearables/insights/series';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MIN_INTERVAL_MS = 60_000;
const lastRun = new Map<string, number>();

const NO_STORE = { 'Cache-Control': 'no-store' };

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

async function resolveTarget(request: NextRequest): Promise<{ consultantId: string } | { error: string; status: number }> {
  let body: { consultantId?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    // corps vide : appel du consultant lui-même
  }
  const requested = typeof body.consultantId === 'string' ? body.consultantId : null;

  if (!requested) {
    const consultantId = await resolveConsultantId(request);
    return consultantId ? { consultantId } : { error: 'Authentification requise.', status: 401 };
  }

  // Appel praticien : le consultant doit lui appartenir.
  const token = request.headers.get('authorization')?.replace('Bearer ', '').trim();
  if (!token) return { error: 'Authentification requise.', status: 401 };
  const { data: authData, error: authError } = await createSupabaseAuthClient().auth.getUser(token);
  if (authError || !authData.user) return { error: 'Session invalide.', status: 401 };

  const { data: consultant } = await createSupabaseAdminClient()
    .from('consultants')
    .select('id, practitioner_id')
    .eq('id', requested)
    .maybeSingle();
  if (!consultant) return { error: 'Consultant introuvable.', status: 404 };
  if (consultant.practitioner_id !== authData.user.id) return { error: 'Accès refusé.', status: 403 };
  return { consultantId: consultant.id };
}

export async function POST(request: NextRequest) {
  const config = readPolarConfig('cron', getPolarApiCredentials);
  if (!config.ok) return config.response;

  const target = await resolveTarget(request);
  if ('error' in target) return json({ error: target.error }, target.status);
  const { consultantId } = target;

  const now = Date.now();
  const previous = lastRun.get(consultantId) ?? 0;
  if (now - previous < MIN_INTERVAL_MS) {
    const retryInSeconds = Math.ceil((MIN_INTERVAL_MS - (now - previous)) / 1000);
    return json({ error: `Synchronisation déjà lancée : réessayez dans ${retryInSeconds} s.`, retryInSeconds }, 429);
  }
  lastRun.set(consultantId, now);

  const result = await syncConsultantConnection(consultantId);
  if (result.outcome === 'synced') {
    // Coches par l'objet : « à la synchronisation suivante ». Un échec ici ne fait pas échouer la synchro.
    let autoChecks = 0;
    try {
      autoChecks = await applyAutoChecks(createSupabaseAdminClient(), consultantId, parisDay(new Date()));
    } catch (error) {
      console.error('[wearables/sync] coches par l’objet', { message: (error as Error).message });
    }
    return json({ ok: true, ...result, autoChecks });
  }
  // Erreurs « attendues » : on libère l'anti-rafale pour permettre un nouvel essai après correction.
  if (result.outcome !== 'rate_limited') lastRun.delete(consultantId);
  const status = result.outcome === 'rate_limited' ? 429 : result.outcome === 'error' ? 502 : 409;
  return json({ ok: false, outcome: result.outcome, error: result.message }, status);
}
