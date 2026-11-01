import { describe, expect, it } from 'vitest';
import {
  parsePolarConfig,
  PolarConfigError,
  POLAR_ENV_VARS,
} from '@/lib/wearables/polar/config';

const validEnv = {
  POLAR_CLIENT_ID: 'client-id-test',
  POLAR_CLIENT_SECRET: 'client-secret-test',
  POLAR_REDIRECT_URI: 'http://localhost:3000/api/wearables/polar/callback',
};

describe('parsePolarConfig', () => {
  it('renvoie une config typée quand tout est défini', () => {
    expect(parsePolarConfig(validEnv)).toEqual({
      clientId: 'client-id-test',
      clientSecret: 'client-secret-test',
      redirectUri: 'http://localhost:3000/api/wearables/polar/callback',
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
