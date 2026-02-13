import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPractitionerBySlug } from '@/lib/queries/booking';
import { sendEmail } from '@/lib/server/email';
import {
  buildGroupSessionConfirmationEmail,
  buildGroupSessionPractitionerNotificationEmail,
} from '@/lib/emails/group-session-confirmation';

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'AFEIA <contact@afeia.fr>';

function sanitize(str: string): string {
  return str
    .replace(/</g, '')
    .replace(/>/g, '')
    .replace(/"/g, '')
    .replace(/'/g, '')
    .trim()
    .slice(0, 500);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string; sessionId: string } }
) {
  try {
    const body = await request.json();

    const { name, first_name, email, phone, reason } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Nom et email sont requis.' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Format d\'email invalide.' },
        { status: 400 }
      );
    }

    const sanitizedName = sanitize(first_name ? `${first_name} ${name}` : name);
    const sanitizedEmail = email.trim().toLowerCase();

    const practitioner = await getPractitionerBySlug(params.slug);
    if (!practitioner) {
      return NextResponse.json(
        { error: 'Praticien non trouve.' },
        { status: 404 }
      );
    }

    const supabase = createAdminClient();

    // Verify session exists and belongs to practitioner
    const { data: session, error: sessionError } = await supabase
      .from('group_sessions')
      .select('id, practitioner_id, title, starts_at, ends_at, location_type, location_details, max_participants, status')
      .eq('id', params.sessionId)
      .eq('practitioner_id', practitioner.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Seance introuvable.' },
        { status: 404 }
      );
    }

    if (!['scheduled', 'confirmed'].includes(session.status)) {
      return NextResponse.json(
        { error: 'Cette seance n\'accepte plus d\'inscriptions.' },
        { status: 400 }
      );
    }

    // Check available spots
    const { data: countData } = await supabase
      .rpc('get_group_session_registration_count', { p_session_id: session.id });

    const currentCount = countData ?? 0;
    if (currentCount >= session.max_participants) {
      return NextResponse.json(
        { error: 'FULL', message: 'Cette seance est complete.' },
        { status: 409 }
      );
    }

    // Check for duplicate email
    const { data: existing } = await supabase
      .from('group_session_registrations')
      .select('id')
      .eq('group_session_id', session.id)
      .eq('email', sanitizedEmail)
      .neq('status', 'cancelled')
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'DUPLICATE', message: 'Cette adresse email est deja inscrite a cette seance.' },
        { status: 409 }
      );
    }

    // Optionally link to existing consultant
    let consultantId: string | null = null;
    const { data: consultant } = await supabase
      .from('consultants')
      .select('id')
      .eq('email', sanitizedEmail)
      .eq('practitioner_id', practitioner.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (consultant) {
      consultantId = consultant.id;
    }

    // Insert registration
    const { data: registration, error: regError } = await supabase
      .from('group_session_registrations')
      .insert({
        group_session_id: session.id,
        consultant_id: consultantId,
        practitioner_id: practitioner.id,
        name: sanitizedName,
        email: sanitizedEmail,
        phone: phone ? sanitize(phone) : null,
        source: 'online_booking',
        notes: reason ? sanitize(reason) : null,
      })
      .select()
      .single();

    if (regError) {
      console.error('Registration error:', regError);
      return NextResponse.json(
        { error: 'Erreur lors de l\'inscription.' },
        { status: 500 }
      );
    }

    // Format dates for emails
    const startsAt = new Date(session.starts_at);
    const endsAt = new Date(session.ends_at);

    const dateFormatted = new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(startsAt);

    const timeFormatted = `${new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(startsAt)} - ${new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(endsAt)}`;

    const locationText = session.location_type === 'video'
      ? 'Visioconference'
      : session.location_type === 'home_visit'
        ? 'A domicile'
        : (session.location_details || practitioner.booking_address || 'Au cabinet');

    // Send confirmation email to participant
    try {
      const confirmation = buildGroupSessionConfirmationEmail({
        participantName: first_name || sanitizedName,
        sessionTitle: session.title,
        dateFormatted,
        timeFormatted,
        location: locationText,
        practitionerName: practitioner.full_name,
      });

      await sendEmail({
        to: sanitizedEmail,
        from: FROM_EMAIL,
        subject: confirmation.subject,
        html: confirmation.html,
        text: confirmation.text,
      });
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
    }

    // Send notification email to practitioner
    try {
      const { data: practitionerData } = await supabase
        .from('practitioners')
        .select('email')
        .eq('id', practitioner.id)
        .single();

      if (practitionerData?.email) {
        const notification = buildGroupSessionPractitionerNotificationEmail({
          participantName: sanitizedName,
          participantEmail: sanitizedEmail,
          sessionTitle: session.title,
          dateFormatted,
          timeFormatted,
          currentCount: currentCount + 1,
          maxParticipants: session.max_participants,
        });

        await sendEmail({
          to: practitionerData.email,
          from: FROM_EMAIL,
          subject: notification.subject,
          html: notification.html,
          text: notification.text,
        });
      }
    } catch (emailError) {
      console.error('Failed to send practitioner notification:', emailError);
    }

    return NextResponse.json({
      registration_id: registration.id,
      session_title: session.title,
      starts_at: session.starts_at,
      ends_at: session.ends_at,
      practitioner_name: practitioner.full_name,
    });
  } catch (error) {
    console.error('Error in register API:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue.' },
      { status: 500 }
    );
  }
}
