-- ============================================================
-- SEED DATA : Contre-indications naturopathie
-- 50+ regles critiques pour AFEIA
-- ============================================================

-- ========================
-- SUBSTANCES
-- ========================

INSERT INTO public.substances (id, name, type, aliases) VALUES
-- Plantes
('00000001-0000-0000-0000-000000000001', 'Millepertuis', 'plante', ARRAY['Hypericum perforatum', 'St John''s Wort', 'herbe de la Saint-Jean']),
('00000001-0000-0000-0000-000000000002', 'Ginkgo biloba', 'plante', ARRAY['Ginkgo', 'arbre aux quarante ecus']),
('00000001-0000-0000-0000-000000000003', 'Ginseng', 'plante', ARRAY['Panax ginseng', 'ginseng asiatique', 'ginseng rouge', 'ginseng de Coree']),
('00000001-0000-0000-0000-000000000004', 'Reglisse', 'plante', ARRAY['Glycyrrhiza glabra', 'bois doux', 'racine de reglisse']),
('00000001-0000-0000-0000-000000000005', 'Valeriane', 'plante', ARRAY['Valeriana officinalis', 'herbe aux chats']),
('00000001-0000-0000-0000-000000000006', 'Curcuma', 'plante', ARRAY['Curcuma longa', 'turmeric', 'safran des Indes', 'curcumine']),
('00000001-0000-0000-0000-000000000007', 'Ail', 'plante', ARRAY['Allium sativum', 'ail des ours']),
('00000001-0000-0000-0000-000000000008', 'Echinacee', 'plante', ARRAY['Echinacea purpurea', 'Echinacea angustifolia', 'echinacee pourpre']),
('00000001-0000-0000-0000-000000000009', 'Chardon-Marie', 'plante', ARRAY['Silybum marianum', 'silymarine']),
('00000001-0000-0000-0000-000000000010', 'Griffonia', 'plante', ARRAY['Griffonia simplicifolia', '5-HTP', '5-hydroxytryptophane']),
('00000001-0000-0000-0000-000000000011', 'Passiflore', 'plante', ARRAY['Passiflora incarnata', 'fleur de la passion']),
('00000001-0000-0000-0000-000000000012', 'Houblon', 'plante', ARRAY['Humulus lupulus']),
('00000001-0000-0000-0000-000000000013', 'Sauge', 'plante', ARRAY['Salvia officinalis', 'sauge officinale']),
('00000001-0000-0000-0000-000000000014', 'Aloe vera', 'plante', ARRAY['Aloe barbadensis', 'aloes']),
('00000001-0000-0000-0000-000000000015', 'Reine-des-pres', 'plante', ARRAY['Filipendula ulmaria', 'ulmaire', 'aspirine vegetale']),
('00000001-0000-0000-0000-000000000016', 'Ephedra', 'plante', ARRAY['Ephedra sinica', 'ma huang', 'ephedrine']),
('00000001-0000-0000-0000-000000000017', 'Camomille', 'plante', ARRAY['Matricaria chamomilla', 'camomille allemande', 'camomille matricaire']),
('00000001-0000-0000-0000-000000000018', 'Arnica', 'plante', ARRAY['Arnica montana']),
-- Complements
('00000001-0000-0000-0000-000000000019', 'Chrome', 'complement', ARRAY['picolinate de chrome', 'chrome trivalent']),
('00000001-0000-0000-0000-000000000020', 'Fer', 'complement', ARRAY['bisglycinate de fer', 'sulfate ferreux', 'fer bisglycinate']),
('00000001-0000-0000-0000-000000000021', 'Vitamine K', 'complement', ARRAY['vitamine K2', 'MK-7', 'menaquinone']),
-- Huiles essentielles
('00000001-0000-0000-0000-000000000022', 'HE Menthe poivree', 'huile_essentielle', ARRAY['Mentha piperita', 'menthe poivree', 'huile essentielle de menthe']),
('00000001-0000-0000-0000-000000000023', 'HE Eucalyptus', 'huile_essentielle', ARRAY['Eucalyptus globulus', 'eucalyptus', 'huile essentielle d''eucalyptus']),
('00000001-0000-0000-0000-000000000024', 'HE Romarin', 'huile_essentielle', ARRAY['Rosmarinus officinalis', 'romarin a camphre', 'huile essentielle de romarin']),
('00000001-0000-0000-0000-000000000025', 'HE Sauge', 'huile_essentielle', ARRAY['Salvia officinalis HE', 'huile essentielle de sauge'])
ON CONFLICT DO NOTHING;

