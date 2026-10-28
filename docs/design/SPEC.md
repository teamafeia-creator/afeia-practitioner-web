# AFEIA — Spécification issue du canevas Design (octobre 2026)

Source visuelle : `docs/design/canvas/*.dc.html` (copie exacte du canevas « AFEIA — Espace praticien »).
Chaque fichier contient le balisage final (textes, couleurs, tailles) et, dans son `<script>`, la logique d'interaction et des données d'exemple. Les données d'exemple ne doivent jamais être codées en dur : tout vient de Supabase.

Ce document liste **toutes** les décisions prises pendant les revues du canevas, y compris celles qui ne se voient pas à l'écran (back-end, règles métier). Il remplace le document de prompts du 25 octobre, incomplet.

## 0. Règles transverses

- Thème sombre existant (tokens de `tailwind.config.ts`) : fond `#0A0E14`, surface `#151A23`, surface relevée `#1C2230`, bordure `#2A3140`, menthe `#6DD4B8`, teinte menthe `#23383B`, terracotta `#E8A87C` (teinte `#373131`), bleu `#7B93DB` (teinte `#1F2640`), rose `#E8A5C6`, texte `#E8EDF4`, texte secondaire `#8B95A5`. Avertissement jaune : fond `#332D17`, bordure `#5C4F1E`, texte `#F5E3A8`, icône `#F2C94C`.
- Inter pour le texte, Source Serif 4 pour les titres et grands chiffres.
- Vocabulaire :
  - « praticien » partout, jamais « naturopathe » (féminin « praticienne » quand on parle d'une femme nommée) ; « École de naturopathie » reste un nom d'école.
  - « objet connecté », jamais « bague ».
  - « dossier de santé », jamais « dossier médical » ni « diagnostic ».
  - pas de numéro ADELI.
- Garde-fous non médicaux :
  - Messages : bandeau « Question sur un médicament » purement informatif, **sans réponse type ni conseil** (« C'est au médecin de juger de la compatibilité entre un traitement et vos recommandations : ne donnez pas d'avis sur ce médicament. »).
  - Traitements déclarés : petit avertissement jaune « {prénom} doit toujours vérifier avec son médecin que vos recommandations sont compatibles avec sa situation. »
  - Conseillancier : une contre-indication bloque le partage tant qu'elle n'est pas traitée.
- Boutons d'action jamais grisés « muets » sur un formulaire : au clic, on explique ce qui manque (encadré récapitulatif + message sous chaque champ).

## 1. Accès et inscription (écrans 1 à 5)

- **Connexion** (`Connexion.dc.html`) : deux colonnes ; pas de lien « Accès Admin », pas de « Mode démo » ; « Connectez-vous à votre espace praticien. » ; œil afficher/masquer ; « Pas encore de compte ? Créer un compte · Découvrir Afeia » ; pied « © Afeia · Confidentialité ».
- **Découvrir Afeia** (`Essai.dc.html`, route publique `/decouvrir`) : pastille « Pour les praticiens », vidéo de présentation (URL `NEXT_PUBLIC_PRESENTATION_VIDEO_URL`, chapitres cliquables), 4 aperçus non cliquables badgés « Aperçu · données fictives », CTA « Créer mon compte ».
- **Inscription en 3 étapes** (`Inscription.dc.html`, prop `startStep`) :
  1. Prénom, Nom, « E-mail » (pas « professionnel »), mot de passe avec œil + 5 règles en direct (12 caractères, majuscule, minuscule, chiffre, caractère spécial), confirmation avec œil et message de correspondance.
  2. « Formation & SIRET » : école, année, SIRET (14 chiffres), ville, justificatif de formation, **pièce d'identité** (recto/verso, mention de suppression après décision), case charte non médicale.
  3. « Demande envoyée » (validation sous 48 h ouvrées).
- Statut de compte : `pending_validation | validated | info_requested | rejected` ; non validé = pas d'accès à `(app)`.

## 2. Validation par l'équipe Afeia (écrans 6, 7, 7 bis)

- **E-mail admin** (`EmailAdmin.dc.html`) : récapitulatif (Activité « Praticienne · ville »), SIRET + résultat Pappers, documents, ligne « Contrôles automatiques », bouton « Examiner la demande ». Aucun document en pièce jointe.
- **Admin — inscriptions** (`AdminValidation.dc.html`) :
  - SIRET vérifié automatiquement via l'API Pappers (`PAPPERS_API_KEY`, serveur uniquement) : conforme / à vérifier (dirigeant différent) / non conforme (fermé, introuvable).
  - Concordance automatique certificat ↔ pièce d'identité ↔ déclaratif (OCR derrière une interface `DocumentExtractor`).
  - Les contrôles automatiques réussis cochent et verrouillent la case correspondante ; « Justificatif lisible et authentique » reste manuel.
  - Valider / Demander un complément / Refuser (motif obligatoire), annulable ; la pièce d'identité est supprimée après décision.
  - Entrée « Questionnaire » dans la navigation admin.
- **Admin — questionnaire préliminaire** (`AdminQuestionnaire.dc.html`) : un seul questionnaire pour tous les praticiens, versionné.
  - Rubriques : réordonner, masquer, ajouter, titre + phrase d'introduction.
  - Questions : libellé, type (texte libre / choix unique / choix multiples), réponses proposées, exemple dans la case, aide sous la question, obligatoire, avertissement « voir avec son médecin », réordonner, ajouter, retirer (les réponses existantes restent dans les dossiers).
  - Brouillon puis « Publier la version N » ; un questionnaire commencé garde sa version.
  - Aperçu consultant en direct.
  - Back-end : tables `questionnaire_versions`, `questionnaire_sections`, `questionnaire_questions` remplacent `ANAMNESIS_SECTIONS` en dur.

## 3. Quotidien du praticien (écrans 8 à 11, 20, 21)

- **Navigation** (`Sidebar.dc.html`) : Suivi (Tableau de bord, Revue du matin avec soleil + badge, Consultants, Agenda) ; Outils (Messages + badge, Questionnaires + badge en attente, Bibliothèque) ; Gestion (Facturation, Statistiques). Pied : « Praticienne ».
- **Tableau de bord** (`Main.dc.html`) : en-tête ; carte d'introduction simple à la revue du matin (soleil, une phrase, avatars, « Commencer · ~6 min ») ; colonnes Aujourd'hui / À faire ; statistiques en bas : grille 3 × 2, slider de catégories (Activité / Accompagnement / Bien-être des consultants), sélecteur de période, pastilles d'évolution et sparklines.
- **Revue du matin** (`RevueMatin.dc.html`) :
  - ancienneté par cas (« Nouveau ce matin » / « Depuis N jours · reporté N fois », terracotta dès 2 reports), tri plus anciens d'abord ;
  - source exacte du contexte (« Avis sur le conseillancier · … » vs « Journal : … ») ;
  - 4 boutons de même taille en grille : « Écrire à … », « 🔒 Ajouter aux notes privées », « 🔔 Me le rappeler demain », « ✓ Vu, rien à faire » (vrai bouton) ;
  - « Traités ce matin » avec « Dossier ↗ », « Annuler », « Tout remettre » ;
  - vue d'ensemble 7 jours : **3 indicateurs seulement** — consultants silencieux depuis 14 j, journaux remplis, recommandations suivies (pas de séances à venir, pas de sommeil moyen).
- **Agenda** (`Agenda.dc.html`, interactif) :
  - vues Jour / Semaine / Liste, navigation, détail d'une séance (ouvrir le dossier, lancer la visio, décaler, annuler) ;
  - « Nouvelle séance » : type choisi dans `consultation_types` (couleur, durée, tarif, battement) ; « + Ajouter un type de séance » ; lieu « Au cabinet / En visio » choisi **à chaque séance** (`appointments.location_type`) ; détection de chevauchement avec battement ;
  - **Liste d'attente** repliable (ouverte par défaut, compteur visible repliée) alimentée par `waitlist_entries` (formulaire public) : prénom, e-mail, type souhaité, préférences (« Mardi, Jeudi · après-midi »), « Inscription il y a N j · expire dans N j », pastille « Prévenu·e », actions « Proposer un créneau » et « Retirer » ; note : les 3 premières personnes compatibles sont prévenues quand un créneau se libère ;
  - encart **Types de séance** repliable aussi, avec « Gérer » et « + Ajouter un type de séance » (modale, composant partagé `ConsultationTypeForm`).
  - Le type par défaut « Consultation visio » n'a plus lieu d'être (la visio est un lieu, pas un type).
- **Messages** (`Messages.dc.html`) : bulles lisibles, bandeau médicament informatif sans réponse type.
- **Questionnaires préliminaires** (`Questionnaires.dc.html`, écran 11 bis) :
  - lien personnel affiché + « Copier mon lien » (`/questionnaire/[slug]`, praticien présélectionné) ;
  - onglets avec compteurs, recherche ; liste + détail ;
  - bandeau doublon si l'e-mail correspond à un consultant existant (« Associer à … ») ;
  - actions Créer le dossier / Associer / Archiver / Remettre en attente, avec annulation ;
  - avertissement jaune sur les traitements déclarés ;
  - « Réponses » : barre de 13 segments + « Non remplies : … » (pas de pastilles) ;
  - une fois associé : « 🔒 Écrire ma conclusion » = raccourci vers l'onglet Notes privées **existant** du dossier ;
  - le code OTP n'est plus affiché dans le toast ;
  - **bug à corriger** : `linkQuestionnaireToExistingConsultant` écrase les champs déjà remplis ; ne compléter que les champs vides et historiser.
- **Facturation** (`Facturation.dc.html`, écrans 20 à 20d) : KPI (encaissé du mois, de l'année, en attente, panier moyen) ; bandeau « N séances terminées sans facture → Facturer » ; rappel URSSAF du trimestre ; filtres par statut + recherche ; tableau ; export CSV / PDF ; détail avec aperçu papier (« TVA non applicable, article 293 B du CGI ») ; actions marquer payée (moyen de paiement), lien de paiement, PDF, envoi, rembourser (avoir, motif), annuler ; historique ; nouvelle facture depuis une séance ou libre.
- **Statistiques** (`Statistiques.dc.html`) : période (mois, trimestre, année, 12 mois) ; Activité (séances, nouveaux, actifs, fidélisation) + séances par semaine ; Financier (CA 12 mois, CA période, rappel URSSAF) ; Accompagnement (motifs, conseillanciers créés / partagés, journaux remplis, recommandations suivies).

## 4. Consultants et dossier (écrans 12 à 18)

- **Liste** (`Consultants.dc.html`) : un seul panneau de filtres — recherche « Nom, e-mail ou téléphone » (téléphone normalisé, +33 = 0, dès 2 chiffres ; **pas de recherche par ville**), Offre, Dernière séance, Prochain RDV, « À relancer » ; **pas de filtre objet connecté** (Premium = objet connecté) ; encart « Invitations en attente » repliable sous les filtres, page 1 uniquement ; tableau triable ; pagination 8/page ; bouton « Relancer » (> 30 j sans séance et aucun RDV) qui ouvre une modale (canal, message prérempli, lien de réservation, toast, « ✓ Relancé aujourd'hui »).
- **Dossier** : `DossierHeader` + `DossierNav` (déjà en place) ; Synthèse, Anamnèse (points clés, sections repliables), Bilan de terrain, Conseillancier (blocs, avis consultant sous chaque bloc, contre-indications bloquantes, aperçu téléphone), Objet connecté & cycle (Premium) / version Standard.

## 5. Bibliothèque (écrans 19 à 19j)

- Trois onglets : **Fiches éducatives**, **Blocs conseillancier**, **Ressources**.
- Fiches : AFEIA + praticien, filtres origine / favoris / thèmes ; lecture (avertissement médical, « Déjà envoyée à » avec lu / pas lu) ; envoi à plusieurs consultants avec petit mot ; créer / modifier (article avec barre d'outils et aperçu, PDF, image, vidéo ; temps de lecture calculé ; aperçu téléphone) ; « Dupliquer pour l'adapter » pour une fiche AFEIA ; **le praticien peut ajouter un thème** (« + Ajouter un thème »).
- Blocs : **uniquement ceux écrits par le praticien** (plus de blocs AFEIA ni de filtre d'origine) ; modale créer / modifier : titre, section, contenu, **motifs en liste déroulante à choix multiples avec « Ajouter un motif »**, mots-clés.
- Ressources (pour le praticien) : alimentées par l'équipe Afeia ou par des praticiens ; filtres Tout / AFEIA / Praticiens / Mes ressources + thèmes ; « Proposer une ressource » (titre, format lien / PDF / vidéo / modèle, fichier ou lien, thème, description, « Partager avec tous les praticiens » ⇒ relecture par l'équipe, étiquette « En relecture »).

## 6. Côté consultant (étapes F et G)

- **Questionnaire préliminaire** (`QuestionnairePublic.dc.html`, `/questionnaire/[slug]`) :
  - pas de liste « Votre naturopathe » : le lien personnel désigne le praticien ;
  - en-tête sans « Afeia » ; vrai logo `public/afeia_symbol_white.svg` en filigrane (opacité ~3,5 %) ;
  - coordonnées : prénom, nom, e-mail, **téléphone obligatoire** (10 chiffres) ;
  - 13 rubriques avec sommaire, progression, « Passer » ; rubrique 10 « **Cycle** », rubrique 11 « **Pour les hommes** » ; pas d'encadré « ne vous concerne pas » ;
  - en haut de chaque rubrique : « Les questions sont facultatives, mais plus vos réponses sont précises, mieux {praticien} pourra préparer votre séance. » ;
  - **chaque case aura un exemple ou une indication** pour la remplir (exemple dans la case + aide permanente sous le libellé) ;
  - avertissement jaune sous « Traitements » ;
  - vérification avec extraits et « Modifier / Compléter », consentement données de santé obligatoire ; page « Envoyé » avec « Réserver une séance » ; brouillon local.
- **Prise de rendez-vous** (`RendezVous.dc.html`, `/rdv/[slug]`) :
  - types de séance (Première consultation, Suivi, atelier de groupe) ; **chaque type est disponible au cabinet ou en visio** : choix du lieu à l'étape date ;
  - calendrier, créneaux matin / après-midi / soir ; liste d'attente (moment préféré, jours) ; état « plus aucun créneau » ; séances de groupe avec places restantes ;
  - coordonnées (téléphone obligatoire), **acompte obligatoire payé par carte (Stripe)**, solde après la séance (cabinet, virement ou lien) ; acompte remboursé si annulation > 24 h, conservé sinon ; acompte par défaut 30 % (réglage par praticien et par type) ;
  - **messages d'erreur explicites** : encadré « Pour confirmer, il reste à : » + message sous chaque champ ;
  - confirmation (cabinet / visio), ajout à l'agenda, lien vers le questionnaire préliminaire.

## 7. Suivi de l'implémentation (branche `design/canvas-afeia`)

| Lot | Contenu | État |
|---|---|---|
| 1 | Connexion, page Découvrir, navigation, vocabulaire « praticien » | fait |
| 2 | Tableau de bord, revue du matin (actions consignées, notes privées en ajout) | fait |
| 3 | Agenda : grille Jour / Semaine / Liste, séance sélectionnée, liste d'attente, types de séance, lieu par séance | fait |
| 6 | Bibliothèque : fiches (thèmes libres, favoris, envoi groupé avec petit mot, lu / pas lu, dupliquer, éditeur avec aperçu téléphone), blocs du praticien (motifs libres), ressources praticiens (proposition, relecture) | fait |
| 7 | Facturation (KPI, séances sans facture, rappel URSSAF, onglets, tableau, export, détail papier, paiement / lien / avoir / annulation, nouvelle facture) et statistiques (périodes, comparaison, séances par semaine, CA 12 mois, motifs, accompagnement) | fait |
| 8 | Questionnaire public `/questionnaire/[slug]` et prise de rendez-vous `/rdv/[slug]` (lieu, acompte Stripe, erreurs explicites, annulation par lien) | fait |
| 4 | Messages (bandeau médicament informatif), questionnaires préliminaires (liste + détail, doublon, conclusion), correction de la fusion d'anamnèse | fait |

Choix faits en attendant une décision :
- le type « Consultation visio » n'est plus créé pour les nouveaux comptes ; les types existants des praticiens ne sont **pas** modifiés ;
- « Proposer un créneau » (liste d'attente) crée la séance (rattachée au dossier si l'e-mail correspond, sinon au nom / e-mail de la personne) puis retire la personne de la liste ;
- « Décaler » ouvre le formulaire de report (le design proposait « Décaler d'1 h ») ; « Annuler la séance » demande une confirmation et prévient la liste d'attente ;
- le bandeau « Question sur un médicament » s'affiche quand un message du consultant resté sans réponse cite un médicament ou un traitement (liste de mots dans `lib/messages/medication.ts`) ;
- « Annuler » après création ou association d'un questionnaire n'est pas proposé (l'anamnèse a déjà été complétée) ; il l'est après un archivage ;
- ressources praticiens : table `practitioner_resources` (privée, en relecture, publiée, refusée) ; l'écran admin de relecture reste à faire (question ouverte) — en attendant, la publication se fait en base (`review_status = 'published'`) ;
- thème libre d'une fiche : `category = 'general'` + `theme_label` ; motifs libres d'un bloc : `blocks.custom_motifs` ;
- facturation : une facture peut désormais être liée à une séance de l'agenda (`consultation_invoices.appointment_id`) ; « séances terminées sans facture » = séances marquées terminées depuis 30 jours sans facture liée ;
- rappel URSSAF : encaissements du trimestre civil en cours, date limite de la déclaration trimestrielle (micro-entreprise) ;
- acompte : saisi sur la page de paiement sécurisée Stripe (Checkout, compte Connect du praticien) au lieu de champs carte dans la page ; le créneau est tenu 30 min, libéré si le paiement est abandonné ou expiré ; confirmation et e-mails envoyés une fois l'acompte payé ;
- sans compte Stripe actif, la réservation est confirmée sans paiement en ligne (bandeau dans Paramètres › Réservation) ;
- séances de groupe : pas d'acompte en ligne pour l'instant ;
- annulation par le consultant : lien personnel dans l'e-mail (`/rdv/annuler/{jeton}`), remboursement si au-delà du délai d'annulation du praticien (24 h par défaut), acompte conservé sinon ; annulation par le praticien dans l'agenda = remboursement ;
- l'ancien questionnaire `/questionnaire` (avec liste de praticiens) reste en place pour les liens déjà diffusés ;
- l'ancienneté d'un consultant dans la revue du matin est mémorisée par navigateur ; le nombre de reports vient des actions enregistrées.
