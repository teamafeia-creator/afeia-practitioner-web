-- =============================================================================
-- Fichier : supabase/seed-blocks-complement.sql
-- Blocs AFEIA pour les 7 sections manquantes du conseillancier
-- Sections couvertes : en_tete, aromatologie, hydrologie, respiration,
--                      techniques_manuelles, environnement, cloture
-- =============================================================================

-- ═══════════════════════════════════════════════════════
-- SECTION: en_tete (4 blocs)
-- ═══════════════════════════════════════════════════════

INSERT INTO blocks (title, content, section, source, owner_id, motifs, tags, ai_keywords) VALUES (
  'Introduction — Programme d''hygiène vitale personnalisé',
  E'Votre programme d''hygiène vitale personnalisé\n\nSuite à notre entretien, vous trouverez ci-dessous les recommandations naturopathiques adaptées à votre situation. Ce programme s''articule autour de plusieurs axes complémentaires : alimentation, plantes, micronutrition, hygiène de vie et gestion du stress.\n\nConseils de lecture :\n- Lisez l''ensemble du document une première fois avant de commencer.\n- Mettez en place les changements progressivement, sur 2 à 3 semaines. Ne cherchez pas à tout appliquer dès le premier jour.\n- Surlignez ou cochez les recommandations au fur et à mesure de leur intégration.\n- En cas de doute ou de réaction inhabituelle, contactez-moi avant de poursuivre.\n\nCe programme ne se substitue pas à un avis médical. Ne modifiez jamais un traitement en cours sans l''accord de votre médecin.',
  'en_tete', 'afeia_base', NULL,
  ARRAY['universel']::consultation_motif[],
  ARRAY['introduction', 'programme'],
  ARRAY['introduction', 'conseillancier', 'hygiène vitale', 'programme', 'recommandations']
) ON CONFLICT DO NOTHING;

INSERT INTO blocks (title, content, section, source, owner_id, motifs, tags, ai_keywords) VALUES (
  'Introduction — Confort digestif',
  E'Votre programme d''accompagnement digestif\n\nSuite à notre bilan, j''ai élaboré un programme ciblé pour restaurer votre confort digestif. Les troubles digestifs sont souvent multifactoriels : alimentation inadaptée, stress, déséquilibre du microbiote, insuffisance enzymatique ou hépatique.\n\nCe programme agit sur plusieurs leviers simultanément :\n- Réforme alimentaire progressive pour réduire les irritants et nourrir votre flore.\n- Soutien par les plantes et la micronutrition pour apaiser et réparer la muqueuse.\n- Techniques de gestion du stress, car l''axe intestin-cerveau joue un rôle central.\n\nLes premiers résultats sont généralement perceptibles sous 2 à 4 semaines. Certains ajustements alimentaires peuvent provoquer un inconfort transitoire les premiers jours : c''est normal. Tenez un journal de vos symptômes pour que nous puissions affiner le programme lors du prochain rendez-vous.',
  'en_tete', 'afeia_base', NULL,
  ARRAY['digestif']::consultation_motif[],
  ARRAY['introduction', 'digestif'],
  ARRAY['introduction', 'digestion', 'confort digestif', 'microbiote', 'accompagnement']
) ON CONFLICT DO NOTHING;

INSERT INTO blocks (title, content, section, source, owner_id, motifs, tags, ai_keywords) VALUES (
  'Introduction — Gestion du stress',
  E'Votre programme de gestion du stress et d''équilibre nerveux\n\nVotre organisme est actuellement en état de sollicitation nerveuse importante. Le stress chronique impacte l''ensemble de vos fonctions : sommeil, digestion, immunité, équilibre hormonal et énergie.\n\nCe programme vise à :\n- Réguler votre système nerveux autonome par des techniques respiratoires et corporelles.\n- Soutenir vos surrénales et votre système nerveux par l''alimentation, les plantes adaptogènes et la micronutrition.\n- Installer des rituels quotidiens simples et efficaces pour retrouver un état de calme intérieur.\n\nL''ordre de priorité est important : commencez par la cohérence cardiaque et les ajustements alimentaires. Les compléments et les plantes viendront renforcer ces bases. Soyez patient avec vous-même : la régulation du système nerveux demande 3 à 6 semaines de pratique régulière pour porter ses fruits.',
  'en_tete', 'afeia_base', NULL,
  ARRAY['stress']::consultation_motif[],
  ARRAY['introduction', 'stress'],
  ARRAY['introduction', 'stress', 'système nerveux', 'surrénales', 'régulation']
) ON CONFLICT DO NOTHING;

INSERT INTO blocks (title, content, section, source, owner_id, motifs, tags, ai_keywords) VALUES (
  'Introduction — Équilibre hormonal féminin',
  E'Votre programme d''accompagnement hormonal féminin\n\nL''équilibre hormonal féminin est intimement lié à l''hygiène de vie globale : alimentation, gestion du stress, qualité du sommeil, exposition aux perturbateurs endocriniens et activité physique.\n\nCe programme s''articule autour de :\n- Une alimentation adaptée aux besoins hormonaux, en phase avec votre cycle.\n- Un soutien par les plantes régulatrices et la micronutrition ciblée.\n- La réduction de l''exposition aux perturbateurs endocriniens au quotidien.\n- Des techniques de gestion du stress, car le cortisol perturbe directement l''axe hormonal.\n\nLes cycles hormonaux demandent du temps pour se rééquilibrer. Comptez 3 cycles complets (environ 3 mois) pour observer des résultats significatifs. Notez vos symptômes tout au long du cycle pour que nous puissions évaluer précisément l''évolution lors de nos prochains rendez-vous.',
  'en_tete', 'afeia_base', NULL,
  ARRAY['feminin']::consultation_motif[],
  ARRAY['introduction', 'féminin', 'hormones'],
  ARRAY['introduction', 'hormones', 'cycle', 'féminin', 'perturbateurs endocriniens']
) ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════
-- SECTION: aromatologie (6 blocs)
-- ═══════════════════════════════════════════════════════

