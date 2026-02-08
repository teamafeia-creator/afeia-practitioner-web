/**
 * Structure enrichie du conseillancier (Programme d'Hygiène Vitale).
 *
 * Le contenu est stocké en JSONB dans consultant_plans.content.
 * Cette structure est rétrocompatible : les anciens plans (Record<string, string>)
 * sont migrés automatiquement via migrateOldPlanContent().
 */

// ─── Clés du formulaire plat (stockées en JSONB) ──────────────
// Chaque clé correspond à un textarea dans l'éditeur.
// L'ordre est celui du document final (PDF et UI).

export const CONSEILLANCIER_KEYS = [
  // Section 0 : En-tête personnalisé
  'message_accueil',
  'duree_programme',
  'date_debut_conseille',

  // Section 1 : Objectifs
  'objectifs_principaux',
  'actions_prioritaires_semaine_1',

  // Section 2 : Alimentation & Hydratation
  'principes_alimentaires',
  'aliments_a_privilegier',
  'aliments_a_limiter',
  'rythme_repas',
  'objectif_hydratation',
  'type_eau',
  'moments_hydratation',

  // Section 3A : Phytothérapie
  'phytotherapie_plantes',
  'phytotherapie_posologie',
  'phytotherapie_precautions',

  // Section 3B : Micronutrition
  'complements',
  'precautions_complements',

  // Section 3C : Aromatologie
  'huiles_essentielles',
  'precautions_he',

  // Section 4 : Hydrologie
  'hydrologie',

  // Section 5 : Activité physique
  'activite_type',
  'activite_frequence',
  'activite_conseils',

  // Section 6 : Équilibre psycho-émotionnel
  'equilibre_psycho',
  'gestion_charge_mentale',

  // Section 7 : Techniques respiratoires
  'techniques_respiratoires',

  // Section 8 : Techniques manuelles & réflexes
  'automassages',
  'points_reflexes',
  'seances_recommandees',

  // Section 9 : Sommeil
  'sommeil_routine',
  'sommeil_environnement',
  'sommeil_conseils',

  // Section 10 : Environnement & hygiène de vie
  'environnement_air',
  'environnement_produits',
  'environnement_perturbateurs',

  // Section 11 : Suivi & ajustements
  'suivi_indicateurs',
  'suivi_prochain_rdv',
  'suivi_entre_temps',

  // Section 12 : Message de clôture
  'message_cloture',

  // Section 13 : Notes libres
  'notes_libres',
] as const;

export type ConseillancierKey = (typeof CONSEILLANCIER_KEYS)[number];
export type ConseillancierContent = Record<ConseillancierKey, string>;

// ─── Valeurs par défaut ────────────────────────────

export const DEFAULT_CONSEILLANCIER_CONTENT: ConseillancierContent = Object.fromEntries(
  CONSEILLANCIER_KEYS.map((key) => [key, ''])
) as ConseillancierContent;

// ─── Sections pour l'éditeur et le PDF ─────────────

export type ConseillancierField = {
  key: ConseillancierKey;
  label: string;
  placeholder?: string;
  multiline?: boolean;
};

export type ConseillancierSection = {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  optional?: boolean;
  fields: ConseillancierField[];
};