-- ========================
-- CONDITIONS
-- ========================

INSERT INTO public.conditions (id, name, type) VALUES
-- Etats physiologiques
('00000002-0000-0000-0000-000000000001', 'Grossesse', 'etat_physiologique'),
('00000002-0000-0000-0000-000000000002', 'Allaitement', 'etat_physiologique'),
('00000002-0000-0000-0000-000000000003', 'Enfant de moins de 6 ans', 'etat_physiologique'),
('00000002-0000-0000-0000-000000000004', 'Enfant de moins de 12 ans', 'etat_physiologique'),
-- Pathologies
('00000002-0000-0000-0000-000000000005', 'Hypertension arterielle', 'pathologie'),
('00000002-0000-0000-0000-000000000006', 'Diabete', 'pathologie'),
('00000002-0000-0000-0000-000000000007', 'Insuffisance renale', 'pathologie'),
('00000002-0000-0000-0000-000000000008', 'Insuffisance hepatique', 'pathologie'),
('00000002-0000-0000-0000-000000000009', 'Epilepsie', 'pathologie'),
('00000002-0000-0000-0000-000000000010', 'Troubles de la coagulation', 'pathologie'),
-- Traitements medicamenteux
('00000002-0000-0000-0000-000000000011', 'Contraceptifs oraux', 'traitement_medicamenteux'),
('00000002-0000-0000-0000-000000000012', 'Antidepresseurs ISRS', 'traitement_medicamenteux'),
('00000002-0000-0000-0000-000000000013', 'Anticoagulants', 'traitement_medicamenteux'),
('00000002-0000-0000-0000-000000000014', 'Immunosuppresseurs', 'traitement_medicamenteux'),
('00000002-0000-0000-0000-000000000015', 'Antiretroviraux', 'traitement_medicamenteux'),
('00000002-0000-0000-0000-000000000016', 'Antiplaquettaires', 'traitement_medicamenteux'),
('00000002-0000-0000-0000-000000000017', 'Antidiabetiques', 'traitement_medicamenteux'),
('00000002-0000-0000-0000-000000000018', 'IMAO', 'traitement_medicamenteux'),
('00000002-0000-0000-0000-000000000019', 'Antihypertenseurs', 'traitement_medicamenteux'),
('00000002-0000-0000-0000-000000000020', 'Diuretiques', 'traitement_medicamenteux'),
('00000002-0000-0000-0000-000000000021', 'Corticoides', 'traitement_medicamenteux'),
('00000002-0000-0000-0000-000000000022', 'Digoxine', 'traitement_medicamenteux'),
('00000002-0000-0000-0000-000000000023', 'Benzodiazepines', 'traitement_medicamenteux'),
('00000002-0000-0000-0000-000000000024', 'Barbituriques', 'traitement_medicamenteux'),
('00000002-0000-0000-0000-000000000025', 'Sedatifs', 'traitement_medicamenteux'),
('00000002-0000-0000-0000-000000000026', 'Medicaments metabolises par le CYP3A4', 'traitement_medicamenteux'),
-- Allergies
('00000002-0000-0000-0000-000000000027', 'Allergie aux asteracees', 'allergie')
ON CONFLICT DO NOTHING;

-- ========================
-- CONTRE-INDICATION RULES (substance × condition)
-- ========================

INSERT INTO public.contraindication_rules (substance_id, condition_id, severity, message_fr, recommendation_fr, source) VALUES
-- Millepertuis
('00000001-0000-0000-0000-000000000001', '00000002-0000-0000-0000-000000000011', 'critical',
 'Le millepertuis peut reduire significativement l''efficacite des contraceptifs oraux par induction enzymatique (CYP3A4).',
 'Deconseiller le millepertuis. Envisager la valeriane ou la passiflore comme alternatives pour l''anxiete/sommeil.',
 'Monographie EMA/HMPC 2018 - Hypericum perforatum'),

