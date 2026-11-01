// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

let search = '';
const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/consultant/home',
  useSearchParams: () => new URLSearchParams(search),
}));
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'session-jwt' } } }) } },
}));
const success = vi.fn();
const error = vi.fn();
vi.mock('@/components/ui', async (orig) => ({
  ...(await orig<typeof import('@/components/ui')>()),
  showToast: { success: (m: string) => success(m), error: (m: string) => error(m) },
}));

const fetchMock = vi.fn();
const { WearableConnectionSection } = await import('@/components/wearables/WearableConnectionSection');

beforeEach(() => {
  replace.mockReset();
  success.mockReset();
  error.mockReset();
  fetchMock.mockReset().mockResolvedValue(
    new Response(JSON.stringify({ connections: [{ provider: 'polar', status: 'active', connected_at: '2026-10-20T09:00:00Z', last_sync_at: null, last_error: null }] }))
  );
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('WearableConnectionSection', () => {
  it("lit l'état via /api/wearables/status avec la session (jamais la table brute)", async () => {
    search = '';
    render(<WearableConnectionSection />);
    await screen.findByText('Connecté');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/wearables/status');
    expect(init.headers).toEqual({ Authorization: 'Bearer session-jwt' });
    expect(replace).not.toHaveBeenCalled();
  });

  it('?wearable=connected : toast de succès, aide affichée, URL nettoyée', async () => {
    search = 'tab=objets&wearable=connected';
    render(<WearableConnectionSection />);
    await screen.findByTestId('wearable-setup-help');
    expect(success).toHaveBeenCalledWith('Votre objet connecté est relié à Afeia.');
    expect(replace).toHaveBeenCalledWith('/consultant/home?tab=objets', { scroll: false });
  });

  it('?wearable=error&reason=… : toast d’erreur avec le message de la raison, URL nettoyée', async () => {
    search = 'wearable=error&reason=polar_consents_missing';
    render(<WearableConnectionSection />);
    await waitFor(() => expect(error).toHaveBeenCalled());
    expect(error.mock.calls[0][0]).toContain('account.polar.com');
    expect(replace).toHaveBeenCalledWith('/consultant/home', { scroll: false });
  });
});
