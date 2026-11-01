import { afterEach, describe, expect, it } from 'vitest';
import {
  getCronSecret,
  getPolarApiCredentials,
  getPolarConfig,
  getPolarWebhookSecret,
  parsePolarApiCredentials,
  parsePolarConfig,
  parsePolarWebhookSecret,
  PolarConfigError,
  POLAR_ENV_VARS,
  resetPolarConfigCache,
} from '@/lib/wearables/polar/config';

const validEnv = {
  POLAR_CLIENT_ID: 'client-id-test',
  POLAR_CLIENT_SECRET: 'client-secret-test',
  POLAR_REDIRECT_URI: 'http://localhost:3000/api/wearables/polar/callback',
  POLAR_STATE_SECRET: 'state-secret-for-tests-0123456789abcdef',
};

describe('parsePolarConfig', () => {
  it('renvoie une config typée quand tout est défini', () => {
    expect(parsePolarConfig(validEnv)).toEqual({
      clientId: 'client-id-test',
      clientSecret: 'client-secret-test',
      redirectUri: 'http://localhost:3000/api/wearables/polar/callback',
      stateSecret: 'state-secret-for-tests-0123456789abcdef',
    });
  });

  it('accepte la redirect URI de production', () => {
    const config = parsePolarConfig({
      ...validEnv,
      POLAR_REDIRECT_URI: 'https://afeia.fr/api/wearables/polar/callback',
    });
    expect(config.redirectUri).toBe('https://afeia.fr/api/wearables/polar/callback');
  });

  it.each(POLAR_ENV_VARS)('variable manquante %s → erreur qui la nomme', (name) => {
    const env: Record<string, string | undefined> = { ...validEnv };
    delete env[name];

    expect(() => parsePolarConfig(env)).toThrow(PolarConfigError);
    expect(() => parsePolarConfig(env)).toThrow(name);
    try {
      parsePolarConfig(env);
    } catch (error) {
      expect((error as PolarConfigError).variables).toEqual([name]);
    }
  });

  it.each(POLAR_ENV_VARS)('variable vide %s → erreur qui la nomme', (name) => {
    expect(() => parsePolarConfig({ ...validEnv, [name]: '' })).toThrow(name);
    expect(() => parsePolarConfig({ ...validEnv, [name]: '   ' })).toThrow(name);
  });

  it('liste toutes les variables manquantes', () => {
    try {
      parsePolarConfig({});
      throw new Error('aurait dû échouer');
    } catch (error) {
      expect(error).toBeInstanceOf(PolarConfigError);
      expect((error as PolarConfigError).variables).toEqual([...POLAR_ENV_VARS]);
    }
  });

  it('la config OAuth ne dépend jamais de POLAR_WEBHOOK_SECRET, même en production', () => {
    expect(() => parsePolarConfig({ ...validEnv, VERCEL_ENV: 'production' })).not.toThrow();
  });

  it('POLAR_WEBHOOK_SECRET : vérifié seul, erreur qui le nomme', () => {
    expect(parsePolarWebhookSecret({ POLAR_WEBHOOK_SECRET: ' whsec ' })).toBe('whsec');
    try {
      parsePolarWebhookSecret({ ...validEnv, VERCEL_ENV: 'production' });
      throw new Error('aurait dû échouer');
    } catch (error) {
      expect(error).toBeInstanceOf(PolarConfigError);
      expect((error as PolarConfigError).variables).toEqual(['POLAR_WEBHOOK_SECRET']);
    }
  });

  it('identifiants client : seuls POLAR_CLIENT_ID et POLAR_CLIENT_SECRET sont exigés', () => {
    expect(parsePolarApiCredentials({ POLAR_CLIENT_ID: 'a', POLAR_CLIENT_SECRET: 'b' })).toEqual({ clientId: 'a', clientSecret: 'b' });
    try {
      parsePolarApiCredentials({ POLAR_CLIENT_ID: 'a' });
      throw new Error('aurait dû échouer');
    } catch (error) {
      expect((error as PolarConfigError).variables).toEqual(['POLAR_CLIENT_SECRET']);
    }
  });

  it('refuse un POLAR_STATE_SECRET trop court', () => {
    expect(() => parsePolarConfig({ ...validEnv, POLAR_STATE_SECRET: 'court' })).toThrow('POLAR_STATE_SECRET');
  });

  it('refuse une redirect URI qui ne pointe pas vers le callback', () => {
    expect(() =>
      parsePolarConfig({ ...validEnv, POLAR_REDIRECT_URI: 'https://afeia.fr/autre' })
    ).toThrow('POLAR_REDIRECT_URI');
    expect(() =>
      parsePolarConfig({ ...validEnv, POLAR_REDIRECT_URI: 'pas-une-url' })
    ).toThrow('POLAR_REDIRECT_URI');
  });

  it("n'expose jamais la valeur du secret dans le message d'erreur", () => {
    const secret = 'super-secret-value-123';
    try {
      parsePolarConfig({ ...validEnv, POLAR_CLIENT_SECRET: secret, POLAR_CLIENT_ID: undefined });
      throw new Error('aurait dû échouer');
    } catch (error) {
      expect((error as Error).message).not.toContain(secret);
      expect((error as Error).message).not.toContain('client-id-test');
    }
  });
});

describe('getters à la demande (lazy, mis en cache)', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
    resetPolarConfigCache();
  });

  it('chaque getter ne vérifie que ses variables', () => {
    for (const k of [...POLAR_ENV_VARS, 'POLAR_WEBHOOK_SECRET', 'CRON_SECRET']) delete process.env[k];
    resetPolarConfigCache();
    process.env.CRON_SECRET = 'cron';
    expect(getCronSecret()).toBe('cron');
    expect(() => getPolarConfig()).toThrow(PolarConfigError);
    expect(() => getPolarWebhookSecret()).toThrow('POLAR_WEBHOOK_SECRET');
    expect(() => getPolarApiCredentials()).toThrow('POLAR_CLIENT_ID');
  });

  it('un résultat valide est mis en cache ; une erreur ne l’est pas', () => {
    for (const k of POLAR_ENV_VARS) delete process.env[k];
    resetPolarConfigCache();
    expect(() => getPolarConfig()).toThrow(PolarConfigError);
    Object.assign(process.env, validEnv);
    const first = getPolarConfig();
    process.env.POLAR_CLIENT_ID = 'autre';
    expect(getPolarConfig()).toBe(first);
  });
});
