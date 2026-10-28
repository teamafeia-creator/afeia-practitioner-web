import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseAdminClient, createSupabaseAuthClient } from '@/lib/server/supabaseAdmin';
import { notifyReschedule } from '@/lib/server/booking';

const bodySchema = z.object({ previousStartsAt: z.string().datetime({ offset: true }) });

/** POST /api/appointments/[id]/notify-reschedule : le praticien a déplacé la séance, le consultant reçoit le nouvel horaire. */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '').trim();
  if (!token) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
  const { data: auth } = await createSupabaseAuthClient().auth.getUser(token);
  if (!auth.user) return NextResponse.json({ error: 'Session invalide.' }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Données invalides.' }, { status: 400 });
  const { data: apt } = await createSupabaseAdminClient().from('appointments').select('practitioner_id').eq('id', params.id).maybeSingle();
  if (!apt) return NextResponse.json({ error: 'Séance introuvable.' }, { status: 404 });
  if (apt.practitioner_id !== auth.user.id) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
  try {
    const sent = await notifyReschedule(params.id, parsed.data.previousStartsAt);
    return NextResponse.json({ sent });
  } catch (err) {
    console.error('[notify-reschedule] failed', err);
    return NextResponse.json({ error: 'L’e-mail de changement d’horaire n’a pas pu être envoyé.' }, { status: 502 });
  }
}
