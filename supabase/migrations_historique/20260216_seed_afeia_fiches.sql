-- ============================================
-- Seed : 20 Fiches AFEIA officielles
-- ============================================

INSERT INTO educational_resources (practitioner_id, title, slug, summary, content_type, content_markdown, category, tags, source, is_published, read_time_minutes)
VALUES

-- ALIMENTATION (3 fiches)

(NULL, 'Les bases de l''alimentation anti-inflammatoire', 'alimentation-anti-inflammatoire',
'Découvrez les principes fondamentaux d''une alimentation qui réduit l''inflammation chronique.',
'article',
E'## Pourquoi l''inflammation chronique est un enjeu majeur\n\nL''inflammation est un mécanisme de défense naturel de l''organisme. Toutefois, lorsqu''elle devient chronique — souvent silencieuse et de bas grade — elle participe au développement de nombreuses problématiques : fatigue persistante, douleurs articulaires, troubles digestifs, problèmes cutanés, et pathologies métaboliques.\n\nL''alimentation est l''un des leviers les plus puissants pour moduler cette inflammation.\n\n## Les aliments pro-inflammatoires à réduire\n\n**Sucres raffinés et produits ultra-transformés** : ils provoquent des pics glycémiques répétés et favorisent la production de cytokines pro-inflammatoires.\n\n**Acides gras trans et huiles raffinées** : les huiles de tournesol, palme et les graisses hydrogénées déséquilibrent le ratio oméga-6/oméga-3.\n\n**Gluten et produits laitiers de vache** : chez les personnes sensibles, ces protéines peuvent entretenir une perméabilité intestinale. L''éviction n''est pas systématique mais mérite un test sur 3 à 4 semaines.\n\n**Alcool** : même modéré, il perturbe la flore intestinale et surcharge le foie.\n\n## Les aliments anti-inflammatoires à privilégier\n\n**Les légumes colorés** : brocoli, chou rouge, betterave, poivron, épinards. Plus l''assiette est colorée, plus elle est riche en polyphénols et antioxydants.\n\n**Les petits poissons gras** : sardine, maquereau, anchois, hareng. Riches en EPA et DHA, ils ont un effet anti-inflammatoire puissant. Visez 2 à 3 portions par semaine.\n\n**Les épices** : le curcuma (associé au poivre noir et à un corps gras), le gingembre, la cannelle de Ceylan.\n\n**Les oléagineux** : noix, amandes, noisettes — une petite poignée quotidienne.\n\n**Les baies** : myrtilles, framboises, cassis — champions des antioxydants.\n\n## Principes pratiques\n\nAdoptez la règle du 50/25/25 dans l''assiette : 50% de légumes, 25% de protéines de qualité, 25% de glucides complexes.\n\nCommencez la journée par un petit-déjeuner salé ou faiblement sucré. Privilégiez la cuisson douce (vapeur, basse température).\n\nL''alimentation anti-inflammatoire n''est pas un régime restrictif mais une façon durable de manger.',
'alimentation', ARRAY['anti-inflammatoire','oméga-3','nutrition','inflammation'], 'afeia', true, 6),

