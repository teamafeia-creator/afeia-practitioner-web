import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAuthClient, createSupabaseAdminClient } from '@/lib/server/supabaseAdmin';
import { timingSafeEqual } from 'crypto';
import { z } from 'zod';
import { createMeetingToken } from '@/lib/server/daily';

/**
 * GET /api/video/[appointmentId]/token
 * Practitioner: get an owner meeting token
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { appointmentId: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '').trim();
    if (!token) {
      return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
    }

    const supabaseAuth = createSupabaseAuthClient();
    const { data: authData, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Session invalide.' }, { status: 401 });
    }

    const practitionerId = authData.user.id;
    const supabase = createSupabaseAdminClient();

    // Fetch appointment
    const { data: appointment, error: aptError } = await supabase
      .from('appointments')
      .select('id, practitioner_id, video_room_name, video_link, starts_at, ends_at')
      .eq('id', params.appointmentId)
      .single();

    if (aptError || !appointment) {
      return NextResponse.json({ error: 'Rendez-vous non trouvé.' }, { status: 404 });
    }

    if (appointment.practitioner_id !== practitionerId) {
      return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
    }

    if (!appointment.video_room_name) {
      return NextResponse.json({ error: 'Ce rendez-vous n\'a pas de salle de visio.' }, { status: 400 });
    }

    // Get practitioner name
    const { data: practitioner } = await supabase
      .from('practitioners')
      .select('full_name')
      .eq('id', practitionerId)
      .single();

    const expiresAt = new Date(new Date(appointment.ends_at).getTime() + 60 * 60 * 1000); // +1h

    const meetingToken = await createMeetingToken({
      roomName: appointment.video_room_name,
      userName: practitioner?.full_name || 'Praticien',
      isOwner: true,
      expiresAt,
    });

    if (!meetingToken) {
      return NextResponse.json({ error: 'Impossible de générer le token de visio.' }, { status: 502 });
    }

    const domain = process.env.DAILY_DOMAIN || 'afeia.daily.co';

    return NextResponse.json({
      token: meetingToken.token,
      roomUrl: `https://${domain}/${appointment.video_room_name}`,
    });
  } catch (error) {
    console.error('Error in GET vidéo token:', error);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

const consultantBodySchema = z.object({
  token: z.string().min(1).max(200),
});

const INVALID_LINK = 'Ce lien de consultation n\'est pas valide.';

const parisDay = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris' });
const parisHour = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });

/** « 14 h 05 » */
function hourLabel(date: Date): string {
  return parisHour.format(date).replace(':', ' h ');
}

function sameJoinToken(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * POST /api/video/[appointmentId]/token
 * Consultant (sans compte) : jeton Daily non-hôte, sur présentation du secret du lien reçu par e-mail.
 * Le consultant arrive dans la salle d'attente ; le praticien le fait entrer.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { appointmentId: string } }
) {
  try {
    const parsed = consultantBodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: INVALID_LINK }, { status: 403 });
    }

    const supabase = createSupabaseAdminClient();

    const { data: appointment, error: aptError } = await supabase
      .from('appointments')
      .select(`
        id, practitioner_id, video_room_name, video_join_token, starts_at, ends_at, status, booking_name,
        patient:consultants(name, first_name, last_name),
        consultation_type:consultation_types(name)
      `)
      .eq('id', params.appointmentId)
      .maybeSingle();

    // Même réponse que le rendez-vous existe ou non
    if (aptError || !appointment || !appointment.video_join_token || !sameJoinToken(parsed.data.token, appointment.video_join_token)) {
      return NextResponse.json({ error: INVALID_LINK }, { status: 403 });
    }

    if (appointment.status === 'cancelled') {
      return NextResponse.json({ error: 'Ce rendez-vous a été annulé.' }, { status: 410 });
    }

    if (!appointment.video_room_name) {
      return NextResponse.json({ error: 'Ce rendez-vous n\'a pas de salle de visio.' }, { status: 400 });
    }

    // Fenêtre d'accès : 15 min avant le début jusqu'à 30 min après la fin
    const now = new Date();
    const startsAt = new Date(appointment.starts_at);
    const endsAt = new Date(appointment.ends_at);
    const windowStart = new Date(startsAt.getTime() - 15 * 60 * 1000);
    const windowEnd = new Date(endsAt.getTime() + 30 * 60 * 1000);

    if (now < windowStart) {
      const today = parisDay.format(now) === parisDay.format(windowStart);
      return NextResponse.json(
        {
          error: `La consultation n'est pas encore accessible. Le lien sera actif ${today ? 'à partir de' : `le ${parisDay.format(windowStart)} à partir de`} ${hourLabel(windowStart)}.`,
          code: 'NOT_YET_OPEN',
          opensAt: windowStart.toISOString(),
        },
        { status: 403 }
      );
    }

    if (now > windowEnd) {
      return NextResponse.json(
        { error: 'Cette consultation est terminée : le lien n\'est plus actif.', code: 'CLOSED' },
        { status: 403 }
      );
    }

    // Get practitioner name
    const { data: practitioner } = await supabase
      .from('practitioners')
      .select('full_name')
      .eq('id', appointment.practitioner_id)
      .single();

    const patient = appointment.patient as unknown as { name: string | null; first_name: string | null; last_name: string | null } | null;
    const consultantName =
      (patient && (patient.name || [patient.first_name, patient.last_name].filter(Boolean).join(' '))) ||
      appointment.booking_name ||
      'Consultant';

    const expiresAt = new Date(endsAt.getTime() + 60 * 60 * 1000); // +1h

    const meetingToken = await createMeetingToken({
      roomName: appointment.video_room_name,
      userName: consultantName,
      isOwner: false,
      expiresAt,
    });

    if (!meetingToken) {
      return NextResponse.json({ error: 'Impossible de générer le token de visio.' }, { status: 502 });
    }

    const domain = process.env.DAILY_DOMAIN || 'afeia.daily.co';
    const ct = appointment.consultation_type as unknown as { name: string } | null;

    return NextResponse.json({
      token: meetingToken.token,
      roomUrl: `https://${domain}/${appointment.video_room_name}`,
      consultantName,
      practitionerName: practitioner?.full_name || 'Votre praticien',
      consultationType: ct?.name || 'Consultation',
      startsAt: appointment.starts_at,
    });
  } catch (error) {
    console.error('Error in POST vidéo token:', error);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
