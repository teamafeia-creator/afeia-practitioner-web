// POST /api/webhooks/polar — notifications Polar AccessLink (docs/wearables/polar.md §6).
//
// 1. Lit le corps BRUT (la signature porte sur les octets reçus).
// 2. PING → 200 sans rien enregistrer. Le PING de création arrive AVANT que Polar ne nous
//    donne le secret : il ne peut pas toujours être vérifié, et il ne déclenche rien.
// 3. Autres événements : HMAC-SHA256 (hex) avec POLAR_WEBHOOK_SECRET, temps constant ; sinon 401.
// 4. Enregistre l'événement (une ligne par ressource), répond 200, puis traite en arrière-plan
//    dès que l'événement est (re)passé en pending.
//
// Jamais de corps complet ni de jeton dans les logs.
import { NextRequest, NextResponse } from 'next/server';
import { runInBackground } from '@/lib/server/background';
import { recordEvent } from '@/lib/wearables/events';
import { getPolarConfig } from '@/lib/wearables/polar/config';
import { processPolarEvent } from '@/lib/wearables/polar/process-event';
import {
  EVENT_HEADER,
  InvalidPayloadError,
  SIGNATURE_HEADER,
  idempotencyKey,
  parsePolarNotification,
  verifyPolarSignature,
} from '@/lib/wearables/polar/webhook';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LOG = '[webhooks/polar]';

function isPing(rawBody: string, headerEvent: string | null): boolean {
  if (headerEvent?.toUpperCase() === 'PING') return true;
  try {
    return (JSON.parse(rawBody) as { event?: unknown })?.event === 'PING';
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const headerEvent = request.headers.get(EVENT_HEADER);

  if (isPing(rawBody, headerEvent)) {
    return NextResponse.json({ ok: true });
  }

  const secret = getPolarConfig().webhookSecret;
  if (!secret) {
    console.error(LOG, 'POLAR_WEBHOOK_SECRET absent : événement refusé', { event: headerEvent });
    return NextResponse.json({ error: 'signature invalide' }, { status: 401 });
  }
  if (!verifyPolarSignature(rawBody, request.headers.get(SIGNATURE_HEADER), secret)) {
    console.warn(LOG, 'signature absente ou invalide', { event: headerEvent });
    return NextResponse.json({ error: 'signature invalide' }, { status: 401 });
  }

  let notification;
  try {
    notification = parsePolarNotification(rawBody);
  } catch (error) {
    if (error instanceof InvalidPayloadError) {
      console.warn(LOG, 'payload invalide', { reason: error.message });
      return NextResponse.json({ error: 'payload invalide' }, { status: 400 });
    }
    throw error;
  }

  const { id, shouldProcess } = await recordEvent({
    provider: 'polar',
    eventType: notification.event,
    providerUserId: notification.userId,
    eventDate: notification.date,
    resourceUrl: notification.url,
    payload: {
      event: notification.event,
      user_id: notification.userId,
      date: notification.date,
      entity_id: notification.entityId,
      url: notification.url,
      timestamp: notification.timestamp,
    },
    idempotencyKey: idempotencyKey(notification),
  });

  if (shouldProcess) {
    runInBackground(`processPolarEvent ${id}`, () => processPolarEvent(id));
  }

  return NextResponse.json({ ok: true });
}
