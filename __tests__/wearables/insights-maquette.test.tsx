// @vitest-environment jsdom
// Fidélité à la maquette : on rejoue les données d'Amina (canvas, écrans 19a à 19f) et on vérifie
// que le code produit les mêmes chiffres et les mêmes phrases que la maquette.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

// Client Supabase factice : toute requête renvoie une liste vide.
vi.mock('@/lib/supabase', () => {
  const result = { data: [], error: null };
  const chain: Record<string, unknown> = {};
  const handler: ProxyHandler<object> = {
    get: (_t, prop) => (prop === 'then' ? (res: (v: unknown) => void) => res(result) : prop === 'single' || prop === 'maybeSingle' ? () => Promise.resolve({ data: null, error: null }) : () => proxy),
  };
  const proxy: unknown = new Proxy(chain, handler);
  return { supabase: { from: () => proxy, rpc: () => proxy, auth: { getUser: async () => ({ data: { user: { id: 'p1' } } }), getSession: async () => ({ data: { session: null } }) } } };
});

import { addDays, computeInsights, buildRecapText, type InsightsInput } from '@/lib/wearables/insights';
import type { LoadedInsights } from '@/lib/wearables/insights/load';

const H = (v: number | null) => (v === null ? null : Math.round(v * 60));
// 28 nuits de la maquette, du 6 oct. (indice 0) au 2 nov. (27) ; null = objet non porté.
const SL = [6.3, 6.0, 6.8, 5.9, 6.4, 6.1, 7.0, 6.2, 5.8, null, null, 6.5, 6.0, 6.6, 7.1, 7.4, 6.1, 6.2, 5.4, 7.8, 8.3, 7.1, 6.9, 6.6, 7.4, null, 7.0, 7.9];
const HV = [39, 37, 41, 36, 38, 37, 42, 38, 35, null, null, 39, 37, 40, 41, 43, 40, 38, 33, 35, 42, 45, 46, 44, 47, null, 46, 48];
const HR = [62, 63, 61, 64, 62, 63, 60, 62, 64, null, null, 62, 63, 61, 61, 60, 61, 62, 66, 65, 61, 59, 59, 60, 58, null, 59, 58];
const SP = [4200, 3800, 6100, 3500, 5000, 7200, 8000, 4100, 3900, null, null, 4500, 6800, 7500, 5200, 6400, 4000, 5500, 2100, 1500, 6000, 7800, 8200, 6500, 9100, null, 7400, 8800];
// 14 nuits antérieures (habituel avant la séance).
const PRE = {
  sleep: [6.2, 6.5, 5.9, 6.4, 6.7, 6.1, 6.3, 6.0, 6.6, 5.8, 6.4, 6.2, 6.9, 6.1],
  hrv: [38, 36, 39, 37, 40, 38, 36, 39, 37, 35, 38, 40, 39, 37],
  hr: [62, 63, 62, 61, 63, 62, 64, 62, 61, 63, 62, 62, 60, 63],
  steps: [4500, 3900, 5200, 6100, 4000, 7000, 6500, 4200, 3800, 5100, 4800, 6900, 7200, 4100],
};
const START = '2026-10-06';
const TODAY = '2026-11-03';

function amina(): LoadedInsights {
  const days = [
    ...PRE.sleep.map((_, i) => ({ date: addDays(START, i - 14), sleepMin: H(PRE.sleep[i]), hrvMs: PRE.hrv[i], nightHrBpm: PRE.hr[i], steps: PRE.steps[i] })),
    ...SL.map((_, i) => ({ date: addDays(START, i), sleepMin: H(SL[i]), hrvMs: HV[i], nightHrBpm: HR[i], steps: SP[i] })),
    { date: TODAY, sleepMin: null, hrvMs: null, nightHrBpm: null, steps: null },
  ];
  const input: InsightsInput = {
    days,
    today: TODAY,
    firstName: 'Amina',
    gender: 'female',
    lastSessionDate: '2026-10-19',
    nextSessionDate: '2026-11-12',
    planShares: [{ date: '2026-10-19', version: 2 }],
    consentDate: '2026-10-02',
    items: [],
    logs: [],
  };
  return { ...input, consultantId: 'c1', lastSyncAt: null, lastJournalDate: null };
}

afterEach(cleanup);