INSERT INTO blocks (title, content, section, source, owner_id, motifs, tags, ai_keywords) VALUES (
  'Huiles essentielles — Confort digestif',
  E'Protocole aromatique pour le confort digestif :\n\n1. Menthe poivrée (Mentha piperita) — Antispasmodique, carminative :\n   1 goutte sur un comprimé neutre ou dans 1 c.à.c. de miel, après le déjeuner et le dîner. Maximum 2 prises/jour.\n\n2. Basilic tropical (Ocimum basilicum ct. méthylchavicol) — Antispasmodique puissant :\n   1 goutte diluée dans 4 gouttes d''huile végétale de noyau d''abricot, en massage sur le ventre dans le sens des aiguilles d''une montre, après les repas.\n\n3. Estragon (Artemisia dracunculus) — Anti-ballonnements, antispasmodique :\n   1 goutte diluée dans 4 gouttes d''HV, en massage abdominal. Peut être associé au basilic tropical.\n\nDurée de cure : 7 à 10 jours maximum, pause 1 semaine, reprendre si nécessaire.\n\n⚠️ Précautions : contre-indiqué chez la femme enceinte ou allaitante et l''enfant de moins de 6 ans. Toujours effectuer un test cutané au pli du coude 24h avant la première utilisation. Ne jamais appliquer pure sur la peau : diluer systématiquement dans une huile végétale (20% HE / 80% HV).',
  'aromatologie', 'afeia_base', NULL,
  ARRAY['digestif']::consultation_motif[],
  ARRAY['huiles essentielles', 'digestion'],
  ARRAY['menthe poivrée', 'basilic tropical', 'estragon', 'antispasmodique', 'ballonnements']
) ON CONFLICT DO NOTHING;

INSERT INTO blocks (title, content, section, source, owner_id, motifs, tags, ai_keywords) VALUES (
  'Huiles essentielles — Gestion du stress',
  E'Protocole aromatique pour la gestion du stress et de l''anxiété :\n\n1. Lavande vraie (Lavandula angustifolia) — Calmante, anxiolytique :\n   2 gouttes sur les poignets et le plexus solaire, 2 à 3 fois/jour. Peut être respirée directement au flacon en cas de stress aigu.\n\n2. Petit grain bigarade (Citrus aurantium ssp. amara — feuilles) — Rééquilibrant nerveux :\n   1 goutte sur la face interne des poignets, matin et soir. Idéale pour les angoisses et la nervosité.\n\n3. Marjolaine à coquilles (Origanum majorana) — Parasympathicotonique :\n   2 gouttes diluées dans 4 gouttes d''HV, en massage sur le plexus solaire et la voûte plantaire au coucher.\n\nDurée de cure : 3 semaines maximum, pause 1 semaine. En diffusion : 10 minutes maximum dans une pièce aérée.\n\n⚠️ Précautions : contre-indiqué chez la femme enceinte ou allaitante et l''enfant de moins de 6 ans. Effectuer un test cutané au pli du coude 24h avant. Toujours diluer dans une huile végétale pour l''application cutanée (20-30% HE / 70-80% HV). Éviter le contact avec les yeux.',
  'aromatologie', 'afeia_base', NULL,
  ARRAY['stress']::consultation_motif[],
  ARRAY['huiles essentielles', 'stress'],
  ARRAY['lavande', 'petit grain bigarade', 'marjolaine', 'anxiolytique', 'calmante']
) ON CONFLICT DO NOTHING;

INSERT INTO blocks (title, content, section, source, owner_id, motifs, tags, ai_keywords) VALUES (
  'Huiles essentielles — Sommeil',
  E'Protocole aromatique pour améliorer le sommeil :\n\n1. Lavande vraie (Lavandula angustifolia) — Sédative douce :\n   2 gouttes sur l''oreiller ou en diffusion 15 minutes avant le coucher. Ou 2 gouttes diluées dans 4 gouttes d''HV en massage sur le plexus solaire.\n\n2. Mandarine (Citrus reticulata — zeste) — Relaxante, inductrice du sommeil :\n   3 gouttes en diffusion atmosphérique 20 minutes avant le coucher. Attention : photosensibilisante, ne pas appliquer sur la peau avant une exposition solaire.\n\n3. Camomille romaine (Chamaemelum nobile) — Calmante puissante :\n   1 goutte sur la face interne des poignets, à respirer profondément 5 fois. Ou 1 goutte diluée dans 4 gouttes d''HV en massage sur les tempes.\n\nRituel du coucher : diffuser le mélange lavande-mandarine 15 min, puis appliquer la camomille sur les poignets au moment de se coucher.\n\nDurée de cure : 3 semaines, pause 1 semaine.\n\n⚠️ Précautions : contre-indiqué chez la femme enceinte ou allaitante et l''enfant de moins de 6 ans. Test cutané 24h avant. Dilution obligatoire dans une HV pour toute application cutanée.',
  'aromatologie', 'afeia_base', NULL,
  ARRAY['sommeil']::consultation_motif[],
  ARRAY['huiles essentielles', 'sommeil'],
  ARRAY['lavande', 'mandarine', 'camomille romaine', 'sommeil', 'diffusion']
) ON CONFLICT DO NOTHING;

INSERT INTO blocks (title, content, section, source, owner_id, motifs, tags, ai_keywords) VALUES (
  'Huiles essentielles — Soutien immunitaire',
  E'Protocole aromatique pour renforcer les défenses immunitaires :\n\n1. Ravintsara (Cinnamomum camphora ct. 1,8-cinéole) — Antiviral majeur, immunostimulant :\n   3 gouttes diluées dans 3 gouttes d''HV, en friction sur le thorax et le haut du dos, matin et soir. En préventif : 2 gouttes sur les poignets chaque matin.\n\n2. Tea tree (Melaleuca alternifolia) — Antibactérien, antiviral, antifongique :\n   2 gouttes diluées dans 4 gouttes d''HV, en application sur le thorax. En cas de mal de gorge : 1 goutte sur un comprimé neutre, 3 fois/jour pendant 5 jours maximum.\n\n3. Eucalyptus radié (Eucalyptus radiata) — Décongestionnant respiratoire :\n   3 gouttes en inhalation dans un bol d''eau chaude, 2 fois/jour. Ou 2 gouttes diluées dans 4 gouttes d''HV en massage sur le thorax.\n\nDurée de cure préventive : 3 semaines, pause 1 semaine. En curatif : 5 à 7 jours maximum.\n\n⚠️ Précautions : contre-indiqué chez la femme enceinte ou allaitante et l''enfant de moins de 6 ans. Contre-indiqué en cas d''asthme pour l''eucalyptus et le ravintsara (risque de bronchospasme). Test cutané 24h avant. Dilution dans HV obligatoire.',
  'aromatologie', 'afeia_base', NULL,
  ARRAY['immunite']::consultation_motif[],
  ARRAY['huiles essentielles', 'immunité'],
  ARRAY['ravintsara', 'tea tree', 'eucalyptus radié', 'antiviral', 'immunostimulant']
) ON CONFLICT DO NOTHING;

