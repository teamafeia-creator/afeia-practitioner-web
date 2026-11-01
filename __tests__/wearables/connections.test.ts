import { beforeEach, describe, expect, it, vi } from 'vitest';

// Le chiffrement réel (Vault) est testé en SQL : supabase/tests/wearable_connections.test.sql.
// Ici on vérifie le câblage TS, avec un faux client qui simule les RPC : un aller-retour
// save → get, le calcul de l'expiration et l'absence de jeton dans les erreurs.

const vault = new Map<string, string>();
const rpc = vi.fn(async (fn: string, args: Record<string, unknown>) => {
  const key = `${args.p_consultant_id}:${args.p_provider}`;
  switch (fn) {
    case 'wearable_save_connection':
      if (args.p_access_token === 'boom') return { data: null, error: { message: 'insert failed', code: '23505' } };
      vault.set(key, args.p_access_token as string);
      return { data: 'connection-id', error: null };
    case 'wearable_get_access_token':
      return { data: vault.get(key) ?? null, error: null };
    case 'wearable_revoke_connection':
      vault.delete(key);
      return { data: null, error: null };
    default:
      throw new Error(`rpc inattendue ${fn}`);
  }
});
const update = vi.fn();
const query = { update, eq: vi.fn(), neq: vi.fn() };
update.mockReturnValue(query);
query.eq.mockReturnValue(query);
query.neq.mockResolvedValue({ error: null });
const from = vi.fn(() => query);

vi.mock('@/lib/server/supabaseAdmin', () => ({
  createSupabaseAdminClient: () => ({ rpc, from }),
}));

const {
  saveConnection,
  getAccessToken,
  markRevoked,
  markError,
  computeTokenExpiresAt,
  sanitizeErrorMessage,
} = await import('@/lib/wearables/connections');

const consultantId = '00000000-0000-0000-0000-0000000000b1';

describe('wearable connections', () => {
  beforeEach(() => {
    vault.clear();
    vi.clearAllMocks();
    update.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.neq.mockResolvedValue({ error: null });
  });

  it('aller-retour : saveConnection puis getAccessToken renvoie le même jeton', async () => {
    const id = await saveConnection({
      consultantId,
      provider: 'polar',
      providerUserId: '475',
      accessToken: 'tok-secret',
      expiresIn: 31535999,
    });
    expect(id).toBe('connection-id');
    expect(await getAccessToken(consultantId, 'polar')).toBe('tok-secret');
  });

  it('calcule token_expires_at depuis expires_in', async () => {
    const now = new Date('2026-11-01T00:00:00Z');
    await saveConnection({ consultantId, provider: 'polar', providerUserId: '475', accessToken: 't', expiresIn: 86400, now });
    expect(rpc).toHaveBeenCalledWith('wearable_save_connection', expect.objectContaining({
      p_token_expires_at: '2026-11-02T00:00:00.000Z',
    }));
    expect(computeTokenExpiresAt(null)).toBeNull();
    expect(computeTokenExpiresAt(0)).toBeNull();
  });

  it('getAccessToken renvoie null après markRevoked', async () => {
    await saveConnection({ consultantId, provider: 'polar', providerUserId: '475', accessToken: 'tok' });
    await markRevoked(consultantId, 'polar');
    expect(await getAccessToken(consultantId, 'polar')).toBeNull();
  });

  it('refuse un jeton vide sans appeler la base', async () => {
    await expect(
      saveConnection({ consultantId, provider: 'polar', providerUserId: '475', accessToken: '' })
    ).rejects.toThrow('accessToken manquant');
    expect(rpc).not.toHaveBeenCalled();
  });

  it("le message d'erreur ne contient jamais le jeton", async () => {
    await expect(
      saveConnection({ consultantId, provider: 'polar', providerUserId: '475', accessToken: 'boom' })
    ).rejects.toThrow(/saveConnection a échoué \(23505\)/);
    try {
      await saveConnection({ consultantId, provider: 'polar', providerUserId: '475', accessToken: 'boom' });
    } catch (error) {
      expect((error as Error).message).not.toContain('boom');
    }
  });

  it('markError enregistre un message nettoyé, sans toucher aux connexions révoquées', async () => {
    await markError(consultantId, 'polar', 'HTTP 401 with Authorization: Bearer abc.def-123 token=xyz');
    expect(from).toHaveBeenCalledWith('wearable_connections');
    const payload = update.mock.calls[0][0];
    expect(payload.status).toBe('error');
    expect(payload.last_error).not.toContain('abc.def-123');
    expect(payload.last_error).not.toContain('xyz');
    expect(query.neq).toHaveBeenCalledWith('status', 'revoked');
  });

  it('sanitizeErrorMessage tronque à 500 caractères', () => {
    expect(sanitizeErrorMessage('x'.repeat(2000))).toHaveLength(500);
    expect(sanitizeErrorMessage('Basic Y2lkOnNlY3JldA==')).toBe('Basic [redacted]');
  });
});
