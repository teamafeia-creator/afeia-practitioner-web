import { describe, expect, it } from 'vitest';
import {
  formatFrequency,
  frequencyFromDb,
  frequencyToDb,
  inferFrequency,
  plannedDays,
  resolveTrackedItems,
  type TrackedItem,
} from '../lib/observance-tracking';

describe('inferFrequency', () => {
  it('reconnaît les conseils quotidiens', () => {
    expect(inferFrequency('Mélisse : 1 tasse le soir')).toEqual({ mode: 'daily' });
  });
  it('prend le haut de la fourchette « 2 à 3 fois par semaine »', () => {
    expect(inferFrequency('Marche 2 à 3 fois par semaine')).toEqual({ mode: 'custom', count: 3, unit: 'week' });
  });
  it('reconnaît « par an » et « semaines par mois »', () => {
    expect(inferFrequency('Cure 2 fois par an')).toEqual({ mode: 'custom', count: 2, unit: 'year' });
    expect(inferFrequency('Camomille 3 semaines par mois')).toEqual({ mode: 'custom', count: 3, unit: 'month' });
  });
});

describe('fréquence en base', () => {
  it('garde frequency / weekly_target lisibles par l’app mobile', () => {
    expect(frequencyToDb({ mode: 'custom', count: 3, unit: 'week' })).toMatchObject({ frequency: 'weekly', weekly_target: 3 });
    expect(frequencyToDb({ mode: 'custom', count: 2, unit: 'month' })).toMatchObject({ frequency: 'as_needed', period_unit: 'month' });
  });
  it('fait l’aller-retour', () => {
    const f = { mode: 'custom', count: 5, unit: 'year' } as const;
    expect(frequencyFromDb(frequencyToDb(f))).toEqual(f);
    expect(formatFrequency(f)).toBe('5× / an');
  });
});

describe('plannedDays', () => {
  it('compte les jours attendus sur 14 jours', () => {
    expect(plannedDays({ mode: 'daily' }, 14)).toBe(14);
    expect(plannedDays({ mode: 'custom', count: 3, unit: 'week' }, 14)).toBe(6);
    expect(plannedDays({ mode: 'custom', count: 1, unit: 'year' }, 14)).toBe(1);
  });
});

describe('resolveTrackedItems', () => {
  const item: TrackedItem = { field_key: 'phyto', line_index: 0, line: 'Mélisse', label: 'Infusion', freq: { mode: 'daily' } };
  it('suit la ligne quand l’ordre change', () => {
    expect(resolveTrackedItems({ phyto: 'Camomille\nMélisse' }, [item])[0].line_index).toBe(1);
  });
  it('retire l’item quand la rubrique est vide', () => {
    expect(resolveTrackedItems({ phyto: '' }, [item])).toEqual([]);
  });
});