(NULL, 'Comprendre l''index glycémique et la charge glycémique', 'index-glycemique-charge-glycemique',
'Apprenez à distinguer IG et CG pour mieux gérer votre énergie et votre santé métabolique.',
'article',
E'## Qu''est-ce que l''index glycémique ?\n\nL''index glycémique (IG) mesure la vitesse à laquelle un aliment fait monter la glycémie après ingestion. Échelle de 0 à 100.\n\n**IG bas (≤ 55)** : lentilles, pois chiches, la plupart des fruits, pain au levain complet\n**IG moyen (56-69)** : riz basmati, pain complet, banane mûre\n**IG élevé (≥ 70)** : pain blanc, pomme de terre au four, corn flakes\n\n## La charge glycémique\n\nL''IG ne tient pas compte de la quantité réelle de glucides. La charge glycémique (CG) = (IG × glucides par portion) / 100.\n\nExemple : la pastèque a un IG élevé (~72), mais une portion de 150g ne contient que 9g de glucides. Sa CG est de 6,5 — c''est faible.\n\n## Impact sur la santé\n\nDes pics glycémiques répétés entraînent une surproduction d''insuline, favorisant la résistance à l''insuline, la prise de poids abdominale et la fatigue post-prandiale.\n\n## Conseils pratiques\n\n**Commencer le repas par les fibres** : une entrée de crudités ralentit l''absorption du glucose.\n\n**Associer glucides + protéines + gras** : réduit la réponse glycémique globale.\n\n**Privilégier pain au levain** : le levain abaisse l''IG d''environ 30%.\n\n**Cuire al dente** : les pâtes al dente ont un IG plus bas.\n\n**Bouger après le repas** : 10-15 minutes de marche réduit le pic post-prandial.',
'alimentation', ARRAY['glycémie','index glycémique','insuline','nutrition'], 'afeia', true, 5),

(NULL, 'Les bonnes associations alimentaires', 'associations-alimentaires',
'Optimisez votre digestion grâce aux bonnes combinaisons alimentaires.',
'article',
E'## Pourquoi les associations comptent\n\nChaque macronutriment mobilise des enzymes et un pH différents. Certaines combinaisons facilitent la digestion tandis que d''autres provoquent fermentations et ballonnements.\n\n## Associations à favoriser\n\n**Protéines + légumes verts** : les légumes apportent des fibres et enzymes qui facilitent la digestion des protéines.\n\n**Céréales + légumineuses** : complémentarité en acides aminés. Riz + lentilles, semoule + pois chiches, maïs + haricots rouges.\n\n**Fer végétal + vitamine C** : un filet de citron sur les lentilles multiplie l''absorption du fer par 3 à 6.\n\n**Curcuma + poivre noir + matière grasse** : la pipérine augmente l''absorption de la curcumine de 2000%.\n\n**Vitamine D + matières grasses** : vitamine liposoluble, à prendre pendant un repas gras.\n\n## Associations à limiter\n\n**Fruits en dessert après un repas copieux** : les fruits se digèrent en 20-30 min. Après un repas riche, ils stagnent et fermentent. Préférez-les au goûter.\n\n**Protéines animales + féculents lourds** : steak-frites demande beaucoup d''énergie digestive.\n\n**Produits laitiers + protéines animales** : pH et enzymes très différents.\n\nCes principes ne sont pas absolus mais des pistes d''optimisation. Observez comment votre digestion réagit.',
'alimentation', ARRAY['digestion','combinaisons','nutrition','absorption'], 'afeia', true, 5),

-- HYDRATATION (1 fiche)

(NULL, 'L''hydratation : bien plus que boire de l''eau', 'hydratation-guide-complet',
'Apprenez à vous hydrater correctement en fonction de votre terrain et de vos besoins.',
'article',
E'## L''eau, premier nutriment du corps\n\nLe corps humain est composé de 60 à 70% d''eau. Une déshydratation même légère (1-2%) impacte la concentration, l''énergie et l''humeur.\n\n## Combien boire ?\n\nVisez 30 ml par kg de poids corporel comme base. Une personne de 70 kg a besoin d''environ 2,1L par jour, davantage en cas d''activité physique ou de chaleur.\n\n## Quelle eau choisir ?\n\n**Eau faiblement minéralisée** (résidu sec < 200 mg/L) : Mont Roucous, Montcalm, Volvic. Idéale au quotidien.\n\n**Eaux riches en magnésium** (Hépar, Rozana) : utiles ponctuellement, pas au quotidien.\n\n**Eau du robinet filtrée** : un filtre à charbon actif élimine le chlore. Option économique et écologique.\n\n## Quand boire ?\n\n**Au réveil** : un grand verre d''eau tiède relance les fonctions d''élimination.\n\n**Entre les repas** : boire pendant les repas dilue les sucs digestifs. Limitez-vous à un verre pendant le repas.\n\n**Avant la sensation de soif** : quand la soif se manifeste, la déshydratation a déjà commencé.\n\n## Eaux aromatisées naturelles\n\nInfusions tièdes, eaux infusées au concombre-menthe, au citron-gingembre, ou au romarin.',
'hydratation', ARRAY['eau','hydratation','minéraux','drainage'], 'afeia', true, 4),

