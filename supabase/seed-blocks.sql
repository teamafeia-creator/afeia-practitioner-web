-- Seed data: AFEIA base blocks for the reusable blocks library.
-- All blocks have owner_id = NULL and source = 'afeia_base'.
-- Section IDs map to CONSEILLANCIER_SECTIONS in lib/conseillancier.ts.

-- ═══════════════════════════════════════════════════════
-- SECTION: objectifs (5 blocs)
-- ═══════════════════════════════════════════════════════

INSERT INTO blocks (title, content, section, source, owner_id, motifs, tags, ai_keywords) VALUES
(
  'Rééquilibrage digestif',
  'Retrouver un confort digestif quotidien en travaillant sur plusieurs axes :
- Réduire les ballonnements, gaz et troubles du transit en identifiant les aliments irritants.
- Identifier les potentielles intolérances alimentaires via un journal alimentaire sur 2 semaines.
- Restaurer une flore intestinale équilibrée grâce à une alimentation prébiotique et probiotique.
- Apaiser la muqueuse digestive par des plantes cicatrisantes et anti-inflammatoires.
- Améliorer la digestion haute (estomac, foie, vésicule) par des techniques simples avant et après les repas.',
  'objectifs', 'afeia_base', NULL,
  ARRAY['digestif']::consultation_motif[],
  ARRAY['digestion', 'confort digestif'],
  ARRAY['ballonnements', 'transit', 'intestin', 'dysbiose', 'flore', 'intolérances']
),
(
  'Retrouver énergie et vitalité',
  'Restaurer un niveau d''énergie stable tout au long de la journée :
- Identifier les causes de la fatigue (carences, sommeil, stress, surcharge hépatique).
- Soutenir les surrénales et la fonction thyroïdienne par l''alimentation et les plantes adaptogènes.
- Optimiser l''assimilation des nutriments essentiels (fer, B12, magnésium, vitamine D).
- Améliorer la qualité du sommeil pour un repos véritablement réparateur.
- Mettre en place une hygiène de vie qui favorise l''énergie : mouvement, lumière naturelle, rythme circadien.',
  'objectifs', 'afeia_base', NULL,
  ARRAY['fatigue']::consultation_motif[],
  ARRAY['énergie', 'vitalité'],
  ARRAY['fatigue', 'épuisement', 'surrénales', 'asthénie', 'carences']
),
(
  'Gestion du stress et équilibre nerveux',
  'Diminuer la charge nerveuse et retrouver un équilibre du système nerveux :
- Installer des routines quotidiennes de régulation (cohérence cardiaque, respiration, ancrage).
- Retrouver un sommeil de qualité grâce à un rituel du coucher adapté.
- Soutenir le système nerveux par une alimentation riche en magnésium, oméga-3 et vitamines du groupe B.
- Apprendre à identifier et gérer les signaux de stress avant l''épuisement.
- Intégrer des pauses ressourçantes dans le quotidien (nature, déconnexion numérique, activité physique douce).',
  'objectifs', 'afeia_base', NULL,
  ARRAY['stress']::consultation_motif[],
  ARRAY['stress', 'anxiété', 'nervosité'],
  ARRAY['stress', 'anxiété', 'nervosité', 'burn-out', 'système nerveux']
),
(
  'Équilibre hormonal féminin',
  'Accompagner le rééquilibrage hormonal de manière naturelle :
- Régulariser le cycle menstruel par l''alimentation et les plantes adaptées.
- Réduire les symptômes prémenstruels (douleurs, humeur, rétention d''eau, acné).
- Soutenir l''axe hypothalamo-hypophyso-ovarien par une hygiène de vie globale.
- Réduire l''exposition aux perturbateurs endocriniens au quotidien.
- Adapter l''alimentation aux différentes phases du cycle (alimentation cyclique).',
  'objectifs', 'afeia_base', NULL,
  ARRAY['feminin']::consultation_motif[],
  ARRAY['hormones', 'cycle', 'féminin'],
  ARRAY['SPM', 'cycle', 'ménopause', 'SOPK', 'hormones', 'endométriose']
),
(
  'Perte de poids durable',
  'Rééquilibrer le poids de manière progressive et durable, sans restriction :
- Rééquilibrer l''alimentation en privilégiant la densité nutritionnelle plutôt que la restriction calorique.
- Relancer le métabolisme de base par l''activité physique et la chronobiologie alimentaire.
- Travailler sur la satiété et les comportements alimentaires compulsifs.
- Soutenir les fonctions d''élimination (foie, reins, intestins) pour une détoxification douce.
- Intégrer une activité physique adaptée et progressive, combinant cardio et renforcement.',
  'objectifs', 'afeia_base', NULL,
  ARRAY['perte_poids']::consultation_motif[],
  ARRAY['poids', 'minceur'],
  ARRAY['poids', 'métabolisme', 'satiété', 'obésité', 'restriction']
);

-- ═══════════════════════════════════════════════════════
-- SECTION: alimentation (10 blocs)
-- ═══════════════════════════════════════════════════════

