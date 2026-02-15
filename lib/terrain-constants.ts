/**
 * Constantes du bilan de terrain naturopathique.
 * Labels, couleurs, descriptions pour toutes les valeurs du bilan.
 */

import type {
  ConstitutionType,
  DiatheseType,
  SurchargeLevel,
  EmunctoryStatus,
  EmunctoryStatusPeau,
  EmunctoryStatusPoumons,
  VitalityLevel,
  IrisEye,
} from './types';

// ─── Constitutions ───────────────────────────

export const CONSTITUTIONS: {
  value: ConstitutionType;
  label: string;
  color: string;
  dotColor: string;
  description: string;
}[] = [
  {
    value: 'sanguin',
    label: 'Sanguin',
    color: 'bg-red-100 text-red-700 border-red-200',
    dotColor: '#C4856C',
    description: 'Teint coloré, énergie expansive, pléthore',
  },
  {
    value: 'lymphatique',
    label: 'Lymphatique',
    color: 'bg-sky-100 text-sky-700 border-sky-200',
    dotColor: '#7DD3FC',
    description: 'Teint pâle, rétention, métabolisme lent',
  },
  {
    value: 'bilieux',
    label: 'Bilieux',
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    dotColor: '#D4A060',
    description: 'Teint mat, musculature tonique, foie dominant',
  },
  {
    value: 'nerveux',
    label: 'Nerveux',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    dotColor: '#A78BFA',
    description: 'Visage fin, hypersensibilité, SN dominant',
  },
];

export const CONSTITUTION_MAP = Object.fromEntries(
  CONSTITUTIONS.map((c) => [c.value, c])
) as Record<ConstitutionType, (typeof CONSTITUTIONS)[number]>;

// ─── Diathèses de Ménétrier ─────────────────

export const DIATHESES: {
  value: DiatheseType;
  label: string;
  description: string;
}[] = [
  {
    value: 'allergique_mn',
    label: 'Allergique (Mn)',
    description: 'Hyperréactivité, allergies, douleurs migratoires',
  },
  {
    value: 'hyposthenique_mn_cu',
    label: 'Hyposthénique (Mn-Cu)',
    description: 'Fatigue progressive, infections récurrentes',
  },
  {
    value: 'dystonique_mn_co',
    label: 'Dystonique (Mn-Co)',
    description: 'Troubles neuro-végétatifs, anxiété, circulation',
  },
  {
    value: 'anergique_cu_au_ag',
    label: 'Anergique (Cu-Au-Ag)',
    description: 'Épuisement profond, terrain dégénératif',
  },
  {
    value: 'desadaptation_zn_cu',
    label: 'Désadaptation (Zn-Cu)',
    description: 'Axe hypothalamo-hypophyso-gonadique',
  },
  {
    value: 'desadaptation_zn_ni_co',
    label: 'Désadaptation (Zn-Ni-Co)',
    description: 'Axe pancréatique, troubles glycémiques',
  },
];

export const DIATHESE_MAP = Object.fromEntries(
  DIATHESES.map((d) => [d.value, d])
) as Record<DiatheseType, (typeof DIATHESES)[number]>;

// ─── Niveaux de surcharge ────────────────────

export const SURCHARGE_LEVELS: {
  value: SurchargeLevel;
  label: string;
  color: string;
  barColor: string;
  percent: number;
}[] = [
  { value: 'absent', label: 'Absent', color: 'text-sage', barColor: 'bg-sage', percent: 5 },
  { value: 'leger', label: 'Léger', color: 'text-gold', barColor: 'bg-gold', percent: 33 },
  { value: 'modere', label: 'Modéré', color: 'text-terracotta', barColor: 'bg-terracotta', percent: 66 },
  { value: 'important', label: 'Important', color: 'text-rose', barColor: 'bg-rose', percent: 100 },
];

export const SURCHARGE_LEVEL_MAP = Object.fromEntries(
  SURCHARGE_LEVELS.map((s) => [s.value, s])
) as Record<SurchargeLevel, (typeof SURCHARGE_LEVELS)[number]>;

// ─── Statuts émonctoires ─────────────────────

// Standard emunctory statuses (foie, intestins, reins)
export const EMUNCTORY_STATUSES: {
  value: EmunctoryStatus;
  label: string;
  color: string;
  hexColor: string;
}[] = [
  { value: 'fonctionnel', label: 'Fonctionnel', color: 'text-sage', hexColor: '#5B8C6E' },
  { value: 'ralenti', label: 'Ralenti', color: 'text-gold', hexColor: '#D4A060' },
  { value: 'surcharge', label: 'Surchargé', color: 'text-terracotta', hexColor: '#C4856C' },
  { value: 'bloque', label: 'Bloqué', color: 'text-rose', hexColor: '#D4738B' },
];

export const EMUNCTORY_STATUS_MAP = Object.fromEntries(
  EMUNCTORY_STATUSES.map((s) => [s.value, s])
) as Record<EmunctoryStatus, (typeof EMUNCTORY_STATUSES)[number]>;

