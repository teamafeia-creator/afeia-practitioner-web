// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';

vi.mock('@/lib/supabase', () => ({ supabase: {} }));
// recharts mesure son conteneur : en jsdom on lui donne une taille fixe pour qu'il dessine le SVG.
vi.mock('recharts', async (orig) => {
  const actual = await orig<typeof import('recharts')>();
  const { cloneElement } = await import('react');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactElement }) => (
      <div style={{ width: 300, height: 112 }}>{cloneElement(children, { width: 300, height: 112 } as never)}</div>
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
  partialDay: '2026-10-28',
  days: [
    { date: '2026-10-26', sleepMin: 420, hrvMs: 40, nightHrBpm: 55, steps: 8000 },
    { date: '2026-10-27', sleepMin: null, hrvMs: null, nightHrBpm: null, steps: 7000 },
    { date: '2026-10-28', sleepMin: 451, hrvMs: 44, nightHrBpm: 54, steps: 0 },
  ],
  averages: {
    current: { sleepMin: 435.5, hrvMs: 42, nightHrBpm: 54.5, steps: 5000 },
    previous: { sleepMin: 423, hrvMs: 45, nightHrBpm: 54.5, steps: null },
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
    expect(formatMetricValue('nightHrBpm', null)).toBe('—');
  });

  it('écart neutre avec la période précédente', () => {
    expect(formatDelta('sleepMin', 435.5, 423, 7)).toBe('+13 min vs 7 jours précédents');
    expect(formatDelta('hrvMs', 42, 45, 30)).toBe('−3 ms vs 30 jours précédents');
    expect(formatDelta('nightHrBpm', 54.5, 54.5, 7)).toBe('Identique aux 7 jours précédents');
    expect(formatDelta('steps', 5000, null, 7)).toBe('Pas de données sur les 7 jours précédents');
    expect(formatDelta('steps', null, 4000, 7)).toBeNull();
  });

  it('données du graphique : null conservé (trou), sommeil en heures', () => {
    expect(chartData('sleepMin', summary.days, '2026-10-28').map((d) => d.value)).toEqual([7, null, 7.52]);
  });

  it('pas : journée en cours sortie de la courbe pleine, segment pointillé depuis la veille', () => {
    const points = chartData('steps', summary.days, '2026-10-28');
    expect(points.map((d) => d.value)).toEqual([8000, 7000, null]);
    expect(points.map((d) => d.partial)).toEqual([null, 7000, 0]);
    expect(points.map((d) => d.isPartial)).toEqual([false, false, true]);
    // Les autres métriques ne sont pas cumulées : jour en cours tracé normalement.
    expect(chartData('hrvMs', summary.days, '2026-10-28').every((d) => !d.isPartial && d.partial === null)).toBe(true);
  });

  it('graduations de l’axe Y avec l’unité', async () => {
    const { formatAxisValue, chartRange } = await import('@/lib/wearables/format');
    expect(formatAxisValue('sleepMin', 7.52)).toBe('7,5\u202fh');
    expect(formatAxisValue('steps', 12000)).toBe('12\u202f000\u202fpas');
    expect(formatAxisValue('nightHrBpm', 54)).toBe('54\u202fbpm');
    expect(chartRange(chartData('steps', summary.days, '2026-10-28'))).toEqual([0, 8000]);
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

  it.each(['error', 'revoked'] as const)('connexion %s → bandeau « interrompue depuis le … », graphiques conservés', (status) => {
    view({ connection: { ...connection, status, interrupted_at: '2026-10-29T07:30:00Z' } });
    expect(screen.getByTestId('patient-wearable-interrupted').textContent).toBe(
      "La connexion à l'objet connecté est interrompue depuis le 29 octobre 2026. Le patient doit la rétablir."
    );
    expect(screen.getByTestId('patient-wearable-grid')).toBeTruthy();
    expect(screen.queryByTestId('patient-wearable-empty')).toBeNull();
    expect(screen.queryByTestId('patient-wearable-importing')).toBeNull();
  });

  it('connexion interrompue sans date d’interruption → date de dernière synchronisation', () => {
    view({ connection: { ...connection, status: 'error', interrupted_at: null } });
    expect(screen.getByTestId('patient-wearable-interrupted').textContent).toContain('depuis le 1 novembre 2026');
  });

  it('import en cours → mention, graphiques affichés avec ce qui est déjà arrivé', () => {
    view({ connection: { ...connection, backfill_status: 'running' } });
    expect(screen.getByTestId('patient-wearable-importing').textContent).toContain("Import de l'historique en cours");
    expect(screen.getByTestId('patient-wearable-grid')).toBeTruthy();
  });

  it('données → 4 graphiques avec unité, moyenne et écart, dernière synchronisation', () => {
    view();
    expect(screen.getByTestId('patient-wearable-last-sync').textContent).toBe('Dernière synchronisation : il y a 3 heures');
    expect(within(screen.getByTestId('wearable-chart-nightHrBpm')).getByText('FC nocturne')).toBeTruthy();
    expect(screen.queryByText('FC de repos')).toBeNull();
    const sleep = screen.getByTestId('wearable-chart-sleepMin');
    expect(within(sleep).getByText('Sommeil')).toBeTruthy();
    expect(within(sleep).getByText('h')).toBeTruthy();
    expect(screen.getByTestId('wearable-average-sleepMin').textContent).toBe('7 h 16');
    expect(screen.getByTestId('wearable-delta-sleepMin').textContent).toBe('+13 min vs 7 jours précédents');
    expect(screen.getByTestId('wearable-delta-steps').textContent).toBe('Pas de données sur les 7 jours précédents');
    for (const m of ['sleepMin', 'hrvMs', 'nightHrBpm', 'steps']) expect(screen.getByTestId(`wearable-chart-${m}`)).toBeTruthy();
  });

  it('axe Y : minimum et maximum de la période, avec l’unité', () => {
    view();
    const steps = screen.getByTestId('wearable-chart-steps');
    const ticks = [...steps.querySelectorAll('.recharts-yAxis .recharts-cartesian-axis-tick-value')].map((t) => t.textContent);
    expect(ticks).toEqual(['0\u202fpas', '8\u202f000\u202fpas']);
    const hr = screen.getByTestId('wearable-chart-nightHrBpm');
    expect([...hr.querySelectorAll('.recharts-yAxis .recharts-cartesian-axis-tick-value')].map((t) => t.textContent)).toEqual([
      '54\u202fbpm',
      '55\u202fbpm',
    ]);
  });

  it('pas : journée en cours en creux, exclue de la moyenne (mention « hors journée en cours »)', () => {
    view();
    const steps = screen.getByTestId('wearable-chart-steps');
    expect(steps.querySelectorAll('[data-testid="wearable-partial-dot"]')).toHaveLength(1);
    expect(steps.querySelector('.recharts-line-curve[stroke-dasharray="3 3"]')).toBeTruthy();
    expect(within(steps).getByText('(hors journée en cours)')).toBeTruthy();
    // Pas de point en creux sur les autres métriques.
    expect(screen.getByTestId('wearable-chart-sleepMin').querySelectorAll('[data-testid="wearable-partial-dot"]')).toHaveLength(0);
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
        partialDay: summary.partialDay,
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