INSERT INTO blocks (title, content, section, source, owner_id, motifs, tags, ai_keywords) VALUES
(
  'Alimentation anti-inflammatoire',
  'Privilégier une alimentation riche en nutriments anti-inflammatoires :
- Augmenter les apports en oméga-3 : petits poissons gras (sardines, maquereaux, anchois) 3 fois/semaine, huile de lin ou de cameline en assaisonnement (1 c.à.s./jour).
- Intégrer le curcuma quotidiennement (associé au poivre noir et à un corps gras pour optimiser l''absorption).
- Consommer des fruits rouges et baies riches en antioxydants (myrtilles, framboises, cassis).
- Privilégier les cuissons douces (vapeur, basse température) pour préserver les nutriments.
- Augmenter les légumes colorés à chaque repas (au moins 50% de l''assiette).
- Réduire les aliments pro-inflammatoires : sucre raffiné, huiles raffinées, produits ultra-transformés.',
  'alimentation', 'afeia_base', NULL,
  ARRAY['digestif', 'douleurs', 'peau', 'immunite', 'universel']::consultation_motif[],
  ARRAY['anti-inflammatoire', 'oméga-3'],
  ARRAY['inflammation', 'oméga-3', 'curcuma', 'antioxydants', 'cuisson douce']
),
(
  'Alimentation pauvre en FODMAPs',
  'Mise en place d''une alimentation pauvre en FODMAPs en 3 phases :

Phase 1 — Éviction stricte (4 à 6 semaines) :
Éviter les aliments riches en FODMAPs : oignon, ail, blé, seigle, pomme, poire, lait, miel, champignons, légumineuses en grande quantité. Privilégier : riz, quinoa, pommes de terre, carottes, courgettes, banane mûre, oranges, fromages affinés, lait sans lactose.

Phase 2 — Réintroduction progressive (6 à 8 semaines) :
Réintroduire un groupe de FODMAPs à la fois, sur 3 jours consécutifs, en notant les réactions dans un journal alimentaire.

Phase 3 — Personnalisation :
Conserver uniquement les évictions nécessaires. L''objectif est la diversité alimentaire maximale tolérée.',
  'alimentation', 'afeia_base', NULL,
  ARRAY['digestif']::consultation_motif[],
  ARRAY['FODMAPs', 'SII'],
  ARRAY['FODMAPs', 'intestin irritable', 'ballonnements', 'SIBO', 'éviction']
),
(
  'Alimentation chronobiologique',
  'Adapter les repas au rythme biologique pour optimiser énergie et métabolisme :

Petit-déjeuner (7h-8h) — Gras et protéiné :
Œufs, avocat, fromage de brebis, pain au levain ou flocons d''avoine, oléagineux (amandes, noix). Éviter le sucré (confiture, viennoiseries, jus de fruits).

Déjeuner (12h-13h) — Repas complet :
Protéine animale ou végétale (150g), légumes cuits et crus, féculent complet (riz, patate douce, quinoa), huile de qualité. C''est le repas principal de la journée.

Goûter (16h-17h) — Optionnel :
Fruit frais + quelques oléagineux ou carré de chocolat noir 70%.

Dîner (19h-20h) — Léger et végétal :
Soupe de légumes, salade composée, poisson léger. Éviter les protéines animales lourdes et les féculents en excès le soir.',
  'alimentation', 'afeia_base', NULL,
  ARRAY['fatigue', 'perte_poids', 'universel']::consultation_motif[],
  ARRAY['chronobiologie', 'rythme'],
  ARRAY['chronobiologie', 'petit-déjeuner', 'rythme', 'métabolisme', 'énergie']
),
(
  'Alimentation hypotoxique (Seignalet)',
  'Principes de l''alimentation hypotoxique pour réduire la charge inflammatoire :
- Suppression du gluten (blé, seigle, orge, épeautre) : remplacer par riz, sarrasin, quinoa, millet, maïs.
- Suppression des laitages animaux (vache surtout) : remplacer par laits végétaux (amande, avoine), fromages de chèvre/brebis en quantité modérée.
- Cuisson basse température (< 110°C) : vapeur douce, étouffée, wok rapide. Éviter fritures, grillades, barbecue.
- Privilégier le cru et le peu cuit pour préserver enzymes et vitamines.
- Augmenter les huiles vierges première pression à froid (olive, colza, lin, cameline).
- Durée recommandée : 3 mois minimum pour évaluer les bénéfices.',
  'alimentation', 'afeia_base', NULL,
  ARRAY['peau', 'douleurs']::consultation_motif[],
  ARRAY['Seignalet', 'hypotoxique'],
  ARRAY['Seignalet', 'hypotoxique', 'sans gluten', 'sans laitages', 'cuisson douce']
),
(
  'Alimentation soutien hormonal féminin',
  'Adapter l''alimentation pour soutenir l''équilibre hormonal :
- Graines de lin fraîchement moulues : 1 à 2 c.à.s./jour (riches en lignanes, modulateurs d''œstrogènes).
- Crucifères (brocoli, chou-fleur, chou kale) : 3 à 4 fois/semaine pour le métabolisme des œstrogènes (DIM naturel).
- Réduire les perturbateurs endocriniens alimentaires : plastiques, conserves, pesticides → privilégier le bio et les contenants en verre.
- Augmenter les sources de zinc (graines de courge, fruits de mer) et de vitamine B6 (banane, poulet, pois chiches).
- En phase lutéale (2e partie de cycle) : augmenter les aliments riches en magnésium et en tryptophane.
- Réduire l''alcool et le café qui perturbent le métabolisme hépatique des hormones.',
  'alimentation', 'afeia_base', NULL,
  ARRAY['feminin']::consultation_motif[],
  ARRAY['hormones', 'cycle', 'féminin'],
  ARRAY['hormones', 'graines de lin', 'crucifères', 'perturbateurs endocriniens', 'cycle']
),
(
  'Éviction des irritants digestifs',
  'Pendant la durée du protocole, limiter ou supprimer les irritants digestifs suivants :
- Café (y compris décaféiné) : remplacer par de la chicorée ou du rooibos.
- Alcool : suppression complète pendant 4 à 6 semaines minimum.
- Épices fortes et piquantes (piment, poivre en excès) : préférer curcuma, gingembre, cumin, fenouil.
- Produits ultra-transformés (additifs, émulsifiants, édulcorants) : lire les étiquettes et privilégier les aliments bruts.
- Crudités en excès le soir : privilégier les légumes cuits, plus digestes.
- Boissons gazeuses et chewing-gums (aérophagie).
- Laitages de vache (caséine irritante) : tester l''éviction sur 3 semaines.',
  'alimentation', 'afeia_base', NULL,
  ARRAY['digestif']::consultation_motif[],
  ARRAY['éviction', 'irritants'],
  ARRAY['café', 'alcool', 'irritants', 'ultra-transformés', 'additifs']
),
(
  'Réduction des pro-inflammatoires',
  'Réduire progressivement les aliments qui entretiennent l''inflammation chronique :
- Sucre raffiné et produits sucrés industriels : remplacer par fruits frais, miel en petite quantité, sucre de coco.
- Graisses trans et hydrogénées : margarines, viennoiseries industrielles, plats préparés.
- Huiles raffinées (tournesol, arachide) : remplacer par huile d''olive vierge extra (cuisson) et huile de colza/lin (assaisonnement).
- Viandes rouges en excès : limiter à 1 à 2 fois/semaine, privilégier les viandes blanches et le poisson.
- Produits laitiers de vache en excès : tester la réduction et observer les effets sur 3 semaines.
- Aliments à index glycémique élevé : pain blanc, riz blanc, pâtes blanches → remplacer par versions complètes ou semi-complètes.',
  'alimentation', 'afeia_base', NULL,
  ARRAY['universel']::consultation_motif[],
  ARRAY['anti-inflammatoire'],
  ARRAY['inflammation', 'sucre', 'graisses trans', 'index glycémique']
),
(
  'Limitation des excitants et acidifiants',
  'Réduire les substances qui stimulent excessivement le système nerveux et acidifient le terrain :
- Café : maximum 1 tasse le matin (avant 10h), idéalement remplacer par thé vert matcha ou chicorée.
- Thé noir : limiter à 1 tasse/jour (riche en théine). Préférer le thé vert ou les infusions.
- Sucres rapides (confiseries, sodas, jus de fruits) : favorisent les pics d''insuline et l''acidification.
- Alcool : même en petite quantité, perturbe le sommeil et acidifie l''organisme.
- Protéines animales en excès le soir : acidifiantes et stimulantes, à réserver au déjeuner.
- Privilégier les aliments alcalinisants : légumes verts, patate douce, amandes, banane, citron (malgré son goût acide, il est alcalinisant).',
  'alimentation', 'afeia_base', NULL,
  ARRAY['stress', 'fatigue', 'sommeil']::consultation_motif[],
  ARRAY['excitants', 'acidifiants'],
  ARRAY['café', 'théine', 'acidité', 'alcalinisant', 'sucre']
),
(
  'Hydratation de base',
  'Objectif : 1,5 L d''eau par jour minimum (à adapter selon le poids, l''activité et la saison).

Recommandations :
- Eau faiblement minéralisée (résidu sec < 200 mg/L) : Mont Roucous, Montcalm, Volvic.
- Boire en dehors des repas pour ne pas diluer les sucs digestifs (arrêter 15 min avant, reprendre 1h après).
- Eau à température ambiante ou tiède (éviter l''eau glacée qui ralentit la digestion).
- Commencer la journée par un grand verre d''eau tiède (avec ou sans citron) pour relancer le péristaltisme.
- Répartir les prises sur la journée : ne pas attendre la soif pour boire.
- Compléter avec des tisanes non sucrées (thym, romarin, verveine) pour varier les plaisirs.',
  'alimentation', 'afeia_base', NULL,
  ARRAY['universel']::consultation_motif[],
  ARRAY['hydratation', 'eau'],
  ARRAY['hydratation', 'eau', 'eau tiède', 'minéralisation']
),
(
  'Hydratation et drainage',
  'Protocole d''hydratation renforcée pour soutenir l''élimination :

Objectif : 2 L/jour minimum, incluant :
- 1,5 L d''eau faiblement minéralisée.
- 2 à 3 tasses d''infusions drainantes par jour : bouleau, reine-des-prés, queue de cerise, pissenlit.
- Option : cure de sève de bouleau fraîche (2 à 3 semaines au printemps, 100 à 250 ml/jour à jeun).
- Jus de citron pressé dans de l''eau tiède le matin à jeun (soutien hépatique).
- Éviter les eaux très minéralisées (Hépar, Contrex) en cure continue — les alterner.

Signes d''une bonne hydratation : urines claires et abondantes, peau souple, absence de maux de tête.',
  'alimentation', 'afeia_base', NULL,
  ARRAY['perte_poids', 'peau', 'detox']::consultation_motif[],
  ARRAY['drainage', 'hydratation'],
  ARRAY['drainage', 'bouleau', 'détox', 'élimination', 'reins']
);