('00000001-0000-0000-0000-000000000001', '00000002-0000-0000-0000-000000000012', 'critical',
 'Association millepertuis + ISRS : risque de syndrome serotoninergique (agitation, confusion, tachycardie, hyperthermie).',
 'Contre-indication absolue. Ne jamais associer millepertuis et antidepresseurs. Orienter vers le medecin traitant.',
 'Pharmacopee europeenne 10e ed. / ANSM 2019'),

('00000001-0000-0000-0000-000000000001', '00000002-0000-0000-0000-000000000013', 'critical',
 'Le millepertuis diminue l''efficacite des anticoagulants (warfarine, acenocoumarol) par induction du CYP2C9.',
 'Contre-indication absolue. Risque thromboembolique. Ne pas substituer sans avis medical.',
 'Monographie EMA/HMPC 2018'),

('00000001-0000-0000-0000-000000000001', '00000002-0000-0000-0000-000000000014', 'critical',
 'Le millepertuis diminue l''efficacite des immunosuppresseurs (ciclosporine, tacrolimus) pouvant entrainer un rejet de greffe.',
 'Contre-indication absolue. Aucune alternative en phytotherapie sans avis du medecin specialiste.',
 'ANSM - Interactions medicamenteuses 2020'),

('00000001-0000-0000-0000-000000000001', '00000002-0000-0000-0000-000000000015', 'critical',
 'Le millepertuis diminue les concentrations plasmatiques des antiretroviraux (inhibiteurs de protease, INNTI).',
 'Contre-indication absolue. Risque de resistance virale et echec therapeutique.',
 'OMS - Monographie Hypericum 2009'),

('00000001-0000-0000-0000-000000000001', '00000002-0000-0000-0000-000000000001', 'critical',
 'Le millepertuis est contre-indique pendant la grossesse (effet uterotrope, interactions medicamenteuses multiples).',
 'Utiliser la passiflore ou le tilleul comme alternatives pour l''anxiete pendant la grossesse, apres avis medical.',
 'Monographie EMA/HMPC 2018'),

-- Ginkgo biloba
('00000001-0000-0000-0000-000000000002', '00000002-0000-0000-0000-000000000013', 'critical',
 'Le ginkgo potentialise l''effet des anticoagulants (warfarine, heparine) et augmente le risque hemorragique.',
 'Eviter l''association. Surveiller l''INR en cas d''utilisation concomitante.',
 'Monographie ESCOP 2003 / EMA/HMPC 2015'),

('00000001-0000-0000-0000-000000000002', '00000002-0000-0000-0000-000000000016', 'warning',
 'Le ginkgo peut potentialiser l''effet des antiplaquettaires et augmenter le risque de saignement.',
 'Prudence. Informer le consultant et son medecin traitant de cette association.',
 'Monographie EMA/HMPC 2015'),

('00000001-0000-0000-0000-000000000002', '00000002-0000-0000-0000-000000000010', 'critical',
 'Le ginkgo est contre-indique en cas de troubles de la coagulation (risque hemorragique accru).',
 'Ne pas recommander de ginkgo. Envisager d''autres plantes pour la circulation veineuse.',
 'ESCOP Monographs 2003'),

-- Ginseng
('00000001-0000-0000-0000-000000000003', '00000002-0000-0000-0000-000000000013', 'warning',
 'Le ginseng peut interferer avec les anticoagulants et modifier l''INR.',
 'Surveiller l''INR. Informer le medecin traitant.',
 'Monographie OMS 1999'),

('00000001-0000-0000-0000-000000000003', '00000002-0000-0000-0000-000000000017', 'warning',
 'Le ginseng peut potentialiser les antidiabetiques et augmenter le risque d''hypoglycemie.',
 'Surveillance glycemique renforcee. Adapter les doses en concertation avec le medecin.',
 'Monographie EMA/HMPC 2014'),

('00000001-0000-0000-0000-000000000003', '00000002-0000-0000-0000-000000000018', 'critical',
 'Association ginseng + IMAO : risque de crise hypertensive et d''episodes maniaques.',
 'Contre-indication absolue. Orienter vers le medecin traitant.',
 'Pharmacopee europeenne'),

