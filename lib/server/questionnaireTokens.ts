import { SignJWT } from 'jose';

const JWT_ALGORITHM = 'HS256';
const JWT_ISSUER = 'afeia-questionnaire';

export type QuestionnaireTokenPayload = {
  patientId: string;
  scope: 'questionnaire';
};

export async function signQuestionnaireToken(
  payload: QuestionnaireTokenPayload,
  expiresInMinutes: number
) {
  const secret = getQuestionnaireJwtSecret();
  return new SignJWT(payload)
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuer(JWT_ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${expiresInMinutes}m`)
    .sign(secret);
}

function getQuestionnaireJwtSecret(): Uint8Array {
  const secret = process.env.QUESTIONNAIRE_JWT_SECRET;
  if (!secret) {
    throw new Error('QUESTIONNAIRE_JWT_SECRET is not configured');
  }
  return new TextEncoder().encode(secret);
}