-- ═══════════════════════════════════════════════════════
-- SECTION: phytotherapie (8 blocs)
-- ═══════════════════════════════════════════════════════

INSERT INTO blocks (title, content, section, source, owner_id, motifs, tags, ai_keywords) VALUES
(
  'Protocole digestif de base',
  'Association de 3 plantes pour un soutien digestif global :

1. Mélisse (Melissa officinalis) — Antispasmodique digestif, carminative :
   Infusion : 1 c.à.s. de feuilles séchées pour 250 ml, 10 min couvert. 1 tasse après le déjeuner et le dîner.

2. Artichaut (Cynara scolymus) — Cholagogue, hépatoprotecteur :
   EPS ou teinture-mère : 5 ml dans un verre d''eau, avant le déjeuner. Stimule la production de bile.

3. Romarin (Rosmarinus officinalis) — Hépatotrope, antioxydant :
   Infusion : 1 c.à.c. de feuilles pour 250 ml, 2 tasses/jour. Ou en EPS associé à l''artichaut.

Cure de 3 semaines, pause 1 semaine, reprendre si nécessaire.',
  'phytotherapie', 'afeia_base', NULL,
  ARRAY['digestif']::consultation_motif[],
  ARRAY['digestion', 'plantes'],
  ARRAY['mélisse', 'artichaut', 'romarin', 'foie', 'bile', 'antispasmodique']
),
(
  'Plantes adaptogènes — Fatigue',
  'Protocole de soutien surrénalien et énergétique par les plantes adaptogènes :

1. Rhodiola (Rhodiola rosea) — Adaptogène de premier choix pour fatigue + stress :
   Gélules standardisées : 200 à 400 mg/jour, le matin à jeun. Pas après 14h (légèrement stimulante).

2. Ashwagandha (Withania somnifera) — Adaptogène calmant, anti-cortisol :
   Gélules : 300 à 600 mg/jour, matin et/ou soir. Idéale si fatigue + anxiété.

3. Éleuthérocoque (Eleutherococcus senticosus) — Tonique général :
   Teinture-mère : 30 à 40 gouttes le matin dans un peu d''eau. Cure de 6 semaines.

Ne pas associer avec café en excès. Contre-indiquées en cas d''hypertension non contrôlée.',
  'phytotherapie', 'afeia_base', NULL,
  ARRAY['fatigue', 'stress']::consultation_motif[],
  ARRAY['adaptogènes', 'énergie'],
  ARRAY['rhodiola', 'ashwagandha', 'éleuthérocoque', 'surrénales', 'cortisol', 'adaptogènes']
),
(
  'Soutien hépatique saisonnier',
  'Protocole de drainage hépatique (idéal aux changements de saison) :

1. Chardon-Marie (Silybum marianum) — Hépatoprotecteur majeur :
   Gélules d''extrait standardisé en silymarine : 200 à 400 mg/jour. Protège et régénère les cellules hépatiques.

2. Desmodium (Desmodium adscendens) — Régénérateur hépatique :
   EPS : 5 à 10 ml/jour pendant 10 jours en début de cure. Très utile après excès ou traitement médicamenteux.

3. Radis noir (Raphanus sativus var. niger) — Cholagogue puissant :
   Jus ou ampoules : 1 ampoule/jour avant le petit-déjeuner, cure de 3 semaines.

Ordre de prise recommandé : Desmodium 10 jours, puis Chardon-Marie + Radis noir 3 semaines.',
  'phytotherapie', 'afeia_base', NULL,
  ARRAY['detox']::consultation_motif[],
  ARRAY['foie', 'détox', 'drainage'],
  ARRAY['chardon-marie', 'desmodium', 'radis noir', 'foie', 'drainage', 'silymarine']
),
(
  'Plantes du sommeil',
  'Association de plantes pour améliorer l''endormissement et la qualité du sommeil :

1. Valériane (Valeriana officinalis) — Sédative, myorelaxante :
   Gélules : 300 à 600 mg, 30 min avant le coucher. Ou teinture-mère : 50 gouttes.
   Note : l''effet se renforce après 2 semaines de prise continue.

2. Passiflore (Passiflora incarnata) — Anxiolytique douce, favorise l''endormissement :
   Infusion : 1 c.à.s. pour 250 ml, 15 min couvert. 1 tasse après le dîner et 1 au coucher.

3. Eschscholtzia (Eschscholzia californica) — Inducteur du sommeil, antalgique léger :
   Gélules : 200 à 400 mg au coucher. Particulièrement utile si réveils nocturnes.

Cure de 3 à 6 semaines. Peut être associée au magnésium bisglycinate.',
  'phytotherapie', 'afeia_base', NULL,
  ARRAY['sommeil', 'stress']::consultation_motif[],
  ARRAY['sommeil', 'plantes'],
  ARRAY['valériane', 'passiflore', 'eschscholtzia', 'insomnie', 'endormissement']
),
(
  'Plantes d''accompagnement féminin',
  'Plantes de soutien du cycle féminin et de l''équilibre hormonal :

1. Gattilier (Vitex agnus-castus) — Régulateur de l''axe hormonal, progestérone-like :
   Gélules : 4 mg d''extrait/jour, le matin à jeun. Cure de 3 à 6 mois minimum pour évaluer l''effet.
   Indication principale : SPM, irrégularités de cycle, insuffisance lutéale.

2. Alchémille (Alchemilla vulgaris) — Progestérone-like douce :
   Infusion : 1 c.à.s. pour 250 ml, 2 tasses/jour en 2e partie de cycle (J14 à J28).

3. Sauge officinale (Salvia officinalis) — Œstrogène-like :
   Infusion : 1 c.à.c. pour 250 ml, 1 tasse/jour en 1re partie de cycle (J1 à J14).
   Contre-indiquée en cas de cancer hormonodépendant, grossesse, allaitement.

Ne pas associer gattilier + pilule contraceptive sans avis médical.',
  'phytotherapie', 'afeia_base', NULL,
  ARRAY['feminin']::consultation_motif[],
  ARRAY['féminin', 'hormones', 'cycle'],
  ARRAY['gattilier', 'alchémille', 'sauge', 'SPM', 'cycle', 'progestérone']
),
(
  'Posologie infusions standard',
  'Préparation et posologie des infusions de plantes :
- Dosage : 1 cuillère à soupe de plantes sèches pour 250 ml d''eau frémissante.
- Couvrir et laisser infuser 10 à 15 minutes (les couvrir permet de conserver les huiles essentielles volatiles).
- Filtrer avant de boire. Ne pas resucrer (si besoin, un peu de miel).
- Posologie : 2 à 3 tasses par jour, idéalement entre les repas.
- Cure : 3 semaines de prise, 1 semaine de pause, puis reprendre si nécessaire.
- Conservation : préparer chaque tasse individuellement ou une théière pour la journée (consommer dans les 12h).',
  'phytotherapie', 'afeia_base', NULL,
  ARRAY['universel']::consultation_motif[],
  ARRAY['posologie', 'infusion'],
  ARRAY['infusion', 'tisane', 'posologie', 'préparation']
),
(
  'Posologie EPS et teintures-mères',
  'Mode d''emploi des extraits de plantes standardisés (EPS) et teintures-mères :

EPS (Extraits de Plantes Standardisés) :
- Posologie adulte : 5 ml (1 cuillère à café) matin et soir, dilués dans un verre d''eau.
- Possibilité de mélanger 2 à 3 EPS dans un même flacon (demander en pharmacie).
- Cure : 1 à 3 mois selon l''indication. Réévaluer après chaque cure.

Teintures-mères (TM) :
- Posologie : 30 à 50 gouttes, 2 à 3 fois/jour, dans un peu d''eau.
- Attention : les TM contiennent de l''alcool — déconseillées si antécédents d''alcoolisme ou grossesse.

Conservation : à l''abri de la lumière et de la chaleur. Respecter les dates de péremption.',
  'phytotherapie', 'afeia_base', NULL,
  ARRAY['universel']::consultation_motif[],
  ARRAY['posologie', 'EPS', 'teinture-mère'],
  ARRAY['EPS', 'teinture-mère', 'posologie', 'extrait']
),
(
  'Précautions générales phytothérapie',
  'Rappels importants concernant l''usage des plantes médicinales :
- Respecter les dosages indiqués. « Naturel » ne signifie pas « sans risque ».
- Grossesse et allaitement : de nombreuses plantes sont contre-indiquées. Demander systématiquement un avis.
- Interactions médicamenteuses : certaines plantes interagissent avec les médicaments (millepertuis + pilule/antidépresseurs, ginkgo + anticoagulants, etc.). Signaler toujours vos traitements en cours.
- Enfants de moins de 6 ans : adapter les dosages et privilégier les hydrolats.
- En cas d''effets indésirables (allergie, troubles digestifs, maux de tête), arrêter la prise et me contacter.
- Ce programme de naturopathie ne se substitue en aucun cas à un avis ou traitement médical. Ne jamais arrêter un traitement sans l''accord de votre médecin.',
  'phytotherapie', 'afeia_base', NULL,
  ARRAY['universel']::consultation_motif[],
  ARRAY['précautions', 'sécurité'],
  ARRAY['précautions', 'contre-indications', 'interactions', 'grossesse', 'sécurité']
);

