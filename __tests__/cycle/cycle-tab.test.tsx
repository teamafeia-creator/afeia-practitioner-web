// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { CycleEntry, CycleProfile } from '@/lib/types';

vi.mock('@/lib/queries/cycle', () => ({
  getCycleEntries: vi.fn(async () => []),
  getCycleProfile: vi.fn(async () => null),
  inviteToCycleTracking: vi.fn(async () => ({ ok: true })),
  notePeriod: vi.fn(async () => ({ ok: true })),
  saveCycleSettings: vi.fn(async () => null),
  setCycleTracking: vi.fn(async () => null),
}));
vi.mock('@/lib/cycle/engine', async (orig) => {
  const m = (await orig()) as Record<string, unknown>;
  return { ...m, todayIso: () => '2026-11-04' };
});

import { addDays } from '@/lib/cycle/engine';
import { CycleTab } from '@/components/cycle/tab/CycleTab';

afterEach(() => cleanup());

function entry(date: string, over: Partial<CycleEntry> = {}): CycleEntry {
  return {
    id: date, consultant_id: 'c1', date, is_period: false, flow_intensity: null, period_pain: null,
    symptom_cramps: false, symptom_bloating: false, symptom_headache: false, symptom_breast_tenderness: false, symptom_mood_swings: false,
    symptom_fatigue: false, symptom_acne: false, symptom_cravings: false, symptom_insomnia: false, symptom_water_retention: false,
    symptom_back_pain: false, symptom_nausea: false, symptom_libido_high: false, symptom_cervical_mucus: null, temperature: null, notes: null,
    source: 'consultant', created_at: date, ...over,
  };
}
const profile = (over: Partial<CycleProfile> = {}): CycleProfile => ({
  id: 'p', consultant_id: 'c1', practitioner_id: 'pr', is_tracking: true, average_cycle_length: 28, average_period_length: 5,
  cycle_regularity: 'regular', contraception: 'aucune', notes: null, created_at: '2026-08-01', updated_at: '2026-08-01', tracking_activated_at: '2026-09-04T10:00:00Z', ...over,
});
function entries(migraineDays = [1, 2]) {
  const out: CycleEntry[] = [];
  ['2026-08-07', '2026-09-04', '2026-10-02', '2026-10-24'].forEach((start, i) => {
    const len = i === 3 ? 12 : 28;
    for (let d = 0; d < len; d++) {
      const cd = d + 1;
      out.push(entry(addDays(start, d), { is_period: cd <= 5, flow_intensity: cd <= 5 ? (cd === 2 ? 'heavy' : 'medium') : null, period_pain: cd <= 4 ? 5 : 0, symptom_headache: i === 3 ? migraineDays.includes(cd) : cd <= 2, symptom_cramps: cd <= 3, notes: cd === 1 ? 'Migraine dès le réveil.' : null }));
    }
  });
  return out;
}
const base = { consultantId: 'c1', practitionerId: 'pr', firstName: 'Amina', practitionerFirstName: 'Claire', onProfile: () => {}, onEntries: () => {}, onOpenJournal: () => {}, onToast: () => {} };