-- PHYTOTHÉRAPIE (2 fiches)

(NULL, 'Initiation à la phytothérapie : les 10 plantes essentielles', 'phytotherapie-10-plantes-essentielles',
'Un tour d''horizon des 10 plantes incontournables en naturopathie.',
'article',
E'## La phytothérapie en naturopathie\n\nVoici 10 plantes à connaître absolument.\n\n## 1. Desmodium\nProtecteur et régénérant du foie. Indispensable en cas de surcharge hépatique.\n\n## 2. Mélisse\nAntispasmodique digestive, calmante, favorise l''endormissement.\n\n## 3. Valériane\nSédative et anxiolytique naturelle. Réduit le temps d''endormissement. Ne pas associer à des benzodiazépines.\n\n## 4. Ortie\nReminéralisante majeure. Riche en fer, silice, magnésium. Anti-inflammatoire.\n\n## 5. Millepertuis\nAntidépresseur léger validé scientifiquement. Attention : photosensibilisant et nombreuses interactions médicamenteuses.\n\n## 6. Pissenlit\nCholérétique et diurétique. Idéal en cure printanière.\n\n## 7. Thym\nAnti-infectieux puissant, expectorant. En infusion au moindre signe d''infection hivernale.\n\n## 8. Aubépine\nRégulatrice du rythme cardiaque, hypotensive douce, anxiolytique.\n\n## 9. Cassis\nAnti-inflammatoire à large spectre en gemmothérapie. Utile pour allergies et douleurs articulaires.\n\n## 10. Chardon-Marie\nHépatoprotecteur de référence grâce à la silymarine.',
'phytotherapie', ARRAY['plantes','phytothérapie','foie','sommeil','immunité'], 'afeia', true, 7),

(NULL, 'Les formes galéniques en phytothérapie', 'formes-galeniques-phytotherapie',
'Tisane, EPS, teinture-mère, gemmothérapie... les différentes formes de préparation des plantes.',
'article',
E'## Pourquoi la forme galénique compte\n\nUne même plante peut avoir des effets différents selon sa forme de préparation.\n\n## Infusion et décoction\n\n**Infusion** : eau frémissante sur les parties aériennes, 5 à 15 min à couvert.\n**Décoction** : parties dures dans l''eau froide, porter à ébullition 10 à 20 min.\n\n## EPS (Extraits de Plantes Standardisés)\n\nExtraits hydro-glycérinés par cryobroyage. Très concentrés, dosage précis. Conservés au réfrigérateur.\n\n## Teintures-mères\n\nMacérations hydro-alcooliques de plantes fraîches. 20 à 50 gouttes 2 à 3 fois par jour.\n\n## Gemmothérapie\n\nBourgeons et jeunes pousses macérés. Forme très douce adaptée aux enfants. 5 à 15 gouttes par jour.\n\n## Gélules et extraits secs\n\nPratiques pour l''observance, dosage standardisé. L''extrait sec est plus concentré que la poudre totale.\n\n## Comment choisir ?\n\nCure de fond longue : gélules ou EPS. Soutien quotidien : infusion. Action ciblée rapide : TM ou EPS.',
'phytotherapie', ARRAY['galénique','EPS','teinture-mère','gemmothérapie','infusion'], 'afeia', true, 5),

-- AROMATHÉRAPIE (2 fiches)

