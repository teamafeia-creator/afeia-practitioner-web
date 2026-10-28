import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, createSupabaseAuthClient } from '@/lib/server/supabaseAdmin';
import { refundDeposit } from '@/lib/server/booking';

/** POST /api/appointments/[id]/refund-deposit : le praticien annule une séance, l'acompte payé est remboursé. */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '').trim();
  if (!token) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
  const { data: auth } = await createSupabaseAuthClient().auth.getUser(token);
  if (!auth.user) return NextResponse.json({ error: 'Session invalide.' }, { status: 401 });
  const { data: apt } = await createSupabaseAdminClient().from('appointments').select('practitioner_id, deposit_status').eq('id', params.id).maybeSingle();
  if (!apt) return NextResponse.json({ error: 'Séance introuvable.' }, { status: 404 });
  if (apt.practitioner_id !== auth.user.id) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
  if (apt.deposit_status !== 'paid') return NextResponse.json({ refunded: false });
  try {
    const refunded = await refundDeposit(params.id);
    return NextResponse.json({ refunded });
  } catch (err) {
    console.error('[refund-deposit] failed', err);
    return NextResponse.json({ error: 'Le remboursement de l’acompte a échoué. Faites-le depuis votre compte Stripe.' }, { status: 502 });
  }
}