-- ═══════════════════════════════════════════════════════
-- SECTION: micronutrition (5 blocs)
-- ═══════════════════════════════════════════════════════

INSERT INTO blocks (title, content, section, source, owner_id, motifs, tags, ai_keywords) VALUES
(
  'Micronutrition de base',
  'Socle micronutritionnel recommandé en première intention :

1. Magnésium bisglycinate : 300 mg/jour au dîner (forme très bien tolérée, ne provoque pas de troubles digestifs).
   Durée : 3 mois minimum. Indispensable en cas de stress, fatigue, crampes, troubles du sommeil.

2. Vitamine D3 : 2 000 UI/jour en automne/hiver (octobre à avril), ou selon dosage sanguin.
   Prendre avec un repas contenant du gras. Associer à la vitamine K2-MK7 (75 μg) pour la fixation osseuse.

3. Zinc bisglycinate : 15 mg/jour, le matin, loin du fer et du calcium.
   Soutien immunitaire, peau, équilibre hormonal. Cure de 2 à 3 mois.

4. Oméga-3 EPA/DHA : 1 à 2 g/jour (ratio EPA > DHA pour l''inflammation, DHA > EPA pour le cerveau).
   Qualité TOTOX faible, origine petits poissons. Prendre au repas.',
  'micronutrition', 'afeia_base', NULL,
  ARRAY['universel']::consultation_motif[],
  ARRAY['micronutrition', 'compléments'],
  ARRAY['magnésium', 'vitamine D', 'zinc', 'oméga-3', 'EPA', 'DHA']
),
(
  'Probiotiques — Rééquilibrage intestinal',
  'Protocole de restauration de la flore intestinale :

1. Probiotiques multi-souches (Lactobacillus + Bifidobacterium) :
   Dosage : 10 à 20 milliards d''UFC/jour, à jeun le matin avec un verre d''eau.
   Souches recommandées : L. rhamnosus GG, L. plantarum, B. longum, B. lactis.
   Durée : 1 à 3 mois.

2. Prébiotiques (en complément ou via l''alimentation) :
   Sources alimentaires : poireau, oignon cuit, ail, banane peu mûre, asperge, artichaut.
   Ou complémentation en FOS/inuline : 5 g/jour (augmenter progressivement pour éviter les ballonnements).

3. L-glutamine : 3 à 5 g/jour à jeun, pendant 1 mois, pour soutenir la réparation de la muqueuse intestinale.

Introduire progressivement si sensibilité digestive importante.',
  'micronutrition', 'afeia_base', NULL,
  ARRAY['digestif', 'immunite']::consultation_motif[],
  ARRAY['probiotiques', 'flore'],
  ARRAY['probiotiques', 'flore intestinale', 'UFC', 'prébiotiques', 'L-glutamine', 'dysbiose']
),
(
  'Compléments anti-fatigue',
  'Compléments ciblés pour la fatigue chronique (après vérification biologique si possible) :

1. Fer bisglycinate (si ferritine < 50 μg/L) : 14 à 28 mg/jour, à jeun avec de la vitamine C.
   Ne pas supplémenter sans bilan sanguin préalable (ferritine + CRP).
   Prendre loin du thé, café, calcium et zinc (2h d''écart).

2. Vitamine B12 (méthylcobalamine) : 1 000 μg/jour en sublingual, surtout si alimentation végéta*ienne.

3. Coenzyme Q10 : 100 à 200 mg/jour au petit-déjeuner (avec du gras).
   Particulièrement utile après 40 ans ou sous statines.

4. Spiruline : 3 à 5 g/jour, progressivement. Riche en fer, B12, protéines.
   Choisir de qualité française ou européenne, certifiée sans métaux lourds.

Cure de 2 à 3 mois. Réévaluer selon évolution de la fatigue.',
  'micronutrition', 'afeia_base', NULL,
  ARRAY['fatigue']::consultation_motif[],
  ARRAY['fatigue', 'fer'],
  ARRAY['fer', 'B12', 'coenzyme Q10', 'spiruline', 'fatigue', 'anémie', 'ferritine']
),
(
  'Soutien hormonal féminin',
  'Compléments pour accompagner l''équilibre hormonal féminin :

1. Huile d''onagre : 1 000 à 1 500 mg/jour en 2e partie de cycle.
   Riche en GLA (oméga-6 anti-inflammatoire). Action sur mastalgie, SPM, peau sèche.

2. Vitamine B6 (P5P — forme active) : 25 à 50 mg/jour.
   Soutient le métabolisme de la progestérone et la synthèse de sérotonine.

3. Magnésium bisglycinate : 300 mg/jour, en continu.
   Essentiel pour réduire irritabilité, crampes, rétention d''eau prémenstruelle.

4. DIM (Di-Indolyl-Méthane) : 100 à 200 mg/jour si dominance œstrogénique.
   Favorise la métabolisation hépatique des œstrogènes.
   Alternative : consommation régulière de crucifères (brocoli, chou kale).

Suivi sur 3 cycles minimum pour évaluer les bénéfices.',
  'micronutrition', 'afeia_base', NULL,
  ARRAY['feminin']::consultation_motif[],
  ARRAY['féminin', 'hormones'],
  ARRAY['onagre', 'B6', 'DIM', 'SPM', 'hormones', 'œstrogènes', 'progestérone']
),
(
  'Soutien immunitaire',
  'Protocole de renforcement des défenses immunitaires :

1. Vitamine C : 500 à 1 000 mg/jour, répartis en 2 prises (matin et midi).
   Formes tamponnées (ascorbate de sodium) si estomac sensible. Associer à des bioflavonoïdes.

2. Échinacée (Echinacea purpurea) : en cure préventive de 3 semaines (automne).
   Teinture-mère : 30 gouttes 3 fois/jour, ou gélules standardisées 500 mg 2 fois/jour.
   Ne pas utiliser en continu : alterner 3 semaines ON / 1 semaine OFF.

3. Propolis : spray buccal ou gélules, en préventif ou dès les premiers symptômes.
   Antibactérien, antiviral, immunostimulant naturel.

4. Zinc : 15 mg/jour en préventif, 30 mg/jour en aigu (pas plus de 5 jours à haute dose).

5. Vitamine D3 : 4 000 UI/jour en cure d''attaque si carence (< 30 ng/ml), puis 2 000 UI/jour.',
  'micronutrition', 'afeia_base', NULL,
  ARRAY['immunite']::consultation_motif[],
  ARRAY['immunité', 'défenses'],
  ARRAY['vitamine C', 'échinacée', 'propolis', 'zinc', 'vitamine D', 'immunité']
);