(NULL, 'Les 8 huiles essentielles indispensables', 'aromatherapie-8-huiles-essentielles',
'Constituez votre trousse aromatique de base avec 8 HE polyvalentes.',
'article',
E'## Précautions générales\n\nNe jamais appliquer pure sur la peau (sauf exceptions). Déconseillées aux femmes enceintes < 3 mois et enfants < 3 ans. Toujours faire un test cutané.\n\n## 1. Lavande vraie\nCalmante, cicatrisante, antispasmodique. La plus polyvalente.\n\n## 2. Tea tree\nAnti-infectieux à large spectre. 1 goutte sur un bouton ou une mycose.\n\n## 3. Ravintsara\nAntivirale majeure, immunostimulante. L''huile de l''hiver.\n\n## 4. Menthe poivrée\nAntalgique (maux de tête), digestive, tonifiante. Interdite avant 6 ans.\n\n## 5. Eucalyptus radié\nDécongestionnant respiratoire. Plus doux que l''eucalyptus globuleux, adapté dès 3 ans.\n\n## 6. Hélichryse italienne\nL''anti-hématome par excellence. Aussi cicatrisante et anti-inflammatoire.\n\n## 7. Gaulthérie couchée\nAnti-inflammatoire musculaire. Contre-indiquée si allergie à l''aspirine.\n\n## 8. Camomille romaine\nCalmante nerveuse puissante, antispasmodique, anti-allergique.',
'aromatherapie', ARRAY['huiles essentielles','aromathérapie','trousse','HE'], 'afeia', true, 6),

(NULL, 'Les voies d''utilisation des huiles essentielles', 'voies-utilisation-huiles-essentielles',
'Voie cutanée, diffusion, ingestion, inhalation : utiliser les HE en toute sécurité.',
'article',
E'## Voie cutanée\n\nLa peau est une excellente voie d''absorption. Dilution dans une huile végétale : 5 à 20% selon la zone. Zones stratégiques : poignets, plexus solaire, voûtes plantaires, colonne vertébrale.\n\n## Diffusion atmosphérique\n\n15 à 30 min par session, pas en continu. Pas en présence d''enfants < 3 ans, femmes enceintes, asthmatiques.\n\n## Inhalation\n\n**Sèche** : 1-2 gouttes sur un mouchoir. **Humide** : 3-5 gouttes dans un bol d''eau chaude, 5-10 min sous une serviette.\n\n## Voie orale\n\nRéservée aux adultes, sur un support (miel, huile végétale, comprimé neutre). Jamais pure, jamais dans l''eau. 5 à 7 jours maximum.',
'aromatherapie', ARRAY['huiles essentielles','voie cutanée','diffusion','sécurité'], 'afeia', true, 5),

-- RESPIRATION (1 fiche)

(NULL, 'Techniques de respiration pour le praticien et le consultant', 'techniques-respiration',
'Cohérence cardiaque, respiration abdominale, respiration alternée : des outils concrets.',
'article',
E'## Pourquoi la respiration est un outil majeur\n\nLa respiration est le seul système vital à la fois automatique et volontaire. En modulant le souffle, on agit sur le système nerveux autonome.\n\n## 1. Cohérence cardiaque (365)\n\n6 respirations/min pendant 5 min, 3 fois/jour. Inspirer 5s par le nez, expirer 5s par la bouche. Réduit le cortisol pendant 4 à 6h.\n\n## 2. Respiration abdominale\n\nInspirer en gonflant le ventre, expirer en le rentrant. Une main sur la poitrine (immobile), une sur le ventre (se soulève). 5 à 10 min matin et soir.\n\n## 3. Respiration alternée (Nadi Shodhana)\n\nAlterner les narines : inspirer gauche (4 temps), retenir (4 temps), expirer droite (8 temps), inspirer droite, retenir, expirer gauche. 5 à 10 cycles.\n\nCes techniques sont puissantes car praticables seul, sans matériel, n''importe où.',
'respiration', ARRAY['cohérence cardiaque','respiration','stress','relaxation'], 'afeia', true, 5),

-- SOMMEIL (2 fiches)

