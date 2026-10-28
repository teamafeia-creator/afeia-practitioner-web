// Contenu du questionnaire préliminaire public (13 rubriques).
// Les clés correspondent à l'anamnèse (lib/anamnesis.ts) : les réponses la préremplissent.
// Chaque question a un exemple dans la case (placeholder) et une aide permanente sous le libellé (help).

export type PublicQuestion = {
  key: string;
  label: string;
  help: string;
  placeholder?: string;
  options?: string[];
};

export type PublicSection = {
  id: string;
  title: string;
  desc: string;
  questions: PublicQuestion[];
};

export const PUBLIC_SECTIONS: PublicSection[] = [
  {
    id: 'general',
    title: 'Informations générales',
    desc: 'Votre quotidien et votre parcours de santé, en quelques mots.',
    questions: [
      { key: 'general_profession', label: 'Profession et rythme de travail', help: 'Votre métier, vos horaires, ce qui rend vos journées faciles ou chargées.', placeholder: 'Ex. assistante de direction, temps plein, beaucoup d’écrans, je rentre vers 19 h.' },
      { key: 'general_antecedents', label: 'Antécédents médicaux ou familiaux', help: 'Les problèmes de santé passés ou actuels, chez vous ou dans votre famille proche.', placeholder: 'Ex. hypothyroïdie depuis 2021, ma mère a du diabète.' },
      { key: 'general_traitements', label: 'Traitements, compléments ou suivis actuels', help: 'Médicaments (avec la dose si vous la connaissez), compléments alimentaires, autres thérapeutes.', placeholder: 'Ex. Lévothyroxine 75 µg le matin, magnésium de temps en temps, ostéopathe deux fois par an.' },
    ],
  },
  {
    id: 'profil',
    title: 'Profil personnel et émotionnel',
    desc: 'Comment vous vous décririez au quotidien.',
    questions: [
      { key: 'profil_temperament', label: 'Tempérament général', help: 'Quelques mots qui vous ressemblent, en temps normal.', placeholder: 'Ex. plutôt dynamique, mais je m’épuise vite et je deviens irritable.' },
      { key: 'profil_emotions', label: 'Émotions dominantes', help: 'Ce que vous ressentez le plus souvent ces derniers temps.', placeholder: 'Ex. inquiétude, un peu de tristesse depuis l’hiver.' },
    ],
  },
  {
    id: 'motif',
    title: 'Ce qui vous amène',
    desc: 'La raison de votre venue et ce que vous aimeriez voir changer.',
    questions: [
      { key: 'motif_principal', label: 'Motif principal', help: 'Ce qui vous gêne, depuis quand, et à quels moments.', placeholder: 'Ex. fatigue persistante depuis l’hiver, je me réveille vers 4 h sans réussir à me rendormir.' },
      { key: 'motif_objectifs', label: 'Ce que vous aimeriez obtenir', help: 'À quoi verriez-vous que l’accompagnement vous a aidé ?', placeholder: 'Ex. retrouver de l’énergie le matin et mieux dormir.' },
    ],
  },
  {
    id: 'alimentation',
    title: 'Alimentation et hydratation',
    desc: 'Vos habitudes, sans jugement : il n’y a pas de bonne réponse.',
    questions: [
      { key: 'alimentation_habitudes', label: 'Habitudes alimentaires', help: 'Une journée type : ce que vous mangez, à quelle heure, où.', placeholder: 'Ex. café et tartines le matin, salade le midi, plat cuisiné le soir vers 20 h.' },
      { key: 'alimentation_hydratation', label: 'Hydratation au quotidien', help: 'Eau, tisanes et boissons non sucrées comprises.', options: ['Insuffisante', 'Moyenne', 'Bonne'] },
      { key: 'alimentation_ecarts', label: 'Grignotage, alcool, sucre', help: 'Ce que vous consommez en dehors des repas, et à quelle fréquence.', placeholder: 'Ex. chocolat l’après-midi, un verre de vin le week-end.' },
    ],
  },
  {
    id: 'digestion',
    title: 'Digestion et transit',
    desc: 'Ce que vous ressentez après les repas.',
    questions: [
      { key: 'digestion_symptomes', label: 'Ballonnements, inconfort, douleurs', help: 'Ce que vous ressentez, à quel moment de la journée, et à quelle fréquence.', placeholder: 'Ex. ballonnements le soir, sans douleur, trois ou quatre fois par semaine.' },
      { key: 'digestion_transit', label: 'Transit', help: 'Votre rythme habituel.', options: ['Régulier', 'Constipation', 'Diarrhée', 'Variable'] },
      { key: 'digestion_tolérances', label: 'Aliments que vous tolérez mal', help: 'Ce que vous avez remarqué vous-même, même sans certitude.', placeholder: 'Ex. les crudités le soir passent mal, le lait me ballonne.' },
    ],
  },
  {
    id: 'sommeil',
    title: 'Sommeil et énergie',
    desc: 'Vos nuits et votre forme au réveil.',
    questions: [
      { key: 'sommeil_qualite', label: 'Qualité du sommeil', help: 'Heure du coucher, endormissement, réveils dans la nuit, sensation au réveil.', placeholder: 'Ex. couchée vers 23 h, endormissement facile, réveil vers 4 h, rendormissement difficile.' },
      { key: 'energie_niveau', label: 'Énergie au réveil', help: 'La plupart des matins.', options: ['Basse', 'Moyenne', 'Élevée'] },
    ],
  },
  {
    id: 'activite',
    title: 'Activité physique et posture',
    desc: 'Comment vous bougez, et où ça tire.',
    questions: [
      { key: 'activite_pratique', label: 'Activité physique', help: 'Type d’activité, fréquence, durée. La marche compte.', placeholder: 'Ex. marche 20 min par jour, yoga une fois par semaine.' },
      { key: 'activite_posture', label: 'Posture et tensions', help: 'Les zones raides ou sensibles, et ce qui les déclenche.', placeholder: 'Ex. tensions dans la nuque et les épaules après le travail sur écran.' },
    ],
  },
  {
    id: 'stress',
    title: 'Stress et équilibre intérieur',
    desc: 'Ce qui vous pèse, et ce qui vous aide.',
    questions: [
      { key: 'stress_niveau', label: 'Niveau de stress ressenti', help: 'Ces dernières semaines.', options: ['Faible', 'Modéré', 'Élevé'] },
      { key: 'stress_gestion', label: 'Ce qui vous aide à décompresser', help: 'Ce que vous faites déjà, même de petites choses.', placeholder: 'Ex. un peu de respiration, des séries le soir, appeler une amie.' },
    ],
  },
  {
    id: 'elimination',
    title: 'Peau et élimination',
    desc: 'Quelques questions courtes.',
    questions: [
      { key: 'elimination_peau', label: 'État de la peau', help: 'Sécheresse, imperfections, démangeaisons, selon les saisons.', placeholder: 'Ex. peau sèche l’hiver, quelques boutons avant les règles.' },
      { key: 'elimination_transpiration', label: 'Transpiration, odeurs', help: 'Votre ressenti général, s’il y a quelque chose de particulier.', placeholder: 'Ex. rien de particulier.' },
    ],
  },
  {
    id: 'femmes',
    title: 'Cycle',
    desc: 'Votre cycle aide à mieux comprendre certaines variations d’énergie ou de sommeil.',
    questions: [
      { key: 'femme_cycle', label: 'Cycle menstruel', help: 'Durée, régularité, douleurs, ce qui change d’une phase à l’autre.', placeholder: 'Ex. régulier, 28 jours, règles douloureuses le premier jour.' },
      { key: 'femme_contraception', label: 'Contraception ou grossesse', help: 'Méthode actuelle, projet de grossesse, ménopause.', placeholder: 'Ex. stérilet au cuivre depuis 2022.' },
    ],
  },
  {
    id: 'hommes',
    title: 'Pour les hommes',
    desc: 'Deux questions, si elles vous concernent.',
    questions: [
      { key: 'homme_urinaire', label: 'Confort urinaire', help: 'Fréquence, levers la nuit, gêne éventuelle.', placeholder: 'Ex. je me lève une fois par nuit.' },
      { key: 'homme_libido', label: 'Libido et vitalité', help: 'Votre ressenti général, seulement si vous souhaitez en parler.', placeholder: 'Ex. en baisse depuis quelques mois.' },
    ],
  },
  {
    id: 'mode_vie',
    title: 'Mode de vie',
    desc: 'Votre environnement et vos habitudes.',
    questions: [
      { key: 'mode_vie_habitudes', label: 'Tabac, alcool, écrans', help: 'Quantités et moments de la journée, approximativement.', placeholder: 'Ex. pas de tabac, téléphone au lit le soir pendant une heure.' },
      { key: 'mode_vie_environnement', label: 'Environnement de vie', help: 'Logement, ville ou campagne, entourage, animaux.', placeholder: 'Ex. appartement en ville, peu d’espaces verts, deux enfants.' },
    ],
  },
  {
    id: 'question_ouverte',
    title: 'Pour finir',
    desc: 'Un dernier mot pour votre praticien ?',
    questions: [
      { key: 'question_ouverte', label: 'Autre chose d’important à partager ?', help: 'Tout ce qui vous semble utile et que l’on ne vous a pas demandé.', placeholder: 'Ex. j’ai déjà essayé un régime sans gluten l’an dernier.' },
    ],
  },
];
