/**
 * Google OAuth2 token management
 * Handles token refresh and validation for Google Calendar API
 */

import { getSupabaseAdmin } from '../supabase-admin';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

export interface GoogleTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

/**
 * Exchange an authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirect_uri: process.env.GOOGLE_REDIRECT_URI || '',
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[Google Auth] Token exchange failed:', errorBody);
    throw new Error(`Google token exchange failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Get a valid access token for a practitioner.
 * Refreshes if expiring within 5 minutes.
 * Returns null if no connection exists or refresh fails.
 */
export async function getValidAccessToken(practitionerId: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();

  const { data: connection, error } = await supabase
    .from('google_calendar_connections')
    .select('*')
    .eq('practitioner_id', practitionerId)
    .eq('sync_enabled', true)
    .single();

  if (error || !connection) {
    return null;
  }

  // Check if token is still valid (with 5 min buffer)
  const expiresAt = new Date(connection.token_expires_at);
  const fiveMinFromNow = new Date(Date.now() + 5 * 60 * 1000);

  if (expiresAt > fiveMinFromNow) {
    return connection.access_token;
  }

  // Token expired or expiring soon — refresh it
  try {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        refresh_token: connection.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[Google Auth] Token refresh failed:', errorBody);

      // Token was revoked or is invalid
      await supabase
        .from('google_calendar_connections')
        .update({
          sync_enabled: false,
          last_sync_error: 'Token revoque — veuillez reconnecter Google Agenda',
          updated_at: new Date().toISOString(),
        })
        .eq('practitioner_id', practitionerId);

      return null;
    }

    const tokens: GoogleTokens = await response.json();
    const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    await supabase
      .from('google_calendar_connections')
      .update({
        access_token: tokens.access_token,
        token_expires_at: newExpiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('practitioner_id', practitionerId);

    return tokens.access_token;
  } catch (err) {
    console.error('[Google Auth] Refresh error:', err);

    await supabase
      .from('google_calendar_connections')
      .update({
        last_sync_error: `Erreur de rafraichissement du token: ${err instanceof Error ? err.message : 'Erreur inconnue'}`,
        updated_at: new Date().toISOString(),
      })
      .eq('practitioner_id', practitionerId);

    return null;
  }
}

/**
 * Get the Google email for the authenticated user
 */
export async function getGoogleUserInfo(accessToken: string): Promise<{ email: string }> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Google user info');
  }

  return response.json();
}

/**
 * Create a dedicated AFEIA calendar in the user's Google account
 */
export async function createAfeiaCalendar(accessToken: string): Promise<string> {
  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary: 'AFEIA \u2014 Mes seances',
      timeZone: 'Europe/Paris',
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[Google Calendar] Failed to create calendar:', errorBody);
    throw new Error('Failed to create AFEIA calendar');
  }

  const calendar = await response.json();
  return calendar.id;
}

/**
 * Revoke a Google OAuth token
 */
export async function revokeGoogleToken(token: string): Promise<void> {
  try {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  } catch (err) {
    // Revocation failure is not critical — the token may already be invalid
    console.warn('[Google Auth] Token revocation failed:', err);
  }
}

/**
 * Get the Google Calendar connection for a practitioner
 */
export async function getGoogleConnection(practitionerId: string) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('google_calendar_connections')
    .select('*')
    .eq('practitioner_id', practitionerId)
    .single();

  if (error || !data) return null;
  return data;
}