export const CONSEILLANCIER_SECTIONS: ConseillancierSection[] = [
  {
    id: 'en_tete',
    title: 'Message d\'accueil',
    description: 'Un mot personnalisé pour le consultant.',
    icon: '',
    optional: true,
    fields: [
      {
        key: 'message_accueil',
        label: 'Message personnalisé',
        placeholder: 'Cher(e) [prénom], je suis ravi(e) d\'avoir pu échanger avec vous...',
        multiline: true,
      },
      {
        key: 'duree_programme',
        label: 'Durée du programme',
        placeholder: 'Ex : 3 semaines, 6 semaines, 3 mois...',
      },
      {
        key: 'date_debut_conseille',
        label: 'Date de début conseillée',
        placeholder: 'Ex : Dès réception, 15 février 2026...',
      },
    ],
  },
  {
    id: 'objectifs',
    title: 'Objectifs prioritaires',
    description: 'Les axes de travail et les premières actions.',
    icon: '',
    fields: [
      {
        key: 'objectifs_principaux',
        label: 'Objectifs principaux',
        placeholder: 'Retrouver un sommeil réparateur\nAméliorer la digestion\nGérer le stress au quotidien',
        multiline: true,
      },
      {
        key: 'actions_prioritaires_semaine_1',
        label: 'Actions prioritaires (semaine 1)',
        placeholder: '1. Commencer la tisane digestion le soir\n2. Marcher 20 min chaque midi\n3. Se coucher avant 23h',
        multiline: true,
      },
    ],
  },
  {
    id: 'alimentation',
    title: 'Alimentation & Hydratation',
    description: 'Recommandations alimentaires et hydratation.',
    icon: '',
    fields: [
      {
        key: 'principes_alimentaires',
        label: 'Principes généraux',
        placeholder: 'Privilégier une alimentation vivante, de saison, mastiquée lentement...',
        multiline: true,
      },
      {
        key: 'aliments_a_privilegier',
        label: 'Aliments à privilégier',
        placeholder: 'Légumes crus, graines germées, huiles 1ère pression à froid...',
        multiline: true,
      },
      {
        key: 'aliments_a_limiter',
        label: 'Aliments à limiter',
        placeholder: 'Produits laitiers de vache, gluten, sucres raffinés...',
        multiline: true,
      },
      {
        key: 'rythme_repas',
        label: 'Rythme des repas',
        placeholder: '3 repas/jour, pas de grignotage. Dîner léger avant 20h.',
        multiline: true,
      },
      {
        key: 'objectif_hydratation',
        label: 'Objectif hydratation',
        placeholder: 'Ex : 1,5L par jour (eau filtrée, tisanes)',
      },
      {
        key: 'type_eau',
        label: 'Type d\'eau recommandé',
        placeholder: 'Eau filtrée, eau de source, tisanes...',
      },
      {
        key: 'moments_hydratation',
        label: 'Moments d\'hydratation',
        placeholder: 'À jeun au réveil (300ml), entre les repas...',
      },
    ],
  },
  {
    id: 'phytotherapie',
    title: 'Phytothérapie',
    description: 'Plantes médicinales recommandées.',
    icon: '',
    optional: true,
    fields: [
      {
        key: 'phytotherapie_plantes',
        label: 'Plantes recommandées',
        placeholder: 'Mélisse (infusion, 1 tasse le soir)\nPassiflore (EPS, 1 c. à café avant coucher)...',
        multiline: true,
      },
      {
        key: 'phytotherapie_posologie',
        label: 'Posologie & durée',
        placeholder: 'Cure de 3 semaines, pause 1 semaine, reprendre 3 semaines...',
        multiline: true,
      },
      {
        key: 'phytotherapie_precautions',
        label: 'Précautions & contre-indications',
        placeholder: 'Contre-indiquée si grossesse. Pause d\'une semaine toutes les 3 semaines.',
        multiline: true,
      },
    ],
  },
  {
    id: 'micronutrition',
    title: 'Micronutrition',
    description: 'Compléments alimentaires et micronutriments.',
    icon: '',
    optional: true,
    fields: [
      {
        key: 'complements',
        label: 'Compléments recommandés',
        placeholder: 'Magnésium bisglycinate : 300mg/jour au dîner\nVitamine D3 : 2000 UI/jour...',
        multiline: true,
      },
      {
        key: 'precautions_complements',
        label: 'Précautions',
        placeholder: 'Ne pas dépasser les doses. Consulter si traitement en cours.',
        multiline: true,
      },
    ],
  },
  {
    id: 'aromatologie',
    title: 'Aromatologie',
    description: 'Huiles essentielles recommandées.',
    icon: '',
    optional: true,
    fields: [
      {
        key: 'huiles_essentielles',
        label: 'Huiles essentielles',
        placeholder: 'Lavande vraie : 2 gouttes sur l\'oreiller le soir (diffusion/olfaction)...',
        multiline: true,
      },
      {
        key: 'precautions_he',
        label: 'Précautions HE',
        placeholder: 'Jamais pures sur la peau. CI si épilepsie, grossesse, enfants < 6 ans.',
        multiline: true,
      },
    ],
  },
  {
    id: 'hydrologie',
    title: 'Hydrologie',
    description: 'Techniques d\'hydrothérapie recommandées.',
    icon: '',
    optional: true,
    fields: [
      {
        key: 'hydrologie',
        label: 'Pratiques recommandées',
        placeholder: 'Douche écossaise : terminer par 30s d\'eau froide sur les jambes\nBouillotte sur le foie 20 min après le dîner...',
        multiline: true,
      },
    ],
  },
  {
    id: 'activite',
    title: 'Activité physique',
    description: 'Recommandations d\'exercice et mouvement.',
    icon: '',
    fields: [
      {
        key: 'activite_type',
        label: 'Type d\'activité',
        placeholder: 'Marche, yoga, natation, renforcement musculaire...',
      },
      {
        key: 'activite_frequence',
        label: 'Fréquence & durée',
        placeholder: '3 fois/semaine, 30 à 45 minutes, intensité modérée.',
      },
      {
        key: 'activite_conseils',
        label: 'Conseils pratiques',
        placeholder: 'Marcher 20 min après le repas du midi. Privilégier le plein air.',
        multiline: true,
      },
    ],
  },
  {
    id: 'equilibre_psycho',
    title: 'Équilibre psycho-émotionnel',
    description: 'Gestion du stress et du bien-être mental.',
    icon: '',
    fields: [
      {
        key: 'equilibre_psycho',
        label: 'Techniques recommandées',
        placeholder: 'Méditation : 10 min le matin (app Petit Bambou)\nJournaling : 5 min le soir...',
        multiline: true,
      },
      {
        key: 'gestion_charge_mentale',
        label: 'Gestion de la charge mentale',
        placeholder: 'Apprendre à déléguer, planifier un vrai week-end de repos/mois...',
        multiline: true,
      },
    ],
  },
  {
    id: 'respiration',
    title: 'Techniques respiratoires',
    description: 'Exercices de respiration et protocoles.',
    icon: '',
    optional: true,
    fields: [
      {
        key: 'techniques_respiratoires',
        label: 'Exercices de respiration',
        placeholder: 'Cohérence cardiaque : 5 min, 3x/jour (inspir 5s, expir 5s)\nApp : RespiRelax+',
        multiline: true,
      },
    ],
  },
  {
    id: 'techniques_manuelles',
    title: 'Techniques manuelles & réflexes',
    description: 'Auto-massages et points réflexes.',
    icon: '',
    optional: true,
    fields: [
      {
        key: 'automassages',
        label: 'Auto-massages',
        placeholder: 'Massage du ventre dans le sens horaire 5 min/jour...',
        multiline: true,
      },
      {
        key: 'points_reflexes',
        label: 'Points réflexes',
        placeholder: 'Point 36 Estomac (Zu San Li) : stimuler 1 min matin et soir...',
        multiline: true,
      },
      {
        key: 'seances_recommandees',
        label: 'Séances recommandées',
        placeholder: '1 séance de réflexologie plantaire/mois pendant 3 mois...',
        multiline: true,
      },
    ],
  },
  {
    id: 'sommeil',
    title: 'Sommeil',
    description: 'Routine et environnement de sommeil.',
    icon: '',
    fields: [
      {
        key: 'sommeil_routine',
        label: 'Routine du coucher',
        placeholder: '21h30 : tisane camomille | 22h : lecture 20 min | 23h : coucher',
        multiline: true,
      },
      {
        key: 'sommeil_environnement',
        label: 'Environnement',
        placeholder: 'Chambre fraîche (18°C), noire, silence. Pas d\'écran 1h avant.',
        multiline: true,
      },
      {
        key: 'sommeil_conseils',
        label: 'Conseils complémentaires',
        placeholder: 'Si réveil nocturne : respiration 4-7-8. Éviter café après 14h.',
        multiline: true,
      },
    ],
  },
  {
    id: 'environnement',
    title: 'Environnement & hygiène de vie',
    description: 'Qualité de l\'air, produits du quotidien.',
    icon: '',
    optional: true,
    fields: [
      {
        key: 'environnement_air',
        label: 'Qualité de l\'air intérieur',
        placeholder: 'Aérer 10 min matin et soir. Plantes dépolluantes (pothos, chlorophytum).',
        multiline: true,
      },
      {
        key: 'environnement_produits',
        label: 'Produits du quotidien',
        placeholder: 'Cosmétiques bio (label Cosmos Organic). Ménage : vinaigre blanc + bicarbonate.',
        multiline: true,
      },
      {
        key: 'environnement_perturbateurs',
        label: 'Perturbateurs endocriniens',
        placeholder: 'Contenants en verre, éviter plastiques BPA. Mode avion la nuit.',
        multiline: true,
      },
    ],
  },
  {
    id: 'suivi',
    title: 'Suivi & ajustements',
    description: 'Indicateurs à observer et prochain rendez-vous.',
    icon: '',
    fields: [
      {
        key: 'suivi_indicateurs',
        label: 'Indicateurs à observer',
        placeholder: 'Qualité du sommeil, transit, niveau d\'énergie à 11h et 16h...',
        multiline: true,
      },
      {
        key: 'suivi_prochain_rdv',
        label: 'Prochain rendez-vous',
        placeholder: 'Dans 3 semaines (présentiel ou visio).',
      },
      {
        key: 'suivi_entre_temps',
        label: 'Entre-temps',
        placeholder: 'N\'hésitez pas à m\'envoyer un message si questions. Tenir un journal.',
        multiline: true,
      },
    ],
  },
  {
    id: 'cloture',
    title: 'Message de clôture',
    description: 'Un mot d\'encouragement pour terminer.',
    icon: '',
    optional: true,
    fields: [
      {
        key: 'message_cloture',
        label: 'Message d\'encouragement',
        placeholder: 'Vous avez toutes les ressources en vous. Chaque petit pas compte. Belle route !',
        multiline: true,
      },
    ],
  },
  {
    id: 'notes_libres',
    title: 'Notes libres',
    description: 'Notes additionnelles.',
    icon: '',
    optional: true,
    fields: [
      {
        key: 'notes_libres',
        label: 'Notes libres',
        placeholder: 'Tout ce qui ne rentre pas dans les sections précédentes.',
        multiline: true,
      },
    ],
  },
];

