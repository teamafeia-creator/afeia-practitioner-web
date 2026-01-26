import { createHash, randomBytes, timingSafeEqual } from 'crypto';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const DEFAULT_CODE_LENGTH = 8;
const DEFAULT_TTL_MINUTES = 30;
const ACCESS_TOKEN_TTL_MINUTES = 60;

export function generateQuestionnaireCode(length = DEFAULT_CODE_LENGTH) {
  if (length <= 0) {
    throw new Error('Invalid code length');
  }

  const alphabetLength = CODE_ALPHABET.length;
  const output: string[] = [];

  while (output.length < length) {
    const buffer = randomBytes(length);
    for (const byte of buffer) {
      if (output.length >= length) break;
      const value = byte;
      const maxValue = 256 - (256 % alphabetLength);
      if (value >= maxValue) continue;
      output.push(CODE_ALPHABET[value % alphabetLength]);
    }
  }

  return output.join('');
}

export function hashQuestionnaireCode(code: string) {
  const pepper = getQuestionnaireCodePepper();
  return createHash('sha256').update(`${code}${pepper}`).digest('hex');
}

export function isQuestionnaireCodeMatch(code: string, codeHash: string) {
  const hashed = hashQuestionnaireCode(code);
  return safeEqualHex(hashed, codeHash);
}

export function getQuestionnaireCodeTtlMinutes() {
  const raw = process.env.QUESTIONNAIRE_CODE_TTL_MINUTES;
  if (!raw) return DEFAULT_TTL_MINUTES;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_TTL_MINUTES;
  }
  return parsed;
}

export function getQuestionnaireAccessTokenTtlMinutes() {
  return ACCESS_TOKEN_TTL_MINUTES;
}

function getQuestionnaireCodePepper() {
  const pepper = process.env.QUESTIONNAIRE_CODE_PEPPER;
  if (!pepper) {
    // Use default pepper for development - change in production!
    if (process.env.NODE_ENV === 'development') {
      return 'dev-pepper-change-in-production';
    }
    throw new Error('QUESTIONNAIRE_CODE_PEPPER is not configured');
  }
  return pepper;
}

function safeEqualHex(value: string, expected: string) {
  const valueBuffer = Buffer.from(value, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  if (valueBuffer.length !== expectedBuffer.length) {
    return false;
  }
  return timingSafeEqual(valueBuffer, expectedBuffer);
}
