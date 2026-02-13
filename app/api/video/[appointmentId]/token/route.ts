import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAuthClient, createSupabaseAdminClient } from '@/lib/server/supabaseAdmin';
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
      return NextResponse.json({ error: 'Rendez-vous non trouve.' }, { status: 404 });
    }

    if (appointment.practitioner_id !== practitionerId) {
      return NextResponse.json({ error: 'Acces refuse.' }, { status: 403 });
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
      return NextResponse.json({ error: 'Impossible de generer le token de visio.' }, { status: 502 });
    }

    const domain = process.env.DAILY_DOMAIN || 'afeia.daily.co';

    return NextResponse.json({
      token: meetingToken.token,
      roomUrl: `https://${domain}/${appointment.video_room_name}`,
    });
  } catch (error) {
    console.error('Error in GET video token:', error);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

/**
 * POST /api/video/[appointmentId]/token
 * Consultant (no auth): get a non-owner meeting token
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { appointmentId: string } }
) {
  try {
    const body = await request.json();
    const consultantName = body.consultantName || 'Consultant';

    const supabase = createSupabaseAdminClient();

    // Fetch appointment
    const { data: appointment, error: aptError } = await supabase
      .from('appointments')
      .select(`
        id, practitioner_id, video_room_name, video_link, starts_at, ends_at, status,
        consultation_type:consultation_types(name)
      `)
      .eq('id', params.appointmentId)
      .single();

    if (aptError || !appointment) {
      return NextResponse.json({ error: 'Rendez-vous non trouve.' }, { status: 404 });
    }

    if (!appointment.video_room_name) {
      return NextResponse.json({ error: 'Ce rendez-vous n\'a pas de salle de visio.' }, { status: 400 });
    }

    if (appointment.status === 'cancelled') {
      return NextResponse.json({ error: 'Ce rendez-vous a ete annule.' }, { status: 410 });
    }

    // Check time window: 15 min before starts_at until ends_at + 30 min
    const now = new Date();
    const startsAt = new Date(appointment.starts_at);
    const endsAt = new Date(appointment.ends_at);
    const windowStart = new Date(startsAt.getTime() - 15 * 60 * 1000);
    const windowEnd = new Date(endsAt.getTime() + 30 * 60 * 1000);

    if (now < windowStart || now > windowEnd) {
      return NextResponse.json(
        { error: 'La consultation n\'est pas encore accessible. Le lien sera actif 15 minutes avant le debut.' },
        { status: 403 }
      );
    }

    // Get practitioner name
    const { data: practitioner } = await supabase
      .from('practitioners')
      .select('full_name')
      .eq('id', appointment.practitioner_id)
      .single();

    const expiresAt = new Date(endsAt.getTime() + 60 * 60 * 1000); // +1h

    const meetingToken = await createMeetingToken({
      roomName: appointment.video_room_name,
      userName: consultantName,
      isOwner: false,
      expiresAt,
    });

    if (!meetingToken) {
      return NextResponse.json({ error: 'Impossible de generer le token de visio.' }, { status: 502 });
    }

    const domain = process.env.DAILY_DOMAIN || 'afeia.daily.co';
    const ct = appointment.consultation_type as unknown as { name: string } | null;

    return NextResponse.json({
      token: meetingToken.token,
      roomUrl: `https://${domain}/${appointment.video_room_name}`,
      practitionerName: practitioner?.full_name || 'Votre praticien',
      consultationType: ct?.name || 'Consultation',
      startsAt: appointment.starts_at,
    });
  } catch (error) {
    console.error('Error in POST video token:', error);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