-- ═══════════════════════════════════════════════════════
-- SECTION: sommeil (3 blocs)
-- ═══════════════════════════════════════════════════════

INSERT INTO blocks (title, content, section, source, owner_id, motifs, tags, ai_keywords) VALUES
(
  'Hygiène du sommeil — Règles de base',
  'Les piliers d''un sommeil réparateur :
- Horaires réguliers : se coucher et se lever à heure fixe, y compris le week-end (± 30 min).
- Chambre fraîche (17-19°C), sombre (rideaux occultants ou masque de nuit) et silencieuse.
- Pas d''écrans (téléphone, tablette, TV) 1h avant le coucher — la lumière bleue inhibe la mélatonine.
- Rituel du coucher : lecture, étirements doux, tisane, cohérence cardiaque, gratitude.
- Éviter le sport intense après 18h (préférer le matin ou en début d''après-midi).
- Dîner léger et au moins 2h avant le coucher. Éviter l''alcool (il fragmente le sommeil).
- Réserver le lit au sommeil (et à l''intimité) : pas de travail, pas de repas au lit.
- Si pas endormi après 20 min : se lever, faire une activité calme, et revenir quand la fatigue se manifeste.',
  'sommeil', 'afeia_base', NULL,
  ARRAY['universel']::consultation_motif[],
  ARRAY['sommeil', 'hygiène'],
  ARRAY['sommeil', 'insomnie', 'rituel', 'mélatonine', 'horaires']
),
(
  'Protocole insomnie d''endormissement',
  'Programme pour favoriser un endormissement rapide :

1. Cohérence cardiaque au coucher (5-5-5) :
   5 minutes, 5 inspirations/expirations par minute, allongé(e). App recommandée : RespiRelax+.

2. Tisane relaxante 30 min avant le coucher :
   Mélange : passiflore + tilleul + fleur d''oranger. 1 c.à.s. pour 250 ml, couvrir 10 min.

3. Magnésium bisglycinate : 300 mg au dîner.
   Le magnésium favorise la relaxation musculaire et nerveuse.

4. Body scan ou relaxation progressive de Jacobson :
   10 minutes allongé(e) dans le noir. Contracter puis relâcher chaque groupe musculaire des pieds à la tête.

5. Ambiance : diffuser 2-3 gouttes d''huile essentielle de lavande vraie dans la chambre 30 min avant, ou sur l''oreiller.

En cas de persistance après 3 semaines : envisager un bilan de la mélatonine et du cortisol salivaire.',
  'sommeil', 'afeia_base', NULL,
  ARRAY['sommeil', 'stress']::consultation_motif[],
  ARRAY['insomnie', 'endormissement'],
  ARRAY['insomnie', 'endormissement', 'cohérence cardiaque', 'magnésium', 'body scan']
),
(
  'Protocole réveils nocturnes',
  'Programme pour les réveils en milieu de nuit (typiquement entre 1h et 4h) :

1. Approche médecine traditionnelle chinoise (MTC) :
   Réveil entre 1h-3h = surcharge hépatique → drainage hépatique doux (artichaut, romarin, desmodium).
   Réveil entre 3h-5h = surcharge pulmonaire/émotionnelle → travail respiratoire et gestion du deuil/tristesse.

2. Stabiliser la glycémie nocturne :
   Collation du soir (si faim) : 1 c.à.s. de purée d''amandes ou quelques oléagineux.
   L''hypoglycémie nocturne provoque un pic de cortisol qui réveille.

3. Complémentation :
   Mélatonine LP (libération prolongée) : 1,9 mg au coucher, sur avis d''un professionnel.
   L-tryptophane ou 5-HTP : 100 à 200 mg au dîner (précurseur de sérotonine puis mélatonine).

4. Si ruminations mentales au réveil : technique du « parking à pensées » (noter sur un carnet de chevet, puis reposer).',
  'sommeil', 'afeia_base', NULL,
  ARRAY['sommeil']::consultation_motif[],
  ARRAY['réveils nocturnes'],
  ARRAY['réveils nocturnes', 'foie', 'MTC', 'glycémie', 'mélatonine', 'cortisol']
);