(NULL, 'Les clés d''un sommeil réparateur', 'sommeil-reparateur-cles',
'Hygiène du sommeil, rituels du soir, gestion de la lumière : les fondamentaux.',
'article',
E'## Architecture du sommeil\n\nCycles de 90 min : sommeil léger, profond, paradoxal. Besoin adulte : 7 à 9h.\n\n## Les perturbateurs\n\n**Lumière bleue** : écrans → inhibe la mélatonine. Arrêter 1h avant le coucher.\n**Température** : chambre à 18-19°C.\n**Caféine** : demi-vie de 5 à 7h. Un café à 14h agit encore à 21h.\n**Alcool** : facilite l''endormissement mais fragmente le sommeil.\n**Repas du soir** : modéré, riche en tryptophane (banane, amandes, dinde).\n\n## Le rituel du coucher\n\nSas de 30-60 min : tamiser les lumières, lecture, infusion (tilleul, passiflore, mélisse), cohérence cardiaque 5 min. Heures fixes, y compris le week-end.',
'sommeil', ARRAY['sommeil','insomnie','mélatonine','hygiène du sommeil'], 'afeia', true, 5),

(NULL, 'Les plantes et compléments du sommeil', 'plantes-complements-sommeil',
'Mélatonine, magnésium, passiflore, valériane : solutions naturelles pour les troubles du sommeil.',
'article',
E'## Plantes sédatives\n\n**Passiflore** : anxiolytique douce, idéale pour les ruminations.\n**Valériane** : réduit le temps d''endormissement. Effet cumulatif sur 2-4 semaines.\n**Eschscholtzia** : sédatif léger, utile pour les réveils nocturnes.\n**Mélisse** : calmante digestive et nerveuse.\n**Houblon** : sédatif puissant, surtout avec la valériane.\n\n## Magnésium\n\n70-80% de la population est déficitaire. Formes recommandées : bisglycinate (sans effet laxatif), thréonate (passe la barrière hémato-encéphalique). 300-400 mg/jour au dîner et coucher.\n\n## Mélatonine\n\n0,5 à 1 mg suffit souvent, 30 min avant le coucher. Idéal pour décalage horaire et travail posté.\n\n## L-tryptophane et 5-HTP\n\nPrécurseurs de la sérotonine puis mélatonine. Ne pas associer à des antidépresseurs ISRS.',
'sommeil', ARRAY['sommeil','plantes','mélatonine','magnésium','compléments'], 'afeia', true, 5),

-- GESTION DU STRESS (2 fiches)

(NULL, 'Comprendre le stress : les 3 phases de Hans Selye', 'comprendre-stress-3-phases',
'Alarme, résistance, épuisement. Identifiez où en est votre consultant.',
'article',
E'## Le stress n''est pas l''ennemi\n\nC''est quand il devient chronique qu''il pose problème. Hans Selye a décrit en 1936 le Syndrome Général d''Adaptation.\n\n## Phase 1 — Alarme\n\nRéaction immédiate : adrénaline, noradrénaline. Cœur qui s''emballe, hypervigilance. Durée : minutes à heures.\n\n## Phase 2 — Résistance\n\nProduction prolongée de cortisol. Fatigue matinale, prise de poids abdominale, envies de sucre, rhumes fréquents, bruxisme. Phase la plus fréquente en cabinet. Durée : semaines à mois.\n\n## Phase 3 — Épuisement\n\nLes surrénales ne suivent plus. Épuisement profond, hypotension, libido effondrée, dépression, infections à répétition.\n\n## Accompagnement par phase\n\n**Phase 1** : respiration, mélisse, passiflore, magnésium.\n**Phase 2** : adaptogènes (rhodiole, ashwagandha), soutien hépatique, sommeil.\n**Phase 3** : repos absolu, vitamine C haute dose, B5, alimentation dense. Reconstruction sur 3-6 mois.',
'gestion_stress', ARRAY['stress','cortisol','surrénales','burnout','Selye'], 'afeia', true, 6),

