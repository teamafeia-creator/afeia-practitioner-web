// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';

vi.mock('@/lib/supabase', () => ({ supabase: {} }));
// recharts mesure son conteneur : en jsdom on le remplace par une boîte de taille fixe.
vi.mock('recharts', async (orig) => {
  const actual = await orig<typeof import('recharts')>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactElement }) => (
      <div style={{ width: 300, height: 96 }}>{children}</div>
    ),
  };
});

const { PatientWearableSectionView, parsePeriod } = await import('@/components/wearables/practitioner/PatientWearableSection');
const { chartData, formatDelta, formatMetricValue, formatSleepMinutes } = await import('@/lib/wearables/format');
import type { WearableConnectionOverview } from '@/lib/wearables/display';
import type { WearableSummary } from '@/lib/wearables/summary';

const NOW = new Date('2026-11-01T12:00:00Z');
const connection: WearableConnectionOverview = {
  provider: 'polar',
  status: 'active',
  connected_at: '2026-10-01T08:00:00Z',
  last_sync_at: '2026-11-01T09:00:00Z',
  last_error: null,
  backfill_status: 'done',
};
const summary: WearableSummary = {
  days: [
    { date: '2026-10-26', sleepMin: 420, hrvMs: 40, restingHrBpm: 55, steps: 8000 },
    { date: '2026-10-27', sleepMin: null, hrvMs: null, restingHrBpm: null, steps: 7000 },
    { date: '2026-10-28', sleepMin: 451, hrvMs: 44, restingHrBpm: 54, steps: 0 },
  ],
  averages: {
    current: { sleepMin: 435.5, hrvMs: 42, restingHrBpm: 54.5, steps: 5000 },
    previous: { sleepMin: 423, hrvMs: 45, restingHrBpm: 54.5, steps: null },
  },
};
const view = (props: Partial<React.ComponentProps<typeof PatientWearableSectionView>> = {}) =>
  render(
    <PatientWearableSectionView connection={connection} summary={summary} period={7} onPeriodChange={vi.fn()} now={NOW} {...props} />
  );

afterEach(cleanup);

describe('mise en forme', () => {
  it('sommeil en heures, unités, milliers', () => {
    expect(formatSleepMinutes(425)).toBe('7 h 05');
    expect(formatMetricValue('hrvMs', 42)).toBe('42 ms');
    expect(formatMetricValue('steps', 12345)).toBe('12 345 pas');
    expect(formatMetricValue('restingHrBpm', null)).toBe('—');
  });

  it('écart neutre avec la période précédente', () => {
    expect(formatDelta('sleepMin', 435.5, 423, 7)).toBe('+13 min vs 7 jours précédents');
    expect(formatDelta('hrvMs', 42, 45, 30)).toBe('−3 ms vs 30 jours précédents');
    expect(formatDelta('restingHrBpm', 54.5, 54.5, 7)).toBe('Identique aux 7 jours précédents');
    expect(formatDelta('steps', 5000, null, 7)).toBe('Pas de données sur les 7 jours précédents');
    expect(formatDelta('steps', null, 4000, 7)).toBeNull();
  });

  it('données du graphique : null conservé (trou), sommeil en heures, 0 conservé', () => {
    expect(chartData('sleepMin', summary.days).map((d) => d.value)).toEqual([7, null, 7.52]);
    expect(chartData('steps', summary.days).map((d) => d.value)).toEqual([8000, 7000, 0]);
  });

  it('période lue dans l’URL : 30 ou 7 par défaut', () => {
    expect(parsePeriod('30')).toBe(30);
    expect(parsePeriod('7')).toBe(7);
    expect(parsePeriod(null)).toBe(7);
    expect(parsePeriod('90')).toBe(7);
  });
});

describe('PatientWearableSectionView', () => {
  it('non connecté → message dédié, ni graphique ni sélecteur', () => {
    view({ connection: null, summary: null });
    expect(screen.getByTestId('patient-wearable-empty').textContent).toBe("Ce patient n'a pas encore connecté d'objet connecté.");
    expect(screen.queryByTestId('patient-wearable-grid')).toBeNull();
    expect(screen.queryByRole('button', { name: '30 jours' })).toBeNull();
  });

  it('connexion révoquée → traitée comme non connectée', () => {
    view({ connection: { ...connection, status: 'revoked' } });
    expect(screen.getByTestId('patient-wearable-empty')).toBeTruthy();
  });

  it('import en cours → mention, graphiques affichés avec ce qui est déjà arrivé', () => {
    view({ connection: { ...connection, backfill_status: 'running' } });
    expect(screen.getByTestId('patient-wearable-importing').textContent).toContain("Import de l'historique en cours");
    expect(screen.getByTestId('patient-wearable-grid')).toBeTruthy();
  });

  it('données → 4 graphiques avec unité, moyenne et écart, dernière synchronisation', () => {
    view();
    expect(screen.getByTestId('patient-wearable-last-sync').textContent).toBe('Dernière synchronisation : il y a 3 heures');
    const sleep = screen.getByTestId('wearable-chart-sleepMin');
    expect(within(sleep).getByText('Sommeil')).toBeTruthy();
    expect(within(sleep).getByText('h')).toBeTruthy();
    expect(screen.getByTestId('wearable-average-sleepMin').textContent).toBe('7 h 16');
    expect(screen.getByTestId('wearable-delta-sleepMin').textContent).toBe('+13 min vs 7 jours précédents');
    expect(screen.getByTestId('wearable-delta-steps').textContent).toBe('Pas de données sur les 7 jours précédents');
    for (const m of ['sleepMin', 'hrvMs', 'restingHrBpm', 'steps']) expect(screen.getByTestId(`wearable-chart-${m}`)).toBeTruthy();
  });

  it('jamais synchronisé → « en attente des premières données »', () => {
    view({ connection: { ...connection, last_sync_at: null } });
    expect(screen.getByTestId('patient-wearable-last-sync').textContent).toContain('en attente des premières données');
  });

  it('sélecteur 7 j / 30 j', () => {
    const onPeriodChange = vi.fn();
    view({ onPeriodChange });
    fireEvent.click(screen.getByRole('button', { name: '30 jours' }));
    expect(onPeriodChange).toHaveBeenCalledWith(30);
  });

  it('métrique sans aucune donnée → « Aucune donnée sur la période », moyenne « — »', () => {
    view({
      summary: {
        days: summary.days.map((d) => ({ ...d, hrvMs: null })),
        averages: { current: { ...summary.averages.current, hrvMs: null }, previous: summary.averages.previous },
      },
    });
    const hrv = screen.getByTestId('wearable-chart-hrvMs');
    expect(within(hrv).getByText('Aucune donnée sur la période')).toBeTruthy();
    expect(screen.getByTestId('wearable-average-hrvMs').textContent).toBe('—');
    expect(screen.queryByTestId('wearable-delta-hrvMs')).toBeNull();
  });

  it('aucune couleur de jugement ni texte d’interprétation', () => {
    const { container } = view();
    const html = container.innerHTML;
    expect(html).not.toMatch(/\b(text|bg|border)-(red|green|rose|success|danger|accent-success|accent-danger)\b/);
    expect(container.textContent).not.toMatch(/\b(bon|mauvais|bonne|excellent|insuffisant|alerte|attention|recommand)/i);
    expect(container.textContent).not.toMatch(/Polar/);
  });

  it('grille 2×2 sur grand écran, une colonne sur mobile', () => {
    view();
    expect(screen.getByTestId('patient-wearable-grid').className).toContain('grid-cols-1');
    expect(screen.getByTestId('patient-wearable-grid').className).toContain('md:grid-cols-2');
  });
});
