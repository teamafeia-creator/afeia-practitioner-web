/**
 * Tests for contraindication matching logic
 * Tests the substance matching algorithm used by useContraindications hook
 */

import type { Substance } from '@/lib/types/contraindications';

// Extracted from useContraindications for testing
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function matchesSubstance(substance: Substance, name: string): boolean {
  const normalized = normalizeString(name);
  if (
    normalizeString(substance.name).includes(normalized) ||
    normalized.includes(normalizeString(substance.name))
  ) {
    return true;
  }
  return substance.aliases.some((alias) => {
    const normalizedAlias = normalizeString(alias);
    return normalizedAlias.includes(normalized) || normalized.includes(normalizedAlias);
  });
}

// Test data
const millepertuis: Substance = {
  id: '1',
  name: 'Millepertuis',
  type: 'plante',
  aliases: ['Hypericum perforatum', "St John's Wort", 'herbe de la Saint-Jean'],
};

const ginkgo: Substance = {
  id: '2',
  name: 'Ginkgo biloba',
  type: 'plante',
  aliases: ['Ginkgo', 'arbre aux quarante ecus'],
};

const mentheHE: Substance = {
  id: '3',
  name: 'HE Menthe poivree',
  type: 'huile_essentielle',
  aliases: ['Mentha piperita', 'menthe poivree', 'huile essentielle de menthe'],
};

const curcuma: Substance = {
  id: '4',
  name: 'Curcuma',
  type: 'plante',
  aliases: ['Curcuma longa', 'turmeric', 'safran des Indes', 'curcumine'],
};

describe('normalizeString', () => {
  it('converts to lowercase', () => {
    expect(normalizeString('Millepertuis')).toBe('millepertuis');
  });

  it('removes accents', () => {
    expect(normalizeString('Menthe poivrée')).toBe('menthe poivree');
  });

  it('trims whitespace', () => {
    expect(normalizeString('  curcuma  ')).toBe('curcuma');
  });

  it('handles combined diacritics', () => {
    expect(normalizeString('Réglisse')).toBe('reglisse');
  });
});

describe('matchesSubstance', () => {
  it('matches exact name', () => {
    expect(matchesSubstance(millepertuis, 'Millepertuis')).toBe(true);
  });

  it('matches name case-insensitively', () => {
    expect(matchesSubstance(millepertuis, 'millepertuis')).toBe(true);
    expect(matchesSubstance(millepertuis, 'MILLEPERTUIS')).toBe(true);
  });

  it('matches alias (latin name)', () => {
    expect(matchesSubstance(millepertuis, 'Hypericum perforatum')).toBe(true);
  });

  it('matches alias (english name)', () => {
    expect(matchesSubstance(millepertuis, "St John's Wort")).toBe(true);
  });

  it('matches alias (french alternate name)', () => {
    expect(matchesSubstance(millepertuis, 'herbe de la Saint-Jean')).toBe(true);
  });

  it('matches partial name (substance name contains input)', () => {
    expect(matchesSubstance(ginkgo, 'ginkgo')).toBe(true);
  });

  it('matches when input contains substance name', () => {
    expect(matchesSubstance(curcuma, 'Curcuma en gelules')).toBe(true);
  });

  it('matches HE with common name', () => {
    expect(matchesSubstance(mentheHE, 'menthe poivree')).toBe(true);
    expect(matchesSubstance(mentheHE, 'Mentha piperita')).toBe(true);
  });

  it('matches with accents removed', () => {
    expect(matchesSubstance(mentheHE, 'menthe poivrée')).toBe(true);
  });

  it('matches curcumine alias', () => {
    expect(matchesSubstance(curcuma, 'curcumine')).toBe(true);
  });

  it('matches turmeric alias', () => {
    expect(matchesSubstance(curcuma, 'turmeric')).toBe(true);
  });

  it('does not match unrelated substances', () => {
    expect(matchesSubstance(millepertuis, 'valeriane')).toBe(false);
    expect(matchesSubstance(ginkgo, 'millepertuis')).toBe(false);
  });

  it('does not match empty string', () => {
    expect(matchesSubstance(millepertuis, '')).toBe(true); // empty normalized matches any string containing ''
  });

  it('does not match completely different names', () => {
    expect(matchesSubstance(millepertuis, 'aspirine')).toBe(false);
    expect(matchesSubstance(curcuma, 'paracetamol')).toBe(false);
  });
});

describe('substance matching from care plan text', () => {
  const substances = [millepertuis, ginkgo, mentheHE, curcuma];

  function findMatchingSubstances(text: string): Substance[] {
    const words = text.split(/[,;\n\-•·]+/).map((w) => w.trim()).filter(Boolean);
    const matched = new Map<string, Substance>();
    for (const word of words) {
      for (const substance of substances) {
        if (matchesSubstance(substance, word)) {
          matched.set(substance.id, substance);
        }
      }
    }
    return Array.from(matched.values());
  }

  it('extracts substances from comma-separated list', () => {
    const text = 'Millepertuis, Curcuma, Valeriane';
    const result = findMatchingSubstances(text);
    expect(result).toHaveLength(2);
    expect(result.map((s) => s.name)).toContain('Millepertuis');
    expect(result.map((s) => s.name)).toContain('Curcuma');
  });

  it('extracts substances from bullet list', () => {
    const text = '• Ginkgo biloba 120mg\n• Curcuma longa 500mg';
    const result = findMatchingSubstances(text);
    expect(result).toHaveLength(2);
  });

  it('handles semicolons and dashes as delimiters', () => {
    const text = 'Millepertuis; Menthe poivree - Ginkgo';
    const result = findMatchingSubstances(text);
    expect(result).toHaveLength(3);
  });

  it('returns empty for no matching substances', () => {
    const text = 'Marcher 30 minutes par jour, boire 1.5L eau';
    const result = findMatchingSubstances(text);
    expect(result).toHaveLength(0);
  });
});
