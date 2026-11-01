import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { canUseWearables, parseWearablesAccess } from '@/lib/wearables/access';
import { WEARABLES_CONSENT_TEXT, WEARABLES_CONSENT_VERSION } from '@/lib/wearables/consent-text';

describe('WEARABLES_ENABLED_FOR', () => {
  it('défaut internal ; valeur inconnue → internal (fermé par défaut)', () => {
    expect(parseWearablesAccess({}).mode).toBe('internal');
    expect(parseWearablesAccess({ WEARABLES_ENABLED_FOR: 'everyone' }).mode).toBe('internal');
    expect(parseWearablesAccess({ WEARABLES_ENABLED_FOR: ' ALL ' }).mode).toBe('all');
  });

  it('internal : seuls les e-mails de l’équipe (casse et espaces ignorés)', () => {
    const access = parseWearablesAccess({ WEARABLES_ENABLED_FOR: 'internal', WEARABLES_INTERNAL_EMAILS: 'Team@Afeia.fr, dev@afeia.fr ;qa@afeia.fr' });
    expect(canUseWearables({ email: 'team@afeia.fr' }, access)).toBe(true);
    expect(canUseWearables({ email: ' QA@afeia.fr ' }, access)).toBe(true);
    expect(canUseWearables({ email: 'patient@example.com' }, access)).toBe(false);
    expect(canUseWearables({ email: null }, access)).toBe(false);
    expect(canUseWearables(null, access)).toBe(false);
  });

  it('all : tout le monde, sans changement de code', () => {
    const access = parseWearablesAccess({ WEARABLES_ENABLED_FOR: 'all' });
    expect(canUseWearables({ email: 'patient@example.com' }, access)).toBe(true);
    expect(canUseWearables(null, access)).toBe(true);
  });
});

describe('texte de consentement', () => {
  it('version v1, fichier unique, commentaire de relecture retiré', () => {
    expect(WEARABLES_CONSENT_VERSION).toBe('v1');
    expect(WEARABLES_CONSENT_TEXT.startsWith('## Partager les données de votre objet connecté')).toBe(true);
    expect(WEARABLES_CONSENT_TEXT).not.toContain('<!--');
  });

  it('couvre données collectées, finalité, conservation et retrait', () => {
    for (const heading of ['### Quelles données ?', '### Pourquoi ?', '### Combien de temps ?', '### Vous gardez la main']) {
      expect(WEARABLES_CONSENT_TEXT).toContain(heading);
    }
    expect(WEARABLES_CONSENT_TEXT).toMatch(/sommeil/);
    expect(WEARABLES_CONSENT_TEXT).toMatch(/praticien qui vous suit/);
    expect(WEARABLES_CONSENT_TEXT).toMatch(/Déconnecter mon objet connecté/);
    expect(WEARABLES_CONSENT_TEXT).toMatch(/suppression des données déjà importées/);
  });

  it('les décisions en attente sont visibles ([À DÉCIDER] / [À VALIDER])', () => {
    expect(WEARABLES_CONSENT_TEXT).toContain('[À DÉCIDER : durée]');
    expect((WEARABLES_CONSENT_TEXT.match(/\[À VALIDER/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });

  it('vocabulaire simple : ni marque, ni jargon médical', () => {
    expect(WEARABLES_CONSENT_TEXT).not.toMatch(/Polar|RMSSD|HRV|bpm|diagnostic|pathologie|patient/i);
  });
});

// --- Route POST /api/wearables/consent -------------------------------------------------
const resolveConsultantId = vi.fn();
vi.mock('@/lib/mobile-auth', () => ({ resolveConsultantId: (r: unknown) => resolveConsultantId(r) }));
let canUse = true;
const recordConsent = vi.fn(async (_c: string, v: string) => ({ version: v, acceptedAt: '2026-11-01T10:00:00Z' }));
vi.mock('@/lib/wearables/consents', () => ({
  consultantCanUseWearables: async () => canUse,
  recordConsent: (c: string, v: string) => recordConsent(c, v),
}));
const { POST } = await import('@/app/api/wearables/consent/route');
const req = (body?: unknown) =>
  new NextRequest('https://afeia.fr/api/wearables/consent', {
    method: 'POST',
    headers: { authorization: 'Bearer s', 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

describe('POST /api/wearables/consent', () => {
  beforeEach(() => {
    canUse = true;
    resolveConsultantId.mockReset().mockResolvedValue('consultant-1');
    recordConsent.mockClear();
  });

  it('401 sans utilisateur', async () => {
    resolveConsultantId.mockResolvedValue(null);
    expect((await POST(req({ version: 'v1' }))).status).toBe(401);
  });

  it('403 pour un compte non ouvert', async () => {
    canUse = false;
    expect((await POST(req({ version: 'v1' }))).status).toBe(403);
    expect(recordConsent).not.toHaveBeenCalled();
  });

  it('409 si la version acceptée n’est pas la version courante', async () => {
    const res = await POST(req({ version: 'v0' }));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'version_mismatch', version: 'v1' });
    expect(recordConsent).not.toHaveBeenCalled();
  });

  it('201 : consentement v1 enregistré pour le consultant du jeton', async () => {
    const res = await POST(req({ version: 'v1', consultantId: 'un-autre' }));
    expect(res.status).toBe(201);
    expect(recordConsent).toHaveBeenCalledWith('consultant-1', 'v1');
  });
});