(NULL, 'Les plantes adaptogènes : guide pratique', 'plantes-adaptogenes-guide',
'Rhodiola, ashwagandha, éleuthérocoque, ginseng : comprendre et utiliser les adaptogènes.',
'article',
E'## Qu''est-ce qu''un adaptogène ?\n\nSubstance qui aide l''organisme à s''adapter au stress sans effet stimulant ou sédatif spécifique. 3 critères : non toxique, augmente la résistance au stress, effet normalisateur.\n\n## Rhodiola\n\nAdaptogène stimulant, anti-fatigue. Pour surmenage intellectuel, examens, baisse de motivation. 200-400 mg le matin. Pas le soir.\n\n## Ashwagandha\n\nAdaptogène calmant, anxiolytique. Réduit le cortisol de 30% en 8 semaines. 300-600 mg matin et soir. Prudence si maladie auto-immune thyroïdienne.\n\n## Éleuthérocoque\n\nGinseng sibérien. Tonique et immunostimulant. Plus doux que le ginseng. Cures de 4-6 semaines.\n\n## Ginseng\n\nLe roi des adaptogènes. Tonique puissant. Déconseillé si HTA, insomnie sévère, cancer hormono-dépendant.\n\n## Principes d''utilisation\n\nUne seule plante à la fois pour commencer. Cures de 4-8 semaines avec pauses. Max 2 adaptogènes simultanés. Stimulant (rhodiola) pour les épuisés, calmant (ashwagandha) pour les anxieux.',
'gestion_stress', ARRAY['adaptogènes','rhodiola','ashwagandha','stress','cortisol'], 'afeia', true, 6),

-- DÉTOX (1 fiche)

(NULL, 'Les cures détox en naturopathie', 'cures-detox-naturopathie',
'Principes, timing et méthodes des cures de détoxification.',
'article',
E'## Détox : de quoi parle-t-on ?\n\nSoutenir les émonctoires pour optimiser l''élimination des déchets. Les 5 émonctoires : foie, intestins, reins, poumons, peau.\n\n## Quand proposer une cure ?\n\n**Bonnes indications** : changement de saison, après des excès, fatigue avec encrassement, début de prise en charge naturopathique.\n\n**Contre-indications** : personne épuisée, femme enceinte, enfant, pathologie aiguë. Ne jamais détoxifier sans vitalité suffisante.\n\n## Principe : drainer AVANT de mobiliser\n\nOuvrir les émonctoires d''élimination (intestin, reins) AVANT de stimuler le foie.\n\n## Les 3 phases\n\n**Semaine 1 — Drainage doux** : pissenlit, artichaut, romarin. Hydratation renforcée. Alimentation allégée.\n\n**Semaine 2 — Soutien hépatique** : radis noir, desmodium, chardon-marie. Bouillotte sur le foie chaque soir.\n\n**Semaine 3 — Revitalisation** : réintroduction progressive, probiotiques, jus de légumes verts.\n\nDeux cures par an suffisent (printemps et automne).',
'detox', ARRAY['détox','foie','drainage','émonctoires','cure'], 'afeia', true, 5),

-- DIGESTION (1 fiche)

(NULL, 'La santé intestinale : microbiote et perméabilité', 'sante-intestinale-microbiote',
'Le rôle central du microbiote intestinal et l''hyperperméabilité intestinale.',
'article',
E'## Le microbiote : un organe à part entière\n\n100 000 milliards de micro-organismes, 1,5 kg. Fonctions : digestion des fibres, synthèse de vitamines, régulation immunitaire (70% du système immunitaire est dans l''intestin), production de sérotonine (95%).\n\n## La dysbiose\n\nCauses : antibiotiques, alimentation pauvre en fibres, stress, AINS, alcool. Conséquences : ballonnements, infections, intolérances, troubles de l''humeur.\n\n## L''hyperperméabilité intestinale\n\nQuand les jonctions serrées s''altèrent, des molécules passent dans le sang et activent le système immunitaire de façon chronique. Conséquences : intolérances multiples, inflammation, troubles auto-immuns, brouillard mental.\n\n## Accompagnement naturopathique\n\n**Éliminer** : aliments pro-inflammatoires, alcool, AINS.\n**Ensemencer** : probiotiques ciblés, cure de 2-3 mois.\n**Nourrir** : prébiotiques (poireau, ail, oignon, banane verte).\n**Réparer** : L-glutamine (3-5g/jour), zinc, vitamine A, curcuma.',
'digestion', ARRAY['microbiote','intestin','perméabilité','probiotiques','dysbiose'], 'afeia', true, 6),

