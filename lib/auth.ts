import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE = 'afeia_session';
const JWT_ALGORITHM = 'HS256';
const JWT_ISSUER = 'afeia-practitioner-web';

export type ApiJwtPayload = {
  sub: string;
  email: string;
  name: string;
  role: string;
};

export function isAuthedFromCookie(cookieHeader: string | null | undefined): boolean {
  if (!cookieHeader) return false;
  return cookieHeader.split(';').some((c) => c.trim().startsWith(`${SESSION_COOKIE}=`));
}

export function getBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) return null;
  const [scheme, token] = authorizationHeader.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}

export async function signApiJwt(payload: ApiJwtPayload): Promise<string> {
  const secret = getJwtSecret();
  return new SignJWT(payload)
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuer(JWT_ISSUER)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

export async function verifyApiJwt(token: string): Promise<ApiJwtPayload> {
  const secret = getJwtSecret();
  const { payload } = await jwtVerify(token, secret, {
    algorithms: [JWT_ALGORITHM],
    issuer: JWT_ISSUER
  });
  return payload as ApiJwtPayload;
}

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return new TextEncoder().encode(secret);
}