// Peau-specific statuses
export const EMUNCTORY_STATUSES_PEAU: {
  value: EmunctoryStatusPeau;
  label: string;
  color: string;
  hexColor: string;
}[] = [
  { value: 'fonctionnel', label: 'Fonctionnel', color: 'text-sage', hexColor: '#5B8C6E' },
  { value: 'reactif', label: 'Réactif', color: 'text-gold', hexColor: '#D4A060' },
  { value: 'surcharge', label: 'Surchargé', color: 'text-terracotta', hexColor: '#C4856C' },
  { value: 'bloque', label: 'Bloqué', color: 'text-rose', hexColor: '#D4738B' },
];

export const EMUNCTORY_STATUS_PEAU_MAP = Object.fromEntries(
  EMUNCTORY_STATUSES_PEAU.map((s) => [s.value, s])
) as Record<EmunctoryStatusPeau, (typeof EMUNCTORY_STATUSES_PEAU)[number]>;

// Poumons-specific statuses
export const EMUNCTORY_STATUSES_POUMONS: {
  value: EmunctoryStatusPoumons;
  label: string;
  color: string;
  hexColor: string;
}[] = [
  { value: 'fonctionnel', label: 'Fonctionnel', color: 'text-sage', hexColor: '#5B8C6E' },
  { value: 'sous_exploite', label: 'Sous-exploité', color: 'text-gold', hexColor: '#D4A060' },
  { value: 'surcharge', label: 'Surchargé', color: 'text-terracotta', hexColor: '#C4856C' },
  { value: 'bloque', label: 'Bloqué', color: 'text-rose', hexColor: '#D4738B' },
];

export const EMUNCTORY_STATUS_POUMONS_MAP = Object.fromEntries(
  EMUNCTORY_STATUSES_POUMONS.map((s) => [s.value, s])
) as Record<EmunctoryStatusPoumons, (typeof EMUNCTORY_STATUSES_POUMONS)[number]>;

// Helper to get hex color from any emunctory status
export function getEmunctoryHexColor(status: string | null): string {
  if (!status) return '#6B7280'; // warmgray
  const map: Record<string, string> = {
    fonctionnel: '#5B8C6E',
    ralenti: '#D4A060',
    reactif: '#D4A060',
    sous_exploite: '#D4A060',
    surcharge: '#C4856C',
    bloque: '#D4738B',
  };
  return map[status] ?? '#6B7280';
}

// ─── Force vitale ────────────────────────────

export const VITALITY_LEVELS: {
  value: VitalityLevel;
  label: string;
  color: string;
  hexColor: string;
  percent: number;
}[] = [
  { value: 'haute', label: 'Haute', color: 'bg-sage text-white', hexColor: '#5B8C6E', percent: 100 },
  { value: 'moyenne', label: 'Moyenne', color: 'bg-gold text-white', hexColor: '#D4A060', percent: 66 },
  { value: 'basse', label: 'Basse', color: 'bg-terracotta text-white', hexColor: '#C4856C', percent: 33 },
  { value: 'epuisee', label: 'Épuisée', color: 'bg-rose text-white', hexColor: '#D4738B', percent: 10 },
];

export const VITALITY_LEVEL_MAP = Object.fromEntries(
  VITALITY_LEVELS.map((v) => [v.value, v])
) as Record<VitalityLevel, (typeof VITALITY_LEVELS)[number]>;

// ─── Émonctoires (liste des 5) ──────────────

export type EmunctoryKey = 'foie' | 'intestins' | 'reins' | 'peau' | 'poumons';

export const EMUNCTORIES: {
  key: EmunctoryKey;
  label: string;
  fieldStatus: string;
  fieldNotes: string;
}[] = [
  { key: 'foie', label: 'Foie / Vésicule biliaire', fieldStatus: 'emunctoire_foie', fieldNotes: 'emunctoire_foie_notes' },
  { key: 'intestins', label: 'Intestins', fieldStatus: 'emunctoire_intestins', fieldNotes: 'emunctoire_intestins_notes' },
  { key: 'reins', label: 'Reins', fieldStatus: 'emunctoire_reins', fieldNotes: 'emunctoire_reins_notes' },
  { key: 'peau', label: 'Peau', fieldStatus: 'emunctoire_peau', fieldNotes: 'emunctoire_peau_notes' },
  { key: 'poumons', label: 'Poumons', fieldStatus: 'emunctoire_poumons', fieldNotes: 'emunctoire_poumons_notes' },
];

// ─── Labels des yeux ─────────────────────────

export const EYE_LABELS: Record<IrisEye, string> = {
  left: 'Œil gauche',
  right: 'Œil droit',
};

// ─── Surcharge labels (for display) ──────────

export const SURCHARGE_TYPES = [
  { key: 'surcharge_acides' as const, label: 'Acides' },
  { key: 'surcharge_colles' as const, label: 'Colles' },
  { key: 'surcharge_cristaux' as const, label: 'Cristaux' },
];
