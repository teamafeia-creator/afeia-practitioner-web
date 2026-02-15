-- ============================================
-- SEED DEMO : Données pour Woodeline (pwoodeline@gmail.com)
-- ============================================
-- Ce script peuple toutes les fonctionnalités pour une démo complète.
-- Il est idempotent : les INSERT utilisent ON CONFLICT DO NOTHING.
-- IMPORTANT : Exécuter avec service_role (bypass RLS).

DO $$
DECLARE
  v_practitioner_id UUID;

  -- 12 consultants
  v_c1  UUID := 'a0000000-0000-4000-a000-000000000001';
  v_c2  UUID := 'a0000000-0000-4000-a000-000000000002';
  v_c3  UUID := 'a0000000-0000-4000-a000-000000000003';
  v_c4  UUID := 'a0000000-0000-4000-a000-000000000004';
  v_c5  UUID := 'a0000000-0000-4000-a000-000000000005';
  v_c6  UUID := 'a0000000-0000-4000-a000-000000000006';
  v_c7  UUID := 'a0000000-0000-4000-a000-000000000007';
  v_c8  UUID := 'a0000000-0000-4000-a000-000000000008';
  v_c9  UUID := 'a0000000-0000-4000-a000-000000000009';
  v_c10 UUID := 'a0000000-0000-4000-a000-00000000000a';
  v_c11 UUID := 'a0000000-0000-4000-a000-00000000000b';
  v_c12 UUID := 'a0000000-0000-4000-a000-00000000000c';

  -- Prescriptions
  v_pres1  UUID := 'e0000000-0000-4000-a000-000000000001';
  v_pres2  UUID := 'e0000000-0000-4000-a000-000000000002';
  v_pres3  UUID := 'e0000000-0000-4000-a000-000000000003';
  v_pres4  UUID := 'e0000000-0000-4000-a000-000000000004';
  v_pres5  UUID := 'e0000000-0000-4000-a000-000000000005';
  v_pres7  UUID := 'e0000000-0000-4000-a000-000000000007';
  v_pres8  UUID := 'e0000000-0000-4000-a000-000000000008';
  v_pres10 UUID := 'e0000000-0000-4000-a000-00000000000a';

  -- Active prescription items (for complement_tracking)
  v_pi_1_1  UUID := 'e1000000-0000-4000-a000-000000000001';
  v_pi_1_2  UUID := 'e1000000-0000-4000-a000-000000000002';
  v_pi_5_1  UUID := 'e1000000-0000-4000-a000-000000000013';
  v_pi_5_2  UUID := 'e1000000-0000-4000-a000-000000000014';
  v_pi_7_1  UUID := 'e1000000-0000-4000-a000-000000000021';
  v_pi_7_2  UUID := 'e1000000-0000-4000-a000-000000000022';
  v_pi_10_1 UUID := 'e1000000-0000-4000-a000-000000000031';
  v_pi_10_2 UUID := 'e1000000-0000-4000-a000-000000000032';

  -- Billing
  v_plan_premium UUID;
  v_sub_id UUID;