INSERT INTO blocks (title, content, section, source, owner_id, motifs, tags, ai_keywords) VALUES (
  'Huiles essentielles — Douleurs articulaires et musculaires',
  E'Protocole aromatique pour les douleurs articulaires et musculaires :\n\n1. Gaulthérie couchée (Gaultheria procumbens) — Anti-inflammatoire, antalgique (salicylate de méthyle naturel) :\n   3 gouttes diluées dans 7 gouttes d''HV d''arnica, en massage local sur la zone douloureuse, 2 à 3 fois/jour.\n\n2. Eucalyptus citronné (Corymbia citriodora) — Anti-inflammatoire puissant :\n   3 gouttes diluées dans 7 gouttes d''HV, en massage sur les articulations douloureuses matin et soir.\n\n3. Menthe poivrée (Mentha piperita) — Antalgique par effet froid, décontractante :\n   1 goutte pure sur la zone douloureuse (petite surface uniquement), ou 2 gouttes diluées dans 8 gouttes d''HV pour une zone étendue.\n\nMélange complet : 10 gouttes gaulthérie + 10 gouttes eucalyptus citronné + 5 gouttes menthe poivrée dans 50 ml d''HV d''arnica. Masser 2 à 3 fois/jour.\n\nDurée : 10 jours maximum, pause 1 semaine.\n\n⚠️ Précautions : contre-indiqué chez la femme enceinte ou allaitante et l''enfant de moins de 6 ans. Gaulthérie contre-indiquée si allergie à l''aspirine ou sous anticoagulants. Test cutané 24h avant. Ne pas appliquer sur peau lésée.',
  'aromatologie', 'afeia_base', NULL,
  ARRAY['douleurs']::consultation_motif[],
  ARRAY['huiles essentielles', 'douleurs'],
  ARRAY['gaulthérie', 'eucalyptus citronné', 'menthe poivrée', 'anti-inflammatoire', 'antalgique']
) ON CONFLICT DO NOTHING;

INSERT INTO blocks (title, content, section, source, owner_id, motifs, tags, ai_keywords) VALUES (
  'Huiles essentielles — Soins de la peau',
  E'Protocole aromatique pour les problèmes cutanés :\n\n1. Tea tree (Melaleuca alternifolia) — Antibactérien, antifongique, purifiant :\n   1 goutte pure sur un bouton isolé (application très localisée). Pour une zone étendue : 3 gouttes diluées dans 10 gouttes d''HV de jojoba, appliquer matin et soir.\n\n2. Géranium rosat (Pelargonium graveolens cv. Égypte) — Régénérant cutané, astringent :\n   2 gouttes diluées dans 10 gouttes d''HV de rose musquée, en soin du visage le soir. Régule le sébum, tonifie la peau.\n\n3. Hélichryse italienne (Helichrysum italicum) — Cicatrisante, anti-hématome :\n   1 à 2 gouttes diluées dans 5 gouttes d''HV de rose musquée, sur les cicatrices ou vergetures, 2 fois/jour. Huile précieuse : utiliser avec parcimonie.\n\nSérum visage purifiant : 30 ml HV jojoba + 5 gouttes tea tree + 5 gouttes géranium rosat + 3 gouttes lavande vraie. Appliquer 3 à 4 gouttes du mélange le soir sur peau propre.\n\nDurée de cure : 4 semaines, pause 1 semaine.\n\n⚠️ Précautions : contre-indiqué chez la femme enceinte ou allaitante et l''enfant de moins de 6 ans. Test cutané 24h avant. Éviter le contour des yeux. L''hélichryse est déconseillée sous anticoagulants.',
  'aromatologie', 'afeia_base', NULL,
  ARRAY['peau']::consultation_motif[],
  ARRAY['huiles essentielles', 'peau'],
  ARRAY['tea tree', 'géranium rosat', 'hélichryse', 'cicatrisant', 'purifiant', 'sérum']
) ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════
-- SECTION: hydrologie (4 blocs)
-- ═══════════════════════════════════════════════════════

INSERT INTO blocks (title, content, section, source, owner_id, motifs, tags, ai_keywords) VALUES (
  'Bouillotte sur le foie',
  E'Application d''une bouillotte chaude sur la zone hépatique :\n\nProtocole :\n- Remplir une bouillotte d''eau chaude (40-42°C, pas brûlante) ou utiliser une bouillotte sèche (noyaux de cerises, graines de lin) chauffée au micro-ondes.\n- Appliquer sur le flanc droit, sous les côtes, en position allongée ou semi-allongée.\n- Durée : 20 à 30 minutes après le repas du soir (moment optimal pour soutenir le travail hépatique).\n- Fréquence : tous les soirs, en continu.\n\nBienfaits :\n- Stimule la production et l''évacuation de la bile (effet cholagogue).\n- Favorise la détoxification hépatique en augmentant le flux sanguin local.\n- Améliore la digestion post-prandiale et réduit la sensation de lourdeur.\n- Effet relaxant global qui favorise l''endormissement.\n\nPrécautions : ne pas appliquer sur une zone inflammée ou en cas de fièvre. Vérifier la température avant application. Protéger la peau avec un linge fin si nécessaire.',
  'hydrologie', 'afeia_base', NULL,
  ARRAY['universel']::consultation_motif[],
  ARRAY['bouillotte', 'foie'],
  ARRAY['bouillotte', 'foie', 'hépatique', 'bile', 'détoxification', 'chaleur']
) ON CONFLICT DO NOTHING;

