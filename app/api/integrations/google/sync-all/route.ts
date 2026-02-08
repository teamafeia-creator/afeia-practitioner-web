import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { syncAllFutureAppointments } from '../../../../../lib/google/calendar-sync';

export async function POST() {
  try {
    // Verify authenticated user
    const cookieStore = cookies();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            cookie: cookieStore
              .getAll()
              .map((c) => `${c.name}=${c.value}`)
              .join('; '),
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const syncedCount = await syncAllFutureAppointments(user.id);

    return NextResponse.json({
      success: true,
      synced: syncedCount,
    });
  } catch (err) {
    console.error('[Google Sync All] Error:', err);
    return NextResponse.json(
      { error: 'Erreur lors de la synchronisation' },
      { status: 500 }
    );
  }
}
