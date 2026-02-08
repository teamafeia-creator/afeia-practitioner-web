/**
 * Types for the blocks & templates library feature.
 *
 * block_section values map to the section `id` in CONSEILLANCIER_SECTIONS (lib/conseillancier.ts).
 */

export type BlockSection =
  | 'en_tete'
  | 'objectifs'
  | 'alimentation'
  | 'phytotherapie'
  | 'micronutrition'
  | 'aromatologie'
  | 'hydrologie'
  | 'activite'
  | 'equilibre_psycho'
  | 'respiration'
  | 'techniques_manuelles'
  | 'sommeil'
  | 'environnement'
  | 'suivi'
  | 'cloture'
  | 'notes_libres';

export type ConsultationMotif =
  | 'digestif'
  | 'fatigue'
  | 'stress'
  | 'sommeil'
  | 'feminin'
  | 'perte_poids'
  | 'immunite'
  | 'peau'
  | 'douleurs'
  | 'detox'
  | 'cardiovasculaire'
  | 'enfant'
  | 'universel';

export type BlockSource = 'afeia_base' | 'praticien' | 'communautaire';

export type Block = {
  id: string;
  title: string;
  content: string;
  section: BlockSection;
  motifs: ConsultationMotif[];
  tags: string[];
  source: BlockSource;
  owner_id: string | null;
  is_favorite: boolean;
  usage_count: number;
  last_used_at: string | null;
  ai_keywords: string[];
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

export type Template = {
  id: string;
  title: string;
  description: string | null;
  primary_motif: ConsultationMotif;
  secondary_motifs: ConsultationMotif[];
  source: BlockSource;
  owner_id: string | null;
  blocks_mapping: Record<string, string>;
  usage_count: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

export type InsertedBlock = {
  id: string;
  plan_version_id: string;
  source_block_id: string | null;
  section: BlockSection;
  content_snapshot: string;
  inserted_at: string;
};

/** Labels for block sections in French. */
export const BLOCK_SECTION_LABELS: Record<BlockSection, string> = {
  en_tete: 'En-tête',
  objectifs: 'Objectifs',
  alimentation: 'Alimentation',
  phytotherapie: 'Phytothérapie',
  micronutrition: 'Micronutrition',
  aromatologie: 'Aromatologie',
  hydrologie: 'Hydrologie',
  activite: 'Activité physique',
  equilibre_psycho: 'Équilibre psycho-émotionnel',
  respiration: 'Techniques respiratoires',
  techniques_manuelles: 'Techniques manuelles',
  sommeil: 'Sommeil',
  environnement: 'Environnement',
  suivi: 'Suivi',
  cloture: 'Message de clôture',
  notes_libres: 'Notes libres',
};

/** All block sections in order. */
export const BLOCK_SECTIONS: BlockSection[] = [
  'en_tete', 'objectifs', 'alimentation', 'phytotherapie',
  'micronutrition', 'aromatologie', 'hydrologie', 'activite',
  'equilibre_psycho', 'respiration', 'techniques_manuelles',
  'sommeil', 'environnement', 'suivi', 'cloture', 'notes_libres',
];

/** Labels for consultation motifs in French. */
export const MOTIF_LABELS: Record<ConsultationMotif, string> = {
  digestif: 'Digestif',
  fatigue: 'Fatigue',
  stress: 'Stress',
  sommeil: 'Sommeil',
  feminin: 'Féminin',
  perte_poids: 'Perte de poids',
  immunite: 'Immunité',
  peau: 'Peau',
  douleurs: 'Douleurs',
  detox: 'Détox',
  cardiovasculaire: 'Cardiovasculaire',
  enfant: 'Enfant',
  universel: 'Universel',
};

/** All motifs in display order. */
export const ALL_MOTIFS: ConsultationMotif[] = [
  'universel', 'digestif', 'fatigue', 'stress', 'sommeil', 'feminin',
  'perte_poids', 'immunite', 'peau', 'douleurs', 'detox',
  'cardiovasculaire', 'enfant',
];
