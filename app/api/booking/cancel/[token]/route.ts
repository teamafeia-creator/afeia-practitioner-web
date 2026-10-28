import { NextResponse } from 'next/server';
import { cancelByToken } from '@/lib/server/booking';
import { triggerWaitlistNotificationServer } from '@/lib/server/waitlist-notify';

/** POST /api/booking/cancel/[token] : annulation par le consultant depuis le lien de l'e-mail. */
export async function POST(_request: Request, { params }: { params: { token: string } }) {
  try {
    const r = await cancelByToken(params.token);
    if (!r.ok) return NextResponse.json({ error: r.message ?? 'Annulation impossible.' }, { status: 400 });
    await triggerWaitlistNotificationServer(params.token).catch(() => undefined);
    return NextResponse.json(r);
  } catch (err) {
    console.error('[cancel] failed', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
