import {
  CONSEILLANCIER_KEYS,
  CONSEILLANCIER_SECTIONS,
  type ConseillancierKey,
} from '../conseillancier';

// Configuration de l'IA pour AFEIA
export const AI_CONFIG = {
  model: 'claude-haiku-4-5-20251001',
  maxTokens: 4096,
  temperature: 0.7,

  // Quotas mensuels par plan
  quotas: {
    standard: 30,
    premium: 100,
    premium_ring: -1, // illimite
  },

  // Limites de tokens par type de generation
  limits: {
    full: { maxOutputTokens: 4096 },
    section: { maxOutputTokens: 1024 },
    regenerate: { maxOutputTokens: 1024 },
  },
} as const;

// Re-export the existing keys for use in AI context
export { CONSEILLANCIER_KEYS, CONSEILLANCIER_SECTIONS };
export type { ConseillancierKey };

// Build a mapping from key to its section label + field label for the AI prompt
export function getKeyLabels(): Record<ConseillancierKey, string> {
  const labels: Partial<Record<ConseillancierKey, string>> = {};
  for (const section of CONSEILLANCIER_SECTIONS) {
    for (const field of section.fields) {
      labels[field.key] = `${section.title} — ${field.label}`;
    }
  }
  return labels as Record<ConseillancierKey, string>;
}
