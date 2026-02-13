import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPractitionerBySlug } from '@/lib/queries/booking';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const consultationTypeId = searchParams.get('consultation_type_id');

    if (!consultationTypeId) {
      return NextResponse.json(
        { error: 'consultation_type_id est requis.' },
        { status: 400 }
      );
    }

    const practitioner = await getPractitionerBySlug(params.slug);
    if (!practitioner) {
      return NextResponse.json(
        { error: 'Praticien non trouve.' },
        { status: 404 }
      );
    }

    const supabase = createAdminClient();

    // Fetch upcoming group sessions for this practitioner and consultation type
    const { data: sessions, error } = await supabase
      .from('group_sessions')
      .select(`
        id, title, description, starts_at, ends_at,
        location_type, location_details, max_participants, status
      `)
      .eq('practitioner_id', practitioner.id)
      .eq('consultation_type_id', consultationTypeId)
      .in('status', ['scheduled', 'confirmed'])
      .gt('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: true });

    if (error) {
      console.error('Error fetching group sessions:', error);
      return NextResponse.json(
        { error: 'Erreur lors du chargement des seances.' },
        { status: 500 }
      );
    }

    // Get registration counts for each session
    const sessionsWithAvailability = await Promise.all(
      (sessions || []).map(async (session) => {
        const { data: countData } = await supabase
          .rpc('get_group_session_registration_count', { p_session_id: session.id });

        const registrationCount = countData ?? 0;
        return {
          ...session,
          registration_count: registrationCount,
          available_spots: session.max_participants - registrationCount,
        };
      })
    );

    return NextResponse.json({ sessions: sessionsWithAvailability });
  } catch (error) {
    console.error('Error in group-sessions API:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue.' },
      { status: 500 }
    );
  }
}