('00000001-0000-0000-0000-000000000003', '00000002-0000-0000-0000-000000000005', 'warning',
 'Le ginseng peut augmenter la pression arterielle.',
 'Deconseille en cas d''HTA non controlee. Surveiller la tension.',
 'Monographie OMS 1999'),

('00000001-0000-0000-0000-000000000003', '00000002-0000-0000-0000-000000000001', 'critical',
 'Le ginseng est contre-indique pendant la grossesse (effets hormonaux potentiels).',
 'Pas d''alternative au ginseng pendant la grossesse pour l''energie. Privilegier un mode de vie adapte.',
 'OMS Monographs on Medicinal Plants'),

-- Reglisse
('00000001-0000-0000-0000-000000000004', '00000002-0000-0000-0000-000000000019', 'critical',
 'La reglisse (glycyrrhizine) provoque une retention hydrosodee et une hypokaliemie, antagonisant les antihypertenseurs.',
 'Contre-indication absolue avec les antihypertenseurs. Eviter toute forme de reglisse.',
 'EMA/HMPC - Glycyrrhiza glabra 2012'),

('00000001-0000-0000-0000-000000000004', '00000002-0000-0000-0000-000000000020', 'warning',
 'La reglisse antagonise les diuretiques et aggrave l''hypokaliemie.',
 'Eviter l''association. Risque de troubles du rythme cardiaque.',
 'Monographie ESCOP 2003'),

('00000001-0000-0000-0000-000000000004', '00000002-0000-0000-0000-000000000021', 'warning',
 'La reglisse peut potentialiser les effets des corticoides (hypokaliemie, retention hydrosodee).',
 'Prudence. Surveillance du potassium sanguin.',
 'EMA/HMPC 2012'),

('00000001-0000-0000-0000-000000000004', '00000002-0000-0000-0000-000000000022', 'critical',
 'La reglisse provoque une hypokaliemie qui potentialise la toxicite de la digoxine (risque d''arythmie fatale).',
 'Contre-indication absolue. Ne jamais associer reglisse et digoxine.',
 'ANSM - Interactions medicamenteuses 2020'),

('00000001-0000-0000-0000-000000000004', '00000002-0000-0000-0000-000000000005', 'critical',
 'La reglisse est contre-indiquee en cas d''HTA (effet mineralocorticoide : retention sodique, perte potassique).',
 'Eviter completement la reglisse. Alternatives : guimauve ou mauve pour les troubles digestifs.',
 'EMA/HMPC 2012'),

('00000001-0000-0000-0000-000000000004', '00000002-0000-0000-0000-000000000001', 'critical',
 'La reglisse est contre-indiquee pendant la grossesse (risque de prematurite, effets hormonaux).',
 'Eviter toute forme de reglisse durant la grossesse.',
 'EMA/HMPC 2012'),

('00000001-0000-0000-0000-000000000004', '00000002-0000-0000-0000-000000000007', 'critical',
 'La reglisse est contre-indiquee en cas d''insuffisance renale (aggravation de la retention hydrosodee et de l''hypokaliemie).',
 'Ne pas recommander de reglisse. Alternatives selon le motif initial.',
 'Pharmacopee europeenne'),

-- Valeriane
('00000001-0000-0000-0000-000000000005', '00000002-0000-0000-0000-000000000023', 'warning',
 'La valeriane potentialise l''effet sedatif des benzodiazepines (somnolence excessive, troubles de la vigilance).',
 'Prudence. Reduire les doses ou espacer les prises. Informer le medecin traitant.',
 'Monographie EMA/HMPC 2016'),

('00000001-0000-0000-0000-000000000005', '00000002-0000-0000-0000-000000000024', 'critical',
 'La valeriane potentialise l''effet des barbituriques (risque de depression respiratoire).',
 'Contre-indication. Ne pas associer.',
 'ESCOP Monographs 2003'),

('00000001-0000-0000-0000-000000000005', '00000002-0000-0000-0000-000000000025', 'warning',
 'La valeriane potentialise l''effet de tous les sedatifs (somnolence, troubles de la vigilance).',
 'Prudence avec tout traitement sedatif. Informer le medecin.',
 'Monographie EMA/HMPC 2016'),

