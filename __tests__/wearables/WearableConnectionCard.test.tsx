// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CONTINUOUS_HR_HELP, WearableConnectionCard } from '@/components/wearables/WearableConnectionCard';
import type { WearableConnectionOverview } from '@/lib/wearables/display';

const NOW = new Date('2026-11-01T12:00:00Z');
const base: WearableConnectionOverview = {
  provider: 'polar',
  status: 'active',
  connected_at: '2026-10-20T09:00:00Z',
  last_sync_at: '2026-11-01T10:00:00Z',
  last_error: null,
};

afterEach(cleanup);

function textOf(container: HTMLElement) {
  return container.textContent ?? '';
}

describe('WearableConnectionCard : déconnexion', () => {
  it('bouton « Déconnecter mon objet connecté » si connecté ou en erreur, pas sinon', () => {
    const { unmount } = render(<WearableConnectionCard connection={base} onConnect={vi.fn()} onDisconnect={vi.fn()} now={NOW} />);
    expect(screen.getByRole('button', { name: 'Déconnecter mon objet connecté' })).toBeTruthy();
    unmount();
    render(<WearableConnectionCard connection={{ ...base, status: 'error' }} onConnect={vi.fn()} onDisconnect={vi.fn()} now={NOW} />);
    expect(screen.getByRole('button', { name: 'Déconnecter mon objet connecté' })).toBeTruthy();
    cleanup();
    render(<WearableConnectionCard connection={null} onConnect={vi.fn()} onDisconnect={vi.fn()} now={NOW} />);
    expect(screen.queryByRole('button', { name: 'Déconnecter mon objet connecté' })).toBeNull();
  });

  it('confirmation : case « Supprimer aussi mes données déjà importées » cochée par défaut', async () => {
    const onDisconnect = vi.fn();
    render(<WearableConnectionCard connection={base} onConnect={vi.fn()} onDisconnect={onDisconnect} now={NOW} />);
    fireEvent.click(screen.getByRole('button', { name: 'Déconnecter mon objet connecté' }));
    const box = (await screen.findByTestId('disconnect-delete-data')) as HTMLInputElement;
    expect(box.checked).toBe(true);
    expect(screen.getByText('Supprimer aussi mes données déjà importées')).toBeTruthy();
    expect(onDisconnect).not.toHaveBeenCalled(); // rien sans confirmation
    fireEvent.click(screen.getByTestId('disconnect-confirm'));
    expect(onDisconnect).toHaveBeenCalledWith(true);
  });

  it('case décochée → déconnexion sans suppression', async () => {
    const onDisconnect = vi.fn();
    render(<WearableConnectionCard connection={base} onConnect={vi.fn()} onDisconnect={onDisconnect} now={NOW} />);
    fireEvent.click(screen.getByRole('button', { name: 'Déconnecter mon objet connecté' }));
    fireEvent.click(await screen.findByTestId('disconnect-delete-data'));
    fireEvent.click(screen.getByTestId('disconnect-confirm'));
    expect(onDisconnect).toHaveBeenCalledWith(false);
  });

  it('annuler → aucune déconnexion', async () => {
    const onDisconnect = vi.fn();
    render(<WearableConnectionCard connection={base} onConnect={vi.fn()} onDisconnect={onDisconnect} now={NOW} />);
    fireEvent.click(screen.getByRole('button', { name: 'Déconnecter mon objet connecté' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Annuler' }));
    expect(onDisconnect).not.toHaveBeenCalled();
  });
});

describe('WearableConnectionCard', () => {
  it('non connecté : bouton « Connecter mon objet connecté »', () => {
    const onConnect = vi.fn();
    const { container } = render(<WearableConnectionCard connection={null} onConnect={onConnect} now={NOW} />);
    fireEvent.click(screen.getByRole('button', { name: 'Connecter mon objet connecté' }));
    expect(onConnect).toHaveBeenCalledOnce();
    expect(screen.queryByText('Reconnecter')).toBeNull();
    expect(container.querySelector('[data-state]')?.getAttribute('data-state')).toBe('disconnected');
  });

  it('une connexion révoquée est affichée comme non connectée', () => {
    render(<WearableConnectionCard connection={{ ...base, status: 'revoked' }} onConnect={vi.fn()} now={NOW} />);
    expect(screen.getByRole('button', { name: 'Connecter mon objet connecté' })).toBeTruthy();
  });

  it('connecté : date de connexion et dernière synchronisation en relatif', () => {
    const { container } = render(<WearableConnectionCard connection={base} onConnect={vi.fn()} now={NOW} />);
    expect(screen.getByText('Connecté')).toBeTruthy();
    expect(screen.getByText('20 octobre 2026')).toBeTruthy();
    expect(screen.getByText('il y a 2 heures')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
    expect(textOf(container)).not.toContain(CONTINUOUS_HR_HELP);
  });

  it('connecté sans synchronisation : en attente des premières données', () => {
    render(<WearableConnectionCard connection={{ ...base, last_sync_at: null }} onConnect={vi.fn()} now={NOW} />);
    expect(screen.getByText('En attente des premières données')).toBeTruthy();
  });

  it("juste après la connexion : aide sur la fréquence cardiaque continue", () => {
    render(<WearableConnectionCard connection={base} onConnect={vi.fn()} showSetupHelp now={NOW} />);
    expect(screen.getByTestId('wearable-setup-help').textContent).toBe(CONTINUOUS_HR_HELP);
  });

  it.each(['pending', 'running'] as const)('import %s → « Import de l’historique en cours »', (backfill_status) => {
    render(<WearableConnectionCard connection={{ ...base, backfill_status }} onConnect={vi.fn()} now={NOW} />);
    expect(screen.getByTestId('wearable-backfill').textContent).toContain('Import de l’historique en cours'.replace('’', "'"));
  });

  it.each(['done', 'failed', null] as const)('import %s → pas de mention d’import', (backfill_status) => {
    render(<WearableConnectionCard connection={{ ...base, backfill_status }} onConnect={vi.fn()} now={NOW} />);
    expect(screen.queryByTestId('wearable-backfill')).toBeNull();
  });

  it('en erreur : message lisible (pas le détail technique) et bouton « Reconnecter »', () => {
    const onConnect = vi.fn();
    const { container } = render(
      <WearableConnectionCard connection={{ ...base, status: 'error', last_error: 'HTTP 401 Unauthorized' }} onConnect={onConnect} now={NOW} />
    );
    expect(screen.getByRole('alert').textContent).toMatch(/expiré ou a été retiré/);
    expect(textOf(container)).not.toContain('HTTP 401');
    fireEvent.click(screen.getByRole('button', { name: 'Reconnecter' }));
    expect(onConnect).toHaveBeenCalledOnce();
  });

  it.each([
    ['non connecté', null],
    ['connecté', base],
    ['en erreur', { ...base, status: 'error' as const, last_error: 'boom' }],
  ])('%s : « Polar » apparaît seulement dans « Compatible : Polar »', (_label, connection) => {
    const { container } = render(<WearableConnectionCard connection={connection} onConnect={vi.fn()} now={NOW} />);
    const text = textOf(container);
    expect(text).toContain('Compatible : Polar');
    expect(text.replace('Compatible : Polar', '')).not.toMatch(/polar/i);
    expect(text).toMatch(/praticien/);
  });
});
