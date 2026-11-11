import { describe, expect, it } from 'vitest';
import {
  Series,
  autoDecision,
  autoRuleFor,
  describeSchedule,
  durationInText,
  goalTrend,
  isRecapDay,
  minutesSince,
  nextRecapDay,
  suggestMetric,
  timeInText,
  validUntil,
  type RecapSettings,
} from '../../lib/wearables/insights';

const base: RecapSettings = { enabled: true, frequency: '1w', weekdays: [1], anchor: '2026-11-02' };

describe('planification du récap', () => {
  it('chaque semaine le lundi', () => {
    expect(isRecapDay(base, '2026-11-09')).toBe(true); // lundi
    expect(isRecapDay(base, '2026-11-10')).toBe(false);
    expect(validUntil(base, '2026-11-09')).toBe('2026-11-15');
  });
  it('désactivé : jamais', () => {
    expect(isRecapDay({ ...base, enabled: false }, '2026-11-09')).toBe(false);
  });
  it('toutes les 2 semaines, à partir de la semaine de référence', () => {
    const s = { ...base, frequency: '2w' as const };
    expect(isRecapDay(s, '2026-11-02')).toBe(true);
    expect(isRecapDay(s, '2026-11-09')).toBe(false);
    expect(isRecapDay(s, '2026-11-16')).toBe(true);
    expect(nextRecapDay(s, '2026-11-02')).toBe('2026-11-16');
  });
  it('chaque mois : le premier jour coché du mois', () => {
    const s = { ...base, frequency: '1m' as const, weekdays: [5] };
    expect(isRecapDay(s, '2026-11-06')).toBe(true); // premier vendredi
    expect(isRecapDay(s, '2026-11-13')).toBe(false);
    expect(nextRecapDay(s, '2026-11-06')).toBe('2026-12-04');
  });
  it('chaque jour, sur les jours cochés', () => {
    const s = { ...base, frequency: '1d' as const, weekdays: [1, 2, 3, 4, 5] };
    expect(isRecapDay(s, '2026-11-14')).toBe(false); // samedi
    expect(validUntil(s, '2026-11-13')).toBe('2026-11-15'); // vendredi → valable jusqu'à dimanche
    expect(describeSchedule(s)).toBe('Chaque jour le lun., mar., mer., jeu., ven.');
  });
});

describe('coches par l’objet', () => {
  it('lit les heures et les durées écrites', () => {
    expect(timeInText('Écrans coupés à 22 h 30')).toBe(1350);
    expect(timeInText('Coucher 23h')).toBe(1380);
    expect(durationInText('Marche rapide, 20 min')).toBe(20);
  });
  it('items éligibles : activité, ou heure de coucher écrite ; les autres non', () => {
    expect(autoRuleFor({ label: 'Marche rapide ou yoga doux', category: 'activite' })).toEqual({ kind: 'activity', minutes: 30 });
    expect(autoRuleFor({ label: 'Écrans coupés à 22 h 30', category: 'sommeil' })).toEqual({ kind: 'bedtime', minutes: 1350 });
    expect(autoRuleFor({ label: 'Infusion de mélisse le soir', category: 'phytotherapie' })).toBeNull();
    expect(autoRuleFor({ label: 'Petit-déjeuner avant 9 h', category: 'alimentation' })).toBeNull();
  });
  it('décide au plus tard 1 h après l’heure écrite ; rien mesuré → reste à cocher', () => {
    const rule = { kind: 'bedtime', minutes: 1350 } as const;
    expect(autoDecision(rule, { activeMin: null, sleepStartMin: 1400 })).toBe(true);
    expect(autoDecision(rule, { activeMin: null, sleepStartMin: 1420 })).toBe(false);
    expect(autoDecision(rule, { activeMin: null, sleepStartMin: null })).toBeNull();
    expect(autoDecision({ kind: 'activity', minutes: 30 }, { activeMin: 31, sleepStartMin: null })).toBe(true);
  });
  it('compte les minutes depuis minuit du jour J, même après minuit (heure de Paris)', () => {
    expect(minutesSince('2026-11-10', '2026-11-10T22:10:00Z')).toBe(23 * 60 + 10);
    expect(minutesSince('2026-11-10', '2026-11-10T23:30:00Z')).toBe(24 * 60 + 30);
  });
});

describe('objectifs reliés à une mesure', () => {
  it('suggère une mesure d’après le texte', () => {
    expect(suggestMetric('Mieux dormir pendant les partiels')).toBe('sleep');
    expect(suggestMetric('Bouger 30 min, 3 fois par semaine')).toBe('steps');
    expect(suggestMetric('Retrouver une énergie stable le matin')).toBe('hrv');
    expect(suggestMetric('Espacer les migraines')).toBeNull();
  });
  it('compare les 14 nuits avant l’objectif aux 14 dernières', () => {
    const days = Array.from({ length: 40 }, (_, i) => {
      const d = new Date(Date.UTC(2026, 9, 3 + i)).toISOString().slice(0, 10);
      return { date: d, sleepMin: null, hrvMs: i < 20 ? 38 : 44, nightHrBpm: null, steps: null };
    });
    const t = goalTrend(new Series(days, '2026-11-11'), 'hrv', '2026-10-23');
    expect(t).toMatchObject({ start: '38 ms', now: '44 ms' });
  });
});
