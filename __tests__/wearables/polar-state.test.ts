import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RETURN_TO,
  InvalidStateError,
  STATE_TTL_SECONDS,
  sanitizeReturnTo,
  signState,
  verifyState,
} from '@/lib/wearables/polar/state';

const SECRET = 'state-secret-for-tests-0123456789abcdef';
const consultantId = '00000000-0000-0000-0000-0000000000b1';

function reasonOf(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (error) {
    return error instanceof InvalidStateError ? error.reason : 'other';
  }
  return undefined;
}

describe('signState / verifyState', () => {
  it('aller-retour : contient consultant, nonce, exp à +10 min et returnTo', () => {
    const now = new Date('2026-11-01T10:00:00Z');
    const { state, payload } = signState({ consultantId, returnTo: '/consultant/home?tab=objets' }, SECRET, now);
    const verified = verifyState(state, SECRET, now);
    expect(verified).toEqual(payload);
    expect(verified.cid).toBe(consultantId);
    expect(verified.exp).toBe(Math.floor(now.getTime() / 1000) + STATE_TTL_SECONDS);
    expect(verified.returnTo).toBe('/consultant/home?tab=objets');
    expect(verified.nonce).toMatch(/^[A-Za-z0-9_-]{22}$/);
  });

  it('deux states successifs ont des nonces différents', () => {
    const a = signState({ consultantId }, SECRET).payload.nonce;
    const b = signState({ consultantId }, SECRET).payload.nonce;
    expect(a).not.toBe(b);
  });

  it('state absent → missing', () => {
    expect(reasonOf(() => verifyState(null, SECRET))).toBe('missing');
    expect(reasonOf(() => verifyState('', SECRET))).toBe('missing');
  });

  it('state mal formé → malformed', () => {
    expect(reasonOf(() => verifyState('pas-de-point', SECRET))).toBe('malformed');
    expect(reasonOf(() => verifyState('a.b.c', SECRET))).toBe('malformed');
  });

  it('payload modifié (autre consultant) → bad_signature', () => {
    const { state } = signState({ consultantId }, SECRET);
    const [body, sig] = state.split('.');
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    payload.cid = '00000000-0000-0000-0000-0000000000ff';
    const forged = `${Buffer.from(JSON.stringify(payload)).toString('base64url')}.${sig}`;
    expect(reasonOf(() => verifyState(forged, SECRET))).toBe('bad_signature');
  });

  it('signé avec un autre secret → bad_signature', () => {
    const { state } = signState({ consultantId }, 'another-secret-of-sufficient-length-000');
    expect(reasonOf(() => verifyState(state, SECRET))).toBe('bad_signature');
  });

  it('expiré après 10 minutes → expired', () => {
    const issued = new Date('2026-11-01T10:00:00Z');
    const { state } = signState({ consultantId }, SECRET, issued);
    expect(() => verifyState(state, SECRET, new Date(issued.getTime() + 9 * 60_000))).not.toThrow();
    expect(reasonOf(() => verifyState(state, SECRET, new Date(issued.getTime() + 10 * 60_000)))).toBe('expired');
  });
});

describe('sanitizeReturnTo', () => {
  it.each([
    ['/consultant/home', '/consultant/home'],
    ['/consultant/home?x=1#y', '/consultant/home?x=1#y'],
    ['afeia://wearables/polar', 'afeia://wearables/polar'],
    [null, DEFAULT_RETURN_TO],
    ['https://evil.example/', DEFAULT_RETURN_TO],
    ['//evil.example/', DEFAULT_RETURN_TO],
    ['/\\evil.example/', DEFAULT_RETURN_TO],
    ['javascript:alert(1)', DEFAULT_RETURN_TO],
  ])('%s → %s', (input, expected) => {
    expect(sanitizeReturnTo(input)).toBe(expected);
  });
});