INSERT INTO blocks (title, content, section, source, owner_id, motifs, tags, ai_keywords) VALUES (
  'Bain hyperthermique et bain dérivatif',
  E'Techniques d''hydrothérapie pour soutenir l''élimination et la détoxification :\n\n1. Bain hyperthermique (sudation) :\n- Remplir la baignoire à 37°C, puis augmenter progressivement la température jusqu''à 39-40°C sur 10 minutes.\n- Rester 15 à 20 minutes maximum. Ajouter 200 g de sel d''Epsom (sulfate de magnésium) pour renforcer l''effet drainant.\n- Sortir lentement, s''allonger 15 minutes sous une couverture pour prolonger la sudation.\n- Fréquence : 1 à 2 fois/semaine, le soir de préférence. Bien s''hydrater avant et après.\n\n2. Bain dérivatif (méthode France Guillain) :\n- Rafraîchir la zone du périnée avec un gant de toilette imbibé d''eau fraîche, ou utiliser des poches de gel réfrigérées placées au niveau de l''aine.\n- Durée : 20 à 30 minutes/jour, assis confortablement.\n- Fréquence : quotidien pour un effet optimal.\n- Stimule la circulation des graisses brunes, favorise l''élimination des déchets.\n\nContre-indications : hypertension non contrôlée, troubles cardiovasculaires, grossesse, fragilité veineuse importante. Demander un avis médical en cas de doute.',
  'hydrologie', 'afeia_base', NULL,
  ARRAY['detox']::consultation_motif[],
  ARRAY['bain', 'détox', 'drainage'],
  ARRAY['bain hyperthermique', 'bain dérivatif', 'sudation', 'sel d''Epsom', 'élimination']
) ON CONFLICT DO NOTHING;

INSERT INTO blocks (title, content, section, source, owner_id, motifs, tags, ai_keywords) VALUES (
  'Douches écossaises — Alternance chaud-froid',
  E'Technique d''hydrothérapie par alternance thermique pour stimuler la circulation et réduire les douleurs :\n\nProtocole progressif :\n- Commencer par une douche chaude (38-40°C) pendant 2 à 3 minutes pour détendre les muscles.\n- Passer à l''eau froide (15-20°C) pendant 15 à 30 secondes, en commençant par les pieds et en remontant vers le haut du corps.\n- Alterner 3 cycles chaud/froid. Toujours terminer par le froid.\n\nProgression sur 3 semaines :\n- Semaine 1 : eau fraîche (20-22°C), pieds et mollets uniquement, 10 secondes.\n- Semaine 2 : eau plus froide (15-18°C), jusqu''aux cuisses et bras, 20 secondes.\n- Semaine 3 : eau froide (12-15°C), corps entier (sauf la tête), 30 secondes.\n\nBienfaits : stimule la circulation sanguine et lymphatique, réduit les douleurs musculaires, renforce le système immunitaire, tonifie le système nerveux.\n\nFréquence : chaque matin, à la fin de la douche habituelle.\n\nContre-indications : syndrome de Raynaud sévère, troubles cardiovasculaires, hypertension non contrôlée. Éviter en cas d''infection urinaire.',
  'hydrologie', 'afeia_base', NULL,
  ARRAY['douleurs']::consultation_motif[],
  ARRAY['douche écossaise', 'chaud-froid'],
  ARRAY['douche écossaise', 'hydrothérapie', 'alternance', 'circulation', 'froid']
) ON CONFLICT DO NOTHING;

INSERT INTO blocks (title, content, section, source, owner_id, motifs, tags, ai_keywords) VALUES (
  'Cataplasmes d''argile',
  E'Utilisation de l''argile en cataplasme pour les soins cutanés :\n\nPréparation du cataplasme :\n- Utiliser de l''argile verte illite ou montmorillonite (en poudre ou concassée).\n- Recouvrir d''eau de source dans un récipient non métallique (verre, céramique, bois).\n- Laisser reposer 1 heure sans mélanger, puis homogénéiser doucement avec une spatule en bois.\n- La pâte doit avoir la consistance d''un yaourt épais.\n\nApplication — Visage (peau à imperfections) :\n- Appliquer une couche de 5 mm sur la zone concernée, en évitant le contour des yeux.\n- Laisser poser 15 à 20 minutes (retirer avant que l''argile ne sèche complètement).\n- Rincer à l''eau tiède. Appliquer une huile végétale (jojoba ou nigelle).\n- Fréquence : 1 à 2 fois/semaine.\n\nApplication — Corps (eczéma, psoriasis, irritations) :\n- Cataplasme épais (1 à 2 cm) sur la zone, recouvert d''un linge humide.\n- Laisser poser 1 heure minimum (ou toute la nuit pour les zones non sensibles).\n- Fréquence : 1 fois/jour pendant 5 à 7 jours, puis espacer.\n\nPrécautions : ne pas réutiliser l''argile après usage. Ne pas appliquer sur une plaie ouverte ou suintante.',
  'hydrologie', 'afeia_base', NULL,
  ARRAY['peau']::consultation_motif[],
  ARRAY['argile', 'cataplasme', 'peau'],
  ARRAY['argile', 'cataplasme', 'imperfections', 'eczéma', 'purifiant', 'montmorillonite']
) ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════
-- SECTION: respiration (4 blocs)
-- ═══════════════════════════════════════════════════════

INSERT INTO blocks (title, content, section, source, owner_id, motifs, tags, ai_keywords) VALUES (
  'Cohérence cardiaque 365',
  E'Protocole de cohérence cardiaque — Méthode 365 (Dr David O''Hare) :\n\n3 fois par jour — 6 respirations par minute — 5 minutes par séance.\n\nProtocole détaillé :\n- Position : assis, dos droit, pieds à plat au sol, mains sur les cuisses.\n- Inspirer par le nez pendant 5 secondes en gonflant le ventre.\n- Expirer par la bouche (ou le nez) pendant 5 secondes en rentrant doucement le ventre.\n- 6 cycles complets par minute, soit 30 cycles par séance de 5 minutes.\n\nMoments de pratique :\n- Au lever (à jeun) : régule le cortisol matinal.\n- Avant le déjeuner (11h-12h) : recentrage avant le repas.\n- En fin d''après-midi ou au coucher (17h-18h ou avant de dormir) : favorise la récupération.\n\nEffets physiologiques : baisse du cortisol pendant 4 à 6 heures, régulation de la tension artérielle, amélioration de la variabilité cardiaque, meilleure gestion émotionnelle.\n\nApplication recommandée : RespiRelax+ (gratuite, iOS et Android).\n\nEngagement minimum : 21 jours consécutifs pour ancrer l''habitude.',
  'respiration', 'afeia_base', NULL,
  ARRAY['universel']::consultation_motif[],
  ARRAY['cohérence cardiaque', '365'],
  ARRAY['cohérence cardiaque', '365', 'cortisol', 'respiration', 'variabilité cardiaque']
) ON CONFLICT DO NOTHING;

