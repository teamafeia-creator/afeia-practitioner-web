import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getMatchingWaitlistEntries, markAsNotified } from '@/lib/queries/waitlist';
import { buildWaitlistNotificationEmail } from '@/lib/emails/waitlist-notification';
import { sendEmail } from '@/lib/server/email';
import { createSupabaseAuthClient, createSupabaseAdminClient } from '@/lib/server/supabaseAdmin';

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'AFEIA <contact@afeia.fr>';

const notifySchema = z.object({
  appointmentId: z.string().uuid(),
});

/**
 * POST /api/waitlist/notify — Trigger waitlist notifications for a freed slot.
 * Called from the client after a cancellation or reschedule.
 * Accepts an appointmentId and looks up all needed info server-side.
 * Protected by practitioner auth.
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const token = request.headers.get('authorization')?.replace('Bearer ', '').trim();
    if (!token) {
      return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
    }

    const supabaseAuth = createSupabaseAuthClient();
    const { data: authData, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Session invalide.' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = notifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Donnees invalides.' }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();

    // Fetch appointment with consultation type
    const { data: appointment, error: aptError } = await supabase
      .from('appointments')
      .select(`
        id, practitioner_id, starts_at, consultation_type_id,
        consultation_type:consultation_types(id, name, duration_minutes)
      `)
      .eq('id', parsed.data.appointmentId)
      .single();

    if (aptError || !appointment) {
      return NextResponse.json({ error: 'Rendez-vous non trouve.' }, { status: 404 });
    }

    // Verify the caller is the practitioner who owns this appointment
    if (appointment.practitioner_id !== authData.user.id) {
      return NextResponse.json({ error: 'Non autorise.' }, { status: 403 });
    }

    if (!appointment.consultation_type_id || !appointment.consultation_type) {
      return NextResponse.json({ notified: 0 });
    }

    // Fetch practitioner info
    const { data: practitioner } = await supabase
      .from('practitioners')
      .select('full_name, booking_slug, booking_address, booking_phone')
      .eq('id', appointment.practitioner_id)
      .single();

    if (!practitioner?.booking_slug) {
      // No booking slug = no booking page = can't send notification link
      return NextResponse.json({ notified: 0 });
    }

    // Supabase join may return an array or single object depending on relationship
    const rawCt = appointment.consultation_type;
    const ct = (Array.isArray(rawCt) ? rawCt[0] : rawCt) as { id: string; name: string; duration_minutes: number };
    if (!ct) {
      return NextResponse.json({ notified: 0 });
    }
    const slotDate = new Date(appointment.starts_at);

    // Find matching waitlist entries
    const entries = await getMatchingWaitlistEntries(appointment.practitioner_id, {
      startsAt: slotDate,
      consultationTypeId: ct.id,
    });

    if (entries.length === 0) {
      return NextResponse.json({ notified: 0 });
    }

    // Format date for email
    const dateFormatted = new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(slotDate);

    const timeFormatted = new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(slotDate);

    const slotDateStr = slotDate.toISOString().split('T')[0];
    const slotTimeStr = `${String(slotDate.getHours()).padStart(2, '0')}:${String(slotDate.getMinutes()).padStart(2, '0')}`;

    // Send notifications
    let sent = 0;
    for (const entry of entries) {
      try {
        const emailContent = buildWaitlistNotificationEmail({
          firstName: entry.first_name,
          practitionerName: practitioner.full_name,
          practitionerSlug: practitioner.booking_slug,
          dateFormatted,
          timeFormatted,
          consultationTypeName: ct.name,
          consultationTypeId: ct.id,
          durationMinutes: ct.duration_minutes,
          slotDate: slotDateStr,
          slotTime: slotTimeStr,
          practitionerAddress: practitioner.booking_address,
          practitionerPhone: practitioner.booking_phone,
        });

        await sendEmail({
          to: entry.email,
          from: FROM_EMAIL,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        });

        sent++;
      } catch (emailError) {
        console.error(`Failed to send waitlist notification to ${entry.email}:`, emailError);
      }
    }

    // Mark all as notified
    await markAsNotified(
      entries.map(e => e.id),
      slotDate
    );

    return NextResponse.json({ notified: sent });
  } catch (error) {
    console.error('Error in waitlist notify:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue.' },
      { status: 500 }
    );
  }
}
