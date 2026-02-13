import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAuthClient, createSupabaseAdminClient } from '@/lib/server/supabaseAdmin';
import { createDailyRoom, deleteDailyRoom, generateRoomName } from '@/lib/server/daily';

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { appointment_id, action } = body;

    if (!appointment_id) {
      return NextResponse.json({ error: 'appointment_id requis.' }, { status: 400 });
    }

    // Verify the appointment belongs to this practitioner
    const { data: appointment, error: aptError } = await supabase
      .from('appointments')
      .select('id, practitioner_id, starts_at, ends_at, location_type, video_link, video_room_name')
      .eq('id', appointment_id)
      .single();

    if (aptError || !appointment) {
      return NextResponse.json({ error: 'Rendez-vous non trouve.' }, { status: 404 });
    }

    if (appointment.practitioner_id !== practitionerId) {
      return NextResponse.json({ error: 'Acces refuse.' }, { status: 403 });
    }

    // Check practitioner video_provider
    const { data: practitioner } = await supabase
      .from('practitioners')
      .select('video_provider')
      .eq('id', practitionerId)
      .single();

    if (action === 'delete') {
      // Delete existing room
      if (appointment.video_room_name) {
        await deleteDailyRoom(appointment.video_room_name);
        await supabase
          .from('appointments')
          .update({ video_link: null, video_room_name: null, updated_at: new Date().toISOString() })
          .eq('id', appointment_id);
      }
      return NextResponse.json({ success: true });
    }

    // Create room
    if (practitioner?.video_provider !== 'daily') {
      return NextResponse.json({ error: 'Visio integree non activee.' }, { status: 400 });
    }

    if (appointment.location_type !== 'video') {
      return NextResponse.json({ error: 'Le rendez-vous n\'est pas en visio.' }, { status: 400 });
    }

    // If room already exists, return existing
    if (appointment.video_room_name && appointment.video_link) {
      return NextResponse.json({
        video_link: appointment.video_link,
        video_room_name: appointment.video_room_name,
      });
    }

    const roomName = generateRoomName(appointment_id);
    const endsAt = new Date(appointment.ends_at);
    const expiresAt = new Date(endsAt.getTime() + 30 * 60 * 1000); // +30 min buffer

    const room = await createDailyRoom({ name: roomName, expiresAt });
    if (!room) {
      return NextResponse.json(
        { error: 'La salle de visio n\'a pas pu etre creee.' },
        { status: 502 }
      );
    }

    // Update appointment with room info
    await supabase
      .from('appointments')
      .update({
        video_link: room.url,
        video_room_name: room.name,
        updated_at: new Date().toISOString(),
      })
      .eq('id', appointment_id);

    return NextResponse.json({
      video_link: room.url,
      video_room_name: room.name,
    });
  } catch (error) {
    console.error('Error in video provision API:', error);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