-- ═══════════════════════════════════════════════════════
-- SECTION: activite (4 blocs)
-- ═══════════════════════════════════════════════════════

INSERT INTO blocks (title, content, section, source, owner_id, motifs, tags, ai_keywords) VALUES
(
  'Activité douce — Reprise',
  'Programme de reprise d''activité physique progressif sur 4 semaines :

Semaine 1-2 :
- Marche quotidienne 20 à 30 minutes (idéalement en nature, le matin ou après le déjeuner).
- Étirements doux 10 minutes le matin au réveil.

Semaine 3-4 :
- Marche 30 à 45 minutes, allure soutenue.
- Ajouter 1 à 2 séances de yoga doux ou Pilates (20-30 min, type Hatha yoga).
- Possibilité de nager 30 min en eau tiède (activité portée, douce pour les articulations).

Principes :
- Ne jamais forcer : la progression doit être agréable.
- Privilégier le plein air et la lumière naturelle (régulation du cortisol et de la mélatonine).
- Écouter les signaux du corps : essoufflement modéré OK, douleur = stop.
- Objectif à terme : 150 min/semaine d''activité modérée (recommandation OMS).',
  'activite', 'afeia_base', NULL,
  ARRAY['fatigue', 'stress', 'universel']::consultation_motif[],
  ARRAY['reprise', 'activité douce'],
  ARRAY['marche', 'yoga', 'reprise', 'progressif', 'pilates']
),
(
  'Activité et perte de poids',
  'Programme d''activité physique optimisé pour la perte de poids durable :

Cardio (3 séances/semaine) :
- Marche rapide, vélo, natation, elliptique : 30 à 45 min à intensité modérée (pouvoir tenir une conversation).
- Idéalement le matin à jeun (ou après un petit-déjeuner léger) pour optimiser la lipolyse.

Renforcement musculaire (2 séances/semaine) :
- Exercices au poids du corps ou avec résistance légère : squats, fentes, gainage, pompes adaptées.
- Le muscle consomme de l''énergie au repos : augmenter la masse musculaire = augmenter le métabolisme basal.

En option (si condition physique OK) :
- 1 séance de HIIT (High Intensity Interval Training) par semaine : 20 min maximum.
- Alterner 30 secondes d''effort intense et 30 secondes de récupération.

Important : ne pas compenser l''effort par une suralimentation. Bien s''hydrater.',
  'activite', 'afeia_base', NULL,
  ARRAY['perte_poids']::consultation_motif[],
  ARRAY['perte de poids', 'sport'],
  ARRAY['cardio', 'renforcement', 'HIIT', 'métabolisme', 'lipolyse']
),
(
  'Exercices respiratoires',
  'Protocole respiratoire quotidien pour la gestion du stress :

1. Cohérence cardiaque (3 fois/jour — matin, midi, coucher) :
   5 minutes : inspirer 5 secondes par le nez, expirer 5 secondes par la bouche (6 cycles/min).
   App recommandée : RespiRelax+ (gratuite) ou Respirelax.
   Effet : régulation du système nerveux autonome, baisse du cortisol pendant 4 à 6 heures.

2. Respiration abdominale (en cas de stress aigu) :
   Main sur le ventre. Inspirer par le nez en gonflant le ventre (4s), bloquer (2s), expirer lentement par la bouche (6s).
   Répéter 5 à 10 cycles. Effet immédiat sur la détente.

3. Technique 4-7-8 (aide à l''endormissement) :
   Inspirer par le nez (4s), retenir le souffle (7s), expirer par la bouche (8s).
   3 à 4 cycles suffisent. À pratiquer allongé(e) dans le lit.',
  'activite', 'afeia_base', NULL,
  ARRAY['stress', 'sommeil', 'universel']::consultation_motif[],
  ARRAY['respiration', 'cohérence cardiaque'],
  ARRAY['cohérence cardiaque', 'respiration', '4-7-8', 'abdominale', 'stress']
),
(
  'Mouvement et troubles digestifs',
  'Activités physiques adaptées pour améliorer la digestion :

1. Marche digestive :
   15 à 20 minutes de marche tranquille après le déjeuner et le dîner.
   Stimule le péristaltisme intestinal et facilite la vidange gastrique.

2. Auto-massage abdominal (5 min/jour) :
   Allongé(e) sur le dos, genoux fléchis. Masser le ventre dans le sens des aiguilles d''une montre (sens du transit) avec une huile végétale tiède.
   Pression douce à modérée. Insister sur le cadre colique (sous les côtes droites → transverse → côté gauche → bas-ventre).

3. Yoga pour la digestion (15-20 min, 2 à 3 fois/semaine) :
   Postures recommandées : torsion assise (Ardha Matsyendrasana), posture de l''enfant (Balasana), chat-vache (Marjaryasana), vent (Apanasana — genoux sur la poitrine).

4. Éviter : abdominaux classiques (crunch) qui augmentent la pression intra-abdominale. Préférer le gainage.',
  'activite', 'afeia_base', NULL,
  ARRAY['digestif']::consultation_motif[],
  ARRAY['digestion', 'mouvement'],
  ARRAY['marche digestive', 'auto-massage', 'yoga', 'péristaltisme', 'transit']
);

