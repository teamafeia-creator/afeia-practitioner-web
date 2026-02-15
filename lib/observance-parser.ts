/**
 * Parse conseillancier (care plan) content into observance checklist items.
 * Uses simple heuristics: split by lines, bullets, numbering.
 * No NLP, no AI, no complex regex.
 */

import type { ObservanceItem, ObservanceCategory, ObservanceFrequency } from './types';

type ObservanceItemCandidate = Omit<ObservanceItem, 'id' | 'created_at'>;

// Mapping from conseillancier keys to observance category + default frequency
const KEY_CATEGORY_MAP: Record<string, { category: ObservanceCategory; frequency: ObservanceFrequency; weekly_target?: number }> = {
  phytotherapie_plantes: { category: 'phytotherapie', frequency: 'daily' },
  phytotherapie_posologie: { category: 'phytotherapie', frequency: 'daily' },
  complements: { category: 'complement', frequency: 'daily' },
  huiles_essentielles: { category: 'aromatologie', frequency: 'daily' },
  techniques_respiratoires: { category: 'respiration', frequency: 'daily' },
  objectif_hydratation: { category: 'hydratation', frequency: 'daily' },
  type_eau: { category: 'hydratation', frequency: 'daily' },
  moments_hydratation: { category: 'hydratation', frequency: 'daily' },
  sommeil_routine: { category: 'sommeil', frequency: 'daily' },
  sommeil_environnement: { category: 'sommeil', frequency: 'daily' },
  automassages: { category: 'technique_manuelle', frequency: 'daily' },
  points_reflexes: { category: 'technique_manuelle', frequency: 'daily' },
  activite_type: { category: 'activite', frequency: 'weekly', weekly_target: 3 },
  activite_frequence: { category: 'activite', frequency: 'weekly', weekly_target: 3 },
  activite_conseils: { category: 'activite', frequency: 'weekly', weekly_target: 3 },
  hydrologie: { category: 'hydrologie', frequency: 'weekly', weekly_target: 2 },
  principes_alimentaires: { category: 'alimentation', frequency: 'daily' },
  aliments_a_privilegier: { category: 'alimentation', frequency: 'daily' },
  aliments_a_limiter: { category: 'alimentation', frequency: 'daily' },
  rythme_repas: { category: 'alimentation', frequency: 'daily' },
  equilibre_psycho: { category: 'equilibre_psycho', frequency: 'daily' },
  gestion_charge_mentale: { category: 'equilibre_psycho', frequency: 'daily' },
};

/**
 * Split text into individual actionable items.
 * Handles bullet points, numbered lists, and line breaks.
 */
function splitTextToItems(text: string): string[] {
  if (!text || !text.trim()) return [];

  // Split by line breaks first
  const lines = text.split(/\n/);
  const items: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Try to split by bullets within the same line
    const fragments = trimmed.split(/[•\-\*·]+/);

    for (const fragment of fragments) {
      // Clean up numbering (1., 2., etc.)
      const cleaned = fragment.replace(/^\d+[\.\)]\s*/, '').trim();
      if (cleaned.length >= 3) {
        items.push(cleaned);
      }
    }
  }

  return items;
}

/**
 * Parse care plan content into candidate observance items.
 * The practitioner validates and adjusts before inserting.
 */
export function parseConseillancierToObservanceItems(
  planContent: Record<string, string | null>,
  planId: string,
  consultantId: string,
  practitionerId: string
): ObservanceItemCandidate[] {
  const items: ObservanceItemCandidate[] = [];
  let sortOrder = 0;

  for (const [key, config] of Object.entries(KEY_CATEGORY_MAP)) {
    const text = planContent[key];
    if (!text || !text.trim()) continue;

    const fragments = splitTextToItems(text);

    for (const fragment of fragments) {
      items.push({
        consultant_plan_id: planId,
        practitioner_id: practitionerId,
        consultant_id: consultantId,
        label: fragment,
        category: config.category,
        frequency: config.frequency,
        weekly_target: config.weekly_target ?? null,
        sort_order: sortOrder++,
        is_active: true,
      });
    }
  }

  return items;
}
