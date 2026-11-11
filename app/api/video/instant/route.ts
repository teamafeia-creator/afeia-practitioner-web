import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseAuthClient, createSupabaseAdminClient } from '@/lib/server/supabaseAdmin';
import { consultantJoinUrl, ensureVideoRoom } from '@/lib/server/daily';
import { sendEmail } from '@/lib/server/email';
import { buildInstantVisioEmail } from '@/lib/emails/instant-visio';
import { conflictName, findAppointmentConflicts } from '@/lib/queries/appointment-conflicts';

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'AFEIA <contact@afeia.fr>';

const parisTime = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });

const bodySchema = z
  .object({
    consultantId: z.string().uuid().optional(),
    guestName: z.string().trim().min(1).max(120).optional(),
    guestEmail: z.string().trim().email().optional(),
    consultationTypeId: z.string().uuid().optional(),
    durationMinutes: z.number().int().min(15).max(120),
    sendEmail: z.boolean(),
    force: z.boolean().optional(),
  })
  .refine((b) => !!b.consultantId || !!b.guestName, { message: 'Indiquez un consultant ou le nom de la personne.' });

/**
 * POST /api/video/instant
 * Visio immédiate : crée une séance en visio qui commence maintenant, sa salle Daily,
 * et envoie (au choix) le lien au consultant. La séance est un rendez-vous normal.
 */
export async function POST(request: NextRequest) {
  try {
    const accessToken = request.headers.get('authorization')?.replace('Bearer ', '').trim();
    if (!accessToken) {
      return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
    }

    const supabaseAuth = createSupabaseAuthClient();
    const { data: authData, error: authError } = await supabaseAuth.auth.getUser(accessToken);
    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Session invalide.' }, { status: 401 });
    }

    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Requête invalide.' }, { status: 400 });
    }
    const body = parsed.data;

    const practitionerId = authData.user.id;
    const supabase = createSupabaseAdminClient();

    // Consultant et type de séance : uniquement ceux du praticien connecté
    let consultant: { id: string; name: string | null; first_name: string | null; last_name: string | null; email: string | null } | null = null;
    if (body.consultantId) {
      const { data } = await supabase
        .from('consultants')
        .select('id, name, first_name, last_name, email')
        .eq('id', body.consultantId)
        .eq('practitioner_id', practitionerId)
        .is('deleted_at', null)
        .maybeSingle();
      if (!data) {
        return NextResponse.json({ error: 'Ce consultant ne fait pas partie de vos dossiers.' }, { status: 403 });
      }
      consultant = data;
    }

    if (body.consultationTypeId) {
      const { data } = await supabase
        .from('consultation_types')
        .select('id')
        .eq('id', body.consultationTypeId)
        .eq('practitioner_id', practitionerId)
        .maybeSingle();
      if (!data) {
        return NextResponse.json({ error: 'Ce type de séance ne fait pas partie de vos réglages.' }, { status: 403 });
      }
    }

    // Maintenant, à la minute
    const start = new Date();
    start.setSeconds(0, 0);
    const end = new Date(start.getTime() + body.durationMinutes * 60 * 1000);

    if (!body.force) {
      const conflicts = await findAppointmentConflicts(supabase, practitionerId, start.toISOString(), end.toISOString());
      if (conflicts.length > 0) {
        return NextResponse.json(
          {
            error: 'Cette visio chevauche une séance existante.',
            conflict: { name: conflictName(conflicts[0]), starts_at: conflicts[0].starts_at },
          },
          { status: 409 }
        );
      }
    }

    // Même statut et même source qu'une séance créée depuis l'agenda (createNativeAppointment)
    const { data: created, error: insertError } = await supabase
      .from('appointments')
      .insert({
        practitioner_id: practitionerId,
        consultant_id: consultant?.id ?? null,
        booking_name: consultant ? null : body.guestName,
        booking_email: consultant ? null : body.guestEmail ?? null,
        consultation_type_id: body.consultationTypeId ?? null,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        location_type: 'video',
        status: 'confirmed',
        source: 'manual',
      })
      .select('id')
      .single();

    if (insertError || !created) {
      console.error('[video/instant] insert failed', insertError);
      return NextResponse.json({ error: 'La séance n\'a pas pu être créée.' }, { status: 500 });
    }

    // Toujours Daily, même si le praticien est réglé sur « lien externe »
    const room = await ensureVideoRoom(created.id);
    if (!room) {
      await supabase.from('appointments').delete().eq('id', created.id);
      return NextResponse.json(
        { error: 'La salle de visio n\'a pas pu être créée. Vérifiez la configuration Daily.co.' },
        { status: 502 }
      );
    }

    const joinUrl = consultantJoinUrl(created.id, room.joinToken);

    let emailSent = false;
    const email = consultant ? consultant.email : body.guestEmail ?? null;
    if (body.sendEmail && email) {
      try {
        const { data: practitioner } = await supabase
          .from('practitioners')
          .select('full_name')
          .eq('id', practitionerId)
          .maybeSingle();
        const fullName = consultant
          ? consultant.name || [consultant.first_name, consultant.last_name].filter(Boolean).join(' ')
          : body.guestName ?? '';
        const firstName = consultant?.first_name || fullName.split(' ')[0] || '';
        const mail = buildInstantVisioEmail({
          consultantFirstName: firstName,
          practitionerName: practitioner?.full_name || 'Votre praticien',
          joinUrl,
          endTimeFormatted: parisTime.format(end).replace(':', ' h '),
        });
        await sendEmail({ to: email, from: FROM_EMAIL, subject: mail.subject, html: mail.html, text: mail.text });
        emailSent = true;
      } catch (e) {
        console.error('[video/instant] invitation email failed', e);
      }
    }

    return NextResponse.json({ appointment_id: created.id, consultant_join_url: joinUrl, emailSent });
  } catch (error) {
    console.error('Error in vidéo instant API:', error);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