INSERT INTO blocks (title, content, section, source, owner_id, motifs, tags, ai_keywords) VALUES (
  'Respiration 4-7-8 — Anti-stress',
  E'Technique de respiration 4-7-8 (Dr Andrew Weil) pour calmer rapidement le système nerveux :\n\nProtocole :\n- Position : assis ou allongé, yeux fermés, pointe de la langue contre le palais (juste derrière les incisives supérieures).\n- Expirer complètement par la bouche en produisant un léger souffle.\n- Inspirer par le nez pendant 4 secondes.\n- Retenir le souffle pendant 7 secondes (sans forcer, garder les épaules détendues).\n- Expirer lentement par la bouche pendant 8 secondes (avec un léger son « whoosh »).\n- Répéter 4 cycles. Ne pas dépasser 4 cycles lors des premières semaines.\n\nProgression :\n- Semaines 1-2 : 4 cycles, 2 fois/jour (matin et soir).\n- Semaines 3-4 : 4 à 6 cycles, 2 à 3 fois/jour.\n- Après 1 mois : jusqu''à 8 cycles par séance si confortable.\n\nIndications : anxiété aiguë, difficulté d''endormissement, montée de stress, irritabilité. Effet calmant immédiat par activation du nerf vague et du système parasympathique.\n\nPrécaution : en cas de vertiges, revenir à une respiration normale. Ne pas pratiquer en conduisant.',
  'respiration', 'afeia_base', NULL,
  ARRAY['stress']::consultation_motif[],
  ARRAY['4-7-8', 'anti-stress'],
  ARRAY['4-7-8', 'nerf vague', 'parasympathique', 'anxiété', 'respiration anti-stress']
) ON CONFLICT DO NOTHING;

INSERT INTO blocks (title, content, section, source, owner_id, motifs, tags, ai_keywords) VALUES (
  'Routine respiratoire du coucher',
  E'Séquence respiratoire en 3 temps pour préparer l''endormissement (10 à 15 minutes au total) :\n\n1. Respiration abdominale profonde (5 minutes) :\n- Allongé sur le dos, une main sur le ventre, une main sur la poitrine.\n- Inspirer par le nez pendant 4 secondes en gonflant uniquement le ventre (la main sur la poitrine ne bouge pas).\n- Expirer par le nez pendant 6 secondes en laissant le ventre redescendre naturellement.\n- 6 cycles par minute. Se concentrer sur le mouvement du ventre.\n\n2. Respiration 4-7-8 (3 à 4 cycles) :\n- Inspirer 4 secondes, retenir 7 secondes, expirer 8 secondes.\n- La rétention du souffle favorise la saturation en CO2, signal naturel de détente.\n\n3. Respiration « soupir physiologique » (2 à 3 minutes) :\n- Double inspiration courte par le nez (sniff-sniff), suivie d''une longue expiration par la bouche (6 à 8 secondes).\n- Répéter lentement. Cette technique active puissamment le parasympathique.\n\nPratiquer cette séquence chaque soir, lumières éteintes, dans le lit. L''endormissement survient souvent avant la fin de la séquence.',
  'respiration', 'afeia_base', NULL,
  ARRAY['sommeil']::consultation_motif[],
  ARRAY['respiration', 'sommeil', 'coucher'],
  ARRAY['respiration nocturne', 'endormissement', 'abdominale', 'soupir physiologique']
) ON CONFLICT DO NOTHING;

INSERT INTO blocks (title, content, section, source, owner_id, motifs, tags, ai_keywords) VALUES (
  'Respiration dynamisante',
  E'Technique de respiration dynamisante pour lutter contre la fatigue (Kapalabhati adapté) :\n\n⚠️ À pratiquer le matin ou en début d''après-midi uniquement. Jamais le soir.\n\nProtocole :\n- Position : assis, dos droit, mains sur les genoux, épaules relâchées.\n- Phase 1 — Activation (Kapalabhati modéré) :\n  Expiration courte et dynamique par le nez (en contractant brièvement les abdominaux), suivie d''une inspiration passive (le ventre se relâche naturellement).\n  Rythme : 1 expiration par seconde. Série de 20 expirations, puis repos 30 secondes.\n  Répéter 3 séries. Augmenter à 30 puis 40 expirations par série après 2 semaines.\n\n- Phase 2 — Respiration carrée (recentrage) :\n  Inspirer 4 secondes, retenir 4 secondes, expirer 4 secondes, retenir poumons vides 4 secondes.\n  Répéter 6 cycles. Cette phase stabilise l''énergie produite par le Kapalabhati.\n\nBienfaits : augmente l''oxygénation cérébrale, stimule le métabolisme, clarifie le mental, tonifie la sangle abdominale.\n\nContre-indications : grossesse, hypertension non contrôlée, épilepsie, hernie abdominale, période de règles abondantes.',
  'respiration', 'afeia_base', NULL,
  ARRAY['fatigue']::consultation_motif[],
  ARRAY['respiration', 'dynamisante', 'énergie'],
  ARRAY['Kapalabhati', 'respiration carrée', 'énergie', 'oxygénation', 'dynamisante']
) ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════
-- SECTION: techniques_manuelles (4 blocs)
-- ═══════════════════════════════════════════════════════