BEGIN
  -- ============================================
  -- ÉTAPE 0 : Récupérer l ID de Woodeline
  -- ============================================
  SELECT id INTO v_practitioner_id FROM practitioners WHERE email = 'pwoodeline@gmail.com';
  IF v_practitioner_id IS NULL THEN
    RAISE EXCEPTION 'Praticienne pwoodeline@gmail.com introuvable. Créez le compte d abord.';
  END IF;
  RAISE NOTICE 'Praticienne trouvée : %', v_practitioner_id;

  -- ============================================
  -- ÉTAPE 1 : CONSULTANTS (12)
  -- ============================================
  INSERT INTO consultants (id, practitioner_id, email, name, first_name, last_name, phone, city, age, date_of_birth, consultation_reason, status, is_premium, activated, activated_at, bague_connectee_enabled, created_at) VALUES
  (v_c1,  v_practitioner_id, 'sophie.martin@example.com',     'Sophie Martin',     'Sophie',      'Martin',     '06 12 34 56 78', 'Paris',       38, '1987-06-15', 'Syndrome du côlon irritable, stress professionnel intense, troubles du sommeil',          'premium',  true,  true,  NOW()-INTERVAL '6 months',  true,  NOW()-INTERVAL '7 months'),
  (v_c2,  v_practitioner_id, 'thomas.dubois@example.com',     'Thomas Dubois',     'Thomas',      'Dubois',     '06 23 45 67 89', 'Chamonix',    32, '1993-03-22', 'Optimisation nutrition sportive trail/ultra, préparation UTMB',                          'premium',  true,  true,  NOW()-INTERVAL '5 months',  true,  NOW()-INTERVAL '6 months'),
  (v_c3,  v_practitioner_id, 'emilie.laurent@example.com',    'Émilie Laurent',    'Émilie',      'Laurent',    '06 34 56 78 90', 'Nantes',      30, '1995-11-08', 'Post-partum 6 mois, fatigue intense, carences fer et vitamine D, allaitement',           'standard', false, true,  NOW()-INTERVAL '4 months',  false, NOW()-INTERVAL '5 months'),
  (v_c4,  v_practitioner_id, 'jeanpierre.moreau@example.com', 'Jean-Pierre Moreau','Jean-Pierre', 'Moreau',     '06 45 67 89 01', 'Tours',       68, '1957-09-30', 'Confort prostatique (HBP débutante), sommeil fragmenté, prévention cardiovasculaire',     'standard', false, true,  NOW()-INTERVAL '7 months',  false, NOW()-INTERVAL '8 months'),
  (v_c5,  v_practitioner_id, 'nathalie.petit@example.com',    'Nathalie Petit',    'Nathalie',    'Petit',      '06 56 78 90 12', 'Lyon',        52, '1973-05-14', 'Ménopause : bouffées de chaleur 8-10x/jour, sueurs nocturnes, pas de THS souhaité',      'premium',  true,  true,  NOW()-INTERVAL '6 months',  true,  NOW()-INTERVAL '7 months'),
  (v_c6,  v_practitioner_id, 'lucas.bernard@example.com',     'Lucas Bernard',     'Lucas',       'Bernard',    '06 67 89 01 23', 'Bordeaux',    17, '2008-08-25', 'Acné inflammatoire modérée à sévère, alimentation très industrielle',                    'standard', false, true,  NOW()-INTERVAL '3 months',  false, NOW()-INTERVAL '4 months'),
  (v_c7,  v_practitioner_id, 'celine.roux@example.com',       'Céline Roux',       'Céline',      'Roux',       '06 78 90 12 34', 'Strasbourg',  45, '1980-12-03', 'Fibromyalgie diagnostiquée depuis 3 ans, douleurs diffuses, fatigue chronique',          'premium',  true,  true,  NOW()-INTERVAL '8 months',  true,  NOW()-INTERVAL '9 months'),
  (v_c8,  v_practitioner_id, 'marc.lefebvre@example.com',     'Marc Lefebvre',     'Marc',        'Lefebvre',   '06 89 01 23 45', 'Toulouse',    44, '1981-02-18', 'RGO chronique sous IPP depuis 2 ans, surpoids (IMC 28.5), sevrage souhaité',             'standard', false, true,  NOW()-INTERVAL '4 months',  false, NOW()-INTERVAL '5 months'),
  (v_c9,  v_practitioner_id, 'amina.benali@example.com',      'Amina Benali',      'Amina',       'Benali',     '06 90 12 34 56', 'Montpellier', 22, '2003-06-20', 'Migraines cataméniales 3-4x/mois, stress examens, abus de caféine',                     'standard', false, true,  NOW()-INTERVAL '2 months',  false, NOW()-INTERVAL '3 months'),
  (v_c10, v_practitioner_id, 'philippe.garnier@example.com',  'Philippe Garnier',  'Philippe',    'Garnier',    '06 01 23 45 67', 'Rennes',      48, '1977-10-12', 'Eczéma chronique mains et avant-bras (artisan boulanger), fatigue matinale',             'premium',  true,  true,  NOW()-INTERVAL '5 months',  true,  NOW()-INTERVAL '6 months'),
  (v_c11, v_practitioner_id, 'isabelle.fontaine@example.com', 'Isabelle Fontaine', 'Isabelle',    'Fontaine',   '06 12 45 78 90', 'Nice',        41, '1984-04-07', 'Détox hépatique et optimisation micronutritionnelle (professeure de yoga)',               'standard', false, true,  NOW()-INTERVAL '3 months',  false, NOW()-INTERVAL '4 months'),
  (v_c12, v_practitioner_id, 'robert.durand@example.com',     'Robert Durand',     'Robert',      'Durand',     '06 23 56 89 01', 'Dijon',       70, '1955-01-28', 'Cholestérol LDL 1.85g/L, HTA limite 140/85, prévention cardiovasculaire (ATCD familiaux)','premium',  true,  true,  NOW()-INTERVAL '4 months',  true,  NOW()-INTERVAL '5 months')
  ON CONFLICT (id) DO NOTHING;

  -- ============================================
  -- ÉTAPE 2 : CONSULTANT_ANAMNESIS (12)
  -- ============================================

  -- Sophie Martin (c1) — SII + stress
  INSERT INTO consultant_anamnesis (consultant_id, naturopath_id, answers, version, source, created_at, updated_at)
  VALUES (v_c1, v_practitioner_id, $a1${
    "general_profession": "Cadre supérieure en marketing digital, rythme intense (50h/semaine), open space bruyant",
    "general_antecedents": "SII diagnostiqué en 2021. Appendicectomie à 15 ans. Terrain anxieux familial (mère sous anxiolytiques)",
    "general_traitements": "Smecta en SOS, Spasfon occasionnel, magnésium en cure",
    "profil_temperament": "Perfectionniste, hyperactive mentalement, besoin de contrôle, rapide dans ses gestes et sa parole",
    "profil_emotions": "Anxiété latente, ruminations nocturnes, sentiment de ne jamais en faire assez, irritabilité en période de surcharge",
    "motif_principal": "Troubles digestifs chroniques (ballonnements quotidiens, transit alternant diarrhée/constipation) aggravés par le stress professionnel",
    "motif_objectifs": "Retrouver un confort digestif au quotidien, mieux gérer le stress, améliorer la qualité du sommeil",
    "alimentation_habitudes": "Repas pris rapidement devant l écran, souvent sandwich le midi, cuisine maison le soir mais fatiguée",
    "alimentation_hydratation": "Insuffisante",
    "alimentation_ecarts": "Café 4-5 tasses/jour, grignotage sucré en fin d après-midi (chocolat, biscuits), verre de vin le soir pour décompresser",
    "digestion_symptomes": "Ballonnements quotidiens post-prandiaux, gaz abondants, douleurs abdominales en barre, alternance diarrhée-constipation",
    "digestion_transit": "Variable",
    "digestion_tolérances": "Sensibilité au gluten (non cœliaque), produits laitiers mal tolérés, légumineuses provoquent des gaz importants",
    "sommeil_qualite": "Endormissement difficile (45 min), ruminations, réveil à 4h du matin fréquent, non réparateur",
    "energie_niveau": "Bas",
    "activite_pratique": "Très peu : marche occasionnelle le week-end, ancien yoga abandonné par manque de temps",
    "activite_posture": "Assise 8-10h/jour, tensions cervicales et lombaires, bruxisme nocturne",
    "stress_niveau": "Élevé",
    "stress_gestion": "Aucune technique en place, se réfugie dans le travail ou le vin le soir",
    "elimination_peau": "Teint terne, cernes marquées, peau sèche et réactive",
    "elimination_transpiration": "Normale",
    "femme_cycle": "Régulier 28 jours, SPM léger (irritabilité J-3), flux normal",
    "femme_contraception": "DIU cuivre depuis 3 ans, bien toléré",
    "mode_vie_habitudes": "Sédentaire, écrans le soir jusqu à 23h, peu de temps en nature",
    "mode_vie_environnement": "Appartement parisien, open space bruyant au travail, transports en commun 1h/jour",
    "question_ouverte": "J ai l impression que mon ventre est mon baromètre émotionnel. Dès que je suis stressée, tout se dérègle. J ai essayé plein de choses mais rien ne tient dans la durée. J ai besoin d un cadre et d un suivi régulier."
  }$a1$::jsonb, 1, 'manual', NOW()-INTERVAL '6 months', NOW()-INTERVAL '5 months')
  ON CONFLICT (consultant_id) DO NOTHING;

  -- Thomas Dubois (c2) — Trail / nutrition sportive
  INSERT INTO consultant_anamnesis (consultant_id, naturopath_id, answers, version, source, created_at, updated_at)
  VALUES (v_c2, v_practitioner_id, $a2${
    "general_profession": "Développeur web freelance, horaires flexibles, passionné de trail et d ultra-endurance",
    "general_antecedents": "Tendinite d Achille récurrente (2022-2023). Fracture de fatigue métatarse (2021). RAS par ailleurs",
    "general_traitements": "Aucun traitement médicamenteux. Compléments auto-prescrits : whey protéine, BCAA",
    "profil_temperament": "Volontaire, discipliné, compétiteur, tendance au surentraînement, analyse ses données en permanence",
    "profil_emotions": "Stable émotionnellement. Frustration quand blessé. Besoin de dépassement et de nature",
    "motif_principal": "Optimiser la nutrition pour performer en trail (objectif UTMB). Problèmes de crampes et de récupération",
    "motif_objectifs": "Plan nutritionnel adapté au trail, améliorer la récupération, prévenir les blessures, optimiser les performances",
    "alimentation_habitudes": "Mange bien mais pas adapté à l effort : trop de protéines, pas assez de glucides complexes pré-effort",
    "alimentation_hydratation": "Moyenne",
    "alimentation_ecarts": "Bières entre amis le samedi, pizzas post-entraînement, alimentation un peu monotone",
    "digestion_symptomes": "Troubles digestifs uniquement à l effort (> 3h) : nausées, crampes intestinales",
    "digestion_transit": "Régulier",
    "digestion_tolérances": "RAS au quotidien. Gels énergétiques industriels mal tolérés à l effort",
    "sommeil_qualite": "Bon en général, perturbé les veilles de course (excitation). 7-8h par nuit",
    "energie_niveau": "Élevé",
    "activite_pratique": "Trail 5x/semaine (80-100km/sem en charge), renforcement musculaire 2x/semaine, étirements insuffisants",
    "activite_posture": "Bonne, position assise pour le travail mais alterner debout/assis avec bureau réglable",
    "stress_niveau": "Faible",
    "stress_gestion": "Le sport est sa gestion du stress. Méditation ponctuelle. Nature ++",
    "elimination_peau": "Normale, bronzée (extérieur ++)",
    "elimination_transpiration": "Abondante à l effort, pertes minérales importantes",
    "homme_urinaire": "RAS",
    "homme_libido": "Normale, légèrement diminuée en période de grosse charge d entraînement",
    "mode_vie_habitudes": "Vie saine, pas de tabac, alcool modéré, couché tôt en semaine",
    "mode_vie_environnement": "Appartement à Chamonix, accès direct aux sentiers, air pur de montagne, télétravail",
    "question_ouverte": "Je veux optimiser ma nutrition pour l UTMB cet été. J ai eu des problèmes gastriques sur ma dernière course longue et des crampes récurrentes. Je veux un plan nutritionnel personnalisé pour la préparation et la course."
  }$a2$::jsonb, 1, 'manual', NOW()-INTERVAL '5 months', NOW()-INTERVAL '4 months')
  ON CONFLICT (consultant_id) DO NOTHING;

  -- Émilie Laurent (c3) — Post-partum / fatigue
  INSERT INTO consultant_anamnesis (consultant_id, naturopath_id, answers, version, source, created_at, updated_at)
  VALUES (v_c3, v_practitioner_id, $a3${
    "general_profession": "Graphiste freelance, en congé maternité prolongé, reprise partielle à domicile",
    "general_antecedents": "Grossesse et accouchement normaux (voie basse). Anémie ferriprive en fin de grossesse. RAS par ailleurs",
    "general_traitements": "Tardyferon prescrit en post-partum (mal toléré, arrêté). Vitamine D prescrite mais oubliée",
    "profil_temperament": "Douce, empathique, culpabilise facilement, exigeante envers elle-même en tant que mère",
    "profil_emotions": "Fatigue émotionnelle, pleurs faciles, sentiment d être dépassée, mais pas de dépression post-partum caractérisée",
    "motif_principal": "Fatigue intense post-partum à 6 mois, carences en fer et vitamine D confirmées, allaitement en cours",
    "motif_objectifs": "Retrouver de l énergie, corriger les carences, être accompagnée pour le sevrage de l allaitement",
    "alimentation_habitudes": "Mange quand elle peut, souvent debout, repas rapides et peu variés par manque de temps et d énergie",
    "alimentation_hydratation": "Insuffisante",
    "alimentation_ecarts": "Grignotage sucré pour tenir le coup (gâteaux, chocolat), saute souvent le petit-déjeuner",
    "digestion_symptomes": "RAS, bonne digestion",
    "digestion_transit": "Régulier",
    "digestion_tolérances": "Bonne tolérance générale",
    "sommeil_qualite": "Très fragmenté (bébé se réveille encore 2-3x/nuit), non réparateur, 5h cumulées par nuit",
    "energie_niveau": "Bas",
    "activite_pratique": "Quasi nulle hormis portage du bébé et promenades en poussette",
    "activite_posture": "Tensions dans les épaules et le haut du dos liées à l allaitement et au portage",
    "stress_niveau": "Modéré",
    "stress_gestion": "Peu de temps pour soi, mari qui aide mais travaille beaucoup, mère qui vient 1x/semaine",
    "elimination_peau": "Pâleur, chute de cheveux importante (post-partum), ongles cassants",
    "elimination_transpiration": "Normale",
    "femme_cycle": "Pas de retour de couches (allaitement), aménorrhée de lactation",
    "femme_contraception": "Aucune pour l instant (allaitement exclusif)",
    "mode_vie_habitudes": "Vie centrée sur le bébé, peu de sorties, isolement social relatif",
    "mode_vie_environnement": "Maison avec jardin à Nantes, quartier calme, bon environnement mais peu de stimulation sociale",
    "question_ouverte": "Je suis épuisée mais je ne veux pas prendre d antidépresseurs. Mon médecin dit que c est normal la fatigue post-partum mais je sens que c est plus que ça. J ai besoin d aide pour remonter la pente et accompagner le sevrage de l allaitement."
  }$a3$::jsonb, 1, 'manual', NOW()-INTERVAL '4 months', NOW()-INTERVAL '3 months')
  ON CONFLICT (consultant_id) DO NOTHING;

  -- Jean-Pierre Moreau (c4) — Prostate / sommeil / prévention
  INSERT INTO consultant_anamnesis (consultant_id, naturopath_id, answers, version, source, created_at, updated_at)
  VALUES (v_c4, v_practitioner_id, $a4${
    "general_profession": "Retraité, ancien professeur de lycée, très actif (jardin, associations, petits-enfants)",
    "general_antecedents": "HBP débutante (hypertrophie bénigne de la prostate). Hypertension légère traitée. Cholestérol limite",
    "general_traitements": "Amlodipine 5mg (HTA). PSA contrôlé annuellement (normal). Pas de traitement prostatique",
    "profil_temperament": "Calme, méthodique, curieux, aime apprendre, discipliné quand il a un plan clair",
    "profil_emotions": "Serein dans l ensemble, légère anxiété liée à la santé (antécédents familiaux cardiovasculaires)",
    "motif_principal": "Gêne prostatique (levers nocturnes 3x, jet faible), sommeil fragmenté, prévention cardiovasculaire",
    "motif_objectifs": "Améliorer le confort urinaire, mieux dormir, prévenir les risques cardiovasculaires naturellement",
    "alimentation_habitudes": "Cuisine traditionnelle française, épouse cuisine bien, repas équilibrés mais un peu riches",
    "alimentation_hydratation": "Bonne",
    "alimentation_ecarts": "Fromage 2x/jour, vin rouge quotidien (1 verre), pâtisseries le dimanche",
    "digestion_symptomes": "RAS, bonne digestion",
    "digestion_transit": "Régulier",
    "digestion_tolérances": "RAS",
    "sommeil_qualite": "Fragmenté par les levers urinaires (3x/nuit), endormissement facile mais sommeil non réparateur",
    "energie_niveau": "Moyen",
    "activite_pratique": "Jardinage quotidien (1-2h), marche 30-45 min/jour, vélo le week-end",
    "activite_posture": "Bonne mobilité pour son âge, légère arthrose lombaire",
    "stress_niveau": "Faible",
    "stress_gestion": "Jardinage, lecture, vie associative, temps avec les petits-enfants",
    "elimination_peau": "Normale pour l âge",
    "elimination_transpiration": "Normale",
    "homme_urinaire": "Levers nocturnes 3x, jet faible, sensation de vidange incomplète, PSA normal",
    "homme_libido": "Diminuée avec l âge mais acceptable",
    "mode_vie_habitudes": "Retraite active et épanouie, vie sociale riche, couple stable",
    "mode_vie_environnement": "Maison avec grand jardin potager à Tours, quartier résidentiel calme",
    "question_ouverte": "Les levers nocturnes me fatiguent beaucoup et empêchent ma femme de dormir aussi. L urologue dit que c est l âge mais je voudrais essayer des solutions naturelles avant les médicaments. Mon père est décédé d un infarctus à 68 ans, j ai peur de suivre le même chemin."
  }$a4$::jsonb, 1, 'manual', NOW()-INTERVAL '7 months', NOW()-INTERVAL '6 months')
  ON CONFLICT (consultant_id) DO NOTHING;

  -- Nathalie Petit (c5) — Ménopause
  INSERT INTO consultant_anamnesis (consultant_id, naturopath_id, answers, version, source, created_at, updated_at)
  VALUES (v_c5, v_practitioner_id, $a5${
    "general_profession": "Directrice d école primaire, poste à responsabilité, charge mentale importante",
    "general_antecedents": "RAS jusqu à la ménopause. Pas d ATCD cancer hormono-dépendant. Ostéopénie légère à la densitométrie",
    "general_traitements": "Aucun. Refus du THS après discussion avec le gynécologue. Souhaite une approche naturelle",
    "profil_temperament": "Dynamique, organisée, volontaire, habituée à gérer du monde, parfois impatiente",
    "profil_emotions": "Irritabilité nouvelle, sautes d humeur inhabituelles, sensation de perte de contrôle sur son corps",
    "motif_principal": "Ménopause confirmée. Bouffées de chaleur 8-10x/jour (dont nocturnes), sueurs, irritabilité, sécheresse muqueuses",
    "motif_objectifs": "Réduire les bouffées de chaleur sans THS, mieux dormir, préserver le capital osseux, retrouver sa vitalité",
    "alimentation_habitudes": "Alimentation équilibrée, cuisine maison, repas à la cantine le midi (choix limités)",
    "alimentation_hydratation": "Moyenne",
    "alimentation_ecarts": "Café 3x/jour (déclenche parfois les bouffées), chocolat en fin de journée, vin occasionnel",
    "digestion_symptomes": "Ballonnements légers depuis la ménopause, transit un peu ralenti",
    "digestion_transit": "Variable",
    "digestion_tolérances": "Bonne tolérance générale",
    "sommeil_qualite": "Perturbé par les sueurs nocturnes (2-3x/nuit), réveils en nage, difficulté à se rendormir",
    "energie_niveau": "Moyen",
    "activite_pratique": "Marche rapide 3x/semaine, aquagym 1x/semaine, danse de salon le samedi",
    "activite_posture": "Bonne, raideurs matinales légères (épaules)",
    "stress_niveau": "Modéré",
    "stress_gestion": "Activités sociales, danse, lecture, sorties entre amies",
    "elimination_peau": "Sécheresse cutanée accrue, rides plus marquées depuis la ménopause, cheveux plus fins",
    "elimination_transpiration": "Excessive (bouffées de chaleur, sueurs nocturnes)",
    "femme_cycle": "Ménopause confirmée (dernières règles il y a 14 mois)",
    "femme_contraception": "Aucune (ménopause)",
    "mode_vie_habitudes": "Vie active, sociable, couple stable (mari compréhensif), enfants adultes indépendants",
    "mode_vie_environnement": "Appartement spacieux à Lyon, quartier agréable, école à 15 min à pied",
    "question_ouverte": "Les bouffées de chaleur me gâchent la vie. En réunion, je deviens écarlate et je transpire. La nuit, je change de pyjama 2 fois. Mon gynécologue m a proposé le THS mais j ai peur des risques. Je veux essayer la voie naturelle d abord."
  }$a5$::jsonb, 1, 'manual', NOW()-INTERVAL '6 months', NOW()-INTERVAL '5 months')
  ON CONFLICT (consultant_id) DO NOTHING;

  -- Lucas Bernard (c6) — Acné adolescent
  INSERT INTO consultant_anamnesis (consultant_id, naturopath_id, answers, version, source, created_at, updated_at)
  VALUES (v_c6, v_practitioner_id, $a6${
    "general_profession": "Lycéen en Terminale S, bac dans 6 mois",
    "general_antecedents": "RAS. Pas d allergie connue. Acné apparue à 14 ans, aggravée depuis 1 an",
    "general_traitements": "Crème Cutacnyl (peroxyde de benzoyle) prescrite par le médecin, peu efficace. Pas d antibiotiques ni Roaccutane",
    "profil_temperament": "Timide, complexé par son acné, passe beaucoup de temps sur les écrans, peu sportif",
    "profil_emotions": "Manque de confiance en soi lié à l acné, évite les photos, impact sur la vie sociale",
    "motif_principal": "Acné inflammatoire modérée à sévère (visage, dos), alimentation très déséquilibrée",
    "motif_objectifs": "Améliorer la peau, changer progressivement l alimentation, retrouver confiance en soi",
    "alimentation_habitudes": "Petit-déjeuner sauté, cantine le midi (frites/pizza), goûter industriel (chips, gâteaux), dîner familial le seul repas correct",
    "alimentation_hydratation": "Insuffisante",
    "alimentation_ecarts": "Sodas 2-3x/jour, fast-food 2-3x/semaine, chips quotidiennes, bonbons, très peu de légumes",
    "digestion_symptomes": "RAS",
    "digestion_transit": "Régulier",
    "digestion_tolérances": "RAS connues",
    "sommeil_qualite": "Se couche tard (minuit-1h) à cause des écrans (jeux vidéo, réseaux sociaux), levé difficile à 7h",
    "energie_niveau": "Moyen",
    "activite_pratique": "Quasi nulle. Dispensé de sport au lycée l an dernier. Joue aux jeux vidéo 3-4h/jour",
    "activite_posture": "Avachie devant les écrans, douleurs cervicales débutantes",
    "stress_niveau": "Modéré",
    "stress_gestion": "Jeux vidéo (échappatoire), quelques amis proches, mère attentive et soutenante",
    "elimination_peau": "Acné inflammatoire visage (front, joues, menton) et dos. Peau grasse. Cicatrices naissantes",
    "elimination_transpiration": "Normale",
    "homme_urinaire": "RAS",
    "homme_libido": "Non abordé (mineur)",
    "mode_vie_habitudes": "Sédentaire, écrans excessifs, rythme décalé, peu de contact avec la nature",
    "mode_vie_environnement": "Vit chez ses parents à Bordeaux, chambre orientée nord (peu de lumière), quartier urbain",
    "question_ouverte": "J en ai marre d avoir des boutons, tout le monde me regarde. Ma mère m a pris ce rendez-vous. Je veux bien essayer si ça marche mais je peux pas arrêter les frites d un coup."
  }$a6$::jsonb, 1, 'manual', NOW()-INTERVAL '3 months', NOW()-INTERVAL '2 months')
  ON CONFLICT (consultant_id) DO NOTHING;

  -- Céline Roux (c7) — Fibromyalgie
  INSERT INTO consultant_anamnesis (consultant_id, naturopath_id, answers, version, source, created_at, updated_at)
  VALUES (v_c7, v_practitioner_id, $a7${
    "general_profession": "Secrétaire médicale à mi-temps (aménagement pour cause de fibromyalgie), arrêts fréquents",
    "general_antecedents": "Fibromyalgie diagnostiquée en 2022 (ACR 2010). Dépression réactionnelle en 2021. Endométriose opérée en 2018",
    "general_traitements": "Lyrica 150mg 2x/jour, tramadol 50mg en SOS, duloxétine 60mg (antidépresseur/antidouleur)",
    "profil_temperament": "Courageuse, volontaire malgré la douleur, perfectionniste (facteur aggravant), besoin de reconnaissance",
    "profil_emotions": "Découragement récurrent, sentiment d incompréhension de l entourage, colère contenue, gratitude envers les soignants bienveillants",
    "motif_principal": "Fibromyalgie : douleurs diffuses chroniques (EVA 7/10), fatigue invalidante, sommeil non réparateur, 14 points sensibles",
    "motif_objectifs": "Réduire la douleur et la fatigue, améliorer le sommeil, regagner de l autonomie, réduire les médicaments si possible",
    "alimentation_habitudes": "Mange correctement quand elle a l énergie de cuisiner, sinon plats préparés. Appétit variable selon la douleur",
    "alimentation_hydratation": "Insuffisante",
    "alimentation_ecarts": "Sucre en excès (besoin de réconfort), café pour tenir, peu de légumes les jours de crise",
    "digestion_symptomes": "Ballonnements fréquents, sensibilité intestinale, colopathie fonctionnelle associée",
    "digestion_transit": "Variable",
    "digestion_tolérances": "Sensibilité au gluten et aux produits laitiers (non testée formellement)",
    "sommeil_qualite": "Catastrophique : endormissement 1h+, réveils multiples par la douleur, 4h30 de sommeil effectif, non réparateur",
    "energie_niveau": "Bas",
    "activite_pratique": "Très réduite par la douleur. Quelques marches courtes les bons jours. Ancienne danseuse (abandonné)",
    "activite_posture": "Raideurs généralisées, contractures cervicales et trapèzes permanentes",
    "stress_niveau": "Élevé",
    "stress_gestion": "Peu de ressources : ne sort presque plus, a perdu des amis qui ne comprennent pas la maladie, chat = réconfort",
    "elimination_peau": "Sèche, sensible, réactive aux changements de température",
    "elimination_transpiration": "Variable, sueurs lors des poussées douloureuses",
    "femme_cycle": "Irrégulier depuis l opération d endométriose, douleurs prémenstruelles accrues",
    "femme_contraception": "Pilule progestative en continu",
    "mode_vie_habitudes": "Vie réduite par la maladie, isolement social progressif, mi-temps thérapeutique",
    "mode_vie_environnement": "Appartement au 2e étage sans ascenseur (difficile les jours de crise), Strasbourg, vit seule avec son chat",
    "question_ouverte": "On m a dit que la naturopathie ne pouvait rien pour la fibromyalgie. Mais les médicaments m abrutissent et ne suffisent pas. Je veux essayer autre chose, même si c est long. J ai besoin de quelqu un qui me croit quand je dis que j ai mal."
  }$a7$::jsonb, 1, 'manual', NOW()-INTERVAL '8 months', NOW()-INTERVAL '7 months')
  ON CONFLICT (consultant_id) DO NOTHING;

  -- Marc Lefebvre (c8) — RGO / surpoids
  INSERT INTO consultant_anamnesis (consultant_id, naturopath_id, answers, version, source, created_at, updated_at)
  VALUES (v_c8, v_practitioner_id, $a8${
    "general_profession": "Directeur commercial régional, déplacements fréquents (2-3 jours/semaine), repas d affaires quotidiens",
    "general_antecedents": "RGO diagnostiqué en 2023. Hernie hiatale modérée (fibroscopie). Surpoids depuis 5 ans",
    "general_traitements": "Oméprazole 20mg/jour depuis 2 ans. Gaviscon en SOS",
    "profil_temperament": "Dynamique, bon vivant, sociable, compétitif, du mal à se poser et à ralentir",
    "profil_emotions": "Stressé par les objectifs commerciaux, culpabilité vis-à-vis de l alimentation et du poids, déni partiel",
    "motif_principal": "RGO chronique sous IPP (souhaite sevrer), surpoids (IMC 28.5, prise de 12 kg en 5 ans), fatigue",
    "motif_objectifs": "Sevrer les IPP progressivement, perdre 8-10 kg, retrouver un confort digestif sans médicaments",
    "alimentation_habitudes": "Repas d affaires le midi (restaurant), souvent copieux avec alcool. Dîner rapide le soir. Peu de cuisiner maison en semaine",
    "alimentation_hydratation": "Insuffisante",
    "alimentation_ecarts": "Alcool 3-4 verres/semaine (vin au restaurant), café 4x/jour, grignotage voiture (biscuits), portions excessives",
    "digestion_symptomes": "Remontées acides quotidiennes surtout après le dîner et en position couchée, pyrosis, éructations fréquentes",
    "digestion_transit": "Régulier",
    "digestion_tolérances": "Intolérance aux tomates crues, agrumes, oignons crus, vin blanc",
    "sommeil_qualite": "Perturbé par le reflux nocturne, dort souvent surélevé, ronflements (apnée du sommeil ?)",
    "energie_niveau": "Moyen",
    "activite_pratique": "Quasi nulle. Ancien rugbyman. Marche un peu en déplacement. Sédentarité totale sinon.",
    "activite_posture": "Ventre proéminent, tension dans le bas du dos, position assise voiture ++ (100km/jour en déplacement)",
    "stress_niveau": "Élevé",
    "stress_gestion": "Le sport d équipe lui manque. Compense par la nourriture et l alcool. Peu de techniques en place.",
    "elimination_peau": "Rosacée légère (nez et joues), peau grasse",
    "elimination_transpiration": "Abondante, surtout la nuit",
    "homme_urinaire": "RAS",
    "homme_libido": "Diminuée (fatigue, surpoids, complexe)",
    "mode_vie_habitudes": "Rythme effréné, hôtels 2-3 nuits/sem, peu de vie de famille en semaine, sport absent",
    "mode_vie_environnement": "Maison de banlieue toulousaine, famille (femme + 2 enfants), souvent absent",
    "question_ouverte": "Mon gastro dit que je serai sous IPP à vie. Je n accepte pas ça. J ai 44 ans, je veux me reprendre en main. Mais c est dur avec mon boulot : les repas d affaires, c est mon quotidien. J ai besoin d un plan réaliste, pas d un régime de moine."
  }$a8$::jsonb, 1, 'manual', NOW()-INTERVAL '4 months', NOW()-INTERVAL '3 months')
  ON CONFLICT (consultant_id) DO NOTHING;

  -- Amina Benali (c9) — Migraines étudiante
  INSERT INTO consultant_anamnesis (consultant_id, naturopath_id, answers, version, source, created_at, updated_at)
  VALUES (v_c9, v_practitioner_id, $a9${
    "general_profession": "Étudiante en 3e année de droit, stage prévu au semestre prochain",
    "general_antecedents": "Migraines depuis la puberté (15 ans), aggravées depuis l entrée en fac. Mère migraineuse également",
    "general_traitements": "Ibuprofène 400mg en crise (2-3x/mois), triptan prescrit mais non utilisé (peur des effets secondaires)",
    "profil_temperament": "Studieuse, perfectionniste scolaire, anxieuse avant les examens, sociable par ailleurs",
    "profil_emotions": "Anxiété de performance, peur de l échec, culpabilité quand migraine empêche de travailler",
    "motif_principal": "Migraines cataméniales 3-4x/mois, aggravées par le stress des examens et la surconsommation de café",
    "motif_objectifs": "Réduire la fréquence et l intensité des migraines, diminuer le café, mieux gérer le stress des partiels",
    "alimentation_habitudes": "Irrégulière : saute le petit-déjeuner, mange sur le pouce à la fac, cuisine simple le soir en colocation",
    "alimentation_hydratation": "Insuffisante",
    "alimentation_ecarts": "Café 5x/jour, peu de fruits et légumes, fast-food 1-2x/semaine, alimentation étudiante classique (pâtes, riz)",
    "digestion_symptomes": "Nausées pendant les crises de migraine. Sinon RAS",
    "digestion_transit": "Régulier",
    "digestion_tolérances": "Pas d intolérance connue hormis le chocolat qui peut déclencher des migraines",
    "sommeil_qualite": "Variable : bon en période normale, très perturbé avant les examens (insomnie d endormissement)",
    "energie_niveau": "Moyen",
    "activite_pratique": "Yoga 1x/semaine avec une amie, marche pour aller à la fac (20 min), pas de sport régulier",
    "activite_posture": "Position penchée sur les livres, cervicalgies fréquentes, bureau non ergonomique",
    "stress_niveau": "Élevé",
    "stress_gestion": "Appels à la mère, yoga ponctuel, quelques soirées avec les amis. Pas de technique formelle.",
    "elimination_peau": "Normale, quelques boutons prémenstruels",
    "elimination_transpiration": "Normale",
    "femme_cycle": "Régulier 30 jours, SPM marqué (migraines J-2 et J1, douleurs pelviennes), flux abondant J1-J2",
    "femme_contraception": "Pilule œstroprogestative (Leeloo) depuis 3 ans",
    "mode_vie_habitudes": "Vie étudiante classique, colocation, sorties le week-end, écrans le soir",
    "mode_vie_environnement": "Colocation à Montpellier, 3 colocataires, environnement parfois bruyant, fac à 20 min à pied",
    "question_ouverte": "Les migraines me font rater des cours et des partiels. J ai peur que ça impacte mes résultats. Le médecin me donne juste des médicaments mais ça ne règle pas le problème de fond. Ma mère est naturopathe et m a conseillé de venir vous voir."
  }$a9$::jsonb, 1, 'manual', NOW()-INTERVAL '2 months', NOW()-INTERVAL '6 weeks')
  ON CONFLICT (consultant_id) DO NOTHING;

  -- Philippe Garnier (c10) — Eczéma / fatigue (artisan boulanger)
  INSERT INTO consultant_anamnesis (consultant_id, naturopath_id, answers, version, source, created_at, updated_at)
  VALUES (v_c10, v_practitioner_id, $a10${
    "general_profession": "Artisan boulanger, propriétaire de sa boulangerie, levé à 2h30 du matin, 6 jours/semaine",
    "general_antecedents": "Eczéma depuis l enfance, aggravé par le métier (contact farine). Terrain atopique. Asthme léger dans l enfance (résolu)",
    "general_traitements": "Dermocorticoïdes en poussée (bétaméthasone crème). Cétirizine 10mg en SOS. Émollients quotidiens",
    "profil_temperament": "Travailleur acharné, passionné par son métier, stoïque face à la douleur, peu de plaintes",
    "profil_emotions": "Frustration vis-à-vis de l eczéma (impact professionnel), fierté de son métier malgré les difficultés",
    "motif_principal": "Eczéma chronique des mains et avant-bras (contact professionnel au gluten), fatigue matinale intense (horaires décalés)",
    "motif_objectifs": "Améliorer l eczéma malgré l exposition professionnelle, retrouver de l énergie, mieux gérer les horaires décalés",
    "alimentation_habitudes": "Petit-déjeuner à 2h30 (café + viennoiserie maison), repas chaud à 11h, dîner à 19h, cuisine simple et traditionnelle",
    "alimentation_hydratation": "Insuffisante",
    "alimentation_ecarts": "Goûte quotidiennement sa production (pain, viennoiseries), bière le soir pour décompresser, peu de légumes",
    "digestion_symptomes": "Ballonnements après les repas contenant du gluten (quotidien professionnel), gaz abondants",
    "digestion_transit": "Variable",
    "digestion_tolérances": "Sensibilité probable au gluten (impossible à éviter professionnellement), produits laitiers ok",
    "sommeil_qualite": "Couché à 20h30, levé à 2h30. 6h de sommeil. Qualité correcte mais insuffisante. Sieste de 20 min après le déjeuner",
    "energie_niveau": "Bas",
    "activite_pratique": "Le travail physique au fournil suffit (debout, port de charges). Marche le dimanche (jour de repos)",
    "activite_posture": "Debout longtemps, port de charges (sacs de farine 25kg), bras tendus devant le four",
    "stress_niveau": "Modéré",
    "stress_gestion": "Peu de temps libre. Marche le dimanche. Regarde le foot. Famille = soutien.",
    "elimination_peau": "Eczéma craquelé des mains et avant-bras, plaques inflammatoires rouges, prurit intense, peau très sèche",
    "elimination_transpiration": "Abondante au fournil (chaleur du four)",
    "homme_urinaire": "RAS",
    "homme_libido": "Diminuée par la fatigue",
    "mode_vie_habitudes": "Rythme décalé (couché 20h30, levé 2h30), peu de vie sociale en semaine, dimanche en famille",
    "mode_vie_environnement": "Maison à Rennes, boulangerie attenante, environnement fariné, bonne aération du fournil",
    "question_ouverte": "Mon eczéma me fait honte devant les clients. J ai les mains rouges et craquelées en permanence. Le dermato me dit de changer de métier mais c est ma vie, ma passion. Il doit bien y avoir un moyen d améliorer ça sans tout arrêter."
  }$a10$::jsonb, 1, 'manual', NOW()-INTERVAL '5 months', NOW()-INTERVAL '4 months')
  ON CONFLICT (consultant_id) DO NOTHING;

  -- Isabelle Fontaine (c11) — Détox / optimisation
  INSERT INTO consultant_anamnesis (consultant_id, naturopath_id, answers, version, source, created_at, updated_at)
  VALUES (v_c11, v_practitioner_id, $a11${
    "general_profession": "Professeure de yoga indépendante, 4-5 cours par jour, formatrice yoga prénatal le week-end",
    "general_antecedents": "RAS. Excellente santé de base. Végétarienne depuis 10 ans (pas végan). Pratiquante de yoga depuis 15 ans",
    "general_traitements": "Aucun médicament. Compléments : spiruline, vitamine B12, huile de lin",
    "profil_temperament": "Calme, intuitive, à l écoute de son corps, disciplinée, en recherche permanente d optimisation",
    "profil_emotions": "Stable, pratique méditative quotidienne, bonne gestion émotionnelle, empathique",
    "motif_principal": "Pas de pathologie. Souhaite une cure détox hépatique printanière et optimiser sa micronutrition",
    "motif_objectifs": "Cure détox hépatique complète, optimisation micronutritionnelle, introduction de super-aliments ciblés",
    "alimentation_habitudes": "Végétarienne bio, cuisine maison quotidienne, aliments complets et non transformés, mange en pleine conscience",
    "alimentation_hydratation": "Bonne",
    "alimentation_ecarts": "Chocolat noir quotidien (85%), vin bio occasionnel en société, fromage de chèvre régulier",
    "digestion_symptomes": "RAS, excellente digestion",
    "digestion_transit": "Régulier",
    "digestion_tolérances": "Sensibilité légère aux lentilles (gaz) si non trempées",
    "sommeil_qualite": "Excellent : endormissement en 10 min, 7h30 de sommeil, réveil naturel sans alarme, rêves lucides occasionnels",
    "energie_niveau": "Élevé",
    "activite_pratique": "Yoga quotidien (Ashtanga le matin, Hatha dans la journée), marche en nature 3x/semaine, nage en été",
    "activite_posture": "Excellente souplesse et posture (yoga quotidien), proprioception très développée",
    "stress_niveau": "Faible",
    "stress_gestion": "Méditation quotidienne 20 min, pranayama, yoga nidra, journaling, marche en forêt",
    "elimination_peau": "Belle peau, teint lumineux, cheveux épais. Légère sécheresse hivernale",
    "elimination_transpiration": "Normale",
    "femme_cycle": "Régulier 28 jours, aucun SPM notable, flux léger et court (3 jours)",
    "femme_contraception": "Méthode naturelle (symptothermie) depuis 5 ans",
    "mode_vie_habitudes": "Vie saine et équilibrée, peu d écrans, coucher tôt, nature +++, communauté yoga",
    "mode_vie_environnement": "Studio avec jardin à Nice, studio de yoga attenant, quartier calme proche de la mer",
    "question_ouverte": "Je me sens bien globalement mais je voudrais passer un cap dans mon bien-être. J ai lu beaucoup de choses sur les cures détox et les super-aliments mais je préfère être accompagnée par une professionnelle pour ne pas faire n importe quoi. Je voudrais aussi vérifier que ma micronutrition est optimale en tant que végétarienne."
  }$a11$::jsonb, 1, 'manual', NOW()-INTERVAL '3 months', NOW()-INTERVAL '2 months')
  ON CONFLICT (consultant_id) DO NOTHING;

  -- Robert Durand (c12) — Prévention cardiovasculaire
  INSERT INTO consultant_anamnesis (consultant_id, naturopath_id, answers, version, source, created_at, updated_at)
  VALUES (v_c12, v_practitioner_id, $a12${
    "general_profession": "Retraité, ancien ingénieur, actif (jardinage, associations)",
    "general_antecedents": "Hypercholestérolémie (LDL 1.85 g/L), HTA limite (140/85), surpoids léger. Antécédents familiaux : père décédé d un infarctus à 65 ans",
    "general_traitements": "Refus des statines pour l instant, amlodipine 5mg pour la tension, aspirine 100mg/jour",
    "profil_temperament": "Méthodique, curieux, ouvert aux approches complémentaires, discipliné",
    "profil_emotions": "Inquiétude liée aux antécédents familiaux, motivation forte pour agir en prévention",
    "motif_principal": "Cholestérol élevé malgré un régime, HTA limite, prévention cardiovasculaire (historique familial)",
    "motif_objectifs": "Baisser le cholestérol naturellement, stabiliser la tension, réduire le risque cardiovasculaire",
    "alimentation_habitudes": "Repas traditionnels français, cuisine maison, quantités raisonnables",
    "alimentation_hydratation": "Bonne",
    "alimentation_ecarts": "Fromage quotidien (2 portions), beurre, pâtisseries le dimanche, vin rouge quotidien (1 verre)",
    "digestion_symptomes": "RAS, bonne digestion",
    "digestion_transit": "Régulier",
    "digestion_tolérances": "RAS",
    "sommeil_qualite": "Bon globalement, endormissement facile, légers réveils pour uriner",
    "energie_niveau": "Moyen",
    "activite_pratique": "Jardinage quotidien, marche 1h/jour, vélo le week-end",
    "activite_posture": "RAS, bonne mobilité pour son âge",
    "stress_niveau": "Faible",
    "stress_gestion": "Jardinage, lecture, vie associative, petit-fils",
    "elimination_peau": "Normale pour l âge",
    "elimination_transpiration": "Normale",
    "homme_urinaire": "Levers nocturnes 2x, prostate surveillée (PSA normal)",
    "homme_libido": "Diminuée avec l âge mais acceptable",
    "mode_vie_habitudes": "Retraite active, bonne hygiène de vie, vie sociale riche",
    "mode_vie_environnement": "Maison avec grand jardin à Dijon, air de bonne qualité, potager",
    "question_ouverte": "Mon père est mort d un infarctus à mon âge. Je veux tout faire pour ne pas suivre le même chemin. Mon cardiologue veut me mettre sous statines mais je préférerais essayer naturellement d abord."
  }$a12$::jsonb, 1, 'manual', NOW()-INTERVAL '4 months', NOW()-INTERVAL '3 months')
  ON CONFLICT (consultant_id) DO NOTHING;


  -- ============================================
  -- Step 3 : Appointments (~42)
  -- ============================================
  INSERT INTO appointments (id, consultant_id, practitioner_id, starts_at, ends_at, status, notes_internal, notes_public, location_type, source, created_at) VALUES
    -- Sophie Martin (c1) : 5 passés + 1 futur
    ('b0000000-0000-4000-a000-000000000001', v_c1, v_practitioner_id, NOW()-INTERVAL '6 months',       NOW()-INTERVAL '6 months'+INTERVAL '90 min', 'completed', 'Première consultation. Bilan complet réalisé. SII confirmé, composante stress majeure.', 'Bilan naturopathique initial réalisé.', 'in_person', 'manual', NOW()-INTERVAL '6 months'-INTERVAL '7 days'),
    ('b0000000-0000-4000-a000-000000000002', v_c1, v_practitioner_id, NOW()-INTERVAL '5 months',       NOW()-INTERVAL '5 months'+INTERVAL '60 min', 'completed', 'Protocole digestif en place. Amélioration transit. Stress toujours présent.', 'Suivi à 1 mois – bon progrès sur la digestion.', 'in_person', 'manual', NOW()-INTERVAL '5 months'-INTERVAL '3 days'),
    ('b0000000-0000-4000-a000-000000000003', v_c1, v_practitioner_id, NOW()-INTERVAL '4 months',       NOW()-INTERVAL '4 months'+INTERVAL '60 min', 'completed', 'Introduction cohérence cardiaque. Ballonnements réduits de 60%.', NULL, 'video', 'manual', NOW()-INTERVAL '4 months'-INTERVAL '3 days'),
    ('b0000000-0000-4000-a000-000000000004', v_c1, v_practitioner_id, NOW()-INTERVAL '2 months',       NOW()-INTERVAL '2 months'+INTERVAL '60 min', 'completed', 'Très belle évolution. Transit normalisé. Sommeil amélioré.', 'Excellente progression sur tous les axes.', 'in_person', 'manual', NOW()-INTERVAL '2 months'-INTERVAL '3 days'),
    ('b0000000-0000-4000-a000-000000000005', v_c1, v_practitioner_id, NOW()-INTERVAL '3 weeks',        NOW()-INTERVAL '3 weeks'+INTERVAL '45 min', 'done', 'Consultation de consolidation. Autonomie acquise sur les techniques respiratoires.', NULL, 'video', 'manual', NOW()-INTERVAL '3 weeks'-INTERVAL '2 days'),
    ('b0000000-0000-4000-a000-000000000006', v_c1, v_practitioner_id, NOW()+INTERVAL '10 days',        NOW()+INTERVAL '10 days'+INTERVAL '60 min', 'confirmed', NULL, NULL, 'in_person', 'manual', NOW()-INTERVAL '5 days'),

    -- Thomas Dubois (c2) : 4 passés + 1 futur
    ('b0000000-0000-4000-a000-000000000007', v_c2, v_practitioner_id, NOW()-INTERVAL '5 months',       NOW()-INTERVAL '5 months'+INTERVAL '90 min', 'completed', 'Bilan sportif complet. Analyse alimentation pré/post effort. Déficits magnésium et fer probables.', 'Bilan initial – axe nutrition sportive et récupération.', 'in_person', 'manual', NOW()-INTERVAL '5 months'-INTERVAL '5 days'),
    ('b0000000-0000-4000-a000-000000000008', v_c2, v_practitioner_id, NOW()-INTERVAL '4 months',       NOW()-INTERVAL '4 months'+INTERVAL '60 min', 'completed', 'Protocole minéraux en place. Électrolytes ajustés. Meilleure récupération.', NULL, 'video', 'manual', NOW()-INTERVAL '4 months'-INTERVAL '3 days'),
    ('b0000000-0000-4000-a000-000000000009', v_c2, v_practitioner_id, NOW()-INTERVAL '2 months',       NOW()-INTERVAL '2 months'+INTERVAL '60 min', 'completed', 'Plan nutrition course ajusté pour UTMB. Ratio glucides/protéines optimisé.', 'Suivi nutrition trail – plan de course personnalisé.', 'in_person', 'manual', NOW()-INTERVAL '2 months'-INTERVAL '3 days'),
    ('b0000000-0000-4000-a000-00000000000a', v_c2, v_practitioner_id, NOW()-INTERVAL '3 weeks',        NOW()-INTERVAL '3 weeks'+INTERVAL '45 min', 'completed', 'Dernière consultation avant course. Protocole J-7 validé.', NULL, 'video', 'manual', NOW()-INTERVAL '3 weeks'-INTERVAL '2 days'),
    ('b0000000-0000-4000-a000-00000000000b', v_c2, v_practitioner_id, NOW()+INTERVAL '3 weeks',        NOW()+INTERVAL '3 weeks'+INTERVAL '60 min', 'scheduled', NULL, NULL, 'in_person', 'manual', NOW()-INTERVAL '2 days'),

    -- Émilie Laurent (c3) : 3 passés + 1 futur
    ('b0000000-0000-4000-a000-00000000000c', v_c3, v_practitioner_id, NOW()-INTERVAL '4 months',       NOW()-INTERVAL '4 months'+INTERVAL '90 min', 'completed', 'Post-partum 6 mois. Fatigue intense, carence fer et vit D. Allaitement en cours.', 'Bilan post-partum complet.', 'in_person', 'manual', NOW()-INTERVAL '4 months'-INTERVAL '5 days'),
    ('b0000000-0000-4000-a000-00000000000d', v_c3, v_practitioner_id, NOW()-INTERVAL '2 months',       NOW()-INTERVAL '2 months'+INTERVAL '60 min', 'completed', 'Fer en hausse. Sommeil fragmenté persistant (bébé). Mise en place routine du soir.', NULL, 'video', 'manual', NOW()-INTERVAL '2 months'-INTERVAL '3 days'),
    ('b0000000-0000-4000-a000-00000000000e', v_c3, v_practitioner_id, NOW()-INTERVAL '2 weeks',        NOW()-INTERVAL '2 weeks'+INTERVAL '60 min', 'completed', 'Regain d énergie notable. Sevrage allaitement en cours, ajustement alimentation.', 'Bonne évolution, accompagnement sevrage.', 'in_person', 'manual', NOW()-INTERVAL '2 weeks'-INTERVAL '3 days'),
    ('b0000000-0000-4000-a000-00000000000f', v_c3, v_practitioner_id, NOW()+INTERVAL '2 weeks',        NOW()+INTERVAL '2 weeks'+INTERVAL '60 min', 'confirmed', NULL, NULL, 'video', 'manual', NOW()-INTERVAL '3 days')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO appointments (id, consultant_id, practitioner_id, starts_at, ends_at, status, notes_internal, notes_public, location_type, source, created_at) VALUES
    -- Jean-Pierre Moreau (c4) : 4 passés + 1 futur
    ('b0000000-0000-4000-a000-000000000010', v_c4, v_practitioner_id, NOW()-INTERVAL '7 months',       NOW()-INTERVAL '7 months'+INTERVAL '90 min', 'completed', 'Bilan complet. Prostate, sommeil, prévention. Hygiène de vie correcte, ajustements ciblés.', 'Bilan de santé globale réalisé.', 'in_person', 'manual', NOW()-INTERVAL '7 months'-INTERVAL '5 days'),
    ('b0000000-0000-4000-a000-000000000011', v_c4, v_practitioner_id, NOW()-INTERVAL '5 months',       NOW()-INTERVAL '5 months'+INTERVAL '60 min', 'completed', 'Protocole prostate (saw palmetto + zinc) en place. Levers nocturnes réduits à 1x.', NULL, 'in_person', 'manual', NOW()-INTERVAL '5 months'-INTERVAL '3 days'),
    ('b0000000-0000-4000-a000-000000000012', v_c4, v_practitioner_id, NOW()-INTERVAL '3 months',       NOW()-INTERVAL '3 months'+INTERVAL '60 min', 'completed', 'Bonne adhésion au protocole. Sommeil amélioré significativement.', 'Suivi positif – qualité de sommeil en hausse.', 'in_person', 'manual', NOW()-INTERVAL '3 months'-INTERVAL '3 days'),
    ('b0000000-0000-4000-a000-000000000013', v_c4, v_practitioner_id, NOW()-INTERVAL '5 weeks',        NOW()-INTERVAL '5 weeks'+INTERVAL '45 min', 'done', 'Consolidation. Phase d entretien. RDV trimestriel à venir.', NULL, 'video', 'manual', NOW()-INTERVAL '5 weeks'-INTERVAL '2 days'),
    ('b0000000-0000-4000-a000-000000000014', v_c4, v_practitioner_id, NOW()+INTERVAL '5 weeks',        NOW()+INTERVAL '5 weeks'+INTERVAL '60 min', 'scheduled', NULL, NULL, 'in_person', 'manual', NOW()-INTERVAL '1 day'),

    -- Nathalie Petit (c5) : 4 passés + 1 futur
    ('b0000000-0000-4000-a000-000000000015', v_c5, v_practitioner_id, NOW()-INTERVAL '6 months',       NOW()-INTERVAL '6 months'+INTERVAL '90 min', 'completed', 'Bilan ménopause. Bouffées de chaleur 8-10x/jour, sueurs nocturnes, irritabilité. Pas de THS souhaité.', 'Bilan ménopause – approche naturelle sans THS.', 'in_person', 'manual', NOW()-INTERVAL '6 months'-INTERVAL '5 days'),
    ('b0000000-0000-4000-a000-000000000016', v_c5, v_practitioner_id, NOW()-INTERVAL '5 months',       NOW()-INTERVAL '5 months'+INTERVAL '60 min', 'completed', 'Phytoestrogènes en place. Bouffées réduites à 4-5x/jour. Sommeil encore perturbé.', NULL, 'video', 'manual', NOW()-INTERVAL '5 months'-INTERVAL '3 days'),
    ('b0000000-0000-4000-a000-000000000017', v_c5, v_practitioner_id, NOW()-INTERVAL '3 months',       NOW()-INTERVAL '3 months'+INTERVAL '60 min', 'completed', 'Ajout sauge et HE. Bouffées 2-3x/jour. Sommeil en amélioration.', 'Belle amélioration des symptômes vasomoteurs.', 'in_person', 'manual', NOW()-INTERVAL '3 months'-INTERVAL '3 days'),
    ('b0000000-0000-4000-a000-000000000018', v_c5, v_practitioner_id, NOW()-INTERVAL '4 weeks',        NOW()-INTERVAL '4 weeks'+INTERVAL '60 min', 'completed', 'Quasi-disparition des bouffées de chaleur. Moral au beau fixe.', NULL, 'in_person', 'manual', NOW()-INTERVAL '4 weeks'-INTERVAL '3 days'),
    ('b0000000-0000-4000-a000-000000000019', v_c5, v_practitioner_id, NOW()+INTERVAL '4 weeks',        NOW()+INTERVAL '4 weeks'+INTERVAL '60 min', 'confirmed', NULL, NULL, 'in_person', 'manual', NOW()-INTERVAL '2 days'),

    -- Lucas Bernard (c6) : 2 passés + 1 annulé + 1 futur
    ('b0000000-0000-4000-a000-00000000001a', v_c6, v_practitioner_id, NOW()-INTERVAL '3 months',       NOW()-INTERVAL '3 months'+INTERVAL '90 min', 'completed', 'Ado de 17 ans. Acné inflammatoire modérée à sévère. Alimentation très industrielle.', 'Premier bilan – acné et alimentation.', 'in_person', 'manual', NOW()-INTERVAL '3 months'-INTERVAL '5 days'),
    ('b0000000-0000-4000-a000-00000000001b', v_c6, v_practitioner_id, NOW()-INTERVAL '6 weeks',        NOW()-INTERVAL '6 weeks'+INTERVAL '60 min', 'completed', 'Transition alimentaire amorcée. Acné stable. Zinc en place.', NULL, 'video', 'manual', NOW()-INTERVAL '6 weeks'-INTERVAL '3 days'),
    ('b0000000-0000-4000-a000-00000000001c', v_c6, v_practitioner_id, NOW()-INTERVAL '2 weeks',        NOW()-INTERVAL '2 weeks'+INTERVAL '60 min', 'cancelled', NULL, NULL, 'video', 'manual', NOW()-INTERVAL '2 weeks'-INTERVAL '5 days'),
    ('b0000000-0000-4000-a000-00000000001d', v_c6, v_practitioner_id, NOW()+INTERVAL '1 week',         NOW()+INTERVAL '1 week'+INTERVAL '60 min', 'scheduled', NULL, NULL, 'in_person', 'manual', NOW()-INTERVAL '4 days')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO appointments (id, consultant_id, practitioner_id, starts_at, ends_at, status, notes_internal, notes_public, location_type, source, created_at) VALUES
    -- Céline Roux (c7) : 5 passés + 1 futur
    ('b0000000-0000-4000-a000-00000000001e', v_c7, v_practitioner_id, NOW()-INTERVAL '8 months',       NOW()-INTERVAL '8 months'+INTERVAL '90 min', 'completed', 'Fibromyalgie diagnostiquée depuis 3 ans. Douleurs diffuses, fatigue chronique, sommeil non réparateur. Traitements classiques insuffisants.', 'Bilan fibromyalgie – approche globale intégrative.', 'in_person', 'manual', NOW()-INTERVAL '8 months'-INTERVAL '5 days'),
    ('b0000000-0000-4000-a000-00000000001f', v_c7, v_practitioner_id, NOW()-INTERVAL '6 months',       NOW()-INTERVAL '6 months'+INTERVAL '60 min', 'completed', 'Anti-inflammatoires naturels en place. Douleurs légèrement atténuées. Travail sur le sommeil.', NULL, 'in_person', 'manual', NOW()-INTERVAL '6 months'-INTERVAL '3 days'),
    ('b0000000-0000-4000-a000-000000000020', v_c7, v_practitioner_id, NOW()-INTERVAL '4 months',       NOW()-INTERVAL '4 months'+INTERVAL '60 min', 'completed', 'Magnésium + bains chauds aux huiles. Sommeil en amélioration. Moins de points douloureux.', 'Amélioration progressive – sommeil et douleurs.', 'video', 'manual', NOW()-INTERVAL '4 months'-INTERVAL '3 days'),
    ('b0000000-0000-4000-a000-000000000021', v_c7, v_practitioner_id, NOW()-INTERVAL '2 months',       NOW()-INTERVAL '2 months'+INTERVAL '60 min', 'completed', 'Ajout protocole yoga doux + respiration. EVA douleur passée de 7 à 4.', NULL, 'in_person', 'manual', NOW()-INTERVAL '2 months'-INTERVAL '3 days'),
    ('b0000000-0000-4000-a000-000000000022', v_c7, v_practitioner_id, NOW()-INTERVAL '3 weeks',        NOW()-INTERVAL '3 weeks'+INTERVAL '60 min', 'completed', 'Stabilisation. Poussées moins fréquentes. Bonne adhésion au programme.', 'Bon maintien – poussées moins intenses.', 'in_person', 'manual', NOW()-INTERVAL '3 weeks'-INTERVAL '2 days'),
    ('b0000000-0000-4000-a000-000000000023', v_c7, v_practitioner_id, NOW()+INTERVAL '3 weeks',        NOW()+INTERVAL '3 weeks'+INTERVAL '60 min', 'confirmed', NULL, NULL, 'in_person', 'manual', NOW()-INTERVAL '3 days'),

    -- Marc Lefebvre (c8) : 3 passés + 1 no_show + 1 futur
    ('b0000000-0000-4000-a000-000000000024', v_c8, v_practitioner_id, NOW()-INTERVAL '4 months',       NOW()-INTERVAL '4 months'+INTERVAL '90 min', 'completed', 'RGO chronique, surpoids (IMC 28.5). Alimentation déséquilibrée (déjeuners business). IPP depuis 2 ans.', 'Bilan digestif et pondéral.', 'in_person', 'manual', NOW()-INTERVAL '4 months'-INTERVAL '5 days'),
    ('b0000000-0000-4000-a000-000000000025', v_c8, v_practitioner_id, NOW()-INTERVAL '3 months',       NOW()-INTERVAL '3 months'+INTERVAL '60 min', 'completed', 'Début sevrage IPP avec protocole naturel. Changements alimentaires amorcés.', NULL, 'video', 'manual', NOW()-INTERVAL '3 months'-INTERVAL '3 days'),
    ('b0000000-0000-4000-a000-000000000026', v_c8, v_practitioner_id, NOW()-INTERVAL '6 weeks',        NOW()-INTERVAL '6 weeks'+INTERVAL '60 min', 'completed', 'Perte de 3kg. RGO atténué. Rechute lors d un déplacement professionnel.', 'Progression malgré quelques écarts professionnels.', 'in_person', 'manual', NOW()-INTERVAL '6 weeks'-INTERVAL '3 days'),
    ('b0000000-0000-4000-a000-000000000027', v_c8, v_practitioner_id, NOW()-INTERVAL '2 weeks',        NOW()-INTERVAL '2 weeks'+INTERVAL '60 min', 'no_show', NULL, NULL, 'video', 'manual', NOW()-INTERVAL '2 weeks'-INTERVAL '5 days'),
    ('b0000000-0000-4000-a000-000000000028', v_c8, v_practitioner_id, NOW()+INTERVAL '1 week',         NOW()+INTERVAL '1 week'+INTERVAL '60 min', 'scheduled', NULL, NULL, 'in_person', 'manual', NOW()-INTERVAL '3 days')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO appointments (id, consultant_id, practitioner_id, starts_at, ends_at, status, notes_internal, notes_public, location_type, source, created_at) VALUES
    -- Amina Benali (c9) : 2 passés + 1 futur
    ('b0000000-0000-4000-a000-000000000029', v_c9, v_practitioner_id, NOW()-INTERVAL '2 months',       NOW()-INTERVAL '2 months'+INTERVAL '90 min', 'completed', 'Étudiante 22 ans. Migraines cataméniales + stress examens. Alimentation irrégulière (saute le petit-déjeuner). Consomme beaucoup de café.', 'Bilan initial – migraines et stress étudiant.', 'video', 'manual', NOW()-INTERVAL '2 months'-INTERVAL '5 days'),
    ('b0000000-0000-4000-a000-00000000002a', v_c9, v_practitioner_id, NOW()-INTERVAL '3 weeks',        NOW()-INTERVAL '3 weeks'+INTERVAL '60 min', 'completed', 'Réduction caféine amorcée. 1 migraine au lieu de 3 ce mois. Magnésium + grande camomille en place.', 'Bonne évolution sur les migraines.', 'video', 'manual', NOW()-INTERVAL '3 weeks'-INTERVAL '3 days'),
    ('b0000000-0000-4000-a000-00000000002b', v_c9, v_practitioner_id, NOW()+INTERVAL '2 weeks',        NOW()+INTERVAL '2 weeks'+INTERVAL '60 min', 'confirmed', NULL, NULL, 'video', 'manual', NOW()-INTERVAL '5 days'),

    -- Philippe Garnier (c10) : 3 passés + 1 futur
    ('b0000000-0000-4000-a000-00000000002c', v_c10, v_practitioner_id, NOW()-INTERVAL '5 months',      NOW()-INTERVAL '5 months'+INTERVAL '90 min', 'completed', 'Artisan boulanger. Eczéma chronique mains et avant-bras. Fatigue matinale (levé 3h). Alimentation riche en gluten (professionnel).', 'Bilan eczéma et fatigue – contexte professionnel.', 'in_person', 'manual', NOW()-INTERVAL '5 months'-INTERVAL '5 days'),
    ('b0000000-0000-4000-a000-00000000002d', v_c10, v_practitioner_id, NOW()-INTERVAL '3 months',      NOW()-INTERVAL '3 months'+INTERVAL '60 min', 'completed', 'Éviction partielle gluten hors travail. Probiotiques en place. Eczéma stabilisé.', NULL, 'in_person', 'manual', NOW()-INTERVAL '3 months'-INTERVAL '3 days'),
    ('b0000000-0000-4000-a000-00000000002e', v_c10, v_practitioner_id, NOW()-INTERVAL '5 weeks',       NOW()-INTERVAL '5 weeks'+INTERVAL '60 min', 'completed', 'Eczéma en nette amélioration sauf poussées hivernales. Énergie meilleure grâce aux siestes.', 'Bonne progression sur l eczéma.', 'video', 'manual', NOW()-INTERVAL '5 weeks'-INTERVAL '3 days'),
    ('b0000000-0000-4000-a000-00000000002f', v_c10, v_practitioner_id, NOW()+INTERVAL '4 weeks',       NOW()+INTERVAL '4 weeks'+INTERVAL '60 min', 'scheduled', NULL, NULL, 'in_person', 'manual', NOW()-INTERVAL '2 days'),

    -- Isabelle Fontaine (c11) : 3 passés + 1 futur
    ('b0000000-0000-4000-a000-000000000030', v_c11, v_practitioner_id, NOW()-INTERVAL '3 months',      NOW()-INTERVAL '3 months'+INTERVAL '90 min', 'completed', 'Prof de yoga, très au fait de la naturopathie. Souhaite une détox printanière et optimiser son alimentation. Pas de pathologie majeure.', 'Bilan optimisation – détox et vitalité.', 'in_person', 'manual', NOW()-INTERVAL '3 months'-INTERVAL '5 days'),
    ('b0000000-0000-4000-a000-000000000031', v_c11, v_practitioner_id, NOW()-INTERVAL '6 weeks',       NOW()-INTERVAL '6 weeks'+INTERVAL '60 min', 'completed', 'Cure détox hépatique terminée. Énergie en hausse. Peau plus lumineuse.', NULL, 'video', 'manual', NOW()-INTERVAL '6 weeks'-INTERVAL '3 days'),
    ('b0000000-0000-4000-a000-000000000032', v_c11, v_practitioner_id, NOW()-INTERVAL '2 weeks',       NOW()-INTERVAL '2 weeks'+INTERVAL '45 min', 'completed', 'Phase de consolidation. Introduction des super-aliments. Très motivée et autonome.', 'Suivi consolidation – consultante très investie.', 'video', 'manual', NOW()-INTERVAL '2 weeks'-INTERVAL '2 days'),
    ('b0000000-0000-4000-a000-000000000033', v_c11, v_practitioner_id, NOW()+INTERVAL '6 weeks',       NOW()+INTERVAL '6 weeks'+INTERVAL '60 min', 'confirmed', NULL, NULL, 'in_person', 'manual', NOW()-INTERVAL '1 day'),

    -- Robert Durand (c12) : 2 passés + 1 futur
    ('b0000000-0000-4000-a000-000000000034', v_c12, v_practitioner_id, NOW()-INTERVAL '4 months',      NOW()-INTERVAL '4 months'+INTERVAL '90 min', 'completed', 'Prévention cardiovasculaire. Cholestérol LDL 1.85, HTA limite. Refus statines. Alimentation française traditionnelle avec fromage quotidien.', 'Bilan cardiovasculaire – approche préventive naturelle.', 'in_person', 'manual', NOW()-INTERVAL '4 months'-INTERVAL '5 days'),
    ('b0000000-0000-4000-a000-000000000035', v_c12, v_practitioner_id, NOW()-INTERVAL '2 months',      NOW()-INTERVAL '2 months'+INTERVAL '60 min', 'completed', 'Cholestérol en baisse (LDL 1.65). Oméga 3 + ail noir en place. TA 135/82. Bonne adhésion.', 'Résultats encourageants sur le bilan lipidique.', 'in_person', 'manual', NOW()-INTERVAL '2 months'-INTERVAL '3 days'),
    ('b0000000-0000-4000-a000-000000000036', v_c12, v_practitioner_id, NOW()+INTERVAL '4 weeks',       NOW()+INTERVAL '4 weeks'+INTERVAL '60 min', 'scheduled', NULL, NULL, 'in_person', 'manual', NOW()-INTERVAL '3 days')
  ON CONFLICT (id) DO NOTHING;

  -- ============================================
  -- Step 4 : Consultations (~30)
  -- ============================================
  INSERT INTO consultations (id, consultant_id, date, notes, created_at) VALUES
    -- Sophie (c1)
    ('c0000000-0000-4000-a000-000000000001', v_c1, NOW()-INTERVAL '6 months',  'Première consultation naturopathique. Bilan vitalité réalisé. Morphotypologie : type nerveux. Iridologie : surcharges coliques, stress surrénalien. Plan d hygiène vitale établi sur 3 axes : digestion, stress, sommeil.', NOW()-INTERVAL '6 months'),
    ('c0000000-0000-4000-a000-000000000002', v_c1, NOW()-INTERVAL '5 months',  'Suivi M+1. Transit amélioré (Bristol 3-4 vs 5-6 avant). Ballonnements réduits. Mise en place cohérence cardiaque 3x/jour. Ajustement des probiotiques.', NOW()-INTERVAL '5 months'),
    ('c0000000-0000-4000-a000-000000000003', v_c1, NOW()-INTERVAL '4 months',  'Suivi M+2 (visio). Ballonnements réduits de 60%. Sommeil amélioré (endormissement 20min vs 45min). Introduction de la respiration abdominale pré-repas.', NOW()-INTERVAL '4 months'),
    ('c0000000-0000-4000-a000-000000000004', v_c1, NOW()-INTERVAL '2 months',  'Suivi M+4. Excellente évolution sur tous les axes. Transit normalisé. Stress mieux géré. Proposition de phase de consolidation.', NOW()-INTERVAL '2 months'),
    ('c0000000-0000-4000-a000-000000000005', v_c1, NOW()-INTERVAL '3 weeks',   'Consultation de consolidation. Autonomie acquise. Passage en suivi trimestriel. Techniques respiratoires bien intégrées dans le quotidien.', NOW()-INTERVAL '3 weeks'),
    -- Thomas (c2)
    ('c0000000-0000-4000-a000-000000000006', v_c2, NOW()-INTERVAL '5 months',  'Bilan sportif complet. Analyse des apports nutritionnels sur 7 jours. Déficits identifiés : magnésium, fer, oméga-3. Ratios macros à rééquilibrer pour l endurance.', NOW()-INTERVAL '5 months'),
    ('c0000000-0000-4000-a000-000000000007', v_c2, NOW()-INTERVAL '4 months',  'Suivi M+1. Complémentation minérale en place. Meilleure récupération post-entraînement. Ajustement fenêtre métabolique post-effort.', NOW()-INTERVAL '4 months'),
    ('c0000000-0000-4000-a000-000000000008', v_c2, NOW()-INTERVAL '2 months',  'Préparation nutrition UTMB. Plan de ravitaillement personnalisé. Stratégie hydratation/électrolytes. Test des produits en entraînement.', NOW()-INTERVAL '2 months'),
    ('c0000000-0000-4000-a000-000000000009', v_c2, NOW()-INTERVAL '3 weeks',   'Dernière consultation pré-course. Protocole J-7 validé : charge glucidique, hydratation, repos. Stratégie de course nutrition finalisée.', NOW()-INTERVAL '3 weeks'),
    -- Émilie (c3)
    ('c0000000-0000-4000-a000-00000000000a', v_c3, NOW()-INTERVAL '4 months',  'Bilan post-partum 6 mois. Allaitement exclusif. Carence fer confirmée (ferritine 12). Vit D basse (18 ng/mL). Plan de reminéralisation compatible allaitement.', NOW()-INTERVAL '4 months'),
    ('c0000000-0000-4000-a000-00000000000b', v_c3, NOW()-INTERVAL '2 months',  'Suivi M+2. Fer en hausse (ferritine 25). Énergie légèrement meilleure. Sommeil toujours fragmenté (bébé). Mise en place routine du soir apaisante.', NOW()-INTERVAL '2 months'),
    ('c0000000-0000-4000-a000-00000000000c', v_c3, NOW()-INTERVAL '2 weeks',   'Suivi M+4. Sevrage allaitement en cours. Ajustement alimentation pour transition. Regain d énergie notable. Humeur stabilisée.', NOW()-INTERVAL '2 weeks'),
    -- Jean-Pierre (c4)
    ('c0000000-0000-4000-a000-00000000000d', v_c4, NOW()-INTERVAL '7 months',  'Bilan santé globale. 68 ans, actif. Prostate surveillée (PSA normal mais HBP débutante). Sommeil fragmenté. Plan de prévention cardiovasculaire et prostatique.', NOW()-INTERVAL '7 months'),
    ('c0000000-0000-4000-a000-00000000000e', v_c4, NOW()-INTERVAL '5 months',  'Suivi M+2. Saw palmetto + zinc en place. Levers nocturnes réduits de 3 à 1. Bon confort urinaire. Sommeil global en amélioration.', NOW()-INTERVAL '5 months'),
    ('c0000000-0000-4000-a000-00000000000f', v_c4, NOW()-INTERVAL '3 months',  'Suivi M+4. Bonne adhésion au protocole prostatique. Qualité de sommeil en hausse (dort 7h vs 5h30 avant). Activité jardinage maintenue.', NOW()-INTERVAL '3 months'),
    -- Nathalie (c5)
    ('c0000000-0000-4000-a000-000000000010', v_c5, NOW()-INTERVAL '6 months',  'Bilan ménopause. 52 ans. Bouffées de chaleur 8-10x/jour dont nocturnes. Irritabilité, sécheresse muqueuses. Pas de THS souhaité. Phytoestrogènes à mettre en place.', NOW()-INTERVAL '6 months'),
    ('c0000000-0000-4000-a000-000000000011', v_c5, NOW()-INTERVAL '5 months',  'Suivi M+1. Isoflavones de trèfle rouge en place. Bouffées réduites à 4-5x/jour. Sommeil encore perturbé par sueurs. Ajout sauge en infusion le soir.', NOW()-INTERVAL '5 months'),
    ('c0000000-0000-4000-a000-000000000012', v_c5, NOW()-INTERVAL '3 months',  'Suivi M+3. Bouffées 2-3x/jour seulement. HE sauge sclarée ajoutée. Hydratation muqueuses améliorée avec huile d onagre.', NOW()-INTERVAL '3 months'),
    ('c0000000-0000-4000-a000-000000000013', v_c5, NOW()-INTERVAL '4 weeks',   'Suivi M+5. Quasi-disparition des bouffées. Moral excellent. Libido en légère amélioration. Phase de consolidation.', NOW()-INTERVAL '4 weeks')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO consultations (id, consultant_id, date, notes, created_at) VALUES
    -- Lucas (c6)
    ('c0000000-0000-4000-a000-000000000014', v_c6, NOW()-INTERVAL '3 months',  'Première consultation. Ado 17 ans accompagné de sa mère. Acné inflammatoire modérée. Alimentation très transformée : sodas, fast-food 3x/sem. Protocole alimentaire progressif + zinc.', NOW()-INTERVAL '3 months'),
    ('c0000000-0000-4000-a000-000000000015', v_c6, NOW()-INTERVAL '6 weeks',   'Suivi M+1.5. Transition alimentaire amorcée (réduction sodas, ajout légumes). Acné stable mais moins inflammatoire. Zinc bien toléré. Patience requise.', NOW()-INTERVAL '6 weeks'),
    -- Céline (c7)
    ('c0000000-0000-4000-a000-000000000016', v_c7, NOW()-INTERVAL '8 months',  'Bilan fibromyalgie. Douleurs diffuses EVA 7/10, 14 points sensibles. Fatigue chronique, sommeil non réparateur. Sous Lyrica + tramadol. Approche globale : inflammation, sommeil, douleur.', NOW()-INTERVAL '8 months'),
    ('c0000000-0000-4000-a000-000000000017', v_c7, NOW()-INTERVAL '6 months',  'Suivi M+2. Curcuma + oméga 3 anti-inflammatoires en place. Douleurs légèrement atténuées. Bains chauds aux HE relaxantes instaurés. Sommeil en cours d amélioration.', NOW()-INTERVAL '6 months'),
    ('c0000000-0000-4000-a000-000000000018', v_c7, NOW()-INTERVAL '4 months',  'Suivi M+4. Magnésium bisglycinate ajouté. Bains 3x/sem. Sommeil amélioré (6h vs 4h30). EVA douleur 5/10. Moins de points sensibles.', NOW()-INTERVAL '4 months'),
    ('c0000000-0000-4000-a000-000000000019', v_c7, NOW()-INTERVAL '2 months',  'Suivi M+6. Introduction yoga doux adapté fibromyalgie. Respiration en carré. EVA 4/10. Qualité de vie en nette amélioration.', NOW()-INTERVAL '2 months'),
    ('c0000000-0000-4000-a000-00000000001a', v_c7, NOW()-INTERVAL '3 weeks',   'Suivi M+7. Stabilisation. Poussées moins fréquentes et moins intenses. Réduction progressive tramadol en accord avec le médecin.', NOW()-INTERVAL '3 weeks'),
    -- Marc (c8)
    ('c0000000-0000-4000-a000-00000000001b', v_c8, NOW()-INTERVAL '4 months',  'Bilan digestif et pondéral. Commercial, nombreux déjeuners d affaires. RGO sous IPP depuis 2 ans. IMC 28.5. Objectif : sevrage IPP et perte de poids.', NOW()-INTERVAL '4 months'),
    ('c0000000-0000-4000-a000-00000000001c', v_c8, NOW()-INTERVAL '3 months',  'Suivi M+1. Début sevrage progressif IPP. Mélatonine + lithothamne en relais. Changements alimentaires amorcés (portions, mastication).', NOW()-INTERVAL '3 months'),
    ('c0000000-0000-4000-a000-00000000001d', v_c8, NOW()-INTERVAL '6 weeks',   'Suivi M+2.5. Perte de 3kg. RGO atténué hors excès. Rechute lors d un séminaire professionnel. Stratégies de gestion des repas d affaires travaillées.', NOW()-INTERVAL '6 weeks'),
    -- Amina (c9)
    ('c0000000-0000-4000-a000-00000000001e', v_c9, NOW()-INTERVAL '2 months',  'Bilan initial étudiante. Migraines cataméniales 3-4x/mois, stress examens, alimentation irrégulière, abus de caféine (5 cafés/jour). Plan : réduction caféine, magnésium, grande camomille.', NOW()-INTERVAL '2 months'),
    ('c0000000-0000-4000-a000-00000000001f', v_c9, NOW()-INTERVAL '3 weeks',   'Suivi M+1. Caféine réduite à 2 cafés/jour. 1 seule migraine ce mois. Magnésium bien toléré. Grande camomille mise en place en prévention.', NOW()-INTERVAL '3 weeks'),
    -- Philippe (c10)
    ('c0000000-0000-4000-a000-000000000020', v_c10, NOW()-INTERVAL '5 months', 'Bilan eczéma et fatigue. Artisan boulanger (exposition gluten). Eczéma mains/avant-bras chronique. Levé à 3h, fatigue matinale. Plan : perméabilité intestinale, probiotiques, soins cutanés.', NOW()-INTERVAL '5 months'),
    ('c0000000-0000-4000-a000-000000000021', v_c10, NOW()-INTERVAL '3 months', 'Suivi M+2. Éviction gluten hors travail. Probiotiques Lactobacillus rhamnosus en place. Eczéma stabilisé, moins de plaques inflammatoires.', NOW()-INTERVAL '3 months'),
    ('c0000000-0000-4000-a000-000000000022', v_c10, NOW()-INTERVAL '5 weeks',  'Suivi M+4. Eczéma en nette amélioration (poussées hivernales uniquement). Énergie meilleure grâce aux micro-siestes. L-glutamine ajoutée.', NOW()-INTERVAL '5 weeks'),
    -- Isabelle (c11)
    ('c0000000-0000-4000-a000-000000000023', v_c11, NOW()-INTERVAL '3 months', 'Bilan optimisation. Prof yoga, excellente hygiène de vie de base. Souhaite cure détox hépatique et optimisation micronutritionnelle. Plan personnalisé haut de gamme.', NOW()-INTERVAL '3 months'),
    ('c0000000-0000-4000-a000-000000000024', v_c11, NOW()-INTERVAL '6 weeks',  'Suivi M+1.5. Cure détox hépatique (radis noir, artichaut, desmodium) terminée avec succès. Énergie en hausse. Peau plus lumineuse. Phase de consolidation.', NOW()-INTERVAL '6 weeks'),
    ('c0000000-0000-4000-a000-000000000025', v_c11, NOW()-INTERVAL '2 weeks',  'Suivi M+2.5. Introduction super-aliments ciblés (spiruline, maca). Très investie et autonome. Suivi trimestriel suffisant.', NOW()-INTERVAL '2 weeks'),
    -- Robert (c12)
    ('c0000000-0000-4000-a000-000000000026', v_c12, NOW()-INTERVAL '4 months', 'Bilan cardiovasculaire. 70 ans. Cholestérol LDL 1.85g/L, HTA limite 140/85. ATCD familiaux. Sous amlodipine + aspirine. Refus statines. Plan : nutrition cardioprotectrice, complémentation ciblée.', NOW()-INTERVAL '4 months'),
    ('c0000000-0000-4000-a000-000000000027', v_c12, NOW()-INTERVAL '2 months', 'Suivi M+2. Oméga 3 + ail noir + coQ10 en place. LDL en baisse (1.65). TA 135/82. Fromage réduit à 1 portion/jour. Bonne adhésion.', NOW()-INTERVAL '2 months')
  ON CONFLICT (id) DO NOTHING;

  -- ============================================
  -- Step 5 : Consultant Plans (10 plans with full conseillancier JSONB)
  -- ============================================

  -- Sophie Martin (c1) – SII & stress
  INSERT INTO consultant_plans (id, consultant_id, practitioner_id, version, status, content, shared_at, ai_generated, created_at)
  VALUES ('d0000000-0000-4000-a000-000000000001', v_c1, v_practitioner_id, 1, 'shared', $cp1${
    "message_accueil": "Bonjour Sophie, voici votre programme personnalisé pour retrouver un confort digestif et mieux gérer votre stress au quotidien.",
    "duree_programme": "3 mois renouvelable",
    "date_debut_conseille": "Dès réception de ce plan",
    "objectifs_principaux": "1. Restaurer le confort digestif (réduire ballonnements et troubles du transit)\n2. Améliorer la gestion du stress et la qualité du sommeil\n3. Renforcer la barrière intestinale",
    "actions_prioritaires_semaine_1": "- Commencer les probiotiques le matin à jeun\n- Instaurer 3 séances de cohérence cardiaque par jour (6h, 12h, 18h)\n- Supprimer le café après 14h\n- Mastiquer chaque bouchée 20 fois",
    "principes_alimentaires": "Alimentation anti-inflammatoire et respectueuse du microbiote. Éviter les FODMAP les plus irritants pendant 4 semaines puis réintroduction progressive.",
    "aliments_a_privilegier": "Légumes cuits vapeur, poissons gras (sardines, maquereau), riz basmati, patate douce, bouillon d os, kéfir, légumes lactofermentés, curcuma frais",
    "aliments_a_limiter": "Gluten (blé, seigle, orge), produits laitiers de vache, sucres raffinés, crudités en excès, légumineuses (phase 1), café au-delà de 1 tasse",
    "rythme_repas": "3 repas par jour à heures régulières + 1 collation si besoin vers 16h. Dîner léger avant 20h.",
    "objectif_hydratation": "1.5L minimum par jour",
    "type_eau": "Eau faiblement minéralisée (Mont Roucous, Volvic) ou eau filtrée",
    "moments_hydratation": "Au réveil : 1 grand verre d eau tiède citronnée. Boire entre les repas, jamais pendant.",
    "phytotherapie_plantes": "- Mélisse (Melissa officinalis) : antispasmodique digestif et anxiolytique\n- Desmodium (Desmodium adscendens) : hépatoprotecteur\n- Passiflore (Passiflora incarnata) : anxiolytique, favorise le sommeil",
    "phytotherapie_posologie": "Mélisse : 1 gélule 300mg 3x/jour avant les repas. Passiflore : 2 gélules le soir 30min avant le coucher.",
    "phytotherapie_precautions": "Ne pas associer la passiflore avec des benzodiazépines. Mélisse déconseillée en cas d hypothyroïdie.",
    "complements": "- Probiotiques Lactobacillus rhamnosus GG : 10 milliards UFC/jour le matin à jeun\n- L-Glutamine : 5g/jour dans un verre d eau le matin\n- Magnésium bisglycinate : 300mg le soir au dîner\n- Vitamine D3 : 2000 UI/jour",
    "precautions_complements": "Commencer les probiotiques progressivement si ballonnements. La L-glutamine est contre-indiquée en cas d insuffisance rénale.",
    "huiles_essentielles": "- HE Menthe poivrée (Mentha piperita) : 1 goutte sur un comprimé neutre après les repas si ballonnements\n- HE Lavande vraie (Lavandula angustifolia) : en diffusion le soir ou 2 gouttes sur les poignets",
    "precautions_he": "Menthe poivrée déconseillée en cas de RGO. Ne pas appliquer près des yeux. Pas d HE chez la femme enceinte ou allaitante.",
    "hydrologie": "Bouillotte chaude sur le ventre 15 min après le repas du soir. Bain tiède aux sels d Epsom 2x/semaine le soir.",
    "activite_type": "Marche rapide, yoga doux, natation",
    "activite_frequence": "30 minutes minimum 4 fois par semaine",
    "activite_conseils": "Privilégier la marche digestive après le déjeuner (15-20 min). Éviter le sport intensif le soir après 20h.",
    "equilibre_psycho": "La composante émotionnelle est centrale dans votre SII. Le stress active directement l axe cerveau-intestin.",
    "gestion_charge_mentale": "Identifier les 3 principales sources de stress professionnel. Instaurer des micro-pauses de 5 min toutes les 2 heures.",
    "techniques_respiratoires": "Cohérence cardiaque 365 : 3 fois par jour, 6 respirations par minute, pendant 5 minutes. Application recommandée : RespiRelax+.",
    "automassages": "Massage du ventre dans le sens des aiguilles d une montre, 5 min le soir avec huile de ricin tiède.",
    "points_reflexes": "Point 36 Estomac (Zusanli) : 4 travers de doigt sous la rotule, côté externe. Masser 2 min chaque soir.",
    "seances_recommandees": "Réflexologie plantaire 1x/mois en complément. Sophrologie si besoin (gestion du stress professionnel).",
    "sommeil_routine": "Écrans coupés à 21h. Infusion mélisse-passiflore. Lecture ou étirements doux. Coucher avant 23h.",
    "sommeil_environnement": "Chambre à 18-19°C, obscurité complète, pas de téléphone dans la chambre.",
    "sommeil_conseils": "Si réveil nocturne, pratiquer la respiration 4-7-8 (inspirer 4s, retenir 7s, expirer 8s).",
    "environnement_air": "Aérer le bureau et la chambre 10 min matin et soir. Plantes dépolluantes au bureau.",
    "environnement_produits": "Remplacer les produits ménagers chimiques par du vinaigre blanc et du savon de Marseille.",
    "environnement_perturbateurs": "Limiter les contenants plastiques : préférer verre et inox. Filtrer l eau du robinet.",
    "suivi_indicateurs": "- Nombre de ballonnements par jour\n- Qualité du transit (échelle de Bristol)\n- Niveau de stress ressenti (1 à 10)\n- Qualité du sommeil (1 à 10)",
    "suivi_prochain_rdv": "Dans 4 semaines pour évaluer la phase d éviction FODMAP",
    "suivi_entre_temps": "Tenir le journal de bord quotidien dans l application. Me contacter en messagerie si doute sur un aliment.",
    "message_cloture": "Sophie, vous avez toutes les clés en main pour retrouver un confort digestif durable. N hésitez pas à me solliciter entre nos rendez-vous. Votre corps sait se réparer quand on lui en donne les moyens !",
    "notes_libres": "Patiente très motivée et rigoureuse. Risque de perfectionnisme : rappeler l importance de la souplesse. Surveiller le stress professionnel qui est le facteur déclenchant principal."
  }$cp1$::jsonb, NOW()-INTERVAL '6 months', false, NOW()-INTERVAL '6 months')
  ON CONFLICT (consultant_id, version) DO NOTHING;

  -- Thomas Dubois (c2) – Nutrition sportive trail
  INSERT INTO consultant_plans (id, consultant_id, practitioner_id, version, status, content, shared_at, ai_generated, created_at)
  VALUES ('d0000000-0000-4000-a000-000000000002', v_c2, v_practitioner_id, 1, 'shared', $cp2${
    "message_accueil": "Thomas, voici votre programme d optimisation nutritionnelle pour vos objectifs trail et UTMB. Ce plan est spécifiquement conçu pour la performance en endurance.",
    "duree_programme": "4 mois (préparation UTMB)",
    "date_debut_conseille": "Immédiatement",
    "objectifs_principaux": "1. Optimiser les apports en micronutriments pour l endurance\n2. Améliorer la récupération post-effort\n3. Préparer le plan nutritionnel de course UTMB",
    "actions_prioritaires_semaine_1": "- Commencer la complémentation en magnésium et fer\n- Restructurer le petit-déjeuner pré-entraînement\n- Mettre en place la fenêtre métabolique post-effort (30 min)\n- Hydrater avec électrolytes pendant les sorties > 1h",
    "principes_alimentaires": "Alimentation dense nutritionnellement avec ratio adapté : 55-60% glucides complexes, 20-25% lipides de qualité, 15-20% protéines. Périodisation nutritionnelle selon le cycle d entraînement.",
    "aliments_a_privilegier": "Patate douce, riz complet, avoine, banane, fruits secs (dattes, abricots), saumon, œufs, amandes, beurre de cacahuètes, avocat, épinards, betterave (nitrates)",
    "aliments_a_limiter": "Sucres simples hors effort, alcool, fritures, aliments ultra-transformés, fibres en excès avant les sorties longues",
    "rythme_repas": "4 à 5 prises alimentaires par jour. Petit-déjeuner costaud 2h avant l entraînement. Collation post-effort dans les 30 min.",
    "objectif_hydratation": "2.5 à 3L/jour hors entraînement. Pendant l effort : 500-800mL/h selon conditions.",
    "type_eau": "Eau riche en bicarbonates (St-Yorre, Vichy Célestins) en récupération. Eau plate le reste du temps.",
    "moments_hydratation": "Au réveil : 500mL. Avant effort : 500mL dans l heure précédente. Post-effort : pesée comparative pour compenser les pertes.",
    "phytotherapie_plantes": "- Rhodiola (Rhodiola rosea) : adaptogène, améliore la VO2max\n- Eleuthérocoque (Eleutherococcus senticosus) : résistance à l effort\n- Curcuma (Curcuma longa) : anti-inflammatoire articulaire et musculaire",
    "phytotherapie_posologie": "Rhodiola : 400mg/jour le matin. Eleuthérocoque : 300mg 2x/jour. Curcuma : 500mg 2x/jour avec poivre noir.",
    "phytotherapie_precautions": "Rhodiola à arrêter la semaine de la course (effet stimulant). Curcuma déconseillé avec anticoagulants.",
    "complements": "- Magnésium bisglycinate : 400mg/jour (matin et soir)\n- Fer bisglycinate : 14mg/jour (si ferritine < 50, à contrôler)\n- Oméga 3 EPA/DHA : 2g/jour\n- Spiruline : 5g/jour\n- BCAA : 10g autour de l effort (5g avant, 5g après)",
    "precautions_complements": "Fer : prendre à distance du thé et du café (2h). Contrôle ferritine tous les 3 mois. Ne pas dépasser 14mg/jour sans avis médical.",
    "huiles_essentielles": "- HE Gaulthérie couchée : en massage diluée (10%) sur les zones musculaires douloureuses après l effort\n- HE Menthe poivrée : 1 goutte sur les tempes en cas de coup de fatigue",
    "precautions_he": "Gaulthérie contre-indiquée avec les anticoagulants et l allergie à l aspirine. Toujours diluer dans une huile végétale.",
    "hydrologie": "Douche écossaise post-entraînement (alternance chaud/froid) pour la récupération. Bain aux sels d Epsom 1x/semaine.",
    "activite_type": "Trail running (programme dédié), renforcement musculaire fonctionnel, yoga pour la mobilité",
    "activite_frequence": "5 séances/semaine selon plan d entraînement. 1 jour de repos complet.",
    "activite_conseils": "Respecter les jours de repos. Intégrer des séances de mobilité/étirements. Ne pas augmenter le volume de plus de 10%/semaine.",
    "equilibre_psycho": "La préparation mentale est aussi importante que la préparation physique. Visualisation et gestion de l effort sur ultra.",
    "gestion_charge_mentale": "Planifier les entraînements pour éviter les conflits avec le quotidien. Accepter de sauter une séance si fatigue excessive.",
    "techniques_respiratoires": "Respiration nasale en endurance fondamentale. Technique de respiration rythmée 3:2 (3 foulées inspire, 2 foulées expire) en montée.",
    "automassages": "Rouleau de massage (foam roller) sur quadriceps, ischio-jambiers et mollets 10 min après chaque sortie longue.",
    "points_reflexes": "Zone réflexe des surrénales (milieu de la voûte plantaire) : masser 3 min chaque soir pour la récupération.",
    "seances_recommandees": "Ostéopathie 1x/mois pendant la préparation. Massage sportif avant et après la course.",
    "sommeil_routine": "8h minimum de sommeil. Sieste de 20 min les jours de double séance. Coucher avant 22h30.",
    "sommeil_environnement": "Chambre fraîche (17-18°C), obscurité totale, pas d écran 1h avant le coucher.",
    "sommeil_conseils": "Si difficulté d endormissement après un entraînement intensif du soir : magnésium + infusion de tilleul.",
    "environnement_air": "Privilégier les entraînements en nature (forêt) plutôt qu en ville. Éviter les axes routiers.",
    "environnement_produits": "Gourde inox, pas de plastique chauffé. Barres énergétiques maison plutôt qu industrielles.",
    "environnement_perturbateurs": "Attention aux gels et barres industriels : privilégier les produits clean label ou fait maison.",
    "suivi_indicateurs": "- Variabilité cardiaque (HRV) au réveil\n- Ferritine et NFS tous les 3 mois\n- Poids corporel (stabilité)\n- Sensations d effort (RPE)",
    "suivi_prochain_rdv": "Dans 4 semaines pour ajuster le plan en phase de charge",
    "suivi_entre_temps": "Remplir le journal alimentaire 3 jours/semaine. Me contacter après les sorties longues pour débriefer nutrition.",
    "message_cloture": "Thomas, la nutrition est votre 4e discipline en trail. Avec ce plan, vous avez tout pour performer à l UTMB. On ajustera au fur et à mesure. Bonne prépa !",
    "notes_libres": "Athlète très motivé et rigoureux. Attention au surentraînement, surveiller la HRV. Test des produits de course à faire en entraînement, jamais le jour J."
  }$cp2$::jsonb, NOW()-INTERVAL '5 months', false, NOW()-INTERVAL '5 months')
  ON CONFLICT (consultant_id, version) DO NOTHING;

  -- Émilie Laurent (c3) – Post-partum / fatigue
  INSERT INTO consultant_plans (id, consultant_id, practitioner_id, version, status, content, shared_at, ai_generated, created_at)
  VALUES ('d0000000-0000-4000-a000-000000000003', v_c3, v_practitioner_id, 1, 'shared', $cp3${
    "message_accueil": "Émilie, voici votre programme de récupération post-partum. Il est adapté à votre allaitement et à votre rythme de jeune maman.",
    "duree_programme": "3 mois",
    "date_debut_conseille": "Dès réception",
    "objectifs_principaux": "1. Corriger les carences en fer et vitamine D\n2. Retrouver un niveau d énergie satisfaisant\n3. Accompagner le sevrage progressif de l allaitement",
    "actions_prioritaires_semaine_1": "- Débuter la supplémentation en fer bisglycinate\n- Augmenter les sources de fer alimentaire\n- Mettre en place la routine du soir apaisante\n- Sieste obligatoire quand bébé dort",
    "principes_alimentaires": "Alimentation dense, reminéralisante et compatible allaitement. Favoriser les aliments riches en fer héminique et en vitamine C pour l absorption.",
    "aliments_a_privilegier": "Viande rouge 2x/semaine, lentilles, épinards, persil, agrumes, sardines, œufs, amandes, graines de courge, bouillon d os, avoine",
    "aliments_a_limiter": "Thé et café pendant les repas (inhibent absorption fer), alcool (allaitement), soja en excès",
    "rythme_repas": "3 repas + 2 collations. Ne jamais sauter de repas. Collations riches en protéines et bons gras.",
    "objectif_hydratation": "2L minimum (allaitement augmente les besoins)",
    "type_eau": "Eau minérale riche en calcium et magnésium (Hépar, Contrex)",
    "moments_hydratation": "1 grand verre à chaque tétée. Garder une bouteille d eau à portée de main en permanence.",
    "phytotherapie_plantes": "- Ortie (Urtica dioica) : reminéralisante, riche en fer et silice\n- Fenouil (Foeniculum vulgare) : galactogène compatible allaitement\n- Mélisse : relaxante et digestive",
    "phytotherapie_posologie": "Infusion ortie : 3 tasses/jour. Fenouil : 1 tasse après les repas. Mélisse : 1 tasse le soir.",
    "phytotherapie_precautions": "Pas de sauge ni menthe poivrée pendant l allaitement (anti-galactogènes). Ortie déconseillée si allergie aux urticacées.",
    "complements": "- Fer bisglycinate : 20mg/jour (compatible allaitement)\n- Vitamine D3 : 4000 UI/jour jusqu à normalisation\n- Magnésium bisglycinate : 300mg le soir\n- Vitamine C : 500mg avec le fer pour absorption\n- Oméga 3 DHA : 500mg/jour (développement cérébral bébé via lait maternel)",
    "precautions_complements": "Fer : peut constiper, prendre avec vitamine C. Si intolérance digestive, fractionner en 2 prises. Contrôle ferritine à M+2.",
    "huiles_essentielles": "Aucune huile essentielle par voie orale pendant l allaitement. En diffusion uniquement : lavande vraie pour la relaxation.",
    "precautions_he": "CONTRE-INDICATION ABSOLUE des HE par voie orale et cutanée pendant l allaitement sauf avis d un aromathérapeute.",
    "hydrologie": "Bain tiède relaxant le soir (20 min) quand possible. Bouillotte chaude sur le bas du dos si tensions.",
    "activite_type": "Marche avec poussette, yoga post-natal, rééducation périnéale",
    "activite_frequence": "Marche quotidienne 20-30 min. Yoga post-natal 2x/semaine quand énergie le permet.",
    "activite_conseils": "Ne pas forcer tant que la rééducation périnéale n est pas terminée. Écouter son corps. Aucune culpabilité si repos nécessaire.",
    "equilibre_psycho": "La fatigue post-partum est normale et transitoire. Accepter de ne pas tout gérer. Déléguer quand c est possible.",
    "gestion_charge_mentale": "Accepter l aide de l entourage. Lâcher prise sur le ménage. Prioriser : bébé, repos, alimentation.",
    "techniques_respiratoires": "Respiration abdominale douce 5 min quand bébé s endort. Aide à la récupération et au recentrage.",
    "automassages": "Massage des pieds le soir avec huile d amande douce. Massage du cuir chevelu pour la détente (chute de cheveux post-partum).",
    "points_reflexes": "Point 6 Rate (Sanyinjiao) : 4 travers de doigt au-dessus de la malléole interne. Tonifie le sang et l énergie.",
    "seances_recommandees": "Ostéopathie post-partum (1 séance). Massage post-natal si possible.",
    "sommeil_routine": "Dormir dès que bébé dort. Pas d écran pendant les tétées nocturnes (lumière rouge uniquement). Infusion mélisse le soir.",
    "sommeil_environnement": "Chambre fraîche, co-dodo sécuritaire si choisi, lumière tamisée pour les tétées nocturnes.",
    "sommeil_conseils": "Fragmenté est normal à ce stade. Miser sur la qualité des phases de sommeil plutôt que la durée totale.",
    "environnement_air": "Aérer la chambre et celle de bébé 2x/jour. Pas de parfum d ambiance chimique. Diffusion lavande (appareil à froid) uniquement.",
    "environnement_produits": "Produits ménagers naturels (vinaigre, bicarbonate). Cosmétiques bio pour maman et bébé.",
    "environnement_perturbateurs": "Éviter les plastiques (biberons en verre si biberon). Cosmétiques sans perturbateurs endocriniens (label Cosmébio).",
    "suivi_indicateurs": "- Niveau d énergie quotidien (1-10)\n- Nombre d heures de sommeil cumulées\n- Ferritine et vit D à contrôler dans 2 mois\n- Moral et humeur",
    "suivi_prochain_rdv": "Dans 8 semaines",
    "suivi_entre_temps": "Journal de bord dans l application. N hésitez pas à m écrire si vous avez des questions sur l alimentation ou les compléments.",
    "message_cloture": "Émilie, soyez indulgente avec vous-même. Vous faites un travail formidable. La fatigue est temporaire, et votre corps a besoin de temps pour se reconstituer. Je suis là pour vous accompagner.",
    "notes_libres": "Patiente fatiguée mais très motivée. Surveiller le moral (baby blues possible). Mari impliqué et soutenant. Réévaluer fer et vit D dans 2 mois."
  }$cp3$::jsonb, NOW()-INTERVAL '4 months', false, NOW()-INTERVAL '4 months')
  ON CONFLICT (consultant_id, version) DO NOTHING;

  -- Nathalie Petit (c5) – Ménopause
  INSERT INTO consultant_plans (id, consultant_id, practitioner_id, version, status, content, shared_at, ai_generated, created_at)
  VALUES ('d0000000-0000-4000-a000-000000000005', v_c5, v_practitioner_id, 1, 'shared', $cp5${
    "message_accueil": "Nathalie, voici votre programme d accompagnement de la ménopause par des moyens naturels. Il est conçu pour réduire vos symptômes vasomoteurs et améliorer votre qualité de vie.",
    "duree_programme": "4 mois",
    "date_debut_conseille": "Immédiatement",
    "objectifs_principaux": "1. Réduire les bouffées de chaleur et sueurs nocturnes\n2. Améliorer la qualité du sommeil\n3. Préserver le capital osseux et la vitalité",
    "actions_prioritaires_semaine_1": "- Commencer les isoflavones de trèfle rouge\n- Infusion de sauge officinale le soir\n- Supprimer les aliments déclencheurs (épices fortes, alcool, café chaud)\n- Augmenter les sources de calcium et vitamine D",
    "principes_alimentaires": "Alimentation riche en phytoestrogènes naturels, calcium, magnésium et oméga 3. Anti-inflammatoire pour limiter les symptômes vasomoteurs.",
    "aliments_a_privilegier": "Soja et dérivés (tofu, tempeh, edamame), graines de lin moulues, brocoli, chou kale, sardines avec arêtes, amandes, sésame, avocat, fruits rouges",
    "aliments_a_limiter": "Épices fortes (déclenchent les bouffées), alcool, café chaud, sucres raffinés, excès de sel, viandes rouges en excès",
    "rythme_repas": "3 repas équilibrés. Collation vers 16h riche en protéines végétales. Dîner léger et tôt (19h).",
    "objectif_hydratation": "1.5 à 2L par jour",
    "type_eau": "Eau riche en calcium (Hépar, Contrex) pour la prévention osseuse",
    "moments_hydratation": "Boissons tièdes ou froides (les boissons chaudes peuvent déclencher les bouffées). Infusion de sauge à température tiède.",
    "phytotherapie_plantes": "- Sauge officinale (Salvia officinalis) : anti-sudorifique, phytoestrogénique\n- Trèfle rouge (Trifolium pratense) : isoflavones, réduction bouffées de chaleur\n- Actée à grappes noires (Actaea racemosa) : symptômes vasomoteurs\n- Valériane : sommeil et anxiété",
    "phytotherapie_posologie": "Trèfle rouge : 40-80mg isoflavones/jour. Sauge : infusion 3 feuilles/tasse, 2x/jour. Valériane : 600mg le soir.",
    "phytotherapie_precautions": "Sauge déconseillée en cas de cancer hormonodépendant (sein, utérus). Trèfle rouge : même précaution. Consulter votre gynécologue.",
    "complements": "- Isoflavones de trèfle rouge : 80mg/jour\n- Vitamine D3 : 4000 UI/jour (prévention osseuse)\n- Calcium : 500mg/jour (en complément de l alimentaire)\n- Magnésium bisglycinate : 300mg/jour le soir\n- Huile d onagre : 1000mg 2x/jour (sécheresse muqueuses)",
    "precautions_complements": "Calcium : ne pas prendre en même temps que le fer ou le zinc. Espacer de 2h. Phytoestrogènes : avis gynéco si ATCD cancer hormono-dépendant.",
    "huiles_essentielles": "- HE Sauge sclarée (Salvia sclarea) : 2 gouttes diluées en massage sur le plexus solaire matin et soir\n- HE Cyprès (Cupressus sempervirens) : 1 goutte sur les poignets en cas de bouffée",
    "precautions_he": "Sauge sclarée déconseillée avec mastose ou ATCD cancer du sein. Cyprès : pas en cas de mastose ou fibrome.",
    "hydrologie": "Bain de pieds frais le soir (15 min) pour calmer les bouffées nocturnes. Douche tiède (pas chaude) le soir.",
    "activite_type": "Marche rapide, pilates, aquagym, danse",
    "activite_frequence": "4 à 5 séances par semaine de 30 à 45 min",
    "activite_conseils": "L activité physique régulière réduit la fréquence des bouffées de chaleur de 30-40%. Privilégier les activités qui font transpirer modérément.",
    "equilibre_psycho": "La ménopause est une transition, pas une maladie. C est le moment de se recentrer sur soi et ses projets personnels.",
    "gestion_charge_mentale": "Prendre du temps pour soi chaque jour. Activités créatives, sorties entre amies, projets personnels.",
    "techniques_respiratoires": "Respiration abdominale lente dès qu une bouffée commence : elle peut réduire l intensité de 50%. Inspirer 4s, expirer 6s.",
    "automassages": "Massage des pieds avec huile d amande douce + HE lavande le soir. Massage du ventre en cas de ballonnements.",
    "points_reflexes": "Point 6 Rate (Sanyinjiao) et Point 7 Cœur (Shenmen) : réguler les bouffées et calmer l anxiété.",
    "seances_recommandees": "Acupuncture 1x/mois (très efficace sur les bouffées de chaleur). Sophrologie pour la gestion émotionnelle.",
    "sommeil_routine": "Bain de pieds frais avant le coucher. Chambre à 17°C max. Pyjama en coton respirant. Infusion sauge-valériane.",
    "sommeil_environnement": "Draps en fibres naturelles (coton, lin). Couette légère ou système de couettes séparées si en couple. Ventilateur à proximité.",
    "sommeil_conseils": "En cas de sueur nocturne : avoir un change à portée de main. Brumisateur d eau fraîche sur la table de nuit.",
    "environnement_air": "Aérer régulièrement. Plantes dépolluantes dans la chambre (aloe vera, spathiphyllum).",
    "environnement_produits": "Cosmétiques sans perturbateurs endocriniens. Préférer le bio pour les soins du visage et du corps.",
    "environnement_perturbateurs": "Éviter les xénoestrogènes (plastiques, pesticides, parabènes) qui perturbent l équilibre hormonal.",
    "suivi_indicateurs": "- Nombre de bouffées de chaleur par jour\n- Nombre de réveils nocturnes\n- Niveau d humeur (1-10)\n- Sécheresse muqueuses (amélioration oui/non)",
    "suivi_prochain_rdv": "Dans 4 semaines",
    "suivi_entre_temps": "Journal de bord quotidien. Compter les bouffées pour objectiver l amélioration.",
    "message_cloture": "Nathalie, la ménopause est un passage naturel que nous pouvons traverser en douceur avec les bons outils. Soyez patiente, les résultats s installent progressivement sur 4 à 8 semaines.",
    "notes_libres": "Patiente ouverte aux approches naturelles mais avec des attentes fortes de résultats rapides. Rassurer sur le délai d action. Pas d ATCD cancer hormono-dépendant, phytoestrogènes OK."
  }$cp5$::jsonb, NOW()-INTERVAL '6 months', false, NOW()-INTERVAL '6 months')
  ON CONFLICT (consultant_id, version) DO NOTHING;

  -- Céline Roux (c7) – Fibromyalgie
  INSERT INTO consultant_plans (id, consultant_id, practitioner_id, version, status, content, shared_at, ai_generated, created_at)
  VALUES ('d0000000-0000-4000-a000-000000000007', v_c7, v_practitioner_id, 1, 'shared', $cp7${
    "message_accueil": "Céline, voici votre programme d accompagnement naturopathique de la fibromyalgie. L objectif est d améliorer progressivement votre qualité de vie en agissant sur la douleur, le sommeil et l énergie.",
    "duree_programme": "6 mois (programme long, résultats progressifs)",
    "date_debut_conseille": "Dès réception",
    "objectifs_principaux": "1. Réduire l intensité et la fréquence des douleurs (EVA de 7 à 4)\n2. Améliorer la qualité du sommeil (passer de 4h30 à 6h+)\n3. Augmenter le niveau d énergie quotidien",
    "actions_prioritaires_semaine_1": "- Commencer le magnésium et les oméga 3\n- Instaurer les bains chauds aux HE 3x/semaine\n- Supprimer le gluten et les produits laitiers pendant 6 semaines (test)\n- Journal de douleur quotidien",
    "principes_alimentaires": "Alimentation anti-inflammatoire stricte. Éviction temporaire du gluten et des produits laitiers (6 semaines) puis réintroduction contrôlée. Riche en antioxydants et oméga 3.",
    "aliments_a_privilegier": "Poissons gras 3x/semaine, légumes colorés, fruits rouges, curcuma + poivre noir, gingembre, noix, graines de chia, huile d olive vierge, thé vert matcha",
    "aliments_a_limiter": "Gluten (6 semaines), produits laitiers (6 semaines), sucres raffinés, viandes rouges, solanacées (tomates, aubergines, poivrons – test), additifs alimentaires (glutamate, aspartame)",
    "rythme_repas": "3 repas + 1 à 2 collations. Repas à heures fixes. Ne pas sauter de repas (risque de crise).",
    "objectif_hydratation": "2L minimum par jour",
    "type_eau": "Eau faiblement minéralisée. Infusions anti-inflammatoires (curcuma, gingembre) comptent dans l hydratation.",
    "moments_hydratation": "Répartir sur la journée. Au réveil, 1 grand verre d eau tiède + citron.",
    "phytotherapie_plantes": "- Curcuma (Curcuma longa) : anti-inflammatoire puissant\n- Boswellia (Boswellia serrata) : anti-inflammatoire articulaire\n- Griffonia (Griffonia simplicifolia) : précurseur de sérotonine, sommeil et humeur\n- Rhodiola : adaptogène anti-fatigue",
    "phytotherapie_posologie": "Curcuma : 500mg 3x/jour avec poivre noir. Boswellia : 400mg 2x/jour. Griffonia : 100mg 5-HTP le soir. Rhodiola : 400mg le matin.",
    "phytotherapie_precautions": "Griffonia : ne pas associer avec des antidépresseurs ISRS (risque syndrome sérotoninergique). Curcuma déconseillé si anticoagulants.",
    "complements": "- Magnésium bisglycinate : 400mg 2x/jour (matin et soir)\n- Oméga 3 EPA forte dose : 3g/jour\n- CoQ10 : 200mg/jour (énergie mitochondriale)\n- Vitamine D3 : 4000 UI/jour\n- PEA (palmitoylethanolamide) : 600mg 2x/jour (douleurs neuropathiques)",
    "precautions_complements": "PEA : complément très bien toléré, pas d interaction connue. CoQ10 : peut interagir avec les anticoagulants. Oméga 3 à forte dose : surveiller si anticoagulants.",
    "huiles_essentielles": "- HE Eucalyptus citronné : anti-inflammatoire en massage (dilué 5% dans huile de calophylle)\n- HE Lavande aspic : antalgique en application locale sur les points douloureux\n- HE Ylang-ylang : relaxante en diffusion le soir",
    "precautions_he": "Toujours diluer. Test cutané au pli du coude avant première utilisation. Eucalyptus citronné : pas chez l asthmatique.",
    "hydrologie": "Bains chauds (37-38°C) aux sels d Epsom (500g) + 10 gouttes HE lavande, 3x/semaine le soir, 20 min. Effet décontractant et antalgique.",
    "activite_type": "Yoga doux adapté fibromyalgie, aquagym (eau chaude), marche en nature, Qi Gong",
    "activite_frequence": "Activité douce quotidienne 20-30 min. Intensité adaptée : jamais au-delà de 4/10 sur l échelle d effort.",
    "activite_conseils": "JAMAIS forcer. La règle d or : si l activité augmente la douleur le lendemain, c était trop. Progression très lente (5 min de plus par semaine max).",
    "equilibre_psycho": "La fibromyalgie a une forte composante émotionnelle. Le travail sur le stress et les émotions refoulées est essentiel.",
    "gestion_charge_mentale": "Apprendre à dire non. Planifier des plages de repos. Technique de la cuillère : gérer son énergie comme un budget limité.",
    "techniques_respiratoires": "Respiration en carré (4-4-4-4) : inspirer 4s, retenir 4s, expirer 4s, retenir 4s. 5 min 3x/jour. Cohérence cardiaque le soir.",
    "automassages": "Balle de tennis contre le mur pour les points trigger du dos. Automassage des mains et pieds avec huile de calophylle + HE eucalyptus citronné.",
    "points_reflexes": "Point 4 Gros Intestin (Hegu) dans la commissure pouce-index : antalgique général. Masser fermement 3 min quand douleur.",
    "seances_recommandees": "Ostéopathie douce 1x/mois. Acupuncture recommandée. Sophrologie ou hypnose pour la gestion de la douleur.",
    "sommeil_routine": "Bain chaud aux sels d Epsom à 20h. Griffonia à 20h30. Pas d écran après 21h. Lecture, musique douce. Coucher à 22h.",
    "sommeil_environnement": "Matelas adapté (mémoire de forme ou latex). Chambre à 18°C. Obscurité complète. Bouchons d oreilles si sensibilité au bruit.",
    "sommeil_conseils": "Le sommeil profond est crucial pour la récupération musculaire. Le griffonia (5-HTP) améliore spécifiquement le sommeil profond.",
    "environnement_air": "Environnement calme essentiel. Réduire les stimulations sensorielles (bruit, lumière vive). Nature et forêt quand possible.",
    "environnement_produits": "Hypoallergénique pour tout (lessive, cosmétiques). Les sensibilités chimiques sont fréquentes en fibromyalgie.",
    "environnement_perturbateurs": "Limiter les expositions aux polluants : pas de parfum synthétique, produits ménagers naturels, aération quotidienne.",
    "suivi_indicateurs": "- EVA douleur quotidienne (0-10)\n- Nombre de points douloureux\n- Heures de sommeil et qualité perçue\n- Score fatigue (0-10)\n- Nombre de jours de crise par mois",
    "suivi_prochain_rdv": "Dans 4 semaines",
    "suivi_entre_temps": "Journal de douleur quotidien dans l application. Me contacter si crise importante ou si effet indésirable d un complément.",
    "message_cloture": "Céline, la fibromyalgie demande de la patience mais des améliorations significatives sont possibles. Chaque petit progrès compte. Nous allons avancer ensemble, pas à pas.",
    "notes_libres": "Patiente courageuse malgré la douleur chronique. Compliance bonne. Vérifier les interactions avec Lyrica et tramadol. Objectif : réduction progressive du tramadol en accord avec le médecin traitant."
  }$cp7$::jsonb, NOW()-INTERVAL '8 months', false, NOW()-INTERVAL '8 months')
  ON CONFLICT (consultant_id, version) DO NOTHING;

  -- Jean-Pierre Moreau (c4) – Prostate & prévention
  INSERT INTO consultant_plans (id, consultant_id, practitioner_id, version, status, content, shared_at, ai_generated, created_at)
  VALUES ('d0000000-0000-4000-a000-000000000004', v_c4, v_practitioner_id, 1, 'shared', $cp4${
    "message_accueil": "Jean-Pierre, voici votre programme de prévention et de confort prostatique. Il intègre également des axes pour améliorer votre sommeil.",
    "duree_programme": "3 mois renouvelable",
    "date_debut_conseille": "Dès réception",
    "objectifs_principaux": "1. Améliorer le confort urinaire et prostatique\n2. Optimiser la qualité du sommeil\n3. Prévention cardiovasculaire (ATCD familiaux)",
    "actions_prioritaires_semaine_1": "- Commencer le saw palmetto + zinc\n- Réduire les liquides après 18h\n- Supprimer le thé et café après 15h\n- Marche de 30 min après le déjeuner",
    "principes_alimentaires": "Alimentation anti-inflammatoire riche en lycopène, zinc et sélénium pour la prostate. Cardioprotectrice en parallèle.",
    "aliments_a_privilegier": "Tomates cuites (lycopène), graines de courge, noix du Brésil (sélénium), poissons gras, brocoli, chou-fleur, huile d olive, ail, oignon",
    "aliments_a_limiter": "Viandes rouges (1x/semaine max), charcuterie, produits laitiers en excès, aliments épicés le soir, alcool le soir",
    "rythme_repas": "3 repas réguliers. Dîner léger et tôt (18h30-19h) pour limiter les levers nocturnes.",
    "objectif_hydratation": "1.5L mais répartir majoritairement le matin et en début d après-midi",
    "type_eau": "Eau faiblement minéralisée pour le confort urinaire",
    "moments_hydratation": "Boire principalement entre 7h et 16h. Réduire fortement après 18h.",
    "phytotherapie_plantes": "- Saw Palmetto (Serenoa repens) : confort prostatique, réduit les symptômes urinaires\n- Prunier d Afrique (Pygeum africanum) : anti-inflammatoire prostatique\n- Epilobe (Epilobium parviflorum) : décongestionnant prostatique\n- Aubépine (Crataegus) : cardioprotecteur, régulateur du rythme cardiaque",
    "phytotherapie_posologie": "Saw palmetto : 320mg/jour extrait lipidique. Pygeum : 100mg/jour. Epilobe : infusion 2 tasses/jour. Aubépine : 300mg 2x/jour.",
    "phytotherapie_precautions": "Saw palmetto : peut masquer une modification du PSA, informer l urologue. Aubépine : interaction possible avec antihypertenseurs.",
    "complements": "- Zinc bisglycinate : 15mg/jour\n- Sélénium : 100µg/jour\n- Lycopène : 15mg/jour\n- Vitamine D3 : 2000 UI/jour\n- Magnésium bisglycinate : 300mg le soir (sommeil)",
    "precautions_complements": "Zinc : ne pas dépasser 15mg/jour au long cours. Sélénium : ne pas dépasser 200µg/jour. Informer l urologue de la prise de compléments.",
    "huiles_essentielles": "- HE Cyprès (Cupressus sempervirens) : décongestionnant veineux, en massage bas-ventre dilué 5%\n- HE Lavande vraie : en diffusion le soir pour le sommeil",
    "precautions_he": "Cyprès : contre-indiqué en cas de cancer hormono-dépendant (prostate). Vérifier avec l urologue que c est un simple HBP.",
    "hydrologie": "Bains de siège tièdes 15 min le soir (décongestionnant prostatique). Bouillotte chaude bas-ventre si gêne.",
    "activite_type": "Marche, jardinage, vélo modéré, gymnastique douce",
    "activite_frequence": "Activité quotidienne 30-45 min. Jardinage compté comme activité.",
    "activite_conseils": "Éviter le vélo prolongé (pression périnéale). Marche après les repas pour la digestion et le transit. Exercices de Kegel pour le plancher pelvien.",
    "equilibre_psycho": "L inquiétude liée à la prostate est normale. Les contrôles réguliers permettent de rester serein. L hygiène de vie est votre meilleur atout.",
    "gestion_charge_mentale": "Vie de retraité active et épanouie. Maintenir les activités associatives et le lien social.",
    "techniques_respiratoires": "Respiration abdominale 5 min avant le coucher pour faciliter l endormissement. Idéal combiné avec les exercices de Kegel.",
    "automassages": "Massage du bas-ventre en cercles doux. Massage des pieds avant le coucher.",
    "points_reflexes": "Zone réflexe de la prostate sur le pied (face interne du talon). Masser 3 min chaque soir.",
    "seances_recommandees": "Ostéopathie viscérale 1x/trimestre. Éventuellement réflexologie plantaire.",
    "sommeil_routine": "Pas de liquide après 18h. Bain de siège tiède. Infusion épilobe + passiflore. Lecture. Coucher 22h-22h30.",
    "sommeil_environnement": "Chambre à 18°C, obscurité. Accès facile aux toilettes (veilleuse à détection de mouvement).",
    "sommeil_conseils": "En cas de lever nocturne, rester dans la pénombre, ne pas regarder l heure, retour au lit immédiat avec respiration lente.",
    "environnement_air": "Jardin : excellent pour la santé. Continuer le jardinage quotidien.",
    "environnement_produits": "Privilégier les légumes du potager (sans pesticides). Contenants en verre.",
    "environnement_perturbateurs": "Le jardinage expose aux pesticides si utilisés : confirmer que le potager est en bio.",
    "suivi_indicateurs": "- Nombre de levers nocturnes\n- Score IPSS si disponible\n- Qualité du sommeil (1-10)\n- Tension artérielle à domicile 1x/semaine",
    "suivi_prochain_rdv": "Dans 8 semaines",
    "suivi_entre_temps": "Journal de bord. Me contacter si modification des symptômes urinaires ou si effets indésirables.",
    "message_cloture": "Jean-Pierre, votre hygiène de vie est déjà excellente. Avec ces ajustements ciblés, nous pouvons encore améliorer votre confort. N oubliez pas de maintenir le suivi urologique en parallèle.",
    "notes_libres": "Patient discipliné et motivé. PSA normal – confirmer HBP simple. Coordonner avec urologue. Antécédents CV familiaux à surveiller."
  }$cp4$::jsonb, NOW()-INTERVAL '7 months', false, NOW()-INTERVAL '7 months')
  ON CONFLICT (consultant_id, version) DO NOTHING;

  -- Philippe Garnier (c10) – Eczéma & fatigue
  INSERT INTO consultant_plans (id, consultant_id, practitioner_id, version, status, content, shared_at, ai_generated, created_at)
  VALUES ('d0000000-0000-4000-a000-00000000000a', v_c10, v_practitioner_id, 1, 'shared', $cp10${
    "message_accueil": "Philippe, voici votre programme pour améliorer votre eczéma et votre énergie, en tenant compte de vos contraintes professionnelles de boulanger.",
    "duree_programme": "4 mois",
    "date_debut_conseille": "Dès réception",
    "objectifs_principaux": "1. Réduire les poussées d eczéma (mains et avant-bras)\n2. Améliorer l énergie malgré les horaires décalés\n3. Restaurer la perméabilité intestinale",
    "actions_prioritaires_semaine_1": "- Commencer les probiotiques (Lactobacillus rhamnosus GG)\n- Éviction du gluten HORS travail\n- Appliquer le baume au calendula matin et soir sur les zones\n- Micro-sieste de 20 min après le déjeuner",
    "principes_alimentaires": "Alimentation anti-inflammatoire avec éviction du gluten en dehors du travail (impossible pendant vu l exposition professionnelle). Riche en oméga 3 et en nutriments cutanés.",
    "aliments_a_privilegier": "Poissons gras, huile de colza/lin, patate douce, carotte, légumes orange (bêta-carotène), avocat, noix, graines de lin, bouillon d os (collagène)",
    "aliments_a_limiter": "Gluten (hors travail), produits laitiers de vache, sucres raffinés, aliments histaminogènes en excès (fromages affinés, charcuterie, vin rouge)",
    "rythme_repas": "Petit-déjeuner consistant à 2h30. Repas chaud à 11h (pause). Dîner léger à 19h. Sieste 13h-13h30.",
    "objectif_hydratation": "2L par jour (la chaleur du fournil augmente les pertes)",
    "type_eau": "Eau plate faiblement minéralisée",
    "moments_hydratation": "Boire régulièrement pendant le travail au fournil. Garder une gourde inox à portée de main.",
    "phytotherapie_plantes": "- Bardane (Arctium lappa) : dépurative cutanée\n- Pensée sauvage (Viola tricolor) : anti-eczéma traditionnelle\n- Desmodium : hépatoprotecteur et anti-allergique\n- Réglisse (Glycyrrhiza glabra) : anti-inflammatoire et surrénalien",
    "phytotherapie_posologie": "Bardane : 300mg 3x/jour. Pensée sauvage : infusion 3 tasses/jour. Desmodium : 200mg 2x/jour. Réglisse : 1 tasse/jour (sauf HTA).",
    "phytotherapie_precautions": "Réglisse : attention à la tension artérielle, ne pas dépasser 3 semaines consécutives. Déconseillé si HTA.",
    "complements": "- Probiotiques L. rhamnosus GG : 20 milliards UFC/jour\n- L-Glutamine : 5g/jour (perméabilité intestinale)\n- Oméga 3 : 2g/jour EPA+DHA\n- Zinc bisglycinate : 15mg/jour\n- Vitamine D3 : 4000 UI/jour",
    "precautions_complements": "L-glutamine : contre-indiquée si insuffisance rénale ou hépatique. Zinc : à distance des repas riches en fer.",
    "huiles_essentielles": "- HE Lavande aspic (Lavandula latifolia) : en application sur les plaques (1 goutte pure max)\n- HE Tea tree : si surinfection (1 goutte dans la crème)\n- HE Camomille allemande : anti-inflammatoire cutanée, en dilution 2% dans huile de calendula",
    "precautions_he": "Tester au préalable sur une petite zone. Ne pas appliquer sur peau lésée ouverte. Port de gants au travail recommandé.",
    "hydrologie": "Application de compresses d eau thermale (Avène, La Roche-Posay) sur les plaques 2x/jour. Bains d avoine colloïdale 2x/semaine.",
    "activite_type": "Étirements le matin, marche en nature, sieste réparatrice",
    "activite_frequence": "Marche 20-30 min quotidienne. Étirements 10 min au réveil et après le travail.",
    "activite_conseils": "Le travail physique au fournil compte comme activité. Ne pas en rajouter en excès. Prioriser la récupération.",
    "equilibre_psycho": "L eczéma a souvent une composante émotionnelle (la peau est l organe du contact et de la limite). Explorer les sources de frustration.",
    "gestion_charge_mentale": "Horaires décalés = charge mentale particulière. Structurer les temps de repos et de vie sociale.",
    "techniques_respiratoires": "Respiration abdominale au réveil (4h du matin) et avant la sieste. 5 min suffisent pour recentrer.",
    "automassages": "Application du baume au calendula = moment d automassage des mains. Prendre le temps de masser chaque doigt.",
    "points_reflexes": "Point 11 Gros Intestin (Quchi) : pli du coude, face externe. Anti-inflammatoire cutané. Masser 3 min 2x/jour.",
    "seances_recommandees": "Acupuncture (très efficace sur l eczéma). Drainage lymphatique 1x/mois.",
    "sommeil_routine": "Coucher à 20h30 (levé à 2h30). Bain tiède à 20h. Chambre à 17°C. Infusion passiflore.",
    "sommeil_environnement": "Volets occultants impératifs. Bouchons d oreilles. Chambre très fraîche. Draps en coton bio (peau sensible).",
    "sommeil_conseils": "Les horaires décalés perturbent le rythme circadien. La sieste de 20 min est INDISPENSABLE. Régularité maximale même le week-end.",
    "environnement_air": "Port de gants au fournil si possible. Crème barrière avant le travail.",
    "environnement_produits": "Savon surgras sans parfum. Lessive hypoallergénique (Le Chat bébé ou similaire). Pas d adoucissant.",
    "environnement_perturbateurs": "L exposition professionnelle au gluten est irréductible. Maximiser la protection cutanée (gants, crème barrière) et compenser par l éviction alimentaire.",
    "suivi_indicateurs": "- Score SCORAD simplifié (étendue et intensité eczéma)\n- Nombre de nuits de sommeil > 6h\n- Niveau de fatigue (1-10)\n- Photos comparatives des mains (mensuel)",
    "suivi_prochain_rdv": "Dans 6 semaines",
    "suivi_entre_temps": "Journal dans l application. M envoyer des photos des mains toutes les 2 semaines pour suivi visuel.",
    "message_cloture": "Philippe, votre eczéma est un signal de votre corps. Avec la bonne approche, on peut significativement l améliorer même dans votre contexte professionnel. Courage, les premiers résultats arrivent généralement dans les 4 à 6 semaines.",
    "notes_libres": "Artisan très courageux, horaires contraignants. L exposition professionnelle au gluten est le principal obstacle. Travailler sur la barrière cutanée et la perméabilité intestinale en priorité. Coordonner avec dermatologue."
  }$cp10$::jsonb, NOW()-INTERVAL '5 months', false, NOW()-INTERVAL '5 months')
  ON CONFLICT (consultant_id, version) DO NOTHING;

  -- Lucas Bernard (c6) – Acné adolescent (version 1 draft – plan en cours d élaboration)
  INSERT INTO consultant_plans (id, consultant_id, practitioner_id, version, status, content, shared_at, ai_generated, created_at)
  VALUES ('d0000000-0000-4000-a000-000000000006', v_c6, v_practitioner_id, 1, 'draft', $cp6${
    "message_accueil": "Lucas, voici ton programme pour améliorer ta peau. On va travailler ensemble sur ton alimentation et quelques compléments naturels.",
    "duree_programme": "3 mois",
    "date_debut_conseille": "Dès réception",
    "objectifs_principaux": "1. Réduire l inflammation cutanée (acné)\n2. Améliorer l alimentation (réduction des produits ultra-transformés)\n3. Soutenir l élimination cutanée",
    "actions_prioritaires_semaine_1": "- Commencer le zinc\n- Remplacer les sodas par de l eau et des infusions\n- Réduire les fast-food à 1x/semaine maximum\n- Nettoyage doux du visage matin et soir (savon surgras)",
    "principes_alimentaires": "Réduction progressive des aliments à index glycémique élevé (déclencheurs d acné). Augmentation des légumes et aliments riches en zinc et vitamine A.",
    "aliments_a_privilegier": "Carottes, patate douce, poissons, œufs, noix, fruits frais, légumes verts, graines de courge (zinc)",
    "aliments_a_limiter": "Sodas, bonbons, fast-food, pain blanc, chips, lait de vache, fromage fondu, chocolat au lait",
    "rythme_repas": "3 repas + 1 goûter. NE PAS sauter le petit-déjeuner.",
    "objectif_hydratation": "1.5L par jour (remplacer les sodas)",
    "type_eau": "Eau plate ou eau aromatisée maison (rondelles de citron, menthe)",
    "moments_hydratation": "Gourde à emmener au lycée. Boire régulièrement pendant la journée.",
    "complements": "- Zinc bisglycinate : 15mg/jour au repas\n- Probiotiques L. rhamnosus : 10 milliards UFC/jour\n- Oméga 3 : 1g/jour",
    "precautions_complements": "Zinc à prendre pendant un repas pour éviter les nausées.",
    "huiles_essentielles": "- HE Tea tree : 1 goutte pure sur chaque bouton le soir (application locale uniquement)",
    "precautions_he": "Ne pas appliquer sur tout le visage. Application ciblée sur les boutons uniquement.",
    "activite_type": "Sport au choix : football, basket, natation",
    "activite_frequence": "3 à 4 fois par semaine",
    "activite_conseils": "La transpiration peut aggraver si on ne rince pas après. Douche immédiatement après le sport.",
    "sommeil_routine": "Coucher avant 23h les jours de cours. Écrans coupés 30 min avant.",
    "sommeil_environnement": "Taie d oreiller changée 2x/semaine (bactéries = boutons).",
    "sommeil_conseils": "8 à 9h de sommeil nécessaires à cet âge pour la régénération cutanée.",
    "suivi_indicateurs": "- Nombre de nouveaux boutons par semaine\n- Nombre de sodas/fast-food par semaine\n- Photos mensuelles du visage",
    "suivi_prochain_rdv": "Dans 6 semaines",
    "suivi_entre_temps": "Envoie-moi un message si tu as des questions. Photos du visage toutes les 2 semaines.",
    "message_cloture": "Lucas, la patience est la clé. Les résultats sur l acné prennent 6 à 8 semaines. Tiens bon avec les changements alimentaires, ça vaut le coup !",
    "notes_libres": "Adolescent coopératif mais alimentation très ancrée. Transition progressive obligatoire. La mère est très impliquée, bon soutien familial."
  }$cp6$::jsonb, NULL, false, NOW()-INTERVAL '3 months')
  ON CONFLICT (consultant_id, version) DO NOTHING;

  -- Marc Lefebvre (c8) – RGO & surpoids
  INSERT INTO consultant_plans (id, consultant_id, practitioner_id, version, status, content, shared_at, ai_generated, created_at)
  VALUES ('d0000000-0000-4000-a000-000000000008', v_c8, v_practitioner_id, 1, 'shared', $cp8${
    "message_accueil": "Marc, voici votre programme pour retrouver un confort digestif et amorcer une perte de poids durable, compatible avec votre vie professionnelle active.",
    "duree_programme": "4 mois",
    "date_debut_conseille": "Dès réception",
    "objectifs_principaux": "1. Sevrage progressif des IPP avec relais naturel\n2. Perte de poids de 8-10 kg en 4 mois\n3. Gestion des repas d affaires",
    "actions_prioritaires_semaine_1": "- NE PAS arrêter les IPP brutalement : réduction progressive sur 6 semaines\n- Commencer le lithothamne et la mélatonine le soir\n- Mastiquer 20 fois chaque bouchée\n- Dîner avant 20h, rien après",
    "principes_alimentaires": "Alimentation anti-reflux : éviter les aliments acides, les graisses cuites, les repas copieux. Fractionnement possible. Perte de poids progressive par rééquilibrage.",
    "aliments_a_privilegier": "Légumes cuits, poissons, volaille, riz, pomme de terre, banane, amande, gingembre, fenouil",
    "aliments_a_limiter": "Alcool (surtout vin blanc et champagne), tomates, agrumes, café, chocolat, menthe, oignon cru, fritures",
    "rythme_repas": "3 repas + 1 collation à 16h. Repas d affaires : choisir les options les plus légères, éviter l alcool.",
    "objectif_hydratation": "1.5L par jour entre les repas",
    "type_eau": "Eau alcaline (Vichy Célestins) en cas de crise. Eau plate le reste du temps.",
    "moments_hydratation": "Ne JAMAIS boire pendant les repas (dilue les sucs gastriques). Boire 30 min avant ou 1h30 après.",
    "complements": "- Lithothamne : 1g 3x/jour avant les repas (tamponne l acidité)\n- Mélatonine : 3mg le soir (protège l œsophage)\n- DGL (réglisse déglycyrrhizinée) : 380mg 3x/jour avant les repas\n- Probiotiques : 10 milliards UFC/jour",
    "precautions_complements": "Mélatonine : peut causer de la somnolence, prendre au coucher. DGL : la forme déglycyrrhizinée est sans risque tensionnel.",
    "activite_type": "Marche rapide, natation, vélo d appartement",
    "activite_frequence": "4 à 5 fois par semaine, 30-45 min. Marche post-déjeuner quotidienne.",
    "activite_conseils": "Pas de sport dans les 2h suivant un repas (aggrave le reflux). Éviter les exercices de flexion abdominale.",
    "sommeil_routine": "Dîner léger à 19h. Pas de position allongée avant 3h après le repas. Surélever la tête du lit de 15 cm.",
    "sommeil_conseils": "Dormir sur le côté gauche réduit le reflux nocturne. Oreiller anti-reflux recommandé.",
    "suivi_indicateurs": "- Nombre de crises de reflux par semaine\n- Poids hebdomadaire\n- Score de bien-être digestif (1-10)\n- Dose d IPP (suivi du sevrage)",
    "suivi_prochain_rdv": "Dans 4 semaines",
    "suivi_entre_temps": "Journal de bord. Me contacter immédiatement si remontées acides violentes ou douleur thoracique.",
    "message_cloture": "Marc, le sevrage des IPP est possible mais doit être progressif et encadré. Les résultats viennent avec la régularité. Courage pour la gestion des repas d affaires – c est votre plus grand défi !",
    "notes_libres": "Patient motivé mais contexte professionnel difficile (déplacements, repas d affaires). Le no-show est un signal : relancer et rassurer. Sevrage IPP à coordonner avec gastro-entérologue."
  }$cp8$::jsonb, NOW()-INTERVAL '4 months', false, NOW()-INTERVAL '4 months')
  ON CONFLICT (consultant_id, version) DO NOTHING;

  -- Amina Benali (c9) – Migraines étudiante
  INSERT INTO consultant_plans (id, consultant_id, practitioner_id, version, status, content, shared_at, ai_generated, created_at)
  VALUES ('d0000000-0000-4000-a000-000000000009', v_c9, v_practitioner_id, 1, 'shared', $cp9${
    "message_accueil": "Amina, voici ton programme pour réduire tes migraines et mieux gérer le stress des examens.",
    "duree_programme": "3 mois",
    "date_debut_conseille": "Immédiatement",
    "objectifs_principaux": "1. Réduire la fréquence des migraines (de 3-4 à 1 ou moins par mois)\n2. Diminuer la consommation de caféine\n3. Régulariser l alimentation et le sommeil",
    "actions_prioritaires_semaine_1": "- Réduire le café à 3 tasses/jour (puis 2, puis 1 sur 3 semaines)\n- Commencer le magnésium bisglycinate\n- Ne plus sauter le petit-déjeuner\n- Grande camomille en prévention",
    "principes_alimentaires": "Alimentation régulière et riche en magnésium. Éviter les déclencheurs de migraine alimentaires. Ne jamais sauter de repas (l hypoglycémie déclenche les crises).",
    "aliments_a_privilegier": "Céréales complètes, banane, amandes, graines de tournesol, épinards, avocat, gingembre (anti-migraineux naturel), eau",
    "aliments_a_limiter": "Café (réduction progressive), chocolat en excès, fromages affinés, charcuterie (nitrites), alcool, glutamate (plats asiatiques industriels)",
    "rythme_repas": "3 repas + 2 collations OBLIGATOIRES. Ne JAMAIS sauter de repas. Garder des amandes et une banane dans le sac.",
    "objectif_hydratation": "2L par jour (la déshydratation est un déclencheur majeur de migraines)",
    "type_eau": "Eau riche en magnésium (Hépar, Rozana)",
    "moments_hydratation": "Gourde à emmener partout. Boire dès le réveil. Alarme sur le téléphone toutes les 2h si nécessaire.",
    "phytotherapie_plantes": "- Grande camomille (Tanacetum parthenium) : prévention des migraines (validée scientifiquement)\n- Pétasite (Petasites hybridus) : anti-migraineux\n- Mélisse : anxiolytique doux",
    "phytotherapie_posologie": "Grande camomille : 100-250mg/jour d extrait standardisé. Mélisse : infusion le soir ou avant les révisions.",
    "phytotherapie_precautions": "Grande camomille : déconseillée si allergie aux astéracées. Pétasite : uniquement les formes certifiées sans alcaloïdes pyrrolizidiniques.",
    "complements": "- Magnésium bisglycinate : 400mg/jour (matin et soir)\n- Riboflavine (vitamine B2) : 400mg/jour (prévention migraine)\n- CoQ10 : 150mg/jour\n- Oméga 3 : 1g/jour",
    "precautions_complements": "Riboflavine à haute dose : colore les urines en jaune vif (normal). Magnésium : commencer à 200mg et augmenter progressivement.",
    "activite_type": "Yoga, marche, natation (éviter les sports à impact)",
    "activite_frequence": "3 à 4 séances par semaine, 30 min. Régulières, jamais trop intenses.",
    "activite_conseils": "L effort intense peut déclencher une migraine. Toujours s échauffer progressivement. Bien s hydrater avant, pendant, après.",
    "equilibre_psycho": "Le stress des examens est le principal facteur déclenchant. Mettre en place des stratégies anti-stress AVANT les périodes de partiels.",
    "gestion_charge_mentale": "Planifier les révisions pour éviter le bourrage de dernière minute. Technique Pomodoro (25 min de travail, 5 min de pause).",
    "techniques_respiratoires": "Cohérence cardiaque avant les révisions et les examens. 5 min suffisent pour calmer le système nerveux.",
    "sommeil_routine": "Coucher à 23h max les jours de cours. 7-8h de sommeil minimum. Pas de révisions au lit.",
    "sommeil_conseils": "Le manque de sommeil ET l excès de sommeil (grasses matinées) sont des déclencheurs de migraine. Régularité !",
    "suivi_indicateurs": "- Nombre de migraines par mois\n- Nombre de cafés par jour\n- Nombre de repas sautés par semaine\n- Intensité des migraines (1-10)",
    "suivi_prochain_rdv": "Dans 4 semaines",
    "suivi_entre_temps": "Tenir un journal des migraines dans l application (date, intensité, durée, déclencheur potentiel).",
    "message_cloture": "Amina, les migraines ne sont pas une fatalité. Avec le magnésium, la grande camomille et les ajustements de mode de vie, on peut réduire significativement les crises. Courage pour les examens !",
    "notes_libres": "Étudiante motivée, bon niveau de compréhension. Composante hormonale des migraines (cataméniales) : suivi gynéco à coordonner si pilule. Stress examens = facteur principal."
  }$cp9$::jsonb, NOW()-INTERVAL '2 months', false, NOW()-INTERVAL '2 months')
  ON CONFLICT (consultant_id, version) DO NOTHING;

  -- Isabelle Fontaine (c11) – Détox & optimisation (AI-generated plan)
  INSERT INTO consultant_plans (id, consultant_id, practitioner_id, version, status, content, shared_at, ai_generated, created_at)
  VALUES ('d0000000-0000-4000-a000-00000000000b', v_c11, v_practitioner_id, 1, 'shared', $cp11${
    "message_accueil": "Isabelle, voici votre programme d optimisation détox et vitalité, adapté à votre excellent niveau de base en tant que professeure de yoga.",
    "duree_programme": "2 mois",
    "date_debut_conseille": "Immédiatement",
    "objectifs_principaux": "1. Cure détox hépatique complète\n2. Optimisation micronutritionnelle\n3. Introduction de super-aliments ciblés",
    "actions_prioritaires_semaine_1": "- Commencer la cure de radis noir + artichaut\n- Réduire les portions de protéines animales\n- Jus vert le matin (céleri, concombre, épinard, citron, gingembre)\n- Augmenter les crucifères",
    "principes_alimentaires": "Alimentation végétale dominante, bio, riche en antioxydants et en composés soufrés pour soutenir les phases 1 et 2 de détoxification hépatique.",
    "aliments_a_privilegier": "Crucifères (brocoli, chou kale), radis noir, artichaut, citron, curcuma, betterave, ail, oignon, graines germées, algues, spiruline, herbe de blé",
    "aliments_a_limiter": "Protéines animales (réduire à 3x/semaine), café (1 max), alcool (0 pendant la cure), sucres raffinés, produits transformés",
    "rythme_repas": "3 repas légers. Jus vert le matin. Possibilité de jeûne intermittent 16/8 si bien toléré.",
    "objectif_hydratation": "2L minimum (essentiel pour l élimination)",
    "type_eau": "Eau filtrée ou eau de source. Eau tiède citronnée au réveil.",
    "moments_hydratation": "Grand verre au réveil. Tisanes détox entre les repas. Jamais pendant les repas.",
    "complements": "- Radis noir : 2 ampoules/jour pendant 3 semaines\n- Artichaut : 300mg 2x/jour\n- Desmodium : 200mg 3x/jour (hépatoprotecteur)\n- Spiruline : 5g/jour (progressivement)\n- Chlorella : 3g/jour (chélation)\n- Maca : 1.5g/jour (vitalité, adaptogène)",
    "precautions_complements": "Spiruline : commencer à 1g et augmenter de 1g tous les 3 jours (crises de détox possibles). Chlorella : idem progression lente.",
    "huiles_essentielles": "- HE Citron (Citrus limon) : 2 gouttes dans 1 cuillère d huile d olive le matin (drainage hépatique, 3 semaines max)\n- HE Romarin à verbénone : 1 goutte sous le pied droit (projection hépatique) le matin",
    "precautions_he": "Citron : photosensibilisant, pas d exposition solaire dans les 6h. Romarin verbénone : 3 semaines max en continu.",
    "activite_type": "Yoga quotidien (pratique professionnelle), marche en forêt, nage en eau libre",
    "activite_frequence": "Yoga quotidien. 2 sorties nature par semaine minimum.",
    "activite_conseils": "Pendant la cure détox, éviter les efforts trop intenses (fatigue possible les premiers jours). Torsions en yoga pour stimuler le foie.",
    "equilibre_psycho": "Vous êtes déjà très avancée dans la gestion du mental. Maintenir les pratiques méditatives. Approfondir la méditation de pleine conscience.",
    "sommeil_routine": "Yoga nidra le soir. Infusion de tulsi (basilic sacré). Coucher tôt pendant la cure.",
    "suivi_indicateurs": "- Énergie quotidienne (1-10)\n- Qualité de la peau\n- Qualité du sommeil\n- Bien-être général",
    "suivi_prochain_rdv": "Dans 6 semaines",
    "suivi_entre_temps": "Journal de bord. Partager les ressentis pendant la cure détox (crises de détox normales les 3-4 premiers jours).",
    "message_cloture": "Isabelle, avec votre niveau de conscience corporelle et votre discipline, cette cure va donner d excellents résultats. Écoutez votre corps et n hésitez pas à ralentir si nécessaire.",
    "notes_libres": "Consultante experte, très autonome. Ne pas infantiliser. Proposer des approches avancées. Excellent potentiel de résultats rapides vu le terrain de base."
  }$cp11$::jsonb, NOW()-INTERVAL '3 months', true, NOW()-INTERVAL '3 months')
  ON CONFLICT (consultant_id, version) DO NOTHING;

  -- Robert Durand (c12) – Prévention cardiovasculaire
  INSERT INTO consultant_plans (id, consultant_id, practitioner_id, version, status, content, shared_at, ai_generated, created_at)
  VALUES ('d0000000-0000-4000-a000-00000000000c', v_c12, v_practitioner_id, 1, 'shared', $cp12${
    "message_accueil": "Robert, voici votre programme de prévention cardiovasculaire naturelle. Il vise à réduire votre cholestérol et stabiliser votre tension en complément de votre traitement médical.",
    "duree_programme": "4 mois puis réévaluation",
    "date_debut_conseille": "Dès réception",
    "objectifs_principaux": "1. Réduire le cholestérol LDL (objectif < 1.40 g/L)\n2. Stabiliser la tension artérielle (objectif < 130/80)\n3. Réduire le risque cardiovasculaire global",
    "actions_prioritaires_semaine_1": "- Commencer oméga 3 + ail noir + CoQ10\n- Réduire le fromage à 1 portion/jour\n- Remplacer le beurre par huile d olive et purée d amande\n- Augmenter les fibres solubles (avoine, pommes)",
    "principes_alimentaires": "Régime méditerranéen adapté. Riche en fibres solubles (réduction du cholestérol), oméga 3, antioxydants. Réduction des graisses saturées sans privation excessive.",
    "aliments_a_privilegier": "Avoine (bêta-glucanes), noix (30g/jour), poissons gras 3x/semaine, légumineuses, ail, huile d olive vierge, fruits rouges, graines de lin",
    "aliments_a_limiter": "Beurre (remplacer par huile d olive), fromage (1 portion/jour max vs 2 avant), charcuterie (1x/semaine max), pâtisseries (occasionnel)",
    "rythme_repas": "3 repas réguliers. Pas de grignotage. Verre de vin rouge : 1 par jour maximum (pas d augmentation).",
    "objectif_hydratation": "1.5L par jour",
    "type_eau": "Eau faiblement minéralisée",
    "moments_hydratation": "Répartir dans la journée. Infusion d aubépine l après-midi.",
    "complements": "- Oméga 3 EPA/DHA : 3g/jour (dose cardioprotectrice)\n- Ail noir vieilli : 600mg 2x/jour\n- Coenzyme Q10 : 200mg/jour (compense la déplétion par amlodipine)\n- Phytostérols : 2g/jour (réduction LDL de 10%)\n- Vitamine K2 MK-7 : 100µg/jour (protection artérielle)",
    "precautions_complements": "Oméga 3 haute dose : surveiller INR si aspirine. Ail : interaction possible avec anticoagulants et antihypertenseurs. Vitamine K2 : pas de contre-indication avec aspirine faible dose.",
    "phytotherapie_plantes": "- Aubépine (Crataegus) : cardioprotecteur, régulateur tensionnel\n- Olivier (Olea europaea) : hypotenseur, hypocholestérolémiant\n- Levure de riz rouge : statine naturelle (alternative si résultats insuffisants)",
    "phytotherapie_posologie": "Aubépine : 300mg 2x/jour. Feuille d olivier : 500mg 2x/jour. Levure de riz rouge : seulement si échec des autres mesures (10mg monacoline K/jour).",
    "phytotherapie_precautions": "Levure de riz rouge = même mécanisme que les statines, mêmes précautions (surveiller CPK et transaminases). À discuter avec le cardiologue.",
    "activite_type": "Marche rapide, vélo, jardinage actif (bêcher, ratisser)",
    "activite_frequence": "Activité d endurance 30-45 min 5x/semaine. Jardinage quotidien maintenu.",
    "activite_conseils": "Activité régulière et modérée plutôt qu intense. Surveillance de la fréquence cardiaque (ne pas dépasser 130 bpm).",
    "sommeil_routine": "Coucher régulier à 22h30. Pas de nouvelles stressantes le soir. Infusion aubépine + tilleul.",
    "suivi_indicateurs": "- Bilan lipidique tous les 3 mois\n- Tension artérielle 2x/semaine à domicile\n- Poids mensuel\n- Périmètre abdominal mensuel",
    "suivi_prochain_rdv": "Dans 8 semaines (après bilan lipidique de contrôle)",
    "suivi_entre_temps": "Relevés tensionnels dans l application. Me contacter si douleur thoracique, essoufflement inhabituel ou palpitations.",
    "message_cloture": "Robert, votre motivation est votre meilleur atout. Les études montrent que le régime méditerranéen réduit le risque cardiovasculaire de 30%. Avec les compléments ciblés, vous avez toutes les chances de ramener votre cholestérol dans les normes. On fait le point après le prochain bilan sanguin.",
    "notes_libres": "Patient très motivé par la prévention (ATCD familial père). Cardiologue informé de l approche naturopathique. Objectif : éviter les statines. Si LDL ne baisse pas sous 1.40 en 3 mois, discuter levure de riz rouge ou accepter les statines."
  }$cp12$::jsonb, NOW()-INTERVAL '4 months', false, NOW()-INTERVAL '4 months')
  ON CONFLICT (consultant_id, version) DO NOTHING;

  -- ============================================
  -- Step 6 : Prescriptions & Prescription Items
  -- ============================================
  INSERT INTO prescriptions (id, consultant_id, practitioner_id, name, notes, start_date, end_date, created_at) VALUES
    (v_pres1,  v_c1,  v_practitioner_id, 'Protocole SII – Phase 1',           'Probiotiques, L-glutamine, magnésium. Réévaluer à M+1.',                   (NOW()-INTERVAL '6 months')::date, (NOW()-INTERVAL '3 months')::date, NOW()-INTERVAL '6 months'),
    (v_pres2,  v_c2,  v_practitioner_id, 'Complémentation sportive trail',     'Magnésium, fer, oméga 3, spiruline. À maintenir pendant la préparation.',   (NOW()-INTERVAL '5 months')::date, (NOW()-INTERVAL '1 month')::date,  NOW()-INTERVAL '5 months'),
    (v_pres3,  v_c3,  v_practitioner_id, 'Reminéralisation post-partum',       'Fer bisglycinate, vit D, magnésium, oméga 3 DHA. Compatible allaitement.',  (NOW()-INTERVAL '4 months')::date, (NOW()-INTERVAL '1 month')::date,  NOW()-INTERVAL '4 months'),
    (v_pres4,  v_c4,  v_practitioner_id, 'Confort prostatique & sommeil',      'Saw palmetto, zinc, sélénium, magnésium.',                                  (NOW()-INTERVAL '7 months')::date, (NOW()-INTERVAL '1 month')::date,  NOW()-INTERVAL '7 months'),
    (v_pres5,  v_c5,  v_practitioner_id, 'Accompagnement ménopause',           'Isoflavones, vit D, calcium, magnésium, huile d onagre.',                   (NOW()-INTERVAL '6 months')::date, (NOW()-INTERVAL '2 months')::date, NOW()-INTERVAL '6 months'),
    (v_pres7,  v_c7,  v_practitioner_id, 'Anti-douleur & sommeil fibromyalgie','Magnésium forte dose, oméga 3, CoQ10, vit D, PEA.',                         (NOW()-INTERVAL '8 months')::date, (NOW()-INTERVAL '2 months')::date, NOW()-INTERVAL '8 months'),
    (v_pres8,  v_c8,  v_practitioner_id, 'Sevrage IPP & gestion reflux',       'Lithothamne, mélatonine, DGL, probiotiques.',                               (NOW()-INTERVAL '4 months')::date, (NOW()-INTERVAL '1 month')::date,  NOW()-INTERVAL '4 months'),
    (v_pres10, v_c10, v_practitioner_id, 'Eczéma & perméabilité intestinale',  'Probiotiques, L-glutamine, oméga 3, zinc, vit D.',                          (NOW()-INTERVAL '5 months')::date, (NOW()-INTERVAL '1 month')::date,  NOW()-INTERVAL '5 months')
  ON CONFLICT (id) DO NOTHING;

  -- Prescription Items
  INSERT INTO prescription_items (id, prescription_id, name, dosage, frequency, duration, instructions, created_at) VALUES
    -- Sophie (pres1)
    (v_pi_1_1,                                     v_pres1, 'Probiotiques Lactobacillus rhamnosus GG', '10 milliards UFC', '1x/jour',   90, 'Le matin à jeun avec un grand verre d eau. Commencer progressivement.',                NOW()-INTERVAL '6 months'),
    (v_pi_1_2,                                     v_pres1, 'L-Glutamine',                             '5g',               '1x/jour',   90, 'Le matin dans un verre d eau tiède, à jeun.',                                          NOW()-INTERVAL '6 months'),
    ('e1000000-0000-4000-a000-000000000003',        v_pres1, 'Magnésium bisglycinate',                  '300mg',            '1x/jour',   90, 'Le soir au dîner.',                                                                    NOW()-INTERVAL '6 months'),
    ('e1000000-0000-4000-a000-000000000004',        v_pres1, 'Vitamine D3',                             '2000 UI',          '1x/jour',   90, 'Au déjeuner avec un repas contenant du gras.',                                          NOW()-INTERVAL '6 months'),
    ('e1000000-0000-4000-a000-000000000005',        v_pres1, 'Mélisse',                                 '300mg',            '3x/jour',   60, 'Avant chaque repas. Antispasmodique digestif.',                                         NOW()-INTERVAL '6 months'),
    -- Thomas (pres2)
    ('e1000000-0000-4000-a000-000000000006',        v_pres2, 'Magnésium bisglycinate',                  '400mg',            '2x/jour',  120, '200mg matin et 200mg soir.',                                                            NOW()-INTERVAL '5 months'),
    ('e1000000-0000-4000-a000-000000000007',        v_pres2, 'Fer bisglycinate',                        '14mg',             '1x/jour',   90, 'Le matin à distance du thé et du café (2h). Contrôle ferritine à M+3.',                 NOW()-INTERVAL '5 months'),
    ('e1000000-0000-4000-a000-000000000008',        v_pres2, 'Oméga 3 EPA/DHA',                         '2g',               '1x/jour',  120, 'Au déjeuner.',                                                                          NOW()-INTERVAL '5 months'),
    ('e1000000-0000-4000-a000-000000000009',        v_pres2, 'Spiruline',                               '5g',               '1x/jour',  120, 'Au petit-déjeuner, dans un smoothie ou un jus. Commencer à 1g et augmenter de 1g/jour.', NOW()-INTERVAL '5 months'),
    ('e1000000-0000-4000-a000-00000000000a',        v_pres2, 'BCAA',                                    '10g',              'Autour effort', 90, '5g 30 min avant et 5g immédiatement après l effort.',                                NOW()-INTERVAL '5 months'),
    ('e1000000-0000-4000-a000-00000000000b',        v_pres2, 'Rhodiola rosea',                          '400mg',            '1x/jour',   90, 'Le matin à jeun. Arrêter la semaine de la course.',                                     NOW()-INTERVAL '5 months'),
    -- Émilie (pres3)
    ('e1000000-0000-4000-a000-00000000000c',        v_pres3, 'Fer bisglycinate',                        '20mg',             '1x/jour',   90, 'Le matin avec vitamine C. Compatible allaitement.',                                     NOW()-INTERVAL '4 months'),
    ('e1000000-0000-4000-a000-00000000000d',        v_pres3, 'Vitamine D3',                             '4000 UI',          '1x/jour',   90, 'Au déjeuner.',                                                                          NOW()-INTERVAL '4 months'),
    ('e1000000-0000-4000-a000-00000000000e',        v_pres3, 'Magnésium bisglycinate',                  '300mg',            '1x/jour',   90, 'Le soir.',                                                                              NOW()-INTERVAL '4 months'),
    ('e1000000-0000-4000-a000-00000000000f',        v_pres3, 'Vitamine C naturelle',                    '500mg',            '1x/jour',   90, 'Le matin avec le fer pour faciliter l absorption.',                                     NOW()-INTERVAL '4 months'),
    ('e1000000-0000-4000-a000-000000000010',        v_pres3, 'Oméga 3 DHA',                             '500mg',            '1x/jour',   90, 'Au déjeuner. Développement cérébral bébé via lait maternel.',                           NOW()-INTERVAL '4 months')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO prescription_items (id, prescription_id, name, dosage, frequency, duration, instructions, created_at) VALUES
    -- Jean-Pierre (pres4)
    ('e1000000-0000-4000-a000-000000000011',        v_pres4, 'Saw Palmetto (Serenoa repens)',       '320mg',   '1x/jour',  120, 'Extrait lipidique standardisé. Au déjeuner. Informer l urologue.',    NOW()-INTERVAL '7 months'),
    ('e1000000-0000-4000-a000-000000000012',        v_pres4, 'Zinc bisglycinate',                   '15mg',    '1x/jour',  120, 'Au dîner.',                                                          NOW()-INTERVAL '7 months'),
    ('e1000000-0000-4000-a000-000000000015',        v_pres4, 'Sélénium',                            '100µg',   '1x/jour',  120, 'Au déjeuner. Ne pas dépasser 200µg/jour.',                            NOW()-INTERVAL '7 months'),
    ('e1000000-0000-4000-a000-000000000016',        v_pres4, 'Lycopène',                            '15mg',    '1x/jour',  120, 'Au repas.',                                                          NOW()-INTERVAL '7 months'),
    ('e1000000-0000-4000-a000-000000000017',        v_pres4, 'Magnésium bisglycinate',              '300mg',   '1x/jour',  120, 'Le soir pour le sommeil.',                                           NOW()-INTERVAL '7 months'),
    -- Nathalie (pres5)
    (v_pi_5_1,                                      v_pres5, 'Isoflavones de trèfle rouge',         '80mg',    '1x/jour',  120, 'Le matin. Effet progressif sur 4-8 semaines.',                       NOW()-INTERVAL '6 months'),
    (v_pi_5_2,                                      v_pres5, 'Vitamine D3',                         '4000 UI', '1x/jour',  120, 'Au déjeuner. Prévention osseuse ménopause.',                         NOW()-INTERVAL '6 months'),
    ('e1000000-0000-4000-a000-000000000018',        v_pres5, 'Calcium',                             '500mg',   '1x/jour',  120, 'À distance du fer et du zinc (2h).',                                 NOW()-INTERVAL '6 months'),
    ('e1000000-0000-4000-a000-000000000019',        v_pres5, 'Magnésium bisglycinate',              '300mg',   '1x/jour',  120, 'Le soir.',                                                           NOW()-INTERVAL '6 months'),
    ('e1000000-0000-4000-a000-00000000001a',        v_pres5, 'Huile d onagre',                      '1000mg',  '2x/jour',  120, 'Matin et soir. Pour la sécheresse muqueuses.',                       NOW()-INTERVAL '6 months'),
    -- Céline (pres7)
    (v_pi_7_1,                                      v_pres7, 'Magnésium bisglycinate',              '400mg',   '2x/jour',  180, '400mg matin et 400mg soir. Dose élevée pour fibromyalgie.',          NOW()-INTERVAL '8 months'),
    (v_pi_7_2,                                      v_pres7, 'Oméga 3 EPA haute dose',              '3g',      '1x/jour',  180, 'Au déjeuner. Anti-inflammatoire.',                                   NOW()-INTERVAL '8 months'),
    ('e1000000-0000-4000-a000-000000000023',        v_pres7, 'CoQ10',                               '200mg',   '1x/jour',  180, 'Le matin. Énergie mitochondriale.',                                  NOW()-INTERVAL '8 months'),
    ('e1000000-0000-4000-a000-000000000024',        v_pres7, 'Vitamine D3',                         '4000 UI', '1x/jour',  180, 'Au déjeuner.',                                                       NOW()-INTERVAL '8 months'),
    ('e1000000-0000-4000-a000-000000000025',        v_pres7, 'PEA (palmitoylethanolamide)',          '600mg',   '2x/jour',  180, 'Matin et soir. Douleurs neuropathiques.',                            NOW()-INTERVAL '8 months'),
    ('e1000000-0000-4000-a000-000000000026',        v_pres7, 'Griffonia (5-HTP)',                    '100mg',   '1x/jour',  180, 'Le soir à 20h30. NE PAS associer avec ISRS.',                       NOW()-INTERVAL '8 months'),
    -- Marc (pres8)
    ('e1000000-0000-4000-a000-000000000027',        v_pres8, 'Lithothamne',                         '1g',      '3x/jour',   90, 'Avant chaque repas. Tamponne l acidité gastrique.',                  NOW()-INTERVAL '4 months'),
    ('e1000000-0000-4000-a000-000000000028',        v_pres8, 'Mélatonine',                          '3mg',     '1x/jour',   90, 'Au coucher. Protège l œsophage et améliore le sommeil.',             NOW()-INTERVAL '4 months'),
    ('e1000000-0000-4000-a000-000000000029',        v_pres8, 'DGL (réglisse déglycyrrhizinée)',      '380mg',   '3x/jour',   90, 'Avant les repas. Sans risque tensionnel.',                           NOW()-INTERVAL '4 months'),
    ('e1000000-0000-4000-a000-00000000002a',        v_pres8, 'Probiotiques',                        '10 milliards UFC', '1x/jour', 90, 'Le matin à jeun.',                                          NOW()-INTERVAL '4 months'),
    -- Philippe (pres10)
    (v_pi_10_1,                                     v_pres10, 'Probiotiques L. rhamnosus GG',       '20 milliards UFC', '1x/jour', 120, 'Le matin à jeun.',                                          NOW()-INTERVAL '5 months'),
    (v_pi_10_2,                                     v_pres10, 'L-Glutamine',                        '5g',      '1x/jour',  120, 'Le matin dans un verre d eau. Perméabilité intestinale.',            NOW()-INTERVAL '5 months'),
    ('e1000000-0000-4000-a000-000000000033',        v_pres10, 'Oméga 3 EPA/DHA',                    '2g',      '1x/jour',  120, 'Au déjeuner.',                                                      NOW()-INTERVAL '5 months'),
    ('e1000000-0000-4000-a000-000000000034',        v_pres10, 'Zinc bisglycinate',                  '15mg',    '1x/jour',  120, 'Au dîner. À distance du fer.',                                      NOW()-INTERVAL '5 months'),
    ('e1000000-0000-4000-a000-000000000035',        v_pres10, 'Vitamine D3',                        '4000 UI', '1x/jour',  120, 'Au déjeuner.',                                                      NOW()-INTERVAL '5 months')
  ON CONFLICT (id) DO NOTHING;

  -- ============================================
  -- Step 7 : Complement Tracking (14 days for active consultants c1, c5, c7, c10)
  -- ============================================
  -- Sophie (c1) – probiotiques et L-glutamine
  INSERT INTO complement_tracking (consultant_id, complement_id, date, taken, created_at)
  SELECT v_c1, v_pi_1_1, d::date, (random() > 0.1), NOW()  -- 90% adherence
  FROM generate_series(NOW()-INTERVAL '14 days', NOW()-INTERVAL '1 day', INTERVAL '1 day') AS d
  ON CONFLICT (consultant_id, complement_id, date) DO NOTHING;

  INSERT INTO complement_tracking (consultant_id, complement_id, date, taken, created_at)
  SELECT v_c1, v_pi_1_2, d::date, (random() > 0.15), NOW()  -- 85% adherence
  FROM generate_series(NOW()-INTERVAL '14 days', NOW()-INTERVAL '1 day', INTERVAL '1 day') AS d
  ON CONFLICT (consultant_id, complement_id, date) DO NOTHING;

  -- Nathalie (c5) – isoflavones et vit D
  INSERT INTO complement_tracking (consultant_id, complement_id, date, taken, created_at)
  SELECT v_c5, v_pi_5_1, d::date, (random() > 0.05), NOW()  -- 95% adherence
  FROM generate_series(NOW()-INTERVAL '14 days', NOW()-INTERVAL '1 day', INTERVAL '1 day') AS d
  ON CONFLICT (consultant_id, complement_id, date) DO NOTHING;

  INSERT INTO complement_tracking (consultant_id, complement_id, date, taken, created_at)
  SELECT v_c5, v_pi_5_2, d::date, (random() > 0.1), NOW()
  FROM generate_series(NOW()-INTERVAL '14 days', NOW()-INTERVAL '1 day', INTERVAL '1 day') AS d
  ON CONFLICT (consultant_id, complement_id, date) DO NOTHING;

  -- Céline (c7) – magnésium et oméga 3
  INSERT INTO complement_tracking (consultant_id, complement_id, date, taken, created_at)
  SELECT v_c7, v_pi_7_1, d::date, (random() > 0.08), NOW()  -- 92% adherence
  FROM generate_series(NOW()-INTERVAL '14 days', NOW()-INTERVAL '1 day', INTERVAL '1 day') AS d
  ON CONFLICT (consultant_id, complement_id, date) DO NOTHING;

  INSERT INTO complement_tracking (consultant_id, complement_id, date, taken, created_at)
  SELECT v_c7, v_pi_7_2, d::date, (random() > 0.12), NOW()
  FROM generate_series(NOW()-INTERVAL '14 days', NOW()-INTERVAL '1 day', INTERVAL '1 day') AS d
  ON CONFLICT (consultant_id, complement_id, date) DO NOTHING;

  -- Philippe (c10) – probiotiques et L-glutamine
  INSERT INTO complement_tracking (consultant_id, complement_id, date, taken, created_at)
  SELECT v_c10, v_pi_10_1, d::date, (random() > 0.2), NOW()  -- 80% adherence (horaires décalés)
  FROM generate_series(NOW()-INTERVAL '14 days', NOW()-INTERVAL '1 day', INTERVAL '1 day') AS d
  ON CONFLICT (consultant_id, complement_id, date) DO NOTHING;

  INSERT INTO complement_tracking (consultant_id, complement_id, date, taken, created_at)
  SELECT v_c10, v_pi_10_2, d::date, (random() > 0.25), NOW()  -- 75% adherence
  FROM generate_series(NOW()-INTERVAL '14 days', NOW()-INTERVAL '1 day', INTERVAL '1 day') AS d
  ON CONFLICT (consultant_id, complement_id, date) DO NOTHING;

  -- ============================================
  -- Step 8 : Messages (~62 records, 3-4 unread from consultants)
  -- ============================================
  INSERT INTO messages (id, consultant_id, text, body, sender, sender_role, sent_at, created_at, read_by_practitioner) VALUES
    -- Sophie (c1) : conversation active
    ('f0000000-0000-4000-a000-000000000001', v_c1, 'Bonjour Woodeline, j ai commencé les probiotiques ce matin. Juste une question : est-ce normal d avoir un peu plus de ballonnements les premiers jours ?', 'Bonjour Woodeline, j ai commencé les probiotiques ce matin. Juste une question : est-ce normal d avoir un peu plus de ballonnements les premiers jours ?', 'consultant', 'consultant', NOW()-INTERVAL '6 months'+INTERVAL '2 days', NOW()-INTERVAL '6 months'+INTERVAL '2 days', true),
    ('f0000000-0000-4000-a000-000000000002', v_c1, 'Bonjour Sophie ! Oui, c est tout à fait normal. Les probiotiques peuvent provoquer une légère augmentation des ballonnements pendant 3-5 jours le temps que votre microbiote s adapte. Si ça persiste au-delà d une semaine, on ajustera la dose. Courage !', 'Bonjour Sophie ! Oui, c est tout à fait normal. Les probiotiques peuvent provoquer une légère augmentation des ballonnements pendant 3-5 jours le temps que votre microbiote s adapte. Si ça persiste au-delà d une semaine, on ajustera la dose. Courage !', 'praticien', 'practitioner', NOW()-INTERVAL '6 months'+INTERVAL '2 days'+INTERVAL '3 hours', NOW()-INTERVAL '6 months'+INTERVAL '2 days'+INTERVAL '3 hours', true),
    ('f0000000-0000-4000-a000-000000000003', v_c1, 'Merci beaucoup ! Effectivement ça s est calmé après 4 jours. Par contre j ai du mal à faire la cohérence cardiaque 3x par jour, je n y arrive que 2 fois.', 'Merci beaucoup ! Effectivement ça s est calmé après 4 jours. Par contre j ai du mal à faire la cohérence cardiaque 3x par jour, je n y arrive que 2 fois.', 'consultant', 'consultant', NOW()-INTERVAL '6 months'+INTERVAL '8 days', NOW()-INTERVAL '6 months'+INTERVAL '8 days', true),
    ('f0000000-0000-4000-a000-000000000004', v_c1, '2 fois c est déjà très bien Sophie ! L important c est la régularité. Essayez de placer la 3e juste avant le déjeuner, ça aide aussi la digestion. Vous verrez, ça deviendra automatique.', '2 fois c est déjà très bien Sophie ! L important c est la régularité. Essayez de placer la 3e juste avant le déjeuner, ça aide aussi la digestion. Vous verrez, ça deviendra automatique.', 'praticien', 'practitioner', NOW()-INTERVAL '6 months'+INTERVAL '8 days'+INTERVAL '2 hours', NOW()-INTERVAL '6 months'+INTERVAL '8 days'+INTERVAL '2 hours', true),
    ('f0000000-0000-4000-a000-000000000005', v_c1, 'Bonjour, petite mise à jour : je suis à 2 mois de protocole et mes ballonnements ont vraiment diminué ! Mon transit est beaucoup plus régulier. Je suis contente. Par contre, grosse période de stress au travail cette semaine et j ai senti que ça impactait mon ventre.', 'Bonjour, petite mise à jour : je suis à 2 mois de protocole et mes ballonnements ont vraiment diminué ! Mon transit est beaucoup plus régulier. Je suis contente. Par contre, grosse période de stress au travail cette semaine et j ai senti que ça impactait mon ventre.', 'consultant', 'consultant', NOW()-INTERVAL '4 months'+INTERVAL '5 days', NOW()-INTERVAL '4 months'+INTERVAL '5 days', true),
    ('f0000000-0000-4000-a000-000000000006', v_c1, 'Bravo Sophie pour ces résultats ! Le lien stress-intestin est typique du SII. C est pour ça que la cohérence cardiaque est si importante dans votre cas. Pendant les périodes de stress, essayez aussi la respiration 4-7-8 (inspirer 4s, retenir 7s, expirer 8s) quand vous sentez la tension monter. On en reparle à notre prochaine consultation.', 'Bravo Sophie pour ces résultats ! Le lien stress-intestin est typique du SII. C est pour ça que la cohérence cardiaque est si importante dans votre cas. Pendant les périodes de stress, essayez aussi la respiration 4-7-8 (inspirer 4s, retenir 7s, expirer 8s) quand vous sentez la tension monter. On en reparle à notre prochaine consultation.', 'praticien', 'practitioner', NOW()-INTERVAL '4 months'+INTERVAL '5 days'+INTERVAL '4 hours', NOW()-INTERVAL '4 months'+INTERVAL '5 days'+INTERVAL '4 hours', true),
    ('f0000000-0000-4000-a000-000000000007', v_c1, 'Bonjour Woodeline, tout va bien. Je voulais juste vous dire que la respiration 4-7-8 m aide beaucoup, surtout pour m endormir. Merci pour le conseil ! À bientôt pour notre prochain RDV.', 'Bonjour Woodeline, tout va bien. Je voulais juste vous dire que la respiration 4-7-8 m aide beaucoup, surtout pour m endormir. Merci pour le conseil ! À bientôt pour notre prochain RDV.', 'consultant', 'consultant', NOW()-INTERVAL '2 weeks', NOW()-INTERVAL '2 weeks', true),

    -- Thomas (c2) : questions techniques
    ('f0000000-0000-4000-a000-000000000008', v_c2, 'Salut Woodeline ! J ai une question sur la spiruline : je suis à 3g/jour et j ai des selles un peu vertes. C est normal ?', 'Salut Woodeline ! J ai une question sur la spiruline : je suis à 3g/jour et j ai des selles un peu vertes. C est normal ?', 'consultant', 'consultant', NOW()-INTERVAL '4 months'+INTERVAL '10 days', NOW()-INTERVAL '4 months'+INTERVAL '10 days', true),
    ('f0000000-0000-4000-a000-000000000009', v_c2, 'Salut Thomas ! Oui tout à fait, c est la chlorophylle de la spiruline qui donne cette coloration. C est totalement bénin. Continue la progression et passe à 4g la semaine prochaine.', 'Salut Thomas ! Oui tout à fait, c est la chlorophylle de la spiruline qui donne cette coloration. C est totalement bénin. Continue la progression et passe à 4g la semaine prochaine.', 'praticien', 'practitioner', NOW()-INTERVAL '4 months'+INTERVAL '10 days'+INTERVAL '1 hour', NOW()-INTERVAL '4 months'+INTERVAL '10 days'+INTERVAL '1 hour', true),
    ('f0000000-0000-4000-a000-00000000000a', v_c2, 'Top merci ! Autre question : pour la course de samedi (50km), je pense partir sur 500mL/h + 1 gel toutes les 45min. Ça te semble correct ?', 'Top merci ! Autre question : pour la course de samedi (50km), je pense partir sur 500mL/h + 1 gel toutes les 45min. Ça te semble correct ?', 'consultant', 'consultant', NOW()-INTERVAL '2 months'+INTERVAL '3 days', NOW()-INTERVAL '2 months'+INTERVAL '3 days', true),
    ('f0000000-0000-4000-a000-00000000000b', v_c2, 'Pour 50km c est bien. Je te conseille plutôt 1 gel toutes les 30min les 3 premières heures puis toutes les 45min ensuite. N oublie pas les électrolytes dans la boisson et des aliments solides à mi-course (banane, pâte de fruits). Et surtout, bois AVANT d avoir soif !', 'Pour 50km c est bien. Je te conseille plutôt 1 gel toutes les 30min les 3 premières heures puis toutes les 45min ensuite. N oublie pas les électrolytes dans la boisson et des aliments solides à mi-course (banane, pâte de fruits). Et surtout, bois AVANT d avoir soif !', 'praticien', 'practitioner', NOW()-INTERVAL '2 months'+INTERVAL '3 days'+INTERVAL '2 hours', NOW()-INTERVAL '2 months'+INTERVAL '3 days'+INTERVAL '2 hours', true),
    ('f0000000-0000-4000-a000-00000000000c', v_c2, 'Course terminée ! 50km en 6h12, sans trouble digestif. Le plan nutrition a parfaitement fonctionné. Merci !!', 'Course terminée ! 50km en 6h12, sans trouble digestif. Le plan nutrition a parfaitement fonctionné. Merci !!', 'consultant', 'consultant', NOW()-INTERVAL '2 months'+INTERVAL '6 days', NOW()-INTERVAL '2 months'+INTERVAL '6 days', true),
    ('f0000000-0000-4000-a000-00000000000d', v_c2, 'Bravo Thomas ! 6h12 c est un excellent temps et zéro trouble digestif, c est la meilleure nouvelle. Repose-toi bien cette semaine, pas de course avant 5 jours minimum. On débriefera à notre prochaine consultation.', 'Bravo Thomas ! 6h12 c est un excellent temps et zéro trouble digestif, c est la meilleure nouvelle. Repose-toi bien cette semaine, pas de course avant 5 jours minimum. On débriefera à notre prochaine consultation.', 'praticien', 'practitioner', NOW()-INTERVAL '2 months'+INTERVAL '6 days'+INTERVAL '3 hours', NOW()-INTERVAL '2 months'+INTERVAL '6 days'+INTERVAL '3 hours', true)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO messages (id, consultant_id, text, body, sender, sender_role, sent_at, created_at, read_by_practitioner) VALUES
    -- Émilie (c3) : post-partum
    ('f0000000-0000-4000-a000-00000000000e', v_c3, 'Bonjour, j ai un doute : le fer me donne un peu mal au ventre. Est-ce que je peux le prendre au repas plutôt qu à jeun ?', 'Bonjour, j ai un doute : le fer me donne un peu mal au ventre. Est-ce que je peux le prendre au repas plutôt qu à jeun ?', 'consultant', 'consultant', NOW()-INTERVAL '4 months'+INTERVAL '5 days', NOW()-INTERVAL '4 months'+INTERVAL '5 days', true),
    ('f0000000-0000-4000-a000-00000000000f', v_c3, 'Bonjour Émilie ! Oui bien sûr, prenez-le au petit-déjeuner avec votre vitamine C. L absorption sera légèrement réduite mais la tolérance sera bien meilleure. L essentiel c est de le prendre régulièrement.', 'Bonjour Émilie ! Oui bien sûr, prenez-le au petit-déjeuner avec votre vitamine C. L absorption sera légèrement réduite mais la tolérance sera bien meilleure. L essentiel c est de le prendre régulièrement.', 'praticien', 'practitioner', NOW()-INTERVAL '4 months'+INTERVAL '5 days'+INTERVAL '2 hours', NOW()-INTERVAL '4 months'+INTERVAL '5 days'+INTERVAL '2 hours', true),
    ('f0000000-0000-4000-a000-000000000010', v_c3, 'Merci ! Ça va beaucoup mieux au repas. Autre question : mon bébé commence la diversification, est-ce que ça change quelque chose pour mes compléments ?', 'Merci ! Ça va beaucoup mieux au repas. Autre question : mon bébé commence la diversification, est-ce que ça change quelque chose pour mes compléments ?', 'consultant', 'consultant', NOW()-INTERVAL '3 months'+INTERVAL '2 days', NOW()-INTERVAL '3 months'+INTERVAL '2 days', true),
    ('f0000000-0000-4000-a000-000000000011', v_c3, 'Bonne question ! Avec la diversification, les tétées diminuent progressivement donc vos besoins en DHA pour bébé via le lait seront moindres. On en parlera en détail à notre prochaine consultation, mais pour l instant, continuez tout comme c est. Bravo pour tout ce chemin !', 'Bonne question ! Avec la diversification, les tétées diminuent progressivement donc vos besoins en DHA pour bébé via le lait seront moindres. On en parlera en détail à notre prochaine consultation, mais pour l instant, continuez tout comme c est. Bravo pour tout ce chemin !', 'praticien', 'practitioner', NOW()-INTERVAL '3 months'+INTERVAL '2 days'+INTERVAL '5 hours', NOW()-INTERVAL '3 months'+INTERVAL '2 days'+INTERVAL '5 hours', true),

    -- Jean-Pierre (c4) : suivi
    ('f0000000-0000-4000-a000-000000000012', v_c4, 'Bonjour Madame, je voulais vous informer que mes levers nocturnes sont passés de 3 à 1 depuis que je prends le saw palmetto. C est encourageant ! Mon urologue est au courant.', 'Bonjour Madame, je voulais vous informer que mes levers nocturnes sont passés de 3 à 1 depuis que je prends le saw palmetto. C est encourageant ! Mon urologue est au courant.', 'consultant', 'consultant', NOW()-INTERVAL '5 months'+INTERVAL '3 days', NOW()-INTERVAL '5 months'+INTERVAL '3 days', true),
    ('f0000000-0000-4000-a000-000000000013', v_c4, 'Bonjour Jean-Pierre, c est une excellente nouvelle ! Le saw palmetto met généralement 4 à 6 semaines pour agir pleinement, vous êtes sur la bonne voie. Merci d avoir informé votre urologue. Continuez aussi le zinc et les graines de courge.', 'Bonjour Jean-Pierre, c est une excellente nouvelle ! Le saw palmetto met généralement 4 à 6 semaines pour agir pleinement, vous êtes sur la bonne voie. Merci d avoir informé votre urologue. Continuez aussi le zinc et les graines de courge.', 'praticien', 'practitioner', NOW()-INTERVAL '5 months'+INTERVAL '3 days'+INTERVAL '4 hours', NOW()-INTERVAL '5 months'+INTERVAL '3 days'+INTERVAL '4 hours', true),
    ('f0000000-0000-4000-a000-000000000014', v_c4, 'Mon potager donne bien cette saison ! J ai des courgettes, des tomates et du persil frais. Exactement ce que vous m aviez recommandé. Ma femme est impressionnée.', 'Mon potager donne bien cette saison ! J ai des courgettes, des tomates et du persil frais. Exactement ce que vous m aviez recommandé. Ma femme est impressionnée.', 'consultant', 'consultant', NOW()-INTERVAL '3 months'+INTERVAL '10 days', NOW()-INTERVAL '3 months'+INTERVAL '10 days', true),
    ('f0000000-0000-4000-a000-000000000015', v_c4, 'C est merveilleux Jean-Pierre ! Les légumes du potager sont ce qu il y a de mieux – frais, sans pesticides, et l activité de jardinage est excellente pour la santé. Les tomates cuites seront parfaites pour le lycopène. Bravo !', 'C est merveilleux Jean-Pierre ! Les légumes du potager sont ce qu il y a de mieux – frais, sans pesticides, et l activité de jardinage est excellente pour la santé. Les tomates cuites seront parfaites pour le lycopène. Bravo !', 'praticien', 'practitioner', NOW()-INTERVAL '3 months'+INTERVAL '10 days'+INTERVAL '3 hours', NOW()-INTERVAL '3 months'+INTERVAL '10 days'+INTERVAL '3 hours', true),

    -- Nathalie (c5) : ménopause
    ('f0000000-0000-4000-a000-000000000016', v_c5, 'Bonjour, les bouffées ont diminué mais j en ai encore 4-5 par jour. C est normal après 1 mois ? Je m attendais à mieux...', 'Bonjour, les bouffées ont diminué mais j en ai encore 4-5 par jour. C est normal après 1 mois ? Je m attendais à mieux...', 'consultant', 'consultant', NOW()-INTERVAL '5 months'+INTERVAL '3 days', NOW()-INTERVAL '5 months'+INTERVAL '3 days', true),
    ('f0000000-0000-4000-a000-000000000017', v_c5, 'Bonjour Nathalie, passer de 8-10 à 4-5 bouffées en un mois, c est en réalité un très bon résultat ! Les phytoestrogènes mettent 6 à 8 semaines pour atteindre leur plein effet. On va ajouter la sauge officinale en infusion le soir pour accélérer les choses. Patience, ça va continuer à s améliorer !', 'Bonjour Nathalie, passer de 8-10 à 4-5 bouffées en un mois, c est en réalité un très bon résultat ! Les phytoestrogènes mettent 6 à 8 semaines pour atteindre leur plein effet. On va ajouter la sauge officinale en infusion le soir pour accélérer les choses. Patience, ça va continuer à s améliorer !', 'praticien', 'practitioner', NOW()-INTERVAL '5 months'+INTERVAL '3 days'+INTERVAL '2 hours', NOW()-INTERVAL '5 months'+INTERVAL '3 days'+INTERVAL '2 hours', true),
    ('f0000000-0000-4000-a000-000000000018', v_c5, 'Vous aviez raison ! À 2 mois, je suis à 2-3 bouffées par jour et elles sont beaucoup moins intenses. La sauge le soir m aide aussi à mieux dormir. Merci Woodeline !', 'Vous aviez raison ! À 2 mois, je suis à 2-3 bouffées par jour et elles sont beaucoup moins intenses. La sauge le soir m aide aussi à mieux dormir. Merci Woodeline !', 'consultant', 'consultant', NOW()-INTERVAL '3 months'+INTERVAL '5 days', NOW()-INTERVAL '3 months'+INTERVAL '5 days', true),
    ('f0000000-0000-4000-a000-000000000019', v_c5, 'C est formidable Nathalie ! Vous voyez que la patience paie. La sauge est effectivement aussi sédative, c est un bonus. On continue comme ça et on fait le point au prochain rendez-vous.', 'C est formidable Nathalie ! Vous voyez que la patience paie. La sauge est effectivement aussi sédative, c est un bonus. On continue comme ça et on fait le point au prochain rendez-vous.', 'praticien', 'practitioner', NOW()-INTERVAL '3 months'+INTERVAL '5 days'+INTERVAL '3 hours', NOW()-INTERVAL '3 months'+INTERVAL '5 days'+INTERVAL '3 hours', true)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO messages (id, consultant_id, text, body, sender, sender_role, sent_at, created_at, read_by_practitioner) VALUES
    -- Lucas (c6) : ado
    ('f0000000-0000-4000-a000-00000000001a', v_c6, 'Salut, j ai réduit les sodas à 1 par jour au lieu de 3. Mais c est dur de manger des légumes à la cantine, y a que des frites...', 'Salut, j ai réduit les sodas à 1 par jour au lieu de 3. Mais c est dur de manger des légumes à la cantine, y a que des frites...', 'consultant', 'consultant', NOW()-INTERVAL '2 months'+INTERVAL '5 days', NOW()-INTERVAL '2 months'+INTERVAL '5 days', true),
    ('f0000000-0000-4000-a000-00000000001b', v_c6, 'Bravo Lucas pour les sodas ! Pour la cantine, essaie de prendre au moins les crudités d entrée et un fruit en dessert. Et si tu peux amener un goûter maison (amandes + banane), ça sera déjà super.', 'Bravo Lucas pour les sodas ! Pour la cantine, essaie de prendre au moins les crudités d entrée et un fruit en dessert. Et si tu peux amener un goûter maison (amandes + banane), ça sera déjà super.', 'praticien', 'practitioner', NOW()-INTERVAL '2 months'+INTERVAL '5 days'+INTERVAL '4 hours', NOW()-INTERVAL '2 months'+INTERVAL '5 days'+INTERVAL '4 hours', true),
    ('f0000000-0000-4000-a000-00000000001c', v_c6, 'OK je vais essayer. Ma mère me prépare des goûters maintenant. Sinon j ai 2 nouveaux boutons mais moins rouge que d habitude.', 'OK je vais essayer. Ma mère me prépare des goûters maintenant. Sinon j ai 2 nouveaux boutons mais moins rouge que d habitude.', 'consultant', 'consultant', NOW()-INTERVAL '6 weeks'+INTERVAL '3 days', NOW()-INTERVAL '6 weeks'+INTERVAL '3 days', true),
    ('f0000000-0000-4000-a000-00000000001d', v_c6, 'Moins rouge c est un bon signe ! Ça veut dire que l inflammation diminue. Le zinc commence à faire effet. Continue comme ça, on verra vraiment la différence à 2-3 mois. Et remercie ta maman pour les goûters !', 'Moins rouge c est un bon signe ! Ça veut dire que l inflammation diminue. Le zinc commence à faire effet. Continue comme ça, on verra vraiment la différence à 2-3 mois. Et remercie ta maman pour les goûters !', 'praticien', 'practitioner', NOW()-INTERVAL '6 weeks'+INTERVAL '3 days'+INTERVAL '2 hours', NOW()-INTERVAL '6 weeks'+INTERVAL '3 days'+INTERVAL '2 hours', true),

    -- Céline (c7) : douleur
    ('f0000000-0000-4000-a000-00000000001e', v_c7, 'Bonjour, j ai eu une grosse crise de douleur hier, tout le côté droit. J ai dû reprendre du tramadol alors que j avais réduit. Je suis découragée.', 'Bonjour, j ai eu une grosse crise de douleur hier, tout le côté droit. J ai dû reprendre du tramadol alors que j avais réduit. Je suis découragée.', 'consultant', 'consultant', NOW()-INTERVAL '4 months'+INTERVAL '8 days', NOW()-INTERVAL '4 months'+INTERVAL '8 days', true),
    ('f0000000-0000-4000-a000-00000000001f', v_c7, 'Céline, ne soyez pas découragée. Les poussées font partie du parcours avec la fibromyalgie. Reprendre le tramadol quand nécessaire n est pas un échec, c est une gestion intelligente. Y a-t-il eu un facteur déclenchant (stress, changement de temps, suractivité) ?', 'Céline, ne soyez pas découragée. Les poussées font partie du parcours avec la fibromyalgie. Reprendre le tramadol quand nécessaire n est pas un échec, c est une gestion intelligente. Y a-t-il eu un facteur déclenchant (stress, changement de temps, suractivité) ?', 'praticien', 'practitioner', NOW()-INTERVAL '4 months'+INTERVAL '8 days'+INTERVAL '1 hour', NOW()-INTERVAL '4 months'+INTERVAL '8 days'+INTERVAL '1 hour', true),
    ('f0000000-0000-4000-a000-000000000020', v_c7, 'Maintenant que vous le dites, c est vrai que j ai trop forcé ce week-end : ménage complet + courses + cuisine. Et il y a eu un gros changement de température. Merci de me rassurer.', 'Maintenant que vous le dites, c est vrai que j ai trop forcé ce week-end : ménage complet + courses + cuisine. Et il y a eu un gros changement de température. Merci de me rassurer.', 'consultant', 'consultant', NOW()-INTERVAL '4 months'+INTERVAL '8 days'+INTERVAL '4 hours', NOW()-INTERVAL '4 months'+INTERVAL '8 days'+INTERVAL '4 hours', true),
    ('f0000000-0000-4000-a000-000000000021', v_c7, 'Voilà exactement : suractivité + changement météo, ce sont vos 2 principaux déclencheurs. La technique de la cuillère peut vous aider : imaginez que chaque jour vous avez un nombre limité de cuillères d énergie. Répartissez-les sagement. On en reparle à la prochaine consultation.', 'Voilà exactement : suractivité + changement météo, ce sont vos 2 principaux déclencheurs. La technique de la cuillère peut vous aider : imaginez que chaque jour vous avez un nombre limité de cuillères d énergie. Répartissez-les sagement. On en reparle à la prochaine consultation.', 'praticien', 'practitioner', NOW()-INTERVAL '4 months'+INTERVAL '9 days', NOW()-INTERVAL '4 months'+INTERVAL '9 days', true),
    ('f0000000-0000-4000-a000-000000000022', v_c7, 'J utilise la technique de la cuillère depuis 2 semaines et ça change tout ! Je gère mieux mes journées et je n ai pas refait de grosse crise. Merci infiniment.', 'J utilise la technique de la cuillère depuis 2 semaines et ça change tout ! Je gère mieux mes journées et je n ai pas refait de grosse crise. Merci infiniment.', 'consultant', 'consultant', NOW()-INTERVAL '3 months'+INTERVAL '5 days', NOW()-INTERVAL '3 months'+INTERVAL '5 days', true),
    ('f0000000-0000-4000-a000-000000000023', v_c7, 'C est une formidable nouvelle Céline ! La gestion de l énergie est vraiment la clé dans la fibromyalgie. Vous progressez remarquablement. Continuez le bain aux sels d Epsom et les exercices de respiration.', 'C est une formidable nouvelle Céline ! La gestion de l énergie est vraiment la clé dans la fibromyalgie. Vous progressez remarquablement. Continuez le bain aux sels d Epsom et les exercices de respiration.', 'praticien', 'practitioner', NOW()-INTERVAL '3 months'+INTERVAL '5 days'+INTERVAL '5 hours', NOW()-INTERVAL '3 months'+INTERVAL '5 days'+INTERVAL '5 hours', true),

    -- Marc (c8) : suivi après no-show
    ('f0000000-0000-4000-a000-000000000024', v_c8, 'Bonjour, je suis vraiment désolé pour le rendez-vous manqué. J étais en déplacement et ça m est sorti de la tête. Est-ce qu on peut reprogrammer ?', 'Bonjour, je suis vraiment désolé pour le rendez-vous manqué. J étais en déplacement et ça m est sorti de la tête. Est-ce qu on peut reprogrammer ?', 'consultant', 'consultant', NOW()-INTERVAL '2 weeks'+INTERVAL '1 day', NOW()-INTERVAL '2 weeks'+INTERVAL '1 day', true),
    ('f0000000-0000-4000-a000-000000000025', v_c8, 'Pas de souci Marc, je comprends avec vos déplacements fréquents. J ai reprogrammé un créneau la semaine prochaine. Et comment avance le sevrage IPP ? Avez-vous pu maintenir les changements alimentaires en déplacement ?', 'Pas de souci Marc, je comprends avec vos déplacements fréquents. J ai reprogrammé un créneau la semaine prochaine. Et comment avance le sevrage IPP ? Avez-vous pu maintenir les changements alimentaires en déplacement ?', 'praticien', 'practitioner', NOW()-INTERVAL '2 weeks'+INTERVAL '1 day'+INTERVAL '3 hours', NOW()-INTERVAL '2 weeks'+INTERVAL '1 day'+INTERVAL '3 hours', true),
    ('f0000000-0000-4000-a000-000000000026', v_c8, 'Honnêtement, en déplacement c est compliqué. J ai repris les IPP pendant 3 jours parce que j avais trop de reflux après un dîner client. Mais à la maison ça va bien, j ai perdu 1kg de plus.', 'Honnêtement, en déplacement c est compliqué. J ai repris les IPP pendant 3 jours parce que j avais trop de reflux après un dîner client. Mais à la maison ça va bien, j ai perdu 1kg de plus.', 'consultant', 'consultant', NOW()-INTERVAL '12 days', NOW()-INTERVAL '12 days', true),
    ('f0000000-0000-4000-a000-000000000027', v_c8, 'C est honnête et c est bien de me le dire. Pour les dîners clients, on va travailler des stratégies concrètes : choisir du poisson grillé, éviter le vin blanc, manger lentement. On en parle en détail au prochain RDV. Bravo pour le kilo en moins !', 'C est honnête et c est bien de me le dire. Pour les dîners clients, on va travailler des stratégies concrètes : choisir du poisson grillé, éviter le vin blanc, manger lentement. On en parle en détail au prochain RDV. Bravo pour le kilo en moins !', 'praticien', 'practitioner', NOW()-INTERVAL '12 days'+INTERVAL '2 hours', NOW()-INTERVAL '12 days'+INTERVAL '2 hours', true)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO messages (id, consultant_id, text, body, sender, sender_role, sent_at, created_at, read_by_practitioner) VALUES
    -- Amina (c9) : étudiante
    ('f0000000-0000-4000-a000-000000000028', v_c9, 'Bonjour ! J ai réduit le café à 2 par jour et j ai eu qu 1 seule migraine ce mois ! C est la première fois en 2 ans. Par contre les partiels approchent et je stresse...', 'Bonjour ! J ai réduit le café à 2 par jour et j ai eu qu 1 seule migraine ce mois ! C est la première fois en 2 ans. Par contre les partiels approchent et je stresse...', 'consultant', 'consultant', NOW()-INTERVAL '3 weeks'+INTERVAL '3 days', NOW()-INTERVAL '3 weeks'+INTERVAL '3 days', true),
    ('f0000000-0000-4000-a000-000000000029', v_c9, 'Super résultat Amina ! 1 migraine au lieu de 3-4, on est sur la bonne voie. Pour les partiels : la cohérence cardiaque 5 min avant chaque session de révision. Et surtout, ne saute pas de repas même si tu es stressée – l hypoglycémie est ton pire ennemi pour les migraines.', 'Super résultat Amina ! 1 migraine au lieu de 3-4, on est sur la bonne voie. Pour les partiels : la cohérence cardiaque 5 min avant chaque session de révision. Et surtout, ne saute pas de repas même si tu es stressée – l hypoglycémie est ton pire ennemi pour les migraines.', 'praticien', 'practitioner', NOW()-INTERVAL '3 weeks'+INTERVAL '3 days'+INTERVAL '2 hours', NOW()-INTERVAL '3 weeks'+INTERVAL '3 days'+INTERVAL '2 hours', true),
    ('f0000000-0000-4000-a000-00000000002a', v_c9, 'J ai une question : est-ce que je peux prendre un ibuprofène en prévention avant un partiel important ? Ou est-ce que ça contre-indique quelque chose ?', 'J ai une question : est-ce que je peux prendre un ibuprofène en prévention avant un partiel important ? Ou est-ce que ça contre-indique quelque chose ?', 'consultant', 'consultant', NOW()-INTERVAL '5 days', NOW()-INTERVAL '5 days', true),
    ('f0000000-0000-4000-a000-00000000002b', v_c9, 'Je te déconseille l ibuprofène en prévention : ça ne fonctionne pas et ça peut irriter l estomac. Par contre, tu peux prendre 2 comprimés de grande camomille 1h avant le partiel + une banane et des amandes 30 min avant. Ça sera plus efficace et sans risque.', 'Je te déconseille l ibuprofène en prévention : ça ne fonctionne pas et ça peut irriter l estomac. Par contre, tu peux prendre 2 comprimés de grande camomille 1h avant le partiel + une banane et des amandes 30 min avant. Ça sera plus efficace et sans risque.', 'praticien', 'practitioner', NOW()-INTERVAL '5 days'+INTERVAL '1 hour', NOW()-INTERVAL '5 days'+INTERVAL '1 hour', true),

    -- Philippe (c10) : eczéma – 1 UNREAD
    ('f0000000-0000-4000-a000-00000000002c', v_c10, 'Bonjour, l eczéma est mieux en général mais j ai une petite poussée sur le poignet droit. Est-ce que je mets la crème au calendula ou la lavande aspic ?', 'Bonjour, l eczéma est mieux en général mais j ai une petite poussée sur le poignet droit. Est-ce que je mets la crème au calendula ou la lavande aspic ?', 'consultant', 'consultant', NOW()-INTERVAL '3 weeks'+INTERVAL '2 days', NOW()-INTERVAL '3 weeks'+INTERVAL '2 days', true),
    ('f0000000-0000-4000-a000-00000000002d', v_c10, 'Bonjour Philippe ! Pour une poussée localisée, faites les deux : 1 goutte de lavande aspic mélangée à une noisette de baume au calendula, appliquez 2x/jour. Si c est suintant, ajoutez l eau thermale en compresse avant. Comment ça va avec les horaires en ce moment ?', 'Bonjour Philippe ! Pour une poussée localisée, faites les deux : 1 goutte de lavande aspic mélangée à une noisette de baume au calendula, appliquez 2x/jour. Si c est suintant, ajoutez l eau thermale en compresse avant. Comment ça va avec les horaires en ce moment ?', 'praticien', 'practitioner', NOW()-INTERVAL '3 weeks'+INTERVAL '2 days'+INTERVAL '3 hours', NOW()-INTERVAL '3 weeks'+INTERVAL '2 days'+INTERVAL '3 hours', true),
    ('f0000000-0000-4000-a000-00000000002e', v_c10, 'Les horaires c est toujours dur mais je fais mes siestes maintenant. J ai plus d énergie l après-midi. Par contre je vous envoie une photo de mes mains, on dirait que c est mieux qu il y a 2 mois non ?', 'Les horaires c est toujours dur mais je fais mes siestes maintenant. J ai plus d énergie l après-midi. Par contre je vous envoie une photo de mes mains, on dirait que c est mieux qu il y a 2 mois non ?', 'consultant', 'consultant', NOW()-INTERVAL '2 days', NOW()-INTERVAL '2 days', false),

    -- Isabelle (c11) : détox
    ('f0000000-0000-4000-a000-00000000002f', v_c11, 'Bonjour Woodeline, jour 3 de la cure détox et j ai mal à la tête et des boutons sur le menton. C est normal ?', 'Bonjour Woodeline, jour 3 de la cure détox et j ai mal à la tête et des boutons sur le menton. C est normal ?', 'consultant', 'consultant', NOW()-INTERVAL '3 months'+INTERVAL '4 days', NOW()-INTERVAL '3 months'+INTERVAL '4 days', true),
    ('f0000000-0000-4000-a000-000000000030', v_c11, 'Parfaitement normal Isabelle ! C est ce qu on appelle une crise de détoxination : maux de tête, boutons, parfois fatigue. C est le signe que le foie travaille. Buvez beaucoup d eau, reposez-vous, ça passera dans 24-48h. Si c est trop intense, ralentissez les doses de radis noir.', 'Parfaitement normal Isabelle ! C est ce qu on appelle une crise de détoxination : maux de tête, boutons, parfois fatigue. C est le signe que le foie travaille. Buvez beaucoup d eau, reposez-vous, ça passera dans 24-48h. Si c est trop intense, ralentissez les doses de radis noir.', 'praticien', 'practitioner', NOW()-INTERVAL '3 months'+INTERVAL '4 days'+INTERVAL '1 hour', NOW()-INTERVAL '3 months'+INTERVAL '4 days'+INTERVAL '1 hour', true),
    ('f0000000-0000-4000-a000-000000000031', v_c11, 'Ça s est calmé au jour 5. Maintenant je me sens incroyablement bien, ma peau est lumineuse et j ai une énergie de folie. La cure est finie et je suis impressionnée par les résultats.', 'Ça s est calmé au jour 5. Maintenant je me sens incroyablement bien, ma peau est lumineuse et j ai une énergie de folie. La cure est finie et je suis impressionnée par les résultats.', 'consultant', 'consultant', NOW()-INTERVAL '6 weeks'+INTERVAL '3 days', NOW()-INTERVAL '6 weeks'+INTERVAL '3 days', true),
    ('f0000000-0000-4000-a000-000000000032', v_c11, 'Je suis ravie Isabelle ! Avec votre terrain de base et votre hygiène de vie, les résultats sont souvent spectaculaires. Maintenant on passe à la phase de consolidation avec les super-aliments. On en parle au prochain rendez-vous.', 'Je suis ravie Isabelle ! Avec votre terrain de base et votre hygiène de vie, les résultats sont souvent spectaculaires. Maintenant on passe à la phase de consolidation avec les super-aliments. On en parle au prochain rendez-vous.', 'praticien', 'practitioner', NOW()-INTERVAL '6 weeks'+INTERVAL '3 days'+INTERVAL '4 hours', NOW()-INTERVAL '6 weeks'+INTERVAL '3 days'+INTERVAL '4 hours', true),

    -- Robert (c12) : cholestérol – 2 UNREAD
    ('f0000000-0000-4000-a000-000000000033', v_c12, 'Bonjour Madame, j ai les résultats de ma prise de sang. Mon LDL est à 1.65 contre 1.85 il y a 2 mois. Mon cardiologue est agréablement surpris. Il accepte d attendre encore avant les statines.', 'Bonjour Madame, j ai les résultats de ma prise de sang. Mon LDL est à 1.65 contre 1.85 il y a 2 mois. Mon cardiologue est agréablement surpris. Il accepte d attendre encore avant les statines.', 'consultant', 'consultant', NOW()-INTERVAL '2 months'+INTERVAL '3 days', NOW()-INTERVAL '2 months'+INTERVAL '3 days', true),
    ('f0000000-0000-4000-a000-000000000034', v_c12, 'C est une excellente nouvelle Robert ! Une baisse de 0.20 en 2 mois avec les moyens naturels, c est remarquable. Continuez exactement comme ça. On vise sous 1.40 au prochain bilan dans 2 mois. Bravo pour votre discipline !', 'C est une excellente nouvelle Robert ! Une baisse de 0.20 en 2 mois avec les moyens naturels, c est remarquable. Continuez exactement comme ça. On vise sous 1.40 au prochain bilan dans 2 mois. Bravo pour votre discipline !', 'praticien', 'practitioner', NOW()-INTERVAL '2 months'+INTERVAL '3 days'+INTERVAL '2 hours', NOW()-INTERVAL '2 months'+INTERVAL '3 days'+INTERVAL '2 hours', true),
    ('f0000000-0000-4000-a000-000000000035', v_c12, 'Bonjour, j ai une question pratique : est-ce que je peux continuer l ail noir si je pars en voyage ? Il faut le conserver au frais ?', 'Bonjour, j ai une question pratique : est-ce que je peux continuer l ail noir si je pars en voyage ? Il faut le conserver au frais ?', 'consultant', 'consultant', NOW()-INTERVAL '3 days', NOW()-INTERVAL '3 days', false),
    ('f0000000-0000-4000-a000-000000000036', v_c12, 'Et aussi, ma femme voudrait savoir si le régime méditerranéen que je suis peut aussi lui convenir. Elle n a pas de cholestérol mais elle aimerait perdre quelques kilos.', 'Et aussi, ma femme voudrait savoir si le régime méditerranéen que je suis peut aussi lui convenir. Elle n a pas de cholestérol mais elle aimerait perdre quelques kilos.', 'consultant', 'consultant', NOW()-INTERVAL '3 days'+INTERVAL '5 minutes', NOW()-INTERVAL '3 days'+INTERVAL '5 minutes', false)
  ON CONFLICT (id) DO NOTHING;

  -- ============================================
  -- Step 9 : Journal Entries (14 days × 6 active consultants using generate_series)
  -- ============================================

  -- Sophie (c1) – bonne adhésion
  INSERT INTO journal_entries (consultant_id, practitioner_id, date, mood, energy, text,
    adherence_hydratation, adherence_respiration, adherence_mouvement, adherence_plantes,
    sleep_quality, stress_level, energy_level, bristol_type, bristol_frequency,
    hydration_liters, exercise_type, exercise_duration_minutes, exercise_intensity, source, created_at)
  SELECT v_c1, v_practitioner_id, d::date,
    CASE WHEN random() < 0.3 THEN 'tres_bien' WHEN random() < 0.7 THEN 'bien' ELSE 'neutre' END,
    CASE WHEN random() < 0.4 THEN 'bien' ELSE 'neutre' END,
    CASE (d::date - (NOW()-INTERVAL '14 days')::date) % 3
      WHEN 0 THEN 'Bonne journée. Transit normal, pas de ballonnements. Cohérence cardiaque faite 2x.'
      WHEN 1 THEN 'Un peu de stress au travail mais j ai fait ma respiration 4-7-8. Digestion ok.'
      ELSE 'Journée calme. Bonne énergie. J ai marché 30 min après le déjeuner.'
    END,
    true, (random() > 0.3), true, true,
    6 + floor(random()*3)::int, 3 + floor(random()*3)::int, 6 + floor(random()*3)::int,
    3 + floor(random()*2)::int, 1 + floor(random()*2)::int,
    1.2 + (random()*0.8)::numeric(3,1),
    CASE WHEN (d::date - (NOW()-INTERVAL '14 days')::date) % 2 = 0 THEN 'Marche' ELSE 'Yoga' END,
    CASE WHEN (d::date - (NOW()-INTERVAL '14 days')::date) % 2 = 0 THEN 30 ELSE 20 END,
    'modere', 'consultant', NOW()
  FROM generate_series(NOW()-INTERVAL '14 days', NOW()-INTERVAL '1 day', INTERVAL '1 day') AS d
  ON CONFLICT (consultant_id, date) DO NOTHING;

  -- Nathalie (c5) – ménopause
  INSERT INTO journal_entries (consultant_id, practitioner_id, date, mood, energy, text,
    adherence_hydratation, adherence_respiration, adherence_mouvement, adherence_plantes,
    sleep_quality, stress_level, energy_level, source, created_at)
  SELECT v_c5, v_practitioner_id, d::date,
    CASE WHEN random() < 0.4 THEN 'bien' WHEN random() < 0.7 THEN 'neutre' ELSE 'moyen' END,
    CASE WHEN random() < 0.5 THEN 'bien' ELSE 'neutre' END,
    CASE (d::date - (NOW()-INTERVAL '14 days')::date) % 4
      WHEN 0 THEN 'Seulement 1 bouffée de chaleur aujourd hui. Bien dormi grâce à la sauge.'
      WHEN 1 THEN '2 bouffées, une le matin et une en fin d après-midi. Moral ok.'
      WHEN 2 THEN 'Bonne journée, pas de bouffée ! Marche rapide de 40 min. Me sens en forme.'
      ELSE 'Nuit un peu perturbée par une sueur nocturne. Fatigue en matinée mais ça va mieux l après-midi.'
    END,
    true, (random() > 0.4), true, true,
    5 + floor(random()*4)::int, 2 + floor(random()*3)::int, 5 + floor(random()*4)::int,
    'consultant', NOW()
  FROM generate_series(NOW()-INTERVAL '14 days', NOW()-INTERVAL '1 day', INTERVAL '1 day') AS d
  ON CONFLICT (consultant_id, date) DO NOTHING;

  -- Céline (c7) – fibromyalgie
  INSERT INTO journal_entries (consultant_id, practitioner_id, date, mood, energy, text,
    adherence_hydratation, adherence_respiration, adherence_mouvement, adherence_plantes,
    sleep_quality, stress_level, energy_level, source, created_at)
  SELECT v_c7, v_practitioner_id, d::date,
    CASE WHEN random() < 0.2 THEN 'bien' WHEN random() < 0.6 THEN 'neutre' ELSE 'moyen' END,
    CASE WHEN random() < 0.3 THEN 'neutre' ELSE 'moyen' END,
    CASE (d::date - (NOW()-INTERVAL '14 days')::date) % 5
      WHEN 0 THEN 'Douleur modérée (EVA 4). Bain aux sels d Epsom ce soir. Yoga doux 15 min.'
      WHEN 1 THEN 'Bonne journée, douleur faible (EVA 3). J ai pu faire ma marche. Technique de la cuillère respectée.'
      WHEN 2 THEN 'Journée difficile (EVA 6). Fatigue intense. Repos cet après-midi. Bain chaud ce soir.'
      WHEN 3 THEN 'Mieux qu hier (EVA 4). Sommeil correct grâce au griffonia. Yoga nidra ce matin.'
      ELSE 'Journée stable (EVA 4). Gestion des cuillères ok. Marche 20 min en forêt.'
    END,
    (random() > 0.2), (random() > 0.2), (random() > 0.4), true,
    4 + floor(random()*4)::int, 4 + floor(random()*3)::int, 3 + floor(random()*4)::int,
    'consultant', NOW()
  FROM generate_series(NOW()-INTERVAL '14 days', NOW()-INTERVAL '1 day', INTERVAL '1 day') AS d
  ON CONFLICT (consultant_id, date) DO NOTHING;

  -- Thomas (c2) – sportif
  INSERT INTO journal_entries (consultant_id, practitioner_id, date, mood, energy, text,
    adherence_hydratation, adherence_respiration, adherence_mouvement, adherence_plantes,
    sleep_quality, stress_level, energy_level,
    exercise_type, exercise_duration_minutes, exercise_intensity, source, created_at)
  SELECT v_c2, v_practitioner_id, d::date,
    CASE WHEN random() < 0.5 THEN 'tres_bien' ELSE 'bien' END,
    CASE WHEN random() < 0.6 THEN 'tres_bien' ELSE 'bien' END,
    CASE (d::date - (NOW()-INTERVAL '14 days')::date) % 4
      WHEN 0 THEN 'Sortie trail 15km D+600. Bonnes sensations. Nutrition course OK. Récupération en cours.'
      WHEN 1 THEN 'Repos actif. Étirements + rouleau de massage. Spiruline 5g. HRV au top.'
      WHEN 2 THEN 'Fractionné 10x400m. Bon tempo. Hydratation bien gérée. Pas de crampe.'
      ELSE 'Sortie endurance 1h30. Zone 2 maintenue. Alimentation pré-effort bien calée.'
    END,
    true, false, true, (random() > 0.5),
    8 + floor(random()*2)::int, 2 + floor(random()*2)::int, 8 + floor(random()*2)::int,
    CASE (d::date - (NOW()-INTERVAL '14 days')::date) % 4
      WHEN 0 THEN 'Trail' WHEN 1 THEN 'Stretching' WHEN 2 THEN 'Fractionné' ELSE 'Endurance'
    END,
    CASE (d::date - (NOW()-INTERVAL '14 days')::date) % 4
      WHEN 0 THEN 90 WHEN 1 THEN 30 WHEN 2 THEN 45 ELSE 90
    END,
    CASE (d::date - (NOW()-INTERVAL '14 days')::date) % 4
      WHEN 0 THEN 'modere' WHEN 1 THEN 'leger' WHEN 2 THEN 'intense' ELSE 'modere'
    END,
    'consultant', NOW()
  FROM generate_series(NOW()-INTERVAL '14 days', NOW()-INTERVAL '1 day', INTERVAL '1 day') AS d
  ON CONFLICT (consultant_id, date) DO NOTHING;

  -- Philippe (c10) – eczéma
  INSERT INTO journal_entries (consultant_id, practitioner_id, date, mood, energy, text,
    adherence_hydratation, adherence_respiration, adherence_mouvement, adherence_plantes,
    sleep_quality, stress_level, energy_level, source, created_at)
  SELECT v_c10, v_practitioner_id, d::date,
    CASE WHEN random() < 0.3 THEN 'bien' WHEN random() < 0.6 THEN 'neutre' ELSE 'moyen' END,
    CASE WHEN random() < 0.3 THEN 'bien' WHEN random() < 0.7 THEN 'neutre' ELSE 'moyen' END,
    CASE (d::date - (NOW()-INTERVAL '14 days')::date) % 3
      WHEN 0 THEN 'Levé 2h30 ce matin. Journée au fournil. Eczéma stable. Crème calendula appliquée matin et soir. Sieste de 20 min à 13h.'
      WHEN 1 THEN 'Légère démangeaison poignet droit. Appliqué lavande aspic. Marche 20 min après le travail.'
      ELSE 'Jour de repos. Bien dormi (7h). Mains en bon état. Cuisiné des légumes sans gluten.'
    END,
    (random() > 0.3), (random() > 0.5), (random() > 0.3), (random() > 0.2),
    4 + floor(random()*4)::int, 3 + floor(random()*3)::int, 4 + floor(random()*3)::int,
    'consultant', NOW()
  FROM generate_series(NOW()-INTERVAL '14 days', NOW()-INTERVAL '1 day', INTERVAL '1 day') AS d
  ON CONFLICT (consultant_id, date) DO NOTHING;

  -- Isabelle (c11) – optimisation
  INSERT INTO journal_entries (consultant_id, practitioner_id, date, mood, energy, text,
    adherence_hydratation, adherence_respiration, adherence_mouvement, adherence_plantes,
    sleep_quality, stress_level, energy_level,
    exercise_type, exercise_duration_minutes, exercise_intensity, source, created_at)
  SELECT v_c11, v_practitioner_id, d::date,
    CASE WHEN random() < 0.6 THEN 'tres_bien' ELSE 'bien' END,
    CASE WHEN random() < 0.6 THEN 'tres_bien' ELSE 'bien' END,
    CASE (d::date - (NOW()-INTERVAL '14 days')::date) % 3
      WHEN 0 THEN 'Cours de yoga donné ce matin. Spiruline + maca au petit-déjeuner. Énergie au top. Peau lumineuse.'
      WHEN 1 THEN 'Jus vert ce matin. Balade en forêt 1h. Méditation 20 min. Je me sens en pleine forme.'
      ELSE 'Journée très productive. 2 cours de yoga donnés. Alimentation parfaite. Sommeil profond et réparateur.'
    END,
    true, true, true, true,
    8 + floor(random()*2)::int, 1 + floor(random()*2)::int, 8 + floor(random()*2)::int,
    CASE (d::date - (NOW()-INTERVAL '14 days')::date) % 3
      WHEN 0 THEN 'Yoga' WHEN 1 THEN 'Marche nature' ELSE 'Yoga'
    END,
    CASE (d::date - (NOW()-INTERVAL '14 days')::date) % 3
      WHEN 0 THEN 75 WHEN 1 THEN 60 ELSE 90
    END,
    CASE (d::date - (NOW()-INTERVAL '14 days')::date) % 3
      WHEN 0 THEN 'modere' WHEN 1 THEN 'leger' ELSE 'modere'
    END,
    'consultant', NOW()
  FROM generate_series(NOW()-INTERVAL '14 days', NOW()-INTERVAL '1 day', INTERVAL '1 day') AS d
  ON CONFLICT (consultant_id, date) DO NOTHING;

  -- ============================================
  -- Step 10 : Notifications (15 records, 3 unread)
  -- ============================================
  INSERT INTO notifications (id, practitioner_id, consultant_id, title, description, level, read, created_at) VALUES
    ('f1000000-0000-4000-a000-000000000001', v_practitioner_id, v_c1, 'Nouveau message de Sophie Martin', 'Sophie a envoyé un message concernant son suivi digestif.', 'info', true, NOW()-INTERVAL '2 weeks'),
    ('f1000000-0000-4000-a000-000000000002', v_practitioner_id, v_c2, 'Résultat de course – Thomas Dubois', 'Thomas a partagé son résultat de course : 50km en 6h12.', 'info', true, NOW()-INTERVAL '2 months'+INTERVAL '6 days'),
    ('f1000000-0000-4000-a000-000000000003', v_practitioner_id, v_c3, 'Suivi post-partum – Émilie Laurent', 'Émilie signale une amélioration de son énergie.', 'info', true, NOW()-INTERVAL '3 months'+INTERVAL '2 days'),
    ('f1000000-0000-4000-a000-000000000004', v_practitioner_id, v_c7, 'Alerte douleur – Céline Roux', 'Céline signale une crise de douleur importante (fibromyalgie).', 'attention', true, NOW()-INTERVAL '4 months'+INTERVAL '8 days'),
    ('f1000000-0000-4000-a000-000000000005', v_practitioner_id, v_c8, 'Rendez-vous manqué – Marc Lefebvre', 'Marc n est pas venu à son rendez-vous prévu.', 'attention', true, NOW()-INTERVAL '2 weeks'),
    ('f1000000-0000-4000-a000-000000000006', v_practitioner_id, v_c5, 'Bonne nouvelle – Nathalie Petit', 'Nathalie rapporte une quasi-disparition des bouffées de chaleur.', 'info', true, NOW()-INTERVAL '4 weeks'),
    ('f1000000-0000-4000-a000-000000000007', v_practitioner_id, v_c4, 'Potager – Jean-Pierre Moreau', 'Jean-Pierre partage ses progrès alimentaires grâce à son potager.', 'info', true, NOW()-INTERVAL '3 months'+INTERVAL '10 days'),
    ('f1000000-0000-4000-a000-000000000008', v_practitioner_id, v_c11, 'Cure détox terminée – Isabelle Fontaine', 'Isabelle a terminé sa cure détox avec d excellents résultats.', 'info', true, NOW()-INTERVAL '6 weeks'+INTERVAL '3 days'),
    ('f1000000-0000-4000-a000-000000000009', v_practitioner_id, v_c9, 'Résultat positif – Amina Benali', 'Amina n a eu qu 1 migraine ce mois (au lieu de 3-4).', 'info', true, NOW()-INTERVAL '3 weeks'+INTERVAL '3 days'),
    ('f1000000-0000-4000-a000-00000000000a', v_practitioner_id, v_c12, 'Bilan lipidique – Robert Durand', 'Robert : LDL en baisse (1.65 vs 1.85). Le cardiologue repousse les statines.', 'info', true, NOW()-INTERVAL '2 months'+INTERVAL '3 days'),
    ('f1000000-0000-4000-a000-00000000000b', v_practitioner_id, v_c6, 'RDV annulé – Lucas Bernard', 'Lucas a annulé son rendez-vous de suivi.', 'attention', true, NOW()-INTERVAL '2 weeks'),
    ('f1000000-0000-4000-a000-00000000000c', v_practitioner_id, v_c1, 'Rappel RDV – Sophie Martin', 'Rendez-vous confirmé avec Sophie dans 10 jours.', 'info', true, NOW()-INTERVAL '5 days'),
    -- 3 unread notifications
    ('f1000000-0000-4000-a000-00000000000d', v_practitioner_id, v_c10, 'Nouveau message – Philippe Garnier', 'Philippe a envoyé un message avec une photo de ses mains.', 'info', false, NOW()-INTERVAL '2 days'),
    ('f1000000-0000-4000-a000-00000000000e', v_practitioner_id, v_c12, 'Nouveau message – Robert Durand', 'Robert a envoyé 2 messages avec des questions pratiques.', 'info', false, NOW()-INTERVAL '3 days'),
    ('f1000000-0000-4000-a000-00000000000f', v_practitioner_id, v_c9, 'Question urgente – Amina Benali', 'Amina pose une question sur la prise d ibuprofène avant un examen.', 'attention', false, NOW()-INTERVAL '5 days')
  ON CONFLICT (id) DO NOTHING;

  -- ============================================
  -- Step 11 : Practitioner Notes (10 consultants)
  -- ============================================
  INSERT INTO practitioner_notes (consultant_id, practitioner_id, content, created_at, updated_at) VALUES
    (v_c1,  v_practitioner_id, 'Sophie Martin – Cadre sup, SII stress-dépendant. Excellente évolution en 6 mois. Transit normalisé, stress mieux géré grâce à la cohérence cardiaque. Phase de consolidation. Prochaine étape : espacement des RDV (trimestriel). Patiente rigoureuse mais perfectionniste – rappeler l importance du lâcher prise.', NOW()-INTERVAL '3 weeks', NOW()-INTERVAL '3 weeks'),
    (v_c2,  v_practitioner_id, 'Thomas Dubois – Sportif trail/ultra. Complémentation minérale optimisée. Plan nutrition course validé et testé avec succès (50km sans trouble digestif). Prochaine étape : débriefing course et ajustement pour l UTMB. Attention au surentraînement, surveiller la HRV.', NOW()-INTERVAL '3 weeks', NOW()-INTERVAL '3 weeks'),
    (v_c3,  v_practitioner_id, 'Émilie Laurent – Post-partum 10 mois. Fer en hausse (ferritine 25, objectif 50). Énergie en amélioration. Sevrage allaitement en cours. À réévaluer : besoin DHA, ajustement compléments post-sevrage. Bonne compliance malgré la fatigue. Mari soutenant.', NOW()-INTERVAL '2 weeks', NOW()-INTERVAL '2 weeks'),
    (v_c4,  v_practitioner_id, 'Jean-Pierre Moreau – Retraité actif. Prostate : saw palmetto efficace (levers nocturnes réduits de 3 à 1). Sommeil amélioré. Potager = excellente initiative. Coordonner avec urologue (PSA). Prévention CV à maintenir. Patient discipliné et agréable.', NOW()-INTERVAL '5 weeks', NOW()-INTERVAL '5 weeks'),
    (v_c5,  v_practitioner_id, 'Nathalie Petit – Ménopause. Résultats remarquables : bouffées de chaleur quasi-disparues (de 8-10 à 1-2/jour). Sauge + isoflavones très efficaces. Sommeil en amélioration. Moral excellent. Continuer la phase de consolidation. RDV dans 4 semaines.', NOW()-INTERVAL '4 weeks', NOW()-INTERVAL '4 weeks'),
    (v_c6,  v_practitioner_id, 'Lucas Bernard – Ado 17 ans. Acné + alimentation. Transition alimentaire en cours (réduction sodas et fast-food). Zinc démarré. Résultats à évaluer à M+2-3. Mère très impliquée. A annulé un RDV – relancer. Plan non encore partagé (draft).', NOW()-INTERVAL '6 weeks', NOW()-INTERVAL '6 weeks'),
    (v_c7,  v_practitioner_id, 'Céline Roux – Fibromyalgie. EVA douleur passée de 7 à 4 en 8 mois. Technique de la cuillère très efficace pour la gestion quotidienne. Réduction progressive du tramadol (en accord avec le médecin). Bains + yoga doux = piliers du protocole. Patiente courageuse.', NOW()-INTERVAL '3 weeks', NOW()-INTERVAL '3 weeks'),
    (v_c8,  v_practitioner_id, 'Marc Lefebvre – Commercial, RGO + surpoids. Sevrage IPP en cours (rechutes lors des déplacements pro). Perte de 4kg. No-show au dernier RDV (déplacement). Reprendre les stratégies de gestion des repas d affaires. Motivation fluctuante selon le contexte pro.', NOW()-INTERVAL '2 weeks', NOW()-INTERVAL '2 weeks'),
    (v_c10, v_practitioner_id, 'Philippe Garnier – Artisan boulanger, eczéma chronique. Eczéma en nette amélioration malgré l exposition professionnelle au gluten. Probiotiques + L-glutamine efficaces. Siestes bien intégrées. Contrainte majeure : horaires décalés (levé 2h30). Coordonner avec dermato.', NOW()-INTERVAL '5 weeks', NOW()-INTERVAL '5 weeks'),
    (v_c12, v_practitioner_id, 'Robert Durand – Retraité, prévention cardiovasculaire. LDL en baisse (1.85 à 1.65) en 2 mois sans statines. Cardiologue accepte de poursuivre l approche naturelle. Objectif LDL < 1.40 au prochain bilan. Bonne adhésion au régime méditerranéen. ATCD familiaux = motivation forte.', NOW()-INTERVAL '2 months', NOW()-INTERVAL '2 months')
  ON CONFLICT (consultant_id, practitioner_id) DO NOTHING;

  -- ============================================
  -- Step 12 : Educational Resources & Assignments
  -- ============================================
  INSERT INTO educational_resources (id, practitioner_id, title, slug, summary, content_type, content_markdown, category, tags, source, is_published, read_time_minutes, created_at) VALUES
    ('f2000000-0000-4000-a000-000000000001', v_practitioner_id, 'La cohérence cardiaque : guide pratique', 'coherence-cardiaque-guide', 'Tout savoir sur la cohérence cardiaque 365 : technique, bienfaits et mise en pratique au quotidien.', 'article', '# La cohérence cardiaque 365

## Qu est-ce que c est ?
La cohérence cardiaque est une technique de respiration qui synchronise le rythme cardiaque et le système nerveux autonome.

## La méthode 365
- **3** fois par jour
- **6** respirations par minute
- **5** minutes par séance

## Comment pratiquer ?
1. Inspirez pendant 5 secondes par le nez
2. Expirez pendant 5 secondes par la bouche
3. Répétez pendant 5 minutes

## Bienfaits prouvés
- Réduction du cortisol (hormone du stress) pendant 4-6 heures
- Amélioration de la variabilité cardiaque
- Meilleure régulation émotionnelle
- Amélioration du sommeil et de la concentration', 'gestion_stress', ARRAY['stress', 'respiration', 'bien-être', 'sommeil'], 'practitioner', true, 5, NOW()-INTERVAL '6 months'),

    ('f2000000-0000-4000-a000-000000000002', v_practitioner_id, 'Alimentation anti-inflammatoire : les bases', 'alimentation-anti-inflammatoire', 'Comprendre et adopter une alimentation qui réduit l inflammation chronique.', 'article', '# L alimentation anti-inflammatoire

## Pourquoi c est important ?
L inflammation chronique de bas grade est impliquée dans de nombreuses pathologies : troubles digestifs, douleurs articulaires, fatigue chronique, problèmes de peau.

## Les piliers anti-inflammatoires
1. **Oméga 3** : poissons gras (sardines, maquereau, saumon), graines de lin, noix
2. **Antioxydants** : fruits rouges, légumes colorés, curcuma, thé vert
3. **Fibres** : légumes, céréales complètes, légumineuses
4. **Polyphénols** : huile d olive vierge, cacao cru, grenades

## Aliments pro-inflammatoires à limiter
- Sucres raffinés et farines blanches
- Huiles végétales riches en oméga 6 (tournesol, maïs)
- Produits ultra-transformés
- Excès de viande rouge et charcuterie
- Alcool en excès', 'alimentation', ARRAY['alimentation', 'inflammation', 'nutrition', 'oméga 3'], 'practitioner', true, 7, NOW()-INTERVAL '5 months'),

    ('f2000000-0000-4000-a000-000000000003', v_practitioner_id, 'Le magnésium : le minéral anti-stress', 'magnesium-mineral-anti-stress', 'Pourquoi le magnésium est essentiel, comment reconnaître une carence et quelles formes choisir.', 'article', '# Le magnésium

## Signes de carence
- Crampes et spasmes musculaires
- Fatigue chronique
- Irritabilité et anxiété
- Troubles du sommeil
- Paupière qui tremble

## Les meilleures formes
- **Bisglycinate** : excellente absorption, bien toléré (RECOMMANDÉ)
- **Citrate** : bonne absorption, léger effet laxatif
- **Thréonate** : passe la barrière hémato-encéphalique (cognition)
- **Oxyde** : mal absorbé, à éviter

## Dosage recommandé
300 à 400 mg/jour pour un adulte. En cas de stress ou de sport intense : jusqu à 600 mg/jour.

## Aliments riches en magnésium
Chocolat noir 70%+, amandes, noix de cajou, épinards, banane, avocat, graines de courge.', 'general', ARRAY['magnésium', 'compléments', 'stress', 'sommeil', 'minéraux'], 'practitioner', true, 6, NOW()-INTERVAL '4 months'),

    ('f2000000-0000-4000-a000-000000000004', v_practitioner_id, 'Yoga doux pour la fibromyalgie', 'yoga-doux-fibromyalgie', 'Programme de yoga adapté aux personnes souffrant de fibromyalgie.', 'video_link', NULL, 'activite_physique', ARRAY['yoga', 'fibromyalgie', 'douleur', 'mobilité'], 'practitioner', true, 15, NOW()-INTERVAL '6 months'),

    ('f2000000-0000-4000-a000-000000000005', v_practitioner_id, 'Guide des huiles essentielles de base', 'guide-huiles-essentielles', 'Les 5 huiles essentielles indispensables et leur utilisation en toute sécurité.', 'article', '# Les 5 huiles essentielles indispensables

## 1. Lavande vraie (Lavandula angustifolia)
Usage : relaxation, sommeil, petites brûlures, cicatrisation.
Voie : diffusion, cutanée (pure possible), bain.

## 2. Tea tree (Melaleuca alternifolia)
Usage : antiseptique, antifongique, boutons d acné.
Voie : cutanée locale (1 goutte pure sur le bouton).

## 3. Menthe poivrée (Mentha piperita)
Usage : nausées, maux de tête, digestion, coup de fatigue.
Voie : 1 goutte sur les tempes ou sur un comprimé neutre.

## 4. Ravintsara (Cinnamomum camphora)
Usage : immunité, prévention hivernale, antiviral.
Voie : cutanée (sur les poignets), diffusion.

## 5. Eucalyptus citronné (Corymbia citriodora)
Usage : anti-inflammatoire, douleurs musculaires et articulaires.
Voie : cutanée diluée 10% dans huile végétale.

## Précautions générales
- Jamais d HE pure dans les yeux, oreilles, muqueuses
- Test cutané au pli du coude 24h avant première utilisation
- Interdites aux femmes enceintes/allaitantes et enfants < 7 ans (sauf avis)
- Conserver à l abri de la lumière et de la chaleur', 'aromatherapie', ARRAY['aromathérapie', 'huiles essentielles', 'guide', 'sécurité'], 'practitioner', true, 8, NOW()-INTERVAL '3 months')
  ON CONFLICT (slug) DO NOTHING;

  -- Resource Assignments (2-3 per active consultant)
  INSERT INTO resource_assignments (resource_id, consultant_id, practitioner_id, message, sent_at) VALUES
    -- Sophie : cohérence cardiaque + alimentation anti-inflammatoire
    ('f2000000-0000-4000-a000-000000000001', v_c1, v_practitioner_id, 'Sophie, voici un guide complet sur la cohérence cardiaque. Référez-vous y pour perfectionner votre technique.', NOW()-INTERVAL '6 months'),
    ('f2000000-0000-4000-a000-000000000002', v_c1, v_practitioner_id, 'Un article sur l alimentation anti-inflammatoire qui complète votre protocole digestif.', NOW()-INTERVAL '5 months'),
    -- Thomas : magnésium
    ('f2000000-0000-4000-a000-000000000003', v_c2, v_practitioner_id, 'Thomas, un article sur le magnésium pour comprendre pourquoi c est crucial pour ta récupération sportive.', NOW()-INTERVAL '5 months'),
    -- Émilie : magnésium
    ('f2000000-0000-4000-a000-000000000003', v_c3, v_practitioner_id, 'Émilie, un article sur le magnésium pour comprendre son importance dans la récupération post-partum.', NOW()-INTERVAL '4 months'),
    -- Nathalie : alimentation anti-inflammatoire
    ('f2000000-0000-4000-a000-000000000002', v_c5, v_practitioner_id, 'Nathalie, l alimentation anti-inflammatoire est un pilier pour gérer les symptômes de la ménopause.', NOW()-INTERVAL '6 months'),
    -- Céline : yoga fibromyalgie + cohérence cardiaque + magnésium
    ('f2000000-0000-4000-a000-000000000004', v_c7, v_practitioner_id, 'Céline, cette vidéo de yoga doux est spécialement adaptée à la fibromyalgie. Allez-y très progressivement.', NOW()-INTERVAL '4 months'),
    ('f2000000-0000-4000-a000-000000000001', v_c7, v_practitioner_id, 'La cohérence cardiaque pour vous aider avec la gestion de la douleur et le sommeil.', NOW()-INTERVAL '6 months'),
    ('f2000000-0000-4000-a000-000000000003', v_c7, v_practitioner_id, 'Le magnésium est particulièrement important dans la fibromyalgie. Voici un guide complet.', NOW()-INTERVAL '6 months'),
    -- Amina : cohérence cardiaque
    ('f2000000-0000-4000-a000-000000000001', v_c9, v_practitioner_id, 'Amina, la cohérence cardiaque t aidera à gérer le stress des examens et à prévenir les migraines.', NOW()-INTERVAL '2 months'),
    -- Philippe : huiles essentielles
    ('f2000000-0000-4000-a000-000000000005', v_c10, v_practitioner_id, 'Philippe, un guide sur les huiles essentielles pour vous aider avec les applications sur l eczéma.', NOW()-INTERVAL '5 months'),
    ('f2000000-0000-4000-a000-000000000002', v_c10, v_practitioner_id, 'L alimentation anti-inflammatoire est essentielle dans la prise en charge de l eczéma.', NOW()-INTERVAL '5 months'),
    -- Isabelle : huiles essentielles
    ('f2000000-0000-4000-a000-000000000005', v_c11, v_practitioner_id, 'Isabelle, un rappel sur les HE de base pour votre cure détox.', NOW()-INTERVAL '3 months'),
    -- Robert : alimentation anti-inflammatoire
    ('f2000000-0000-4000-a000-000000000002', v_c12, v_practitioner_id, 'Robert, l alimentation anti-inflammatoire rejoint le régime méditerranéen cardioprotecteur.', NOW()-INTERVAL '4 months')
  ON CONFLICT DO NOTHING;

  -- ============================================
  -- Step 13 : Wearable Summaries (30 days × 5 connected consultants)
  -- ============================================

  -- Sophie (c1) – Apple Watch
  INSERT INTO wearable_summaries (consultant_id, date, sleep_duration, sleep_score, hrv_avg, activity_level, completeness, created_at)
  SELECT v_c1, d::date,
    6.5 + (random()*2)::numeric(3,1),
    65 + floor(random()*25)::numeric,
    35 + floor(random()*20)::numeric,
    4000 + floor(random()*4000)::numeric,
    0.8 + (random()*0.2)::numeric(3,2),
    NOW()
  FROM generate_series(NOW()-INTERVAL '30 days', NOW()-INTERVAL '1 day', INTERVAL '1 day') AS d
  ON CONFLICT DO NOTHING;

  -- Thomas (c2) – Garmin (high activity)
  INSERT INTO wearable_summaries (consultant_id, date, sleep_duration, sleep_score, hrv_avg, activity_level, completeness, created_at)
  SELECT v_c2, d::date,
    7 + (random()*2)::numeric(3,1),
    75 + floor(random()*20)::numeric,
    50 + floor(random()*30)::numeric,
    8000 + floor(random()*8000)::numeric,
    0.9 + (random()*0.1)::numeric(3,2),
    NOW()
  FROM generate_series(NOW()-INTERVAL '30 days', NOW()-INTERVAL '1 day', INTERVAL '1 day') AS d
  ON CONFLICT DO NOTHING;

  -- Céline (c7) – Oura Ring (low activity due to fibro)
  INSERT INTO wearable_summaries (consultant_id, date, sleep_duration, sleep_score, hrv_avg, activity_level, completeness, created_at)
  SELECT v_c7, d::date,
    5 + (random()*3)::numeric(3,1),
    45 + floor(random()*30)::numeric,
    25 + floor(random()*15)::numeric,
    2000 + floor(random()*3000)::numeric,
    0.7 + (random()*0.3)::numeric(3,2),
    NOW()
  FROM generate_series(NOW()-INTERVAL '30 days', NOW()-INTERVAL '1 day', INTERVAL '1 day') AS d
  ON CONFLICT DO NOTHING;

  -- Isabelle (c11) – Whoop (high wellness)
  INSERT INTO wearable_summaries (consultant_id, date, sleep_duration, sleep_score, hrv_avg, activity_level, completeness, created_at)
  SELECT v_c11, d::date,
    7.5 + (random()*1.5)::numeric(3,1),
    80 + floor(random()*15)::numeric,
    55 + floor(random()*25)::numeric,
    6000 + floor(random()*5000)::numeric,
    0.9 + (random()*0.1)::numeric(3,2),
    NOW()
  FROM generate_series(NOW()-INTERVAL '30 days', NOW()-INTERVAL '1 day', INTERVAL '1 day') AS d
  ON CONFLICT DO NOTHING;

  -- Robert (c12) – Apple Watch (moderate activity, senior)
  INSERT INTO wearable_summaries (consultant_id, date, sleep_duration, sleep_score, hrv_avg, activity_level, completeness, created_at)
  SELECT v_c12, d::date,
    6 + (random()*2)::numeric(3,1),
    55 + floor(random()*25)::numeric,
    20 + floor(random()*15)::numeric,
    3000 + floor(random()*3000)::numeric,
    0.75 + (random()*0.2)::numeric(3,2),
    NOW()
  FROM generate_series(NOW()-INTERVAL '30 days', NOW()-INTERVAL '1 day', INTERVAL '1 day') AS d
  ON CONFLICT DO NOTHING;

  -- ============================================
  -- Step 14 : Billing (subscription_plans, subscriptions, invoices, payment_methods, billing_history)
  -- ============================================

  -- Subscription plan (Premium)
  INSERT INTO subscription_plans (id, name, display_name, description, price_monthly, price_yearly, features, max_patients, bague_connectee_integration, is_active, created_at)
  VALUES (gen_random_uuid(), 'premium', 'Premium', 'Accès complet à toutes les fonctionnalités AFEIA, incluant l intégration Circular et le nombre illimité de consultants.', 49.90, 499.00,
    '["Consultants illimités", "Messagerie sécurisée", "Conseillancier IA", "Journal enrichi", "Intégration Circular (wearables)", "Ressources éducatives", "Export PDF", "Support prioritaire"]'::jsonb,
    NULL, true, true, NOW()-INTERVAL '12 months')
  ON CONFLICT (name) DO NOTHING;

  -- Get the premium plan ID
  SELECT id INTO v_plan_premium FROM subscription_plans WHERE name = 'premium' LIMIT 1;

  -- Subscription for Woodeline
  INSERT INTO subscriptions (id, practitioner_id, plan_id, status, billing_cycle, current_period_start, current_period_end, stripe_customer_id, stripe_subscription_id, created_at)
  VALUES (gen_random_uuid(), v_practitioner_id, v_plan_premium, 'active', 'monthly', NOW()-INTERVAL '15 days', NOW()+INTERVAL '15 days', 'cus_demo_woodeline_001', 'sub_demo_woodeline_001', NOW()-INTERVAL '10 months')
  RETURNING id INTO v_sub_id;

  -- Payment method
  INSERT INTO payment_methods (practitioner_id, type, is_default, card_brand, card_last4, card_exp_month, card_exp_year, stripe_payment_method_id, created_at) VALUES
    (v_practitioner_id, 'card', true, 'visa', '4242', 12, 2028, 'pm_demo_woodeline_001', NOW()-INTERVAL '10 months')
  ON CONFLICT DO NOTHING;

  -- Invoices (6 derniers mois)
  INSERT INTO invoices (subscription_id, practitioner_id, invoice_number, amount_subtotal, amount_tax, amount_total, currency, status, invoice_date, due_date, paid_at, description, billing_reason, created_at) VALUES
    (v_sub_id, v_practitioner_id, 'AFEIA-2025-0042', 41.58, 8.32, 49.90, 'EUR', 'paid', (NOW()-INTERVAL '5 months')::date, (NOW()-INTERVAL '5 months'+INTERVAL '30 days')::date, NOW()-INTERVAL '5 months', 'Abonnement Premium – Mensuel', 'subscription_cycle', NOW()-INTERVAL '5 months'),
    (v_sub_id, v_practitioner_id, 'AFEIA-2025-0055', 41.58, 8.32, 49.90, 'EUR', 'paid', (NOW()-INTERVAL '4 months')::date, (NOW()-INTERVAL '4 months'+INTERVAL '30 days')::date, NOW()-INTERVAL '4 months', 'Abonnement Premium – Mensuel', 'subscription_cycle', NOW()-INTERVAL '4 months'),
    (v_sub_id, v_practitioner_id, 'AFEIA-2025-0068', 41.58, 8.32, 49.90, 'EUR', 'paid', (NOW()-INTERVAL '3 months')::date, (NOW()-INTERVAL '3 months'+INTERVAL '30 days')::date, NOW()-INTERVAL '3 months', 'Abonnement Premium – Mensuel', 'subscription_cycle', NOW()-INTERVAL '3 months'),
    (v_sub_id, v_practitioner_id, 'AFEIA-2025-0081', 41.58, 8.32, 49.90, 'EUR', 'paid', (NOW()-INTERVAL '2 months')::date, (NOW()-INTERVAL '2 months'+INTERVAL '30 days')::date, NOW()-INTERVAL '2 months', 'Abonnement Premium – Mensuel', 'subscription_cycle', NOW()-INTERVAL '2 months'),
    (v_sub_id, v_practitioner_id, 'AFEIA-2026-0007', 41.58, 8.32, 49.90, 'EUR', 'paid', (NOW()-INTERVAL '1 month')::date, (NOW()-INTERVAL '1 month'+INTERVAL '30 days')::date, NOW()-INTERVAL '1 month', 'Abonnement Premium – Mensuel', 'subscription_cycle', NOW()-INTERVAL '1 month'),
    (v_sub_id, v_practitioner_id, 'AFEIA-2026-0019', 41.58, 8.32, 49.90, 'EUR', 'paid', (NOW()-INTERVAL '15 days')::date, (NOW()+INTERVAL '15 days')::date, NOW()-INTERVAL '15 days', 'Abonnement Premium – Mensuel', 'subscription_cycle', NOW()-INTERVAL '15 days')
  ON CONFLICT (invoice_number) DO NOTHING;

  -- Billing history events
  INSERT INTO billing_history (practitioner_id, subscription_id, event_type, description, created_at) VALUES
    (v_practitioner_id, v_sub_id, 'subscription_created',  'Souscription au plan Premium mensuel.',                     NOW()-INTERVAL '10 months'),
    (v_practitioner_id, v_sub_id, 'payment_succeeded',     'Paiement de 49.90€ reçu – Facture AFEIA-2025-0042.',        NOW()-INTERVAL '5 months'),
    (v_practitioner_id, v_sub_id, 'payment_succeeded',     'Paiement de 49.90€ reçu – Facture AFEIA-2025-0055.',        NOW()-INTERVAL '4 months'),
    (v_practitioner_id, v_sub_id, 'payment_succeeded',     'Paiement de 49.90€ reçu – Facture AFEIA-2025-0068.',        NOW()-INTERVAL '3 months'),
    (v_practitioner_id, v_sub_id, 'payment_succeeded',     'Paiement de 49.90€ reçu – Facture AFEIA-2025-0081.',        NOW()-INTERVAL '2 months'),
    (v_practitioner_id, v_sub_id, 'payment_succeeded',     'Paiement de 49.90€ reçu – Facture AFEIA-2026-0007.',        NOW()-INTERVAL '1 month'),
    (v_practitioner_id, v_sub_id, 'payment_succeeded',     'Paiement de 49.90€ reçu – Facture AFEIA-2026-0019.',        NOW()-INTERVAL '15 days')
  ON CONFLICT DO NOTHING;

  -- ============================================
  -- End of seed data
  -- ============================================
  RAISE NOTICE 'Seed data for Woodeline (pwoodeline@gmail.com) inserted successfully!';
  RAISE NOTICE 'Consultants: 12, Appointments: ~42, Consultations: ~30, Plans: 10';
  RAISE NOTICE 'Prescriptions: 8, Items: ~40, Messages: ~62, Journal entries: ~84';
  RAISE NOTICE 'Notifications: 15, Notes: 10, Resources: 5, Assignments: 13';
  RAISE NOTICE 'Wearable summaries: ~150, Complement tracking: ~112';

END $$;