-- ═══════════════════════════════════════════════════════
-- SECTION: equilibre_psycho (3 blocs)
-- ═══════════════════════════════════════════════════════

INSERT INTO blocks (title, content, section, source, owner_id, motifs, tags, ai_keywords) VALUES
(
  'Programme stress — Niveau 1',
  'Programme de base pour la gestion du stress quotidien :

1. Cohérence cardiaque : 3 fois/jour (matin au réveil, avant le déjeuner, au coucher).
   5 minutes à chaque séance. C''est le pilier n°1 — non négociable.

2. Contact avec la nature : minimum 20 minutes/jour en extérieur.
   Marche en forêt, parc, jardin. L''exposition à la nature réduit le cortisol de 20% en moyenne.

3. Journaling (5 min le soir) :
   Écrire 3 choses positives de la journée (gratitude) + 1 émotion ressentie et nommée.
   Pas besoin de faire des phrases — des mots-clés suffisent.

4. Détox numérique :
   Pas d''écran 1h avant le coucher. Désactiver les notifications non essentielles.
   1 journée/semaine « allégée » en numérique si possible.

5. Ancrage par les 5 sens (exercice rapide en cas de stress aigu) :
   5 choses que je vois, 4 que je touche, 3 que j''entends, 2 que je sens, 1 que je goûte.',
  'equilibre_psycho', 'afeia_base', NULL,
  ARRAY['stress', 'universel']::consultation_motif[],
  ARRAY['stress', 'gestion'],
  ARRAY['cohérence cardiaque', 'nature', 'journaling', 'détox numérique', 'ancrage']
),
(
  'Techniques de régulation émotionnelle',
  'Outils de gestion des émotions et du stress chronique :

1. EFT (Emotional Freedom Technique — « tapping ») :
   Tapoter doucement 7 points méridiens tout en formulant une phrase d''acceptation.
   Très efficace sur l''anxiété anticipatoire. Tutoriels gratuits sur YouTube (rechercher « EFT débutant »).

2. Méditation de pleine conscience :
   Commencer par 5 min/jour (app : Petit Bambou, Insight Timer, Headspace).
   Méditation assise, focus sur la respiration. Observer les pensées sans les juger.
   Objectif : 10 à 15 min/jour après 2 semaines de pratique.

3. Défusion cognitive (issue des TCC de 3e vague) :
   Quand une pensée négative surgit, se dire : « Je remarque que j''ai la pensée que… »
   Cela crée une distance entre soi et la pensée, réduisant son impact émotionnel.

4. Ancrage corporel :
   En cas de montée de stress : poser les pieds bien à plat au sol, sentir le contact, respirer 3 fois lentement.',
  'equilibre_psycho', 'afeia_base', NULL,
  ARRAY['stress']::consultation_motif[],
  ARRAY['émotions', 'EFT', 'méditation'],
  ARRAY['EFT', 'méditation', 'pleine conscience', 'défusion', 'ancrage', 'TCC']
),
(
  'Stress et troubles digestifs',
  'Comprendre et agir sur l''axe intestin-cerveau :

Le lien stress-digestion :
Le stress active le système nerveux sympathique (« combat ou fuite ») et inhibe la digestion. C''est pourquoi les troubles digestifs s''aggravent en période de stress.
L''intestin produit 95% de la sérotonine du corps — un intestin en souffrance impacte l''humeur.

Actions concrètes :
1. Respiration consciente avant chaque repas : 3 grandes respirations abdominales pour activer le parasympathique (mode « repos et digestion »).

2. Manger en pleine conscience : poser les couverts entre chaque bouchée, mastiquer 15 à 20 fois, ne pas manger devant un écran.

3. Éviter de manger en état de stress ou de colère : reporter le repas de 15 min si nécessaire.

4. Techniques d''apaisement ciblées : auto-massage du plexus solaire (mouvement circulaire, 2 min), tisane de mélisse + camomille après le repas.

5. Complémentation : L-glutamine (5 g/jour à jeun) + probiotiques ciblés intestin irritable.',
  'equilibre_psycho', 'afeia_base', NULL,
  ARRAY['digestif', 'stress']::consultation_motif[],
  ARRAY['axe intestin-cerveau', 'stress digestif'],
  ARRAY['axe intestin-cerveau', 'sérotonine', 'parasympathique', 'pleine conscience', 'plexus solaire']
);

-- ═══════════════════════════════════════════════════════
-- SECTION: suivi (3 blocs)
-- ═══════════════════════════════════════════════════════