describe('maquette : cas d’Amina', () => {
  const r = computeInsights(amina(), { recapFrequency: '1w' });

  it('tuiles « Cette semaine, comparée à d’habitude »', () => {
    const sleep = r.tiles.find((t) => t.metric === 'sleep')!;
    expect(sleep).toMatchObject({ value: '7 h 09', usual: '6 h 18', delta: '▲ 51 min de plus', tone: 'good' });
    expect(r.tiles.find((t) => t.metric === 'hrv')).toMatchObject({ value: '46 ms', usual: '38 ms', delta: '▲ 8 ms de plus' });
    expect(r.tiles.find((t) => t.metric === 'hr')).toMatchObject({ value: '59 bpm', usual: '62 bpm', delta: '▼ 3 bpm de moins', tone: 'good' });
  });

  it('points à aborder depuis la séance du 19 octobre', () => {
    expect(r.points.status).toBe('ok');
    if (r.points.status !== 'ok') return;
    const texts = r.points.points.map((p) => p.text);
    expect(texts).toContain('Sa VFC de la nuit est plus haute depuis la séance : +4 ms.');
    expect(texts).toContain('Elle dort 45 min de plus par nuit depuis la séance.');
    expect(texts).toHaveLength(3);
  });

  it('avant / après le conseillancier v2', () => {
    expect(r.beforeAfter.status).toBe('ok');
    if (r.beforeAfter.status !== 'ok') return;
    expect(r.beforeAfter.subtitle).toBe('14 jours de chaque côté · 12 nuits mesurées avant, 13 depuis');
    const row = (m: string) => r.beforeAfter.status === 'ok' && r.beforeAfter.rows.find((x) => x.metric === m)!;
    expect(row('sleep')).toMatchObject({ verdictLabel: 'Évolution favorable', sentence: 'Elle dort 45 min de plus par nuit.' });
    expect(row('hrv')).toMatchObject({ verdictLabel: 'Évolution favorable', sentence: 'Sa VFC la nuit est plus haute de 4 ms.' });
    expect(row('hr')).toMatchObject({ verdictLabel: 'Peu de changement', sentence: 'Un peu moins, dans ses variations habituelles.' });
    expect(row('steps')).toMatchObject({ verdictLabel: 'Peu de changement', sentence: 'Un peu plus, dans ses variations habituelles.' });
  });

  it('récap de la semaine : les 3 points cochés de la maquette, et le texte de la Revue du matin', () => {
    const checked = r.recap.options.filter((o) => o.checked).map((o) => o.id);
    expect(checked.sort()).toEqual(['calm', 'heart', 'move']);
    expect(r.recap.options.map((o) => o.id)).toEqual(expect.arrayContaining(['sleepLong']));
    const { text } = buildRecapText({ firstName: 'Amina', practitionerFirstName: 'Claire', frequency: '1w', points: ['calm', 'heart', 'move'] });
    expect(text).toBe(
      'Bonjour Amina,\n\nVotre corps récupère mieux la nuit : vos rituels du soir portent leurs fruits.\n\nVotre cœur est plus calme la nuit, signe que vous récupérez bien.\n\nVous avez bougé davantage cette semaine, bravo.\n\nBelle semaine,\nClaire'
    );
  });

  it('les onglets s’affichent sans erreur', async () => {
    const { OverviewTab } = await import('@/components/wearables/practitioner/insights/OverviewTab');
    const { BeforeAfterTab } = await import('@/components/wearables/practitioner/insights/BeforeAfterTab');
    const { FeelTab } = await import('@/components/wearables/practitioner/insights/FeelTab');
    const { HabitsTab } = await import('@/components/wearables/practitioner/insights/HabitsTab');
    const { RecapModal } = await import('@/components/wearables/practitioner/insights/RecapModal');
    const { who } = await import('@/lib/wearables/insights');
    const input = amina();
    const w = who('Amina', 'female');
    render(<OverviewTab input={input} insights={r} who={w} consultantId="c1" metric="sleep" onMetric={() => {}} draft={null} sent={false} onOpenRecap={() => {}} onOpenRdv={() => {}} />);
    expect(screen.getByText('Le récap d’Amina')).toBeTruthy();
    expect(screen.getByText('Depuis la séance du 19 octobre')).toBeTruthy();
    expect(screen.getByText('Relire et envoyer à Amina')).toBeTruthy();
    cleanup();
    render(<BeforeAfterTab insights={r} onOpenPlan={() => {}} />);
    expect(screen.getByText('Avant et depuis le 19 oct.')).toBeTruthy();
    cleanup();
    render(<FeelTab input={input} insights={r} who={w} onOpenCycle={() => {}} />);
    expect(screen.getByText('Ce qu’elle ressent, ce que l’objet mesure')).toBeTruthy();
    cleanup();
    render(<HabitsTab input={input} insights={r} who={w} onChanged={() => {}} onOpenGoals={() => {}} />);
    expect(screen.getByText('Ses conseils : ce qu’elle fait, et ce que ça change')).toBeTruthy();
    cleanup();
    render(<RecapModal consultantId="c1" input={input} who={w} practitioner={{ first: 'Claire', full: 'Claire Martin' }} settings={null} draft={null} onSettings={() => {}} onClose={() => {}} onSent={() => {}} />);
    expect(screen.getByText('Récap de la semaine pour Amina')).toBeTruthy();
    expect(screen.getByText('Me le proposer régulièrement (je valide avant l’envoi)')).toBeTruthy();
  });
});
