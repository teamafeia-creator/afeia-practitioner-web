import { cookies as nextCookies } from 'next/headers';
import type { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const ADMIN_EMAIL_COOKIE = 'afeia_admin_email';

function parseAdminEmailsEnv(): string[] {
  const raw = process.env.ADMIN_EMAILS;
  if (!raw) return [];
  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function isAdminEmail(email: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  const allowlist = parseAdminEmailsEnv();

  if (allowlist.length > 0) {
    return allowlist.includes(normalized);
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('admin_allowlist')
      .select('email')
      .eq('email', normalized)
      .maybeSingle();

    if (error) {
      console.error('[admin] allowlist lookup error:', error);
      return false;
    }

    return Boolean(data);
  } catch (error) {
    console.error('[admin] allowlist lookup exception:', error);
    return false;
  }
}

export function getAdminEmailFromRequest(request: NextRequest): string | null {
  return request.cookies.get(ADMIN_EMAIL_COOKIE)?.value ?? null;
}

export function getAdminEmailFromCookies(): string | null {
  return nextCookies().get(ADMIN_EMAIL_COOKIE)?.value ?? null;
}

export function setAdminCookie(response: NextResponse, email: string) {
  response.cookies.set(ADMIN_EMAIL_COOKIE, email.trim().toLowerCase(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 8
  });
}

export function clearAdminCookie(response: NextResponse) {
  response.cookies.set(ADMIN_EMAIL_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0
  });
}

export { ADMIN_EMAIL_COOKIE };