-- IMMUNITÉ (1 fiche)

(NULL, 'Renforcer l''immunité naturellement', 'renforcer-immunite-naturellement',
'Les stratégies naturopathiques pour soutenir le système immunitaire.',
'article',
E'## Les piliers de l''immunité\n\nMicrobiote équilibré, sommeil suffisant, gestion du stress, statut nutritionnel optimal, activité physique régulière.\n\n## Micronutriments clés\n\n**Vitamine D** : 80% de la population est déficitaire en hiver. 1000-4000 UI/jour selon le statut. Avec un repas gras.\n**Zinc** : 15-30 mg/jour. Sources : huîtres, graines de courge. Forme : bisglycinate.\n**Vitamine C** : 500-1000 mg/jour. Forme liposomale mieux assimilée.\n**Sélénium** : 1-2 noix du Brésil par jour.\n\n## Plantes immunostimulantes\n\n**Échinacée** : dès les premiers signes, 5-10 jours max.\n**Propolis** : anti-infectieux à large spectre.\n**Astragale** : adaptogène immunitaire, en cure de fond hivernale.\n\n## Prévention hivernale type\n\nOctobre à mars : vitamine D quotidienne, zinc (1 mois sur 2), vitamine C, probiotiques 2 mois, astragale en fond. Si symptômes : échinacée + propolis + vitamine C haute dose pendant 5-7 jours.',
'immunite', ARRAY['immunité','vitamine D','zinc','hiver','prévention'], 'afeia', true, 5),

-- ACTIVITÉ PHYSIQUE (1 fiche)

(NULL, 'L''activité physique en naturopathie', 'activite-physique-naturopathie',
'Prescrire l''activité physique comme un outil thérapeutique.',
'article',
E'## Le mouvement comme pilier\n\n30 minutes d''activité modérée quotidienne réduisent de 30 à 50% le risque de nombreuses pathologies chroniques.\n\n## Bénéfices par système\n\n**Nerveux** : endorphines, sérotonine, BDNF. Aussi efficace que les antidépresseurs pour la dépression légère.\n**Immunitaire** : stimule les cellules NK. Attention au surentraînement (effet inverse).\n**Digestif** : stimule le péristaltisme, facilite la gestion glycémique.\n**Détox** : augmente la circulation sanguine et lymphatique.\n\n## Adapter au profil\n\n**Épuisé** : marche douce, yoga restauratif. Pas de sport intense.\n**Stressé** : yoga dynamique, natation, marche rapide.\n**Sédentaire débutant** : 10 min de marche quotidienne, augmenter progressivement.\n\nUne marche quotidienne de 30 min à allure soutenue procure l''essentiel des bénéfices santé.',
'activite_physique', ARRAY['activité physique','marche','sport','mouvement'], 'afeia', true, 4),

-- PEAU (1 fiche)