-- Curcuma
('00000001-0000-0000-0000-000000000006', '00000002-0000-0000-0000-000000000013', 'warning',
 'Le curcuma (curcumine) a un effet antiplaquettaire et peut augmenter le risque hemorragique avec les anticoagulants.',
 'Prudence. Informer le medecin traitant. Doses culinaires habituellement sans risque.',
 'Monographie EMA/HMPC 2017'),

('00000001-0000-0000-0000-000000000006', '00000002-0000-0000-0000-000000000016', 'warning',
 'Le curcuma potentialise l''effet des antiplaquettaires.',
 'Prudence. Doses supplementaires deconseillees sous antiplaquettaires.',
 'EMA/HMPC 2017'),

-- Ail (haute dose)
('00000001-0000-0000-0000-000000000007', '00000002-0000-0000-0000-000000000013', 'warning',
 'L''ail a haute dose (supplements) inhibe l''agregation plaquettaire et potentialise les anticoagulants.',
 'Doses culinaires habituelles sans risque. Eviter les supplements d''ail concentre sous anticoagulants.',
 'Monographie EMA/HMPC 2016'),

-- Echinacee
('00000001-0000-0000-0000-000000000008', '00000002-0000-0000-0000-000000000014', 'critical',
 'L''echinacee stimule le systeme immunitaire et est contre-indiquee avec les immunosuppresseurs.',
 'Contre-indication absolue. Ne pas recommander d''echinacee sous immunosuppresseurs.',
 'Monographie EMA/HMPC 2017'),

('00000001-0000-0000-0000-000000000008', '00000002-0000-0000-0000-000000000027', 'warning',
 'L''echinacee appartient a la famille des asteracees. Risque de reaction allergique croisee.',
 'Contre-indiquee en cas d''allergie aux asteracees (camomille, arnica, etc.).',
 'ESCOP Monographs 2003'),

-- Chardon-Marie
('00000001-0000-0000-0000-000000000009', '00000002-0000-0000-0000-000000000026', 'warning',
 'Le chardon-Marie (silymarine) inhibe le CYP3A4 et peut augmenter les concentrations de medicaments metabolises par cette voie.',
 'Prudence. Informer le medecin si le consultant prend des medicaments metabolises par le CYP3A4.',
 'Monographie EMA/HMPC 2018'),

-- Griffonia (5-HTP)
('00000001-0000-0000-0000-000000000010', '00000002-0000-0000-0000-000000000012', 'critical',
 'Association Griffonia (5-HTP) + ISRS : risque majeur de syndrome serotoninergique.',
 'Contre-indication absolue. Ne jamais associer 5-HTP et antidepresseurs serotoninergiques.',
 'Pharmacopee europeenne / ANSM'),

-- Sauge
('00000001-0000-0000-0000-000000000013', '00000002-0000-0000-0000-000000000001', 'critical',
 'La sauge est contre-indiquee pendant la grossesse (effet emmenagogue, neurotoxicite de la thuyone).',
 'Eviter toute forme de sauge pendant la grossesse.',
 'Monographie EMA/HMPC 2016'),

('00000001-0000-0000-0000-000000000013', '00000002-0000-0000-0000-000000000002', 'warning',
 'La sauge peut reduire la lactation.',
 'Deconseiller la sauge pendant l''allaitement sauf si sevrage souhaite.',
 'Monographie EMA/HMPC 2016'),

('00000001-0000-0000-0000-000000000013', '00000002-0000-0000-0000-000000000009', 'warning',
 'La sauge (thuyone) est contre-indiquee en cas d''epilepsie (risque convulsivant).',
 'Ne pas recommander de sauge. Alternatives : melisse, camomille.',
 'ESCOP Monographs 2003'),

-- Aloe vera voie orale
('00000001-0000-0000-0000-000000000014', '00000002-0000-0000-0000-000000000001', 'critical',
 'L''aloe vera par voie orale est contre-indique pendant la grossesse (effet laxatif puissant, contractions uterines).',
 'Eviter l''aloe vera par voie orale. Le gel topique reste utilisable.',
 'EMA/HMPC 2016'),