INSERT INTO blocks (title, content, section, source, owner_id, motifs, tags, ai_keywords) VALUES (
  'Automassage abdominal',
  E'Technique d''automassage abdominal pour améliorer la digestion et le transit :\n\nPréparation :\n- Allongé sur le dos, genoux fléchis, pieds à plat. Appliquer quelques gouttes d''huile végétale tiède (amande douce ou sésame) sur le ventre.\n- Respirer calmement 3 fois avant de commencer.\n\nProtocole (5 à 10 minutes) :\n1. Effleurage circulaire : masser le ventre dans le sens des aiguilles d''une montre (sens du transit) avec la paume, pression légère. 10 cercles.\n2. Massage du cadre colique : avec 2 ou 3 doigts, suivre le trajet du côlon — partir du bas-ventre droit, remonter sous les côtes droites, traverser horizontalement vers la gauche, redescendre le long du flanc gauche. Pression modérée. 5 passages.\n3. Pétrissage doux : avec les deux mains, pétrir doucement la zone autour du nombril. 1 minute.\n4. Pressions statiques : poser les doigts sur un point sensible, maintenir une pression douce pendant 30 secondes en respirant profondément. Répéter sur 3 à 4 points.\n5. Terminer par 10 effleurages légers dans le sens horaire.\n\nFréquence : chaque soir avant le coucher, ou 30 minutes après le repas. Éviter juste après un repas copieux.',
  'techniques_manuelles', 'afeia_base', NULL,
  ARRAY['universel']::consultation_motif[],
  ARRAY['automassage', 'abdomen', 'digestion'],
  ARRAY['automassage', 'abdominal', 'transit', 'côlon', 'péristaltisme']
) ON CONFLICT DO NOTHING;

INSERT INTO blocks (title, content, section, source, owner_id, motifs, tags, ai_keywords) VALUES (
  'Points d''acupression — Anti-stress',
  E'Automassage de points d''acupression pour calmer le système nerveux :\n\n1. Point 6MC (Nei Guan) — Maître du cœur :\n- Localisation : face interne de l''avant-bras, 3 travers de doigt au-dessus du pli du poignet, entre les deux tendons centraux.\n- Technique : presser avec le pouce en effectuant de petits cercles. Maintenir 1 à 2 minutes par poignet.\n- Effet : calme l''anxiété, les palpitations, les nausées.\n\n2. Point Yin Tang — « Troisième œil » :\n- Localisation : entre les deux sourcils, au milieu du front.\n- Technique : presser doucement avec le majeur, effectuer de petits cercles lents. 1 à 2 minutes.\n- Effet : apaise le mental, réduit l''agitation, favorise la concentration.\n\n3. Points des tempes (Taiyang) :\n- Localisation : creux des tempes, entre l''extrémité du sourcil et le coin de l''œil.\n- Technique : masser les deux tempes simultanément avec les majeurs, mouvements circulaires doux. 1 à 2 minutes.\n- Effet : soulage les céphalées de tension, détend les mâchoires et le front.\n\nFréquence : 2 à 3 fois/jour, notamment en cas de montée de stress. Peut être pratiqué assis au bureau.',
  'techniques_manuelles', 'afeia_base', NULL,
  ARRAY['stress']::consultation_motif[],
  ARRAY['acupression', 'stress'],
  ARRAY['acupression', '6MC', 'Yin Tang', 'tempes', 'points', 'anti-stress']
) ON CONFLICT DO NOTHING;

INSERT INTO blocks (title, content, section, source, owner_id, motifs, tags, ai_keywords) VALUES (
  'Étirements doux et mobilisation articulaire',
  E'Programme d''étirements et de mobilisations pour soulager les tensions et les douleurs :\n\nÀ pratiquer le matin au réveil ou le soir, sur un tapis, dans une pièce tiède. Durée : 10 à 15 minutes.\n\n1. Nuque et cervicales :\n- Incliner doucement la tête vers l''épaule droite, maintenir 20 secondes. Répéter à gauche.\n- Rotation lente de la tête : demi-cercles devant (jamais en arrière). 5 rotations dans chaque sens.\n\n2. Épaules et haut du dos :\n- Hausser les épaules vers les oreilles, maintenir 5 secondes, relâcher d''un coup. Répéter 5 fois.\n- Bras croisé devant la poitrine, tirer doucement avec l''autre main. 20 secondes par côté.\n\n3. Dos et lombaires :\n- Posture chat-vache : à quatre pattes, alterner dos rond (expiration) et dos creux (inspiration). 10 cycles lents.\n- Posture de l''enfant : genoux écartés, bras tendus devant, front au sol. Maintenir 1 minute.\n\n4. Hanches et bassin :\n- Genoux sur la poitrine, balancer doucement à droite et à gauche. 1 minute.\n- Posture du pigeon modifiée : 30 secondes par côté.\n\nPrincipes : ne jamais forcer, respirer profondément dans chaque posture, étirer jusqu''à la sensation de tension, jamais jusqu''à la douleur.',
  'techniques_manuelles', 'afeia_base', NULL,
  ARRAY['douleurs']::consultation_motif[],
  ARRAY['étirements', 'mobilisation', 'douleurs'],
  ARRAY['étirements', 'mobilisation', 'cervicales', 'lombaires', 'souplesse', 'articulations']
) ON CONFLICT DO NOTHING;

INSERT INTO blocks (title, content, section, source, owner_id, motifs, tags, ai_keywords) VALUES (
  'Automassage du bas-ventre et cycle féminin',
  E'Automassage abdominal adapté au cycle féminin pour soutenir la sphère gynécologique :\n\nPréparation :\n- Allongée sur le dos, genoux fléchis. Huile végétale tiède (sésame ou ricin) sur le bas-ventre. Mains réchauffées.\n\nProtocole (10 minutes) :\n1. Effleurage global : mains à plat sur le bas-ventre, mouvements circulaires doux dans le sens horaire. 2 minutes pour réchauffer la zone.\n2. Massage utérin : avec les doigts, masser doucement la zone entre le nombril et le pubis, en petits cercles. Pression progressive, jamais douloureuse. 3 minutes.\n3. Points ovariens : localiser les deux points situés à 4 travers de doigt sous le nombril et 3 travers de doigt de chaque côté. Presser doucement 30 secondes par point.\n4. Massage lombaire (zones réflexes) : placer les mains dans le creux des reins, masser en cercles. 2 minutes.\n5. Terminer par un effleurage doux, mains posées sur le bas-ventre, respirer profondément 1 minute.\n\nAdaptation au cycle :\n- Phase folliculaire (J1-J14) : massage quotidien, pression modérée.\n- Phase lutéale (J14-J28) : massage plus doux, 3 à 4 fois/semaine.\n- Pendant les règles : uniquement si les massages soulagent les douleurs, sinon privilégier la bouillotte chaude.\n\nContre-indications : grossesse, stérilet récemment posé, douleurs pelviennes inexpliquées.',
  'techniques_manuelles', 'afeia_base', NULL,
  ARRAY['feminin']::consultation_motif[],
  ARRAY['automassage', 'féminin', 'cycle'],
  ARRAY['automassage', 'utérin', 'cycle', 'ovarien', 'bas-ventre', 'gynécologique']
) ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════
-- SECTION: environnement (4 blocs)
-- ═══════════════════════════════════════════════════════

