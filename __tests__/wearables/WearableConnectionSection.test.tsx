// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

let search = '';
const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/consultant/home',
  useSearchParams: () => new URLSearchParams(search),
}));
vi.mock('@/lib/supabase-consultant', () => ({
  supabaseConsultant: { auth: { getSession: async () => ({ data: { session: { access_token: 'session-jwt' } } }) } },
}));
const success = vi.fn();
const error = vi.fn();
vi.mock('@/components/ui', async (orig) => ({
  ...(await orig<typeof import('@/components/ui')>()),
  showToast: { success: (m: string) => success(m), error: (m: string) => error(m) },
}));

const fetchMock = vi.fn();
const statusResponse = (body: { connections: unknown[]; enabled?: boolean; accepted?: boolean }) =>
  new Response(
    JSON.stringify({
      enabled: body.enabled ?? true,
      consent: { version: 'v1', accepted: body.accepted ?? true, acceptedAt: null },
      connections: body.connections,
    })
  );
const { WearableConnectionSection } = await import('@/components/wearables/WearableConnectionSection');

beforeEach(() => {
  replace.mockReset();
  success.mockReset();
  error.mockReset();
  fetchMock.mockReset().mockResolvedValue(
    statusResponse({ connections: [{ provider: 'polar', status: 'active', connected_at: '2026-10-20T09:00:00Z', last_sync_at: null, last_error: null }] })
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

  it('déconnexion : POST /api/wearables/disconnect avec la session et deleteData, toast, état rechargé', async () => {
    search = '';
    fetchMock.mockReset();
    fetchMock
      .mockResolvedValueOnce(statusResponse({ connections: [{ provider: 'polar', status: 'active', connected_at: '2026-10-20T09:00:00Z', last_sync_at: null, last_error: null }] }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, polar: 'deregistered', deleted: {}, consentsWithdrawn: 1 })))
      .mockResolvedValueOnce(statusResponse({ accepted: false, connections: [{ provider: 'polar', status: 'revoked', connected_at: '2026-10-20T09:00:00Z', last_sync_at: null, last_error: null }] }));
    render(<WearableConnectionSection />);
    fireEvent.click(await screen.findByRole('button', { name: 'Déconnecter mon objet connecté' }));
    fireEvent.click(await screen.findByTestId('disconnect-confirm'));

    await screen.findByRole('button', { name: 'Connecter mon objet connecté' });
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe('/api/wearables/disconnect');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer session-jwt' });
    expect(JSON.parse(init.body)).toEqual({ deleteData: true });
    expect(success).toHaveBeenCalledWith('Objet connecté déconnecté. Vos données importées ont été supprimées.');
  });

  it('compte non ouvert (WEARABLES_ENABLED_FOR=internal hors équipe) → rien d’affiché', async () => {
    search = '';
    fetchMock.mockReset().mockResolvedValue(statusResponse({ enabled: false, connections: [] }));
    const { container } = render(<WearableConnectionSection />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    expect(container.textContent).toBe('');
  });

  it('sans consentement : la connexion ouvre le texte, accord enregistré puis redirection vers /connect', async () => {
    search = '';
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign, search: '' });
    fetchMock
      .mockReset()
      .mockResolvedValueOnce(statusResponse({ accepted: false, connections: [] }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ authorizeUrl: 'https://flow.polar.com/oauth2/authorization?state=x' })));
    render(<WearableConnectionSection />);
    fireEvent.click(await screen.findByRole('button', { name: 'Connecter mon objet connecté' }));

    expect((await screen.findByTestId('wearable-consent-text')).textContent).toContain('Quelles données');
    const accept = screen.getByTestId('wearable-consent-accept') as HTMLButtonElement;
    expect(accept.disabled).toBe(true); // rien sans la case cochée
    fireEvent.click(screen.getByTestId('wearable-consent-checkbox'));
    fireEvent.click(accept);

    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://flow.polar.com/oauth2/authorization?state=x'));
    expect(fetchMock.mock.calls[1][0]).toBe('/api/wearables/consent');
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ version: 'v1' });
    expect(String(fetchMock.mock.calls[2][0])).toMatch(/^\/api\/wearables\/polar\/connect\?returnTo=/);
  });

  it('consentement déjà accepté : redirection directe, sans texte', async () => {
    search = '';
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign, search: '' });
    fetchMock
      .mockReset()
      .mockResolvedValueOnce(statusResponse({ accepted: true, connections: [] }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ authorizeUrl: 'https://flow.polar.com/x' })));
    render(<WearableConnectionSection />);
    fireEvent.click(await screen.findByRole('button', { name: 'Connecter mon objet connecté' }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://flow.polar.com/x'));
    expect(screen.queryByTestId('wearable-consent-text')).toBeNull();
  });
});
