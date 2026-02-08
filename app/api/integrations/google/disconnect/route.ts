import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '../../../../../lib/supabase-admin';
import { revokeGoogleToken } from '../../../../../lib/google/auth';

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

    const supabaseAdmin = getSupabaseAdmin();

    // Get existing connection to revoke the token
    const { data: connection } = await supabaseAdmin
      .from('google_calendar_connections')
      .select('access_token')
      .eq('practitioner_id', user.id)
      .single();

    if (connection?.access_token) {
      await revokeGoogleToken(connection.access_token);
    }

    // Delete the connection (do NOT delete google_event_id from appointments)
    await supabaseAdmin
      .from('google_calendar_connections')
      .delete()
      .eq('practitioner_id', user.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Google Disconnect] Error:', err);
    return NextResponse.json(
      { error: 'Erreur lors de la deconnexion' },
      { status: 500 }
    );
  }
}