INSERT INTO blocks (title, content, section, source, owner_id, motifs, tags, ai_keywords) VALUES (
  'Réduction des perturbateurs endocriniens',
  E'Programme de réduction de l''exposition aux perturbateurs endocriniens au quotidien :\n\nDans la cuisine :\n- Remplacer les contenants en plastique par du verre, de l''inox ou de la céramique (surtout pour le chauffage et le stockage).\n- Ne jamais chauffer d''aliments dans du plastique ou du film alimentaire au micro-ondes.\n- Éviter les conserves (revêtement intérieur au bisphénol) : privilégier les bocaux en verre.\n- Choisir des poêles en inox, fonte ou céramique. Éliminer les revêtements antiadhésifs abîmés (PFOA).\n\nDans la salle de bain :\n- Réduire le nombre de produits cosmétiques. Vérifier la composition avec l''application Yuka ou INCI Beauty.\n- Éviter les parabènes, phtalates, triclosan, BHA, oxybenzone.\n- Privilégier les cosmétiques certifiés bio (labels Cosmos, Nature & Progrès, Ecocert).\n\nDans la maison :\n- Aérer 10 à 15 minutes matin et soir, même en hiver.\n- Réduire l''usage de parfums d''intérieur synthétiques, bougies parfumées et désodorisants chimiques.\n- Privilégier les produits d''entretien simples : vinaigre blanc, bicarbonate, savon noir.\n\nDans l''alimentation :\n- Privilégier le bio pour les fruits et légumes les plus traités (fraises, pommes, épinards, raisin).\n- Laver soigneusement les fruits et légumes non bio.',
  'environnement', 'afeia_base', NULL,
  ARRAY['universel']::consultation_motif[],
  ARRAY['perturbateurs endocriniens', 'environnement'],
  ARRAY['perturbateurs endocriniens', 'bisphénol', 'plastique', 'parabènes', 'cosmétiques']
) ON CONFLICT DO NOTHING;

INSERT INTO blocks (title, content, section, source, owner_id, motifs, tags, ai_keywords) VALUES (
  'Routine cosmétique naturelle minimaliste',
  E'Routine de soins naturels minimaliste pour respecter la peau et limiter l''exposition chimique :\n\nRoutine du matin (2 minutes) :\n- Nettoyage : rincer le visage à l''eau tiède (pas de nettoyant le matin, sauf peau très grasse).\n- Hydratation : quelques gouttes d''huile végétale adaptée à votre type de peau :\n  - Peau mixte à grasse : jojoba (séborégulatrice) ou noisette.\n  - Peau sèche : avocat ou argan.\n  - Peau sensible : calendula ou amande douce.\n- Protection solaire : crème solaire minérale (oxyde de zinc) si exposition.\n\nRoutine du soir (5 minutes) :\n- Démaquillage : huile végétale (jojoba, coco fractionné) en massage sur le visage sec. Rincer avec un hydrolat sur coton lavable.\n- Nettoyage : savon surgras ou savon d''Alep (si peau à imperfections).\n- Soin : sérum huileux (3 à 4 gouttes de votre huile végétale + 1 goutte d''HE adaptée si besoin).\n\nSoins hebdomadaires :\n- 1 gommage doux (poudre d''avoine + miel + eau) par semaine.\n- 1 masque à l''argile (verte pour peau grasse, blanche pour peau sensible) par semaine.\n\nPrincipe : moins de produits, mais de meilleure qualité. La peau s''autorégule en quelques semaines.',
  'environnement', 'afeia_base', NULL,
  ARRAY['peau']::consultation_motif[],
  ARRAY['cosmétiques', 'naturel', 'peau'],
  ARRAY['cosmétiques naturels', 'routine', 'huile végétale', 'minimaliste', 'jojoba']
) ON CONFLICT DO NOTHING;

INSERT INTO blocks (title, content, section, source, owner_id, motifs, tags, ai_keywords) VALUES (
  'Environnement de la chambre — Sommeil optimal',
  E'Optimiser l''environnement de votre chambre pour favoriser un sommeil profond et réparateur :\n\nTempérature :\n- Maintenir la chambre entre 16°C et 18°C (idéalement 18°C). Le corps a besoin de baisser sa température interne pour déclencher l''endormissement.\n- En été : ventilateur, draps en lin, douche tiède avant le coucher.\n\nObscurité :\n- Installer des rideaux occultants ou utiliser un masque de sommeil.\n- Couvrir toutes les sources lumineuses (LED de veille, réveil lumineux).\n- La moindre lumière, même faible, perturbe la sécrétion de mélatonine.\n\nÉcrans et lumière bleue :\n- Aucun écran (téléphone, tablette, ordinateur, TV) dans la chambre, ou mode avion activé.\n- Arrêter les écrans 1 heure avant le coucher minimum.\n- Si utilisation tardive inévitable : lunettes anti-lumière bleue et mode « Night Shift » activé.\n\nBruit :\n- Bouchons d''oreilles en mousse ou cire si environnement bruyant.\n- Option : bruit blanc ou sons de la nature (application, en minuterie).\n\nLiterie :\n- Matelas adapté (ni trop ferme, ni trop mou), oreiller à la bonne hauteur pour la nuque.\n- Changer les draps chaque semaine. Aérer la literie 10 minutes chaque matin.',
  'environnement', 'afeia_base', NULL,
  ARRAY['sommeil']::consultation_motif[],
  ARRAY['chambre', 'sommeil', 'environnement'],
  ARRAY['chambre', 'température', 'obscurité', 'écrans', 'lumière bleue', 'mélatonine']
) ON CONFLICT DO NOTHING;

