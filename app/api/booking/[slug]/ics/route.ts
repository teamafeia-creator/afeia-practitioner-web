import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateICS } from '@/lib/utils/generate-ics';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { searchParams } = request.nextUrl;
    const appointmentId = searchParams.get('appointment_id');

    if (!appointmentId) {
      return NextResponse.json(
        { error: 'appointment_id requis.' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get appointment with consultation type and practitioner
    const { data: appointment, error } = await supabase
      .from('appointments')
      .select(`
        id, starts_at, ends_at, booking_name,
        consultation_type:consultation_types(name, duration_minutes),
        practitioner:practitioners(full_name, booking_address, booking_slug)
      `)
      .eq('id', appointmentId)
      .single();

    if (error || !appointment) {
      return NextResponse.json(
        { error: 'Rendez-vous non trouve.' },
        { status: 404 }
      );
    }

    // Verify slug matches
    const practitioner = appointment.practitioner as unknown as {
      full_name: string;
      booking_address: string | null;
      booking_slug: string | null;
    };

    if (practitioner?.booking_slug !== params.slug) {
      return NextResponse.json(
        { error: 'Rendez-vous non trouve.' },
        { status: 404 }
      );
    }

    const ct = appointment.consultation_type as unknown as {
      name: string;
      duration_minutes: number;
    };

    const icsContent = generateICS({
      starts_at: appointment.starts_at,
      ends_at: appointment.ends_at,
      title: `${ct?.name || 'Consultation'} — ${practitioner?.full_name || ''}`,
      description: `Rendez-vous avec ${practitioner?.full_name || 'votre praticien'}. ${ct?.name || 'Consultation'} (${ct?.duration_minutes || 60} min).`,
      location: practitioner?.booking_address || '',
    });

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="rdv-afeia-${appointmentId.slice(0, 8)}.ics"`,
      },
    });
  } catch (error) {
    console.error('Error generating ICS:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue.' },
      { status: 500 }
    );
  }
}
