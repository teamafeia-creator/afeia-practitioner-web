export type AnamnesisQuestion = {
  key: string;
  label: string;
  type?: 'text' | 'choice';
  options?: string[];
  placeholder?: string;
};

export type AnamnesisSection = {
  id: string;
  title: string;
  description?: string;
  questions: AnamnesisQuestion[];
};

export const ANAMNESIS_SECTIONS: AnamnesisSection[] = [
  {
    id: 'general',
    title: 'Informations générales',
    questions: [
      {
        key: 'general_profession',
        label: 'Profession et rythme de travail',
        placeholder: 'Ex. horaires, charge mentale, déplacements.'
      },
      {
        key: 'general_antecedents',
        label: 'Antécédents médicaux / familiaux',
        placeholder: 'Ex. pathologies, traitements en cours.'
      },
      {
        key: 'general_traitements',
        label: 'Traitements, compléments ou suivis actuels',
        placeholder: 'Ex. médicaments, compléments, thérapeutes.'
      }
    ]
  },
  {
    id: 'profil',
    title: 'Profil personnel et émotionnel',
    questions: [
      {
        key: 'profil_temperament',
        label: 'Tempérament général',
        placeholder: 'Ex. calme, anxieux, dynamique, irritable.'
      },
      {
        key: 'profil_emotions',
        label: 'Émotions dominantes',
        placeholder: 'Ex. colère, tristesse, joie, peur.'
      }
    ]
  },
  {
    id: 'motif',
    title: 'Motif de consultation',
    questions: [
      { key: 'motif_principal', label: 'Motif principal', placeholder: 'Pourquoi consultez-vous ?' },
      { key: 'motif_objectifs', label: 'Objectifs recherchés', placeholder: 'Objectifs de santé.' }
    ]
  },
  {
    id: 'alimentation',
    title: 'Alimentation et hydratation',
    questions: [
      { key: 'alimentation_habitudes', label: 'Habitudes alimentaires', placeholder: 'Ex. type de repas, horaires.' },
      {
        key: 'alimentation_hydratation',
        label: 'Hydratation quotidienne',
        type: 'choice',
        options: ['Insuffisante', 'Moyenne', 'Bonne']
      },
      {
        key: 'alimentation_ecarts',
        label: 'Grignotage / alcool / sucre',
        placeholder: 'Fréquence et contexte.'
      }
    ]
  },
  {
    id: 'digestion',
    title: 'Digestion et transit',
    questions: [
      {
        key: 'digestion_symptomes',
        label: 'Ballonnements, inconfort, douleurs',
        placeholder: 'Fréquence, intensité.'
      },
      {
        key: 'digestion_transit',
        label: 'Transit',
        type: 'choice',
        options: ['Régulier', 'Constipation', 'Diarrhée', 'Variable']
      },
      { key: 'digestion_tolérances', label: 'Intolérances perçues', placeholder: 'Aliments mal tolérés.' }
    ]
  },
  {
    id: 'sommeil',
    title: 'Sommeil et énergie',
    questions: [
      { key: 'sommeil_qualite', label: 'Qualité du sommeil', placeholder: 'Endormissement, réveils, récupération.' },
      {
        key: 'energie_niveau',
        label: 'Niveau d’énergie au réveil',
        type: 'choice',
        options: ['Bas', 'Moyen', 'Élevé']
      }
    ]
  },
  {
    id: 'activite',
    title: 'Activité physique et posture',
    questions: [
      {
        key: 'activite_pratique',
        label: 'Activité physique',
        placeholder: 'Type, fréquence, durée.'
      },
      {
        key: 'activite_posture',
        label: 'Posture / douleurs',
        placeholder: 'Zones sensibles, tensions.'
      }
    ]
  },
  {
    id: 'stress',
    title: 'Stress, émotions et équilibre intérieur',
    questions: [
      {
        key: 'stress_niveau',
        label: 'Niveau de stress perçu',
        type: 'choice',
        options: ['Faible', 'Modéré', 'Élevé']
      },
      {
        key: 'stress_gestion',
        label: 'Stratégies de gestion',
        placeholder: 'Ex. respiration, sport, méditation.'
      }
    ]
  },
  {
    id: 'elimination',
    title: 'Élimination et peau',
    questions: [
      { key: 'elimination_peau', label: 'État de la peau', placeholder: 'Ex. sécheresse, acné.' },
      { key: 'elimination_transpiration', label: 'Transpiration / odeurs', placeholder: 'Ressenti général.' }
    ]
  },
  {
    id: 'femmes',
    title: 'Femmes (si applicable)',
    questions: [
      { key: 'femme_cycle', label: 'Cycle menstruel', placeholder: 'Régularité, douleurs.' },
      { key: 'femme_contraception', label: 'Contraception / grossesse', placeholder: 'Méthode, projet.' }
    ]
  },
  {
    id: 'hommes',
    title: 'Hommes (si applicable)',
    questions: [
      { key: 'homme_urinaire', label: 'Confort urinaire', placeholder: 'Fréquence, gêne.' },
      { key: 'homme_libido', label: 'Libido / vitalité', placeholder: 'Ressenti général.' }
    ]
  },
  {
    id: 'mode_vie',
    title: 'Mode de vie global',
    questions: [
      { key: 'mode_vie_habitudes', label: 'Tabac / alcool / écrans', placeholder: 'Fréquence, contexte.' },
      {
        key: 'mode_vie_environnement',
        label: 'Environnement de vie',
        placeholder: 'Qualité de l’air, exposition toxines.'
      }
    ]
  },
  {
    id: 'question_ouverte',
    title: 'Question ouverte',
    questions: [
      {
        key: 'question_ouverte',
        label: 'Autres informations importantes',
        placeholder: 'Tout élément utile à partager.'
      }
    ]
  }
];