-- Reine-des-pres
('00000001-0000-0000-0000-000000000015', '00000002-0000-0000-0000-000000000007', 'warning',
 'La reine-des-pres contient des derives salicyles et est deconseille en cas d''insuffisance renale.',
 'Eviter la reine-des-pres. Alternatives anti-inflammatoires : harpagophytum, cassis.',
 'Monographie ESCOP 2003'),

('00000001-0000-0000-0000-000000000015', '00000002-0000-0000-0000-000000000013', 'warning',
 'La reine-des-pres (derives salicyles) potentialise les anticoagulants.',
 'Prudence. Informer le medecin traitant.',
 'ESCOP Monographs 2003'),

-- Ephedra
('00000001-0000-0000-0000-000000000016', '00000002-0000-0000-0000-000000000005', 'critical',
 'L''ephedra augmente significativement la pression arterielle et la frequence cardiaque.',
 'Contre-indication absolue en cas d''HTA. Substance interdite dans de nombreux pays.',
 'FDA Safety Alert / Pharmacopee europeenne'),

-- Camomille
('00000001-0000-0000-0000-000000000017', '00000002-0000-0000-0000-000000000027', 'warning',
 'La camomille appartient a la famille des asteracees. Risque de reaction allergique croisee.',
 'Eviter en cas d''allergie aux asteracees. Alternative : tilleul, verveine.',
 'ESCOP Monographs 2003'),

-- Arnica
('00000001-0000-0000-0000-000000000018', '00000002-0000-0000-0000-000000000027', 'warning',
 'L''arnica appartient a la famille des asteracees. Risque de reaction allergique croisee.',
 'Eviter en cas d''allergie aux asteracees.',
 'Monographie EMA/HMPC'),

-- Chrome
('00000001-0000-0000-0000-000000000019', '00000002-0000-0000-0000-000000000006', 'info',
 'Le chrome peut potentialiser les antidiabetiques et modifier la glycemie.',
 'Surveillance glycemique recommandee. Informer le medecin traitant.',
 'ANSES - Complements alimentaires 2019'),

-- HE Menthe poivree
('00000001-0000-0000-0000-000000000022', '00000002-0000-0000-0000-000000000003', 'critical',
 'L''huile essentielle de menthe poivree est contre-indiquee chez l''enfant de moins de 6 ans (risque de spasme larynge).',
 'Ne jamais utiliser d''HE de menthe poivree chez le jeune enfant. Alternative : hydrolat de menthe tres dilue.',
 'ANSM / Monographie EMA'),

('00000001-0000-0000-0000-000000000022', '00000002-0000-0000-0000-000000000002', 'warning',
 'L''HE de menthe poivree peut reduire la lactation.',
 'Eviter pendant l''allaitement.',
 'ESCOP Monographs'),

('00000001-0000-0000-0000-000000000022', '00000002-0000-0000-0000-000000000009', 'warning',
 'L''HE de menthe poivree est deconseille en cas d''epilepsie (menthol potentiellement convulsivant).',
 'Ne pas utiliser. Alternative : HE de lavande fine.',
 'ANSM'),

-- HE Eucalyptus
('00000001-0000-0000-0000-000000000023', '00000002-0000-0000-0000-000000000003', 'critical',
 'L''huile essentielle d''eucalyptus est contre-indiquee chez l''enfant de moins de 6 ans (risque respiratoire grave).',
 'Ne jamais appliquer d''HE d''eucalyptus chez le jeune enfant.',
 'ANSM / Centre antipoison'),

('00000001-0000-0000-0000-000000000023', '00000002-0000-0000-0000-000000000009', 'warning',
 'L''HE d''eucalyptus est deconseille en cas d''epilepsie.',
 'Prudence. Alternative : inhalation d''hydrolat.',
 'ANSM'),

-- HE Romarin
('00000001-0000-0000-0000-000000000024', '00000002-0000-0000-0000-000000000001', 'critical',
 'L''HE de romarin est contre-indiquee pendant la grossesse (abortif potentiel, neurotoxique).',
 'Eviter toutes les HE de romarin pendant la grossesse.',
 'Monographie ESCOP / ANSM'),

