import type { CyclePhase, SymptomKey, FlowIntensity, CervicalMucus, CycleRegularity } from './types';

// ============================================
// CYCLE PHASES — Référentiel naturopathique
// ============================================

export const CYCLE_PHASES: Record<
  CyclePhase,
  {
    label: string;
    color: string;
    bgClass: string;
    textClass: string;
    dotClass: string;
    description: string;
  }
> = {
  menstrual: {
    label: 'Menstruations',
    color: '#D4738B',
    bgClass: 'bg-rose/15',
    textClass: 'text-rose',
    dotClass: 'bg-rose',
    description: 'Phase de repos et d\u2019intériorisation. Énergie au plus bas.',
  },
  follicular: {
    label: 'Phase folliculaire',
    color: '#5B8C6E',
    bgClass: 'bg-sage/15',
    textClass: 'text-sage',
    dotClass: 'bg-sage',
    description: 'Montée des \u0153strogènes. Énergie croissante, clarté mentale.',
  },
  ovulation: {
    label: 'Ovulation',
    color: '#D4A060',
    bgClass: 'bg-gold/15',
    textClass: 'text-gold',
    dotClass: 'bg-gold',
    description: 'Pic d\u2019énergie et de fertilité. Fenêtre courte de 2-3 jours.',
  },
  luteal_early: {
    label: 'Phase lutéale',
    color: '#5B8C8E',
    bgClass: 'bg-teal-600/15',
    textClass: 'text-teal-700',
    dotClass: 'bg-teal-600',
    description: 'Montée de la progestérone. Énergie correcte mais ralentissement.',
  },
  luteal_late: {
    label: 'Phase lutéale tardive',
    color: '#8B5CF6',
    bgClass: 'bg-violet-500/15',
    textClass: 'text-violet-600',
    dotClass: 'bg-violet-500',
    description: 'Phase critique (SPM). Chute hormonale, symptômes prémenstruels.',
  },
};

// ============================================
// SYMPTOM LABELS (FR)
// ============================================

export const SYMPTOM_LABELS: Record<SymptomKey, string> = {
  cramps: 'Crampes',
  bloating: 'Ballonnements',
  headache: 'Maux de tête',
  breast_tenderness: 'Tension mammaire',
  mood_swings: 'Sautes d\u2019humeur',
  fatigue: 'Fatigue',
  acne: 'Acné',
  cravings: 'Fringales',
  insomnia: 'Insomnie',
  water_retention: 'Rétention d\u2019eau',
  back_pain: 'Douleurs lombaires',
  nausea: 'Nausée',
  libido_high: 'Libido élevée',
};

export const SYMPTOM_KEYS: SymptomKey[] = [
  'cramps',
  'bloating',
  'headache',
  'breast_tenderness',
  'mood_swings',
  'fatigue',
  'acne',
  'cravings',
  'insomnia',
  'water_retention',
  'back_pain',
  'nausea',
  'libido_high',
];

// ============================================
// FLOW LABELS
// ============================================

export const FLOW_LABELS: Record<FlowIntensity, string> = {
  spotting: 'Spotting',
  light: 'Léger',
  medium: 'Moyen',
  heavy: 'Abondant',
};

// ============================================
// CERVICAL MUCUS LABELS
// ============================================

export const CERVICAL_MUCUS_LABELS: Record<CervicalMucus, string> = {
  dry: 'Sec',
  sticky: 'Collant',
  creamy: 'Crémeux',
  egg_white: 'Blanc d\u2019\u0153uf',
  watery: 'Aqueux',
};

// ============================================
// CYCLE REGULARITY LABELS
// ============================================

export const CYCLE_REGULARITY_LABELS: Record<CycleRegularity, string> = {
  regular: 'Régulier',
  somewhat_irregular: 'Peu irrégulier',
  irregular: 'Irrégulier',
  absent: 'Absent / Aménorrhée',
};