INSERT INTO blocks (title, content, section, source, owner_id, motifs, tags, ai_keywords) VALUES
(
  'Suivi standard — 1 mois',
  'Modalités de suivi après cette consultation :

Prochain rendez-vous : dans 4 à 6 semaines.
L''objectif est d''évaluer les premiers résultats et d''ajuster le programme si nécessaire.

D''ici là, je vous recommande de :
- Tenir un journal alimentaire et de bien-être pendant au moins 2 semaines (noter ce que vous mangez, votre énergie, votre digestion, votre sommeil sur une échelle de 1 à 10).
- Mettre en place les recommandations progressivement (ne pas tout changer d''un coup).
- Me contacter par message si vous avez des questions ou des difficultés.
- En cas d''effets indésirables (réactions inhabituelles, inconfort), arrêter la prise et me contacter rapidement.

Indicateurs à observer : qualité du sommeil, niveau d''énergie, confort digestif, humeur générale.',
  'suivi', 'afeia_base', NULL,
  ARRAY['universel']::consultation_motif[],
  ARRAY['suivi', '1 mois'],
  ARRAY['suivi', 'rendez-vous', 'journal', 'indicateurs', 'évaluation']
),
(
  'Suivi progressif — Protocole long',
  'Programme de suivi sur 3 à 6 mois, en 3 phases :

Phase 1 — Installation (mois 1-2) :
Mise en place progressive des recommandations alimentaires et des compléments.
RDV de suivi à 4-6 semaines. Ajustements si nécessaire.

Phase 2 — Approfondissement (mois 2-4) :
Intensification du protocole (plantes, compléments). Travail sur les causes profondes.
RDV de suivi tous les 4 à 6 semaines.
Introduction éventuelle de nouvelles pratiques (respiration, activité physique, gestion du stress).

Phase 3 — Autonomie (mois 4-6) :
Réduction progressive des compléments. Consolidation des habitudes acquises.
RDV de suivi espacé (toutes les 6 à 8 semaines).
L''objectif est de vous rendre autonome dans votre hygiène de vie.

Au total : 4 à 6 consultations sur la période. Le rythme s''adapte à votre progression.',
  'suivi', 'afeia_base', NULL,
  ARRAY['fatigue', 'feminin', 'perte_poids']::consultation_motif[],
  ARRAY['suivi long', 'protocole'],
  ARRAY['protocole long', '3 phases', 'autonomie', 'progression', 'ajustements']
),
(
  'Suivi rapproché / alerte',
  'Points importants pour un suivi sécurisé :

Contactez-moi rapidement si :
- Vous ressentez des effets indésirables (allergie, troubles digestifs importants, maux de tête persistants, éruption cutanée).
- Vous avez un doute sur une interaction avec un traitement en cours.
- Vous ne tolérez pas un complément ou une plante recommandée.

Prochain rendez-vous rapproché : dans 2 à 3 semaines.
Ce délai rapproché est normal — il me permet de vérifier votre tolérance au protocole et d''ajuster rapidement si nécessaire.

Rappel : ce programme naturopathique est un complément à votre suivi médical. En cas de symptômes inquiétants (douleurs thoraciques, fièvre persistante, perte de poids inexpliquée, saignements), consultez votre médecin en priorité.',
  'suivi', 'afeia_base', NULL,
  ARRAY['universel']::consultation_motif[],
  ARRAY['suivi rapproché', 'alerte'],
  ARRAY['effets indésirables', 'alerte', 'sécurité', 'tolérance', 'médecin']
);

-- ═══════════════════════════════════════════════════════
-- SECTION: notes_libres (3 blocs)
-- ═══════════════════════════════════════════════════════

INSERT INTO blocks (title, content, section, source, owner_id, motifs, tags, ai_keywords) VALUES
(
  'Rappel cadre naturopathique',
  'Rappel important :
Ce programme d''hygiène vitale (conseillancier) est établi dans le cadre d''un accompagnement naturopathique. Il ne constitue en aucun cas un diagnostic médical ni une prescription médicamenteuse.

La naturopathie est une approche complémentaire qui vise à soutenir les capacités d''auto-régulation de l''organisme par des moyens naturels (alimentation, plantes, hygiène de vie).

Ne jamais interrompre un traitement médical en cours sans l''avis de votre médecin.
En cas de symptômes persistants ou préoccupants, consultez votre médecin traitant.

Ce document est personnel et confidentiel. Il est établi sur la base des informations que vous m''avez communiquées lors de notre entretien.',
  'notes_libres', 'afeia_base', NULL,
  ARRAY['universel']::consultation_motif[],
  ARRAY['cadre', 'légal'],
  ARRAY['naturopathie', 'cadre légal', 'non-médical', 'complémentaire', 'disclaimer']
),
(
  'Ressources et lectures recommandées',
  'Pour aller plus loin, voici quelques ressources de qualité :

Livres :
- « Naturopathie, le guide complet au quotidien » — Daniel Kieffer
- « L''alimentation ou la troisième médecine » — Dr Jean Seignalet
- « Intestin irritable, les raisons de la colère » — Pr Jean-Marc Sabaté
- « Cohérence cardiaque 365 » — Dr David O''Hare

Applications mobiles :
- RespiRelax+ (cohérence cardiaque, gratuite)
- Petit Bambou (méditation guidée)
- Yuka (scanner les produits alimentaires et cosmétiques)

Sites fiables :
- AFEIA (votre espace consultant pour suivre votre programme)
- Vidal.fr (vérification des interactions plantes/médicaments)
- Passeport Santé (fiches plantes et nutriments)',
  'notes_libres', 'afeia_base', NULL,
  ARRAY['universel']::consultation_motif[],
  ARRAY['ressources', 'lectures'],
  ARRAY['livres', 'applications', 'ressources', 'lectures', 'sites']
),
(
  'Note achats compléments',
  'Conseils pour l''achat de vos compléments alimentaires et plantes :

Qualité avant tout :
- Privilégiez les marques professionnelles disponibles en pharmacie ou magasins bio spécialisés.
- Vérifiez les labels : Bio, HACCP, GMP, absence d''excipients controversés (dioxyde de titane, stéarate de magnésium en excès).

Marques de confiance :
Laboratoires recommandés : Pileje, Nutergia, Solgar, Nhco, Therascience, Copmed, Energetica Natura. En magasin bio : Solgar, Nature & Partage, Jolivia.

Où acheter :
- Pharmacies et parapharmacies (conseil professionnel).
- Magasins bio spécialisés (La Vie Claire, Biocoop).
- Sites spécialisés fiables avec traçabilité.

À éviter :
- Produits achetés sur Amazon ou marketplaces (risque de contrefaçon, mauvaise conservation).
- Compléments « miracles » vus sur les réseaux sociaux sans base scientifique.
- Produits avec des allégations santé interdites en France.',
  'notes_libres', 'afeia_base', NULL,
  ARRAY['universel']::consultation_motif[],
  ARRAY['achats', 'compléments'],
  ARRAY['compléments', 'achats', 'marques', 'qualité', 'pharmacie', 'bio']
);
