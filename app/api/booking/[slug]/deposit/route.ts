import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { releasePendingAppointment, verifyDepositSession } from '@/lib/server/booking';

/**
 * GET  /api/booking/[slug]/deposit?session_id=… : retour de Stripe, confirme la séance si l'acompte est payé
 * POST /api/booking/[slug]/deposit { appointment_id } : paiement abandonné, libère le créneau
 */
export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  const sessionId = new URL(request.url).searchParams.get('session_id');
  if (!sessionId) return NextResponse.json({ error: 'session_id manquant' }, { status: 400 });
  try {
    const r = await verifyDepositSession(sessionId);
    if (!r) return NextResponse.json({ error: 'Paiement introuvable.' }, { status: 404 });
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('appointments')
      .select('id, starts_at, ends_at, location_type, video_link, booking_email, deposit_cents, deposit_status, consultation_type:consultation_types(name, duration_minutes, price_cents), practitioner:practitioners(full_name, booking_address)')
      .eq('id', r.appointmentId)
      .maybeSingle();
    type Row = {
      id: string;
      starts_at: string;
      ends_at: string;
      location_type: string;
      video_link: string | null;
      booking_email: string | null;
      deposit_cents: number | null;
      deposit_status: string;
      consultation_type: { name: string; duration_minutes: number; price_cents: number | null } | null;
      practitioner: { full_name: string; booking_address: string | null } | null;
    };
    const a = data as unknown as Row | null;
    if (!a) return NextResponse.json({ error: 'Rendez-vous introuvable.' }, { status: 404 });
    return NextResponse.json({
      paid: r.paid,
      appointment_id: a.id,
      starts_at: a.starts_at,
      ends_at: a.ends_at,
      consultation_type_name: a.consultation_type?.name ?? 'Séance',
      duration_minutes: a.consultation_type?.duration_minutes ?? null,
      price_cents: a.consultation_type?.price_cents ?? null,
      practitioner_name: a.practitioner?.full_name ?? '',
      practitioner_address: a.practitioner?.booking_address ?? null,
      location_type: a.location_type,
      video_link: a.video_link,
      email: a.booking_email,
      deposit_cents: a.deposit_cents ?? 0,
      ics_download_url: `/api/booking/${params.slug}/ics?appointment_id=${a.id}`,
    });
  } catch (err) {
    console.error('[deposit] verify failed', err);
    return NextResponse.json({ error: 'Vérification du paiement impossible pour le moment.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { appointment_id } = (await request.json()) as { appointment_id?: string };
    if (!appointment_id) return NextResponse.json({ error: 'appointment_id manquant' }, { status: 400 });
    await releasePendingAppointment(appointment_id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[deposit] release failed', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
