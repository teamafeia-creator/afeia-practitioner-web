import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '../../../../../lib/supabase-admin';
import {
  exchangeCodeForTokens,
  getGoogleUserInfo,
  createAfeiaCalendar,
} from '../../../../../lib/google/auth';

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error');

    // User denied access
    if (errorParam) {
      return NextResponse.redirect(new URL('/settings/integrations?google=denied', appUrl));
    }

    if (!code || !state) {
      return NextResponse.redirect(new URL('/settings/integrations?google=error', appUrl));
    }

    // Verify state token
    const cookieStore = cookies();
    const storedState = cookieStore.get('google_oauth_state')?.value;
    const userId = cookieStore.get('google_oauth_uid')?.value;

    if (!storedState || storedState !== state || !userId) {
      console.error('[Google Callback] State mismatch or missing userId');
      return NextResponse.redirect(new URL('/settings/integrations?google=error', appUrl));
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      console.error('[Google Callback] Missing tokens');
      return NextResponse.redirect(new URL('/settings/integrations?google=error', appUrl));
    }

    // Get Google email
    const userInfo = await getGoogleUserInfo(tokens.access_token);

    // Create dedicated AFEIA calendar
    const calendarId = await createAfeiaCalendar(tokens.access_token);

    // Store connection in database
    const supabase = getSupabaseAdmin();
    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    const { error: upsertError } = await supabase
      .from('google_calendar_connections')
      .upsert(
        {
          practitioner_id: userId,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: tokenExpiresAt.toISOString(),
          google_email: userInfo.email,
          calendar_id: calendarId,
          sync_enabled: true,
          last_sync_error: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'practitioner_id' }
      );

    if (upsertError) {
      console.error('[Google Callback] DB insert error:', upsertError);
      return NextResponse.redirect(new URL('/settings/integrations?google=error', appUrl));
    }

    // Clear OAuth cookies
    const response = NextResponse.redirect(new URL('/settings/integrations?google=connected', appUrl));
    response.cookies.delete('google_oauth_state');
    response.cookies.delete('google_oauth_uid');

    return response;
  } catch (err) {
    console.error('[Google Callback] Error:', err);
    return NextResponse.redirect(new URL('/settings/integrations?google=error', appUrl));
  }
}