(NULL, 'La peau, miroir de la santé intérieure', 'peau-miroir-sante-interieure',
'Acné, eczéma, psoriasis : comprendre les problèmes de peau en naturopathie.',
'article',
E'## La peau comme émonctoire de secours\n\nQuand foie, intestins et reins sont surchargés, le corps dérive l''élimination vers la peau.\n\n## Acné\n\nTerrain d''encrassement + facteurs hormonaux. Axes : nettoyage hépatique, rééquilibrage intestinal, alimentation anti-inflammatoire (réduction laitages et sucre), zinc 15-30 mg/jour.\n\n## Eczéma\n\nTerrain allergique et hyperperméabilité intestinale. Axes : réparation intestinale, éviction allergènes, oméga-3 haute dose, huile d''onagre, probiotiques spécifiques.\n\n## Psoriasis\n\nMaladie auto-immune avec forte composante émotionnelle. Axes : gestion du stress (crucial), soutien hépatique, curcuma, oméga-3, vitamine D.\n\n## Principe transversal\n\nPour tout problème cutané chronique, investiguer dans l''ordre : intestin, foie, alimentation, stress, puis approche locale.',
'peau', ARRAY['peau','acné','eczéma','psoriasis','émonctoire'], 'afeia', true, 5),

-- FÉMININ (1 fiche)

(NULL, 'Accompagner le cycle féminin en naturopathie', 'accompagner-cycle-feminin',
'Les 4 phases du cycle menstruel et les conseils naturopathiques pour chacune.',
'article',
E'## Les 4 phases du cycle\n\nDurée moyenne 28 jours (21-35 jours = normal).\n\n## Phase 1 — Menstruelle (J1-J5)\n\nPhase de repos, énergie au plus bas. Alimentation riche en fer, infusions de framboisier, magnésium, activité douce, bouillotte chaude.\n\n## Phase 2 — Folliculaire (J6-J12)\n\nŒstrogènes montent. Énergie et créativité augmentent. Phytoestrogènes (graines de lin), sport plus intense possible.\n\n## Phase 3 — Ovulatoire (J13-J15)\n\nÉnergie maximale. Antioxydants et fibres pour métaboliser les œstrogènes.\n\n## Phase 4 — Lutéale (J16-J28)\n\nProgestérone domine, énergie baisse. SPM si ratio progestérone/œstrogènes déséquilibré.\n\n**SPM — Approche naturo** : gattilier (Vitex), magnésium bisglycinate 300-400 mg/jour, vitamine B6 25-50 mg/jour, huile d''onagre 1000-2000 mg/jour.\n\nEncouragez le suivi quotidien du cycle (température basale, humeur, symptômes) comme outil de diagnostic.',
'feminin', ARRAY['cycle','hormones','SPM','féminin','menstruation'], 'afeia', true, 6),

-- GÉNÉRAL (1 fiche)

(NULL, 'Les 10 techniques naturopathiques majeures', '10-techniques-naturopathiques',
'Vue d''ensemble des 10 techniques en naturopathie et leur intégration.',
'article',
E'## Les 3 techniques majeures\n\n**1. Alimentation (bromatologie)** : premier levier du naturopathe. Nutrition, cures saisonnières, jeûne, compléments.\n\n**2. Exercice physique (kinésiologie)** : marche, natation, yoga, Qi Gong. Adapté au terrain.\n\n**3. Gestion psycho-émotionnelle** : relaxation, méditation, cohérence cardiaque. Souvent le déclencheur des déséquilibres.\n\n## Les 7 techniques mineures\n\n**4. Phytothérapie et aromathérapie** : plantes sous toutes formes et huiles essentielles.\n\n**5. Hydrologie** : bains, douche écossaise, hammam, sauna.\n\n**6. Techniques manuelles** : massages, réflexologie, drainage lymphatique.\n\n**7. Techniques réflexes** : réflexologie plantaire, auriculothérapie.\n\n**8. Techniques respiratoires** : cohérence cardiaque, Pranayama.\n\n**9. Techniques énergétiques** : magnétisme, Qi Gong, MTC.\n\n**10. Techniques vibratoires** : chromothérapie, musicothérapie, fleurs de Bach.\n\nLe naturopathe priorise selon le terrain et la vitalité. Les 3 majeures forment toujours le socle.',
'general', ARRAY['naturopathie','techniques','holistique','fondamentaux'], 'afeia', true, 6)

ON CONFLICT (slug) DO NOTHING;
