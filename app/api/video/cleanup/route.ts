import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/server/supabaseAdmin';
import { deleteDailyRoom } from '@/lib/server/daily';

/**
 * GET /api/video/cleanup
 * Cleanup expired or cancelled Daily rooms.
 * Can be called by Vercel Cron.
 */
export async function GET() {
  try {
    const supabase = createSupabaseAdminClient();

    // Find appointments with video_room_name that are:
    // - cancelled, OR
    // - ended more than 2 hours ago
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('id, video_room_name, status, ends_at')
      .not('video_room_name', 'is', null)
      .or(`status.eq.cancelled,ends_at.lt.${twoHoursAgo}`)
      .limit(50);

    if (error) {
      console.error('Cleanup query error:', error);
      return NextResponse.json({ error: 'Query error' }, { status: 500 });
    }

    let cleaned = 0;
    for (const apt of appointments || []) {
      if (apt.video_room_name) {
        const deleted = await deleteDailyRoom(apt.video_room_name);
        if (deleted) {
          await supabase
            .from('appointments')
            .update({ video_room_name: null, updated_at: new Date().toISOString() })
            .eq('id', apt.id);
          cleaned++;
        }
      }
    }

    return NextResponse.json({ cleaned, total: appointments?.length || 0 });
  } catch (error) {
    console.error('Video cleanup error:', error);
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}
