import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPractitionerBySlug } from '@/lib/queries/booking';
import { sendEmail } from '@/lib/server/email';
import { buildConfirmationEmail, buildPractitionerNotificationEmail } from '@/lib/emails/booking-confirmation';
import { generateICS } from '@/lib/utils/generate-ics';

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'AFEIA <contact@afeia.fr>';

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const body = await request.json();

    // Validate required fields
    const { consultation_type_id, starts_at, name, first_name, email, phone, reason, consent_rgpd } = body;

    if (!consultation_type_id || !starts_at || !name || !first_name || !email || !phone) {
      return NextResponse.json(
        { error: 'Tous les champs obligatoires doivent etre remplis.' },
        { status: 400 }
      );
    }

    if (!consent_rgpd) {
      return NextResponse.json(
        { error: 'Le consentement RGPD est requis.' },
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

    // Validate phone format (French: 10 digits starting with 0)
    const cleanPhone = phone.replace(/[\s.-]/g, '');
    if (!/^0\d{9}$/.test(cleanPhone)) {
      return NextResponse.json(
        { error: 'Format de telephone invalide.' },
        { status: 400 }
      );
    }

    // Sanitize text inputs
    const sanitizedName = sanitize(name);
    const sanitizedFirstName = sanitize(first_name);
    const sanitizedReason = reason ? sanitize(reason) : null;

    const practitioner = await getPractitionerBySlug(params.slug);
    if (!practitioner) {
      return NextResponse.json(
        { error: 'Praticien non trouve.' },
        { status: 404 }
      );
    }

    const ct = practitioner.consultation_types.find(t => t.id === consultation_type_id);
    if (!ct) {
      return NextResponse.json(
        { error: 'Type de consultation non trouve.' },
        { status: 404 }
      );
    }

    // Calculate ends_at
    const startsAtDate = new Date(starts_at);
    const endsAtDate = new Date(startsAtDate.getTime() + ct.duration_minutes * 60 * 1000);
    const endsAt = endsAtDate.toISOString();

    const fullName = `${sanitizedFirstName} ${sanitizedName}`;

    // Book using RPC (atomic)
    const supabase = createAdminClient();
    const { data: appointmentId, error: rpcError } = await supabase.rpc('book_appointment', {
      p_practitioner_id: practitioner.id,
      p_consultation_type_id: consultation_type_id,
      p_starts_at: starts_at,
      p_ends_at: endsAt,
      p_booking_name: fullName,
      p_booking_email: email,
      p_booking_phone: cleanPhone,
      p_reason: sanitizedReason,
    });

    if (rpcError) {
      if (rpcError.message?.includes('SLOT_CONFLICT')) {
        return NextResponse.json(
          { error: 'SLOT_CONFLICT', message: 'Ce creneau vient d\'etre reserve. Veuillez en choisir un autre.' },
          { status: 409 }
        );
      }
      console.error('Booking RPC error:', rpcError);
      return NextResponse.json(
        { error: 'Une erreur est survenue lors de la reservation.' },
        { status: 500 }
      );
    }

    // Check if this is a new or existing consultant
    const { data: consultant } = await supabase
      .from('consultants')
      .select('id, source')
      .eq('email', email)
      .eq('practitioner_id', practitioner.id)
      .is('deleted_at', null)
      .single();

    const isNewConsultant = consultant?.source === 'online_booking';

    // Format date for display
    const dateFormatted = new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(startsAtDate);

    const timeFormatted = new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(startsAtDate);

    const emailData = {
      consultantFirstName: sanitizedFirstName,
      consultantName: fullName,
      consultantEmail: email,
      practitionerName: practitioner.full_name,
      practitionerAddress: practitioner.booking_address,
      dateFormatted,
      timeFormatted,
      consultationTypeName: ct.name,
      durationMinutes: ct.duration_minutes,
      cancellationPolicyHours: practitioner.cancellation_policy_hours,
      cancellationPolicyText: practitioner.cancellation_policy_text,
      reason: sanitizedReason,
    };

    // Send confirmation email to consultant
    try {
      const confirmation = buildConfirmationEmail(emailData);
      await sendEmail({
        to: email,
        from: FROM_EMAIL,
        subject: confirmation.subject,
        html: confirmation.html,
        text: confirmation.text,
      });
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Don't fail the booking because of email
    }

    // Send notification email to practitioner
    try {
      const { data: practitionerData } = await supabase
        .from('practitioners')
        .select('email')
        .eq('id', practitioner.id)
        .single();

      if (practitionerData?.email) {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.afeia.fr';
        const agendaDate = starts_at.split('T')[0];
        const notification = buildPractitionerNotificationEmail({
          ...emailData,
          consultantPhone: cleanPhone,
          agendaUrl: `${baseUrl}/agenda?date=${agendaDate}`,
          isNewConsultant,
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
      appointment_id: appointmentId,
      starts_at,
      ends_at: endsAt,
      consultation_type_name: ct.name,
      duration_minutes: ct.duration_minutes,
      practitioner_name: practitioner.full_name,
      practitioner_address: practitioner.booking_address,
      ics_download_url: `/api/booking/${params.slug}/ics?appointment_id=${appointmentId}`,
    });
  } catch (error) {
    console.error('Error in book API:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue.' },
      { status: 500 }
    );
  }
}

function sanitize(str: string): string {
  return str
    .replace(/</g, '')
    .replace(/>/g, '')
    .replace(/"/g, '')
    .replace(/'/g, '')
    .trim()
    .slice(0, 500);
}