('00000001-0000-0000-0000-000000000024', '00000002-0000-0000-0000-000000000009', 'critical',
 'L''HE de romarin a camphre est contre-indiquee en cas d''epilepsie (camphre = convulsivant).',
 'Ne pas utiliser. Alternative : HE de lavande fine.',
 'ANSM'),

-- HE Sauge
('00000001-0000-0000-0000-000000000025', '00000002-0000-0000-0000-000000000001', 'critical',
 'L''HE de sauge est contre-indiquee pendant la grossesse (thuyone neurotoxique et abortive).',
 'Contre-indication absolue. Ne jamais utiliser pendant la grossesse.',
 'ANSM / Pharmacopee europeenne'),

('00000001-0000-0000-0000-000000000025', '00000002-0000-0000-0000-000000000009', 'critical',
 'L''HE de sauge est contre-indiquee en cas d''epilepsie (thuyone convulsivante).',
 'Contre-indication absolue.',
 'ANSM'),

-- Vitamine K
('00000001-0000-0000-0000-000000000021', '00000002-0000-0000-0000-000000000013', 'critical',
 'La vitamine K antagonise les anticoagulants antivitamine K (AVK), reduisant leur efficacite.',
 'Contre-indication absolue avec les AVK. Informer le medecin traitant.',
 'ANSM / Vidal')
ON CONFLICT (substance_id, condition_id) DO NOTHING;

-- ========================
-- INTERACTIONS PLANTE × PLANTE
-- ========================

-- Note: substance_a_id must be < substance_b_id (CHECK constraint)

INSERT INTO public.substance_interactions (substance_a_id, substance_b_id, severity, message_fr, recommendation_fr, source) VALUES
-- Millepertuis + Griffonia (5-HTP)
('00000001-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000010', 'critical',
 'Association millepertuis + Griffonia (5-HTP) : risque majeur de syndrome serotoninergique (agitation, confusion, tachycardie, hyperthermie).',
 'Ne jamais associer ces deux plantes. Choisir l''une ou l''autre selon le profil du consultant.',
 'Pharmacopee europeenne / ANSM'),

-- Valeriane + Passiflore (potentialisation sedative)
('00000001-0000-0000-0000-000000000005', '00000001-0000-0000-0000-000000000011', 'warning',
 'Association valeriane + passiflore : potentialisation de l''effet sedatif. Risque de somnolence excessive.',
 'Reduire les doses de chacune si association souhaitee. Deconseiller la conduite apres la prise.',
 'Monographies EMA/HMPC'),

-- Valeriane + Houblon (potentialisation sedative)
('00000001-0000-0000-0000-000000000005', '00000001-0000-0000-0000-000000000012', 'warning',
 'Association valeriane + houblon : potentialisation sedative. Combinaison traditionnelle mais a doser avec prudence.',
 'Doses moderees. Eviter l''ajout d''un troisieme sedatif.',
 'ESCOP / EMA traditional use'),

-- Ginkgo + Ail (risque hemorragique cumule)
('00000001-0000-0000-0000-000000000002', '00000001-0000-0000-0000-000000000007', 'warning',
 'Association ginkgo + ail a haute dose : risque hemorragique cumule (double inhibition plaquettaire).',
 'Eviter cette association en complement alimentaire. Informer le medecin si le consultant est sous anticoagulant.',
 'Monographies EMA/HMPC'),

-- Curcuma + Ail (potentialisation antiplaquettaire)
('00000001-0000-0000-0000-000000000006', '00000001-0000-0000-0000-000000000007', 'info',
 'Association curcuma + ail a haute dose : potentialisation de l''effet antiplaquettaire.',
 'Prudence en cas de traitement anticoagulant concomitant. Doses culinaires sans risque notable.',
 'Revue de litterature phytotherapie'),

-- Ginkgo + Curcuma (risque hemorragique)
('00000001-0000-0000-0000-000000000002', '00000001-0000-0000-0000-000000000006', 'warning',
 'Association ginkgo + curcuma : potentialisation du risque hemorragique.',
 'Eviter si le consultant prend des anticoagulants. Surveiller les signes de saignement.',
 'Monographies EMA/HMPC')
ON CONFLICT DO NOTHING;