describe('Onglet Cycle', () => {
  it('suivi non activé : propose le message à la consultante', () => {
    render(<CycleTab {...base} profile={null} entries={[]} />);
    expect(screen.getByText('Le suivi du cycle n’est pas activé pour Amina')).toBeTruthy();
    expect(screen.getByText('Proposer le suivi à Amina')).toBeTruthy();
    expect((screen.getByLabelText('Message à Amina') as HTMLTextAreaElement).value).toMatch(/^Bonjour Amina,/);
    expect(screen.queryByText('＋ Noter des règles')).toBeNull();
  });

  it('suivi désactivé : l’onglet reste, données conservées, bouton de réactivation', () => {
    render(<CycleTab {...base} profile={profile({ is_tracking: false, tracking_paused_at: '2026-11-04T09:00:00Z' })} entries={entries()} />);
    expect(screen.getByText('Le suivi du cycle est désactivé pour Amina')).toBeTruthy();
    expect(screen.getByText(/Ses données sont conservées : 4 cycles/)).toBeTruthy();
    expect(screen.getByText('Activer le suivi du cycle pour Amina')).toBeTruthy();
  });

  it('en attente des premières règles', () => {
    render(<CycleTab {...base} profile={profile()} entries={[]} />);
    expect(screen.getByText('En attente des premières règles')).toBeTruthy();
    expect(screen.getByText('＋ Noter des règles')).toBeTruthy();
  });

  it('actif : rien d’inhabituel, tuiles, calendrier, ressentis et historique', () => {
    render(<CycleTab {...base} profile={profile({ cycle_length_manual: true })} entries={entries()} />);
    expect(screen.getByText(/Rien d’inhabituel/)).toBeTruthy();
    expect(screen.getByText('J12')).toBeTruthy();
    expect(screen.getByText('21 nov.')).toBeTruthy();
    expect(screen.getByText('Novembre 2026')).toBeTruthy();
    expect(screen.getByText('Ressentis selon la phase · 3 derniers cycles')).toBeTruthy();
    expect(screen.getByText('Historique des cycles')).toBeTruthy();
    expect(screen.getByText('Depuis le 24 oct.')).toBeTruthy();
    // Point saillant : migraines au début des règles.
    expect(screen.getByText(/pendant les 2 premiers jours des règles/)).toBeTruthy();
  });

  it('actif : met en avant seulement ce qui s’écarte de l’habitude, avec le gap', () => {
    render(<CycleTab {...base} profile={profile({ cycle_length_manual: true })} entries={entries([1, 2, 3, 4, 5, 6])} />);
    expect(screen.getByText(/À surveiller en priorité/)).toBeTruthy();
    expect(screen.getAllByText('Maux de tête').length).toBeGreaterThan(0);
    expect(screen.getByText('+4 j')).toBeTruthy();
    expect(screen.getByText('d’habitude 2 j')).toBeTruthy();
    fireEvent.click(screen.getByText('Règles de calcul'));
    expect(screen.getByText('Ce qui fait ressortir un critère')).toBeTruthy();
  });

  it('clic sur un jour : modale avec Règles Oui/Non, flux, douleur, symptômes, température, note', () => {
    render(<CycleTab {...base} profile={profile({ cycle_length_manual: true })} entries={entries()} />);
    fireEvent.click(screen.getByLabelText('Mois précédent'));
    expect(screen.getByText('Octobre 2026')).toBeTruthy();
    fireEvent.click(screen.getByLabelText(/^24 :/));
    expect(screen.getByText('samedi 24 octobre')).toBeTruthy();
    expect(screen.getByText('Oui')).toBeTruthy();
    expect(screen.getByText('Moyennes')).toBeTruthy();
    expect(screen.getAllByText('Modérée').length).toBeGreaterThan(0); // aussi dans la légende
    expect(screen.getByText('Crampes, Maux de tête')).toBeTruthy();
    expect(screen.getByText('Non renseignée')).toBeTruthy();
    expect(screen.getByText(/Migraine dès le réveil/)).toBeTruthy();
    expect(screen.getByText('Corriger cette date de règles')).toBeTruthy();
  });

  it('noter des règles : aperçu de l’effet et validation du premier jour', () => {
    render(<CycleTab {...base} profile={profile()} entries={entries()} />);
    fireEvent.click(screen.getByText('＋ Noter des règles'));
    expect(screen.getByText('Indiquez le premier jour pour voir l’effet sur les phases.')).toBeTruthy();
    fireEvent.click(screen.getByText('Enregistrer'));
    expect(screen.getByText(/Pour enregistrer, il reste à : indiquer le premier jour des règles/)).toBeTruthy();
    fireEvent.click(screen.getByText('＋ Caillots'));
    expect(screen.getByText('Oui')).toBeTruthy();
  });

  it('réglages : désactiver demande confirmation', () => {
    render(<CycleTab {...base} profile={profile()} entries={entries()} />);
    fireEvent.click(screen.getByText('Réglages du cycle'));
    expect(screen.getByText('Réglages du cycle d’Amina')).toBeTruthy();
    expect(screen.getByText('Stérilet hormonal')).toBeTruthy();
    fireEvent.click(screen.getByText('Désactiver'));
    expect(screen.getByText('Désactiver le suivi du cycle d’Amina ?')).toBeTruthy();
  });
});