// ─── Migration depuis l'ancien format ──────────────

/**
 * Mappe les anciennes clés (format plat) vers les nouvelles clés.
 * Les anciens plans utilisaient un format Record<string, string> avec des clés
 * comme 'objectifs', 'alimentation_recommandations', etc.
 */
const OLD_KEY_MAP: Record<string, ConseillancierKey> = {
  objectifs: 'objectifs_principaux',
  alimentation_recommandations: 'aliments_a_privilegier',
  alimentation_eviter: 'aliments_a_limiter',
  alimentation_hydratation: 'objectif_hydratation',
  phytotherapie_plantes: 'phytotherapie_plantes',
  phytotherapie_posologie: 'phytotherapie_posologie',
  phytotherapie_precautions: 'phytotherapie_precautions',
  complements: 'complements',
  sommeil: 'sommeil_routine',
  activite: 'activite_conseils',
  gestion_stress: 'equilibre_psycho',
  suivi: 'suivi_indicateurs',
  notes_libres: 'notes_libres',
};

/**
 * Migre un ancien plan (format plat avec anciennes clés) vers le nouveau format.
 * Si le plan utilise déjà les nouvelles clés, il est retourné tel quel.
 */
export function migrateOldPlanContent(
  content: Record<string, string> | null | undefined
): ConseillancierContent {
  if (!content) return { ...DEFAULT_CONSEILLANCIER_CONTENT };

  // Check if it's already new format (has any new key)
  const hasNewKeys = CONSEILLANCIER_KEYS.some((key) => key in content);
  const hasOldKeys = Object.keys(OLD_KEY_MAP).some(
    (oldKey) => oldKey in content && !(oldKey in DEFAULT_CONSEILLANCIER_CONTENT)
  );

  if (hasNewKeys && !hasOldKeys) {
    // Already in new format, just fill missing keys
    const result = { ...DEFAULT_CONSEILLANCIER_CONTENT };
    for (const key of CONSEILLANCIER_KEYS) {
      if (content[key]) {
        result[key] = content[key];
      }
    }
    return result;
  }

  // Migrate old keys
  const result = { ...DEFAULT_CONSEILLANCIER_CONTENT };
  for (const [oldKey, newKey] of Object.entries(OLD_KEY_MAP)) {
    if (content[oldKey]) {
      result[newKey] = content[oldKey];
    }
  }
  // Also copy any new-format keys that exist
  for (const key of CONSEILLANCIER_KEYS) {
    if (content[key] && !result[key]) {
      result[key] = content[key];
    }
  }
  return result;
}

/**
 * Vérifie si une section a du contenu non vide.
 */
export function sectionHasContent(
  section: ConseillancierSection,
  content: ConseillancierContent
): boolean {
  return section.fields.some((field) => content[field.key]?.trim());
}
