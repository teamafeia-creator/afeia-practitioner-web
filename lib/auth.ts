export const SESSION_COOKIE = 'afeia_session';

export function isAuthedFromCookie(cookieHeader: string | null | undefined): boolean {
  if (!cookieHeader) return false;
  return cookieHeader.split(';').some((c) => c.trim().startsWith(`${SESSION_COOKIE}=`));
}
