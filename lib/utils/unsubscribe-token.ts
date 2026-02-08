/**
 * Generate and verify JWT tokens for reminder unsubscribe links
 * Uses the jose library already installed in the project
 */

import { SignJWT, jwtVerify } from 'jose';

const ALGORITHM = 'HS256';

function getSecret() {
  const secret = process.env.UNSUBSCRIBE_JWT_SECRET || process.env.JWT_SECRET || 'dev-unsubscribe-secret';
  return new TextEncoder().encode(secret);
}

export interface UnsubscribePayload {
  email: string;
  practitioner_id: string;
}

/**
 * Generate a signed JWT token for the unsubscribe link
 */
export async function generateUnsubscribeToken(payload: UnsubscribePayload): Promise<string> {
  const token = await new SignJWT({
    ...payload,
    type: 'reminder_unsubscribe',
  })
    .setProtectedHeader({ alg: ALGORITHM })
    .setExpirationTime('30d')
    .setIssuedAt()
    .sign(getSecret());

  return token;
}

/**
 * Verify and decode an unsubscribe token
 */
export async function verifyUnsubscribeToken(token: string): Promise<UnsubscribePayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());

    if (payload.type !== 'reminder_unsubscribe') {
      return null;
    }

    return {
      email: payload.email as string,
      practitioner_id: payload.practitioner_id as string,
    };
  } catch {
    return null;
  }
}

/**
 * Build the full unsubscribe URL
 */
export async function buildUnsubscribeUrl(
  email: string,
  practitionerId: string
): Promise<string> {
  const token = await generateUnsubscribeToken({ email, practitioner_id: practitionerId });
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.afeia.fr';
  return `${baseUrl}/unsubscribe/${token}`;
}