INSERT INTO blocks (title, content, section, source, owner_id, motifs, tags, ai_keywords) VALUES (
  'Qualité de l''air intérieur',
  E'Améliorer la qualité de l''air intérieur pour soutenir le système immunitaire et respiratoire :\n\nVentilation :\n- Aérer chaque pièce 10 à 15 minutes, 2 fois/jour (matin et soir), y compris en hiver.\n- Aérer pendant et après les activités productrices de polluants : cuisine, ménage, douche, bricolage.\n- Maintenir les bouches d''aération propres et non obstruées.\n\nRéduction des polluants intérieurs :\n- Supprimer les désodorisants chimiques, sprays, bougies parfumées synthétiques et encens de mauvaise qualité.\n- Produits ménagers : remplacer par des alternatives simples (vinaigre blanc, bicarbonate de soude, savon noir, savon de Marseille).\n- Limiter l''usage de peintures, colles et vernis en intérieur. Choisir des produits labellisés A+ (émissions de COV).\n\nHumidité :\n- Maintenir un taux d''humidité entre 40% et 60% (hygromètre peu coûteux en pharmacie).\n- Trop sec : utiliser un humidificateur ou poser un bol d''eau sur le radiateur.\n- Trop humide : aérer davantage, vérifier l''absence de moisissures.\n\nPlantes dépolluantes (complément, pas solution unique) :\n- Pothos, spathiphyllum, ficus, chlorophytum : contribuent modestement à assainir l''air.\n- Entretenir les plantes sans excès d''eau (risque de moisissures dans les pots).',
  'environnement', 'afeia_base', NULL,
  ARRAY['immunite']::consultation_motif[],
  ARRAY['air intérieur', 'environnement'],
  ARRAY['air intérieur', 'ventilation', 'polluants', 'humidité', 'COV', 'aération']
) ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════
-- SECTION: cloture (3 blocs)
-- ═══════════════════════════════════════════════════════

INSERT INTO blocks (title, content, section, source, owner_id, motifs, tags, ai_keywords) VALUES (
  'Encouragement au changement progressif',
  E'Vous avez entre les mains un programme complet. Il est normal de se sentir un peu dépassé à la lecture de toutes ces recommandations. Rappelez-vous : il ne s''agit pas de tout changer du jour au lendemain.\n\nApproche recommandée :\n- Semaine 1 : choisissez 2 à 3 actions simples à mettre en place (par exemple, la cohérence cardiaque et un ajustement alimentaire).\n- Semaine 2 : une fois ces premières habitudes installées, ajoutez 1 à 2 nouvelles recommandations.\n- Semaine 3 et suivantes : continuez à intégrer progressivement les autres conseils.\n\nChaque petit changement compte. La régularité est plus importante que l''intensité. Une habitude ancrée sur le long terme vaut mieux qu''un programme strict tenu 10 jours.\n\nSoyez bienveillant avec vous-même. Les écarts font partie du processus. L''objectif n''est pas la perfection mais une progression durable vers un meilleur équilibre de vie.',
  'cloture', 'afeia_base', NULL,
  ARRAY['universel']::consultation_motif[],
  ARRAY['encouragement', 'progressif'],
  ARRAY['encouragement', 'changement', 'progressif', 'habitudes', 'motivation']
) ON CONFLICT DO NOTHING;

INSERT INTO blocks (title, content, section, source, owner_id, motifs, tags, ai_keywords) VALUES (
  'Disponibilité du praticien entre les séances',
  E'Je reste disponible entre nos consultations pour vous accompagner dans la mise en place de votre programme.\n\nVous pouvez me contacter pour :\n- Toute question sur les recommandations : posologie, moment de prise, doute sur un aliment ou un complément.\n- Signaler un effet indésirable ou une réaction inhabituelle : arrêtez la prise concernée et contactez-moi avant de reprendre.\n- Partager vos progrès ou vos difficultés : cela me permet d''ajuster le programme en amont du prochain rendez-vous.\n\nMerci de privilégier la messagerie de votre espace AFEIA pour que je puisse retrouver facilement l''historique de nos échanges.\n\nRappel important : en cas de symptômes inquiétants (douleur thoracique, fièvre persistante, réaction allergique, malaise), consultez votre médecin ou le 15 en priorité. Mon accompagnement naturopathique ne remplace pas le suivi médical.',
  'cloture', 'afeia_base', NULL,
  ARRAY['universel']::consultation_motif[],
  ARRAY['disponibilité', 'contact', 'praticien'],
  ARRAY['disponibilité', 'contact', 'suivi', 'questions', 'accompagnement']
) ON CONFLICT DO NOTHING;

INSERT INTO blocks (title, content, section, source, owner_id, motifs, tags, ai_keywords) VALUES (
  'Rappel prochain RDV et objectifs intermédiaires',
  E'Votre prochain rendez-vous de suivi est prévu dans 4 à 6 semaines.\n\nD''ici là, vos objectifs intermédiaires :\n- Mettre en place les recommandations alimentaires prioritaires identifiées ensemble.\n- Pratiquer la cohérence cardiaque quotidiennement (3 fois/jour, 5 minutes).\n- Démarrer la complémentation et la phytothérapie comme indiqué dans ce programme.\n- Tenir votre journal de bord : notez chaque jour votre niveau d''énergie, la qualité de votre sommeil, votre digestion et votre humeur (échelle de 1 à 10). Ces données sont précieuses pour ajuster le protocole.\n\nLors du prochain rendez-vous, nous ferons le point sur :\n- Les améliorations ressenties et les symptômes encore présents.\n- Votre tolérance aux compléments et aux plantes.\n- Les ajustements nécessaires pour la suite du protocole.\n\nPensez à noter vos questions au fil des semaines pour que nous puissions les aborder ensemble. Je vous souhaite un excellent démarrage dans votre programme d''hygiène vitale.',
  'cloture', 'afeia_base', NULL,
  ARRAY['universel']::consultation_motif[],
  ARRAY['suivi', 'objectifs', 'RDV'],
  ARRAY['rendez-vous', 'objectifs', 'journal', 'suivi', 'bilan']
) ON CONFLICT DO NOTHING;
