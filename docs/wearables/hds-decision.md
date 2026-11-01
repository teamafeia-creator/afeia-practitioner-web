# Décision HDS : données d'objet connecté

> **Statut : [À DÉCIDER] — non validée.**
> `WEARABLES_ENABLED_FOR=all` ne doit **pas** être activé en Production tant que cette fiche
> n'est pas complétée et signée (section 5). D'ici là, la fonctionnalité reste en
> `WEARABLES_ENABLED_FOR=internal`, limitée aux comptes de l'équipe (`WEARABLES_INTERNAL_EMAILS`).

## 1. Données concernées

Reçues de Polar (AccessLink) et stockées par Afeia (Supabase) :

- sommeil : horaires, durée, phases, score ;
- récupération nocturne : VFC (RMSSD), FC moyenne de la nuit, respiration ;
- FC continue au cours de la journée (échantillons de 5 min) ;
- activité : pas, temps actif, calories, distance.

Ces données sont rattachées à une personne identifiée (fiche consultant) et consultées par son
praticien. Tables concernées : `wearable_raw`, `sleep_sessions`, `hrv_nightly`, `hr_samples`,
`daily_activity`, `wearable_events`. Le jeton d'accès est chiffré dans Supabase Vault.

## 2. Question à trancher

Ces données constituent-elles des **données de santé à caractère personnel** au sens de l'article
L.1111-8 du Code de la santé publique, dont l'hébergement impose un **hébergeur certifié HDS** ?

[À DÉCIDER : qualification retenue, avec la justification juridique (avis DPO ou conseil)]

## 3. Options

| Option | Conséquences | Statut |
|---|---|---|
| A. Données de santé → hébergement HDS | Hébergement de la base (et des sauvegardes) chez un hébergeur certifié HDS ; contrats ; mise à jour du registre et de l'AIPD | [À DÉCIDER] |
| B. Données de bien-être, hors HDS | Justification écrite (nature des données, finalité d'accompagnement, absence de diagnostic) ; risque à évaluer | [À DÉCIDER] |
| C. Restreindre les données collectées | Ne collecter que ce qui reste hors périmètre santé (à définir), adapter le texte de consentement | [À DÉCIDER] |

## 4. Points liés à vérifier avant l'ouverture

- [ ] Localisation et certification de l'hébergement Supabase (base, sauvegardes, Vault) [À VALIDER]
- [ ] Sous-traitants à déclarer (Supabase, Vercel, Polar) et clauses contractuelles [À VALIDER]
- [ ] AIPD (analyse d'impact) nécessaire ? [À DÉCIDER]
- [ ] Registre des traitements mis à jour [À VALIDER]
- [ ] Texte de consentement `content/consents/wearables-v1.md` relu, marqueurs [À DÉCIDER] / [À VALIDER] résolus
- [ ] Durée de conservation fixée et mise en œuvre (purge) [À DÉCIDER]
- [ ] Procédure d'exercice des droits (accès, suppression) [À VALIDER]

## 5. Validation

| Rôle | Nom | Décision | Date |
|---|---|---|---|
| Responsable produit | [À DÉCIDER] | | |
| DPO / conseil juridique | [À DÉCIDER] | | |

Une fois signée : changer le statut en tête de fiche, publier la version définitive du texte de
consentement (nouvelle version si le sens change), puis passer `WEARABLES_ENABLED_FOR=all` dans
Vercel (Production). Aucun changement de code n'est nécessaire.
