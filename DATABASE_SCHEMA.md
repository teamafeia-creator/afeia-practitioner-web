# Documentation Base de Donnees AFEIA

> **Document de reference du schema de base de donnees**
>
> **Derniere mise a jour :** 2026-02-07
>
> **Version du schema :** 1.0.0
>
> **Ce document doit etre mis a jour a chaque modification du schema de base de donnees.**

---

## Table des matieres

1. [Vue d'ensemble du systeme](#1-vue-densemble-du-systeme)
2. [Tableau recapitulatif des tables](#2-tableau-recapitulatif-des-tables)
3. [Gestion des utilisateurs](#3-gestion-des-utilisateurs)
   - [practitioners](#practitioners)
   - [practitioners_public](#practitioners_public)
   - [consultants](#consultants)
   - [consultants_identity](#consultants_identity)
   - [users](#users)
   - [patient_profiles](#patient_profiles)
   - [admin_allowlist](#admin_allowlist)
   - [otp_codes](#otp_codes)
4. [Invitations et onboarding](#4-invitations-et-onboarding)
   - [consultant_invitations](#consultant_invitations)
   - [consultant_invites](#consultant_invites)
   - [consultant_memberships](#consultant_memberships)
5. [Anamnese et questionnaires](#5-anamnese-et-questionnaires)
   - [consultant_anamnesis](#consultant_anamnesis)
   - [anamneses](#anamneses)
   - [anamnese_instances](#anamnese_instances)
   - [anamnesis](#anamnesis)
   - [anamnesis_history](#anamnesis_history)
   - [preliminary_questionnaires](#preliminary_questionnaires)
   - [consultant_questionnaire_codes](#consultant_questionnaire_codes)
6. [Dossiers et consultations](#6-dossiers-et-consultations)
   - [case_files](#case_files)
   - [consultations](#consultations)
   - [consultation_notes](#consultation_notes)
   - [appointments](#appointments)
   - [practitioner_notes](#practitioner_notes)
   - [consultant_analysis_results](#consultant_analysis_results)
7. [Sante des consultants](#7-sante-des-consultants)
   - [consultants_health](#consultants_health)
8. [Conseillanciers (Plans de soins)](#8-plans-de-soins)
   - [plans](#plans)
   - [plan_versions](#plan_versions)
   - [plan_sections](#plan_sections)
   - [consultant_plans](#consultant_plans)
   - [care_plans](#care_plans)
   - [recommendations](#recommendations)
9. [Supplements et prescriptions](#9-supplements-et-prescriptions)
   - [complements](#complements)
   - [complement_tracking](#complement_tracking)
   - [supplement_items](#supplement_items)
   - [prescription_items](#prescription_items)
10. [Journaux et suivi quotidien](#10-journaux-et-suivi-quotidien)
    - [journal_entries](#journal_entries)
    - [daily_journals](#daily_journals)
    - [daily_logs](#daily_logs)
    - [journal](#journal)
11. [Communication](#11-communication)
    - [messages](#messages)
    - [notifications](#notifications)
12. [Donnees wearables (Circular)](#12-donnees-wearables-circular)
    - [wearable_data](#wearable_data)
    - [wearable_summaries](#wearable_summaries)
    - [wearable_insights](#wearable_insights)
13. [Facturation et abonnements](#13-facturation-et-abonnements)
    - [subscription_plans](#subscription_plans)
    - [subscriptions](#subscriptions)
    - [stripe_subscriptions](#stripe_subscriptions)
    - [invoices](#invoices)
    - [payment_methods](#payment_methods)
    - [billing_history](#billing_history)
14. [Contenu](#14-contenu)
    - [articles](#articles)
15. [Diagramme relationnel](#15-diagramme-relationnel)
16. [Notes importantes](#16-notes-importantes)

---

## 1. Vue d'ensemble du systeme

AFEIA est une plateforme de naturopathie reliant des **praticiens** (naturopathes) a leurs **consultants** (patients). L'architecture de la base de donnees repose sur **Supabase** (PostgreSQL) avec Row-Level Security (RLS).

**Architecture generale :**

- **Authentification** : geree par `auth.users` de Supabase. Les praticiens ont un compte Auth ; les consultants peuvent etre actives via OTP.
- **Praticiens** (`practitioners`) : professionnels de sante utilisant la plateforme web.
- **Consultants** (`consultants`) : patients suivis par un praticien, avec acces optionnel via app mobile.
- **Dossiers** (`case_files`) : dossiers de suivi liant un consultant a un praticien.
- **Plans de soins** : systeme versionnee (`plans` > `plan_versions` > `plan_sections`).
- **Wearables** : integration avec Circular pour le suivi de sante connecte.
- **Facturation** : integration Stripe pour les abonnements des praticiens.

**Nombre total de tables : 47**

---

## 2. Tableau recapitulatif des tables

| Domaine | Table | Role principal |
|---------|-------|----------------|
| Utilisateurs | `practitioners` | Comptes des praticiens (naturopathes) |
| Utilisateurs | `practitioners_public` | Vue publique des praticiens (admin) |
| Utilisateurs | `consultants` | Fiches des consultants (patients) |
| Utilisateurs | `consultants_identity` | Identite des consultants (vue admin) |
| Utilisateurs | `users` | Comptes utilisateurs (app mobile) |
| Utilisateurs | `patient_profiles` | Profils patients (app mobile) |
| Utilisateurs | `admin_allowlist` | Liste blanche des emails admin |
| Utilisateurs | `otp_codes` | Codes OTP pour activation/connexion |
| Invitations | `consultant_invitations` | Invitations de consultants par praticien |
| Invitations | `consultant_invites` | Invitations legacy (token-based) |
| Invitations | `consultant_memberships` | Liens consultant-compte utilisateur |
| Anamnese | `consultant_anamnesis` | Anamnese principale des consultants |
| Anamnese | `anamneses` | Anamnese detaillee (variante avec champs) |
| Anamnese | `anamnese_instances` | Instances de questionnaire d'anamnese |
| Anamnese | `anamnesis` | Anamnese legacy (ancienne implementation) |
| Anamnese | `anamnesis_history` | Historique des modifications d'anamnese |
| Anamnese | `preliminary_questionnaires` | Questionnaires preliminaires publics |
| Anamnese | `consultant_questionnaire_codes` | Codes d'acces aux questionnaires |
| Dossiers | `case_files` | Dossiers de suivi par consultant |
| Dossiers | `consultations` | Enregistrement des consultations |
| Dossiers | `consultation_notes` | Notes detaillees de consultation |
| Dossiers | `appointments` | Rendez-vous praticien/consultant |
| Dossiers | `practitioner_notes` | Notes du praticien sur un consultant |
| Dossiers | `consultant_analysis_results` | Resultats d'analyses medicales |
| Sante | `consultants_health` | Donnees de sante des consultants |
| Plans | `plans` | Plans de soins (racine) |
| Plans | `plan_versions` | Versions des plans de soins |
| Plans | `plan_sections` | Sections dans une version de plan |
| Plans | `consultant_plans` | Plans assignes aux consultants |
| Plans | `care_plans` | Plans de soins alternatifs (avec contenu JSON) |
| Plans | `recommendations` | Recommandations individuelles |
| Supplements | `complements` | Supplements prescrits |
| Supplements | `complement_tracking` | Suivi de prise des supplements |
| Supplements | `supplement_items` | Items de supplementation dans un plan |
| Supplements | `prescription_items` | Items de prescription |
| Journaux | `journal_entries` | Entrees de journal quotidien |
| Journaux | `daily_journals` | Journaux quotidiens detailles |
| Journaux | `daily_logs` | Logs quotidiens simplifies |
| Journaux | `journal` | Journal legacy |
| Communication | `messages` | Messages consultant/praticien |
| Communication | `notifications` | Notifications pour les praticiens |
| Wearables | `wearable_data` | Donnees brutes des wearables |
| Wearables | `wearable_summaries` | Resumes quotidiens des wearables |
| Wearables | `wearable_insights` | Insights generes depuis les wearables |
| Facturation | `subscription_plans` | Plans d'abonnement disponibles |
| Facturation | `subscriptions` | Abonnements actifs des praticiens |
| Facturation | `stripe_subscriptions` | Abonnements Stripe (synchronisation) |
| Facturation | `invoices` | Factures |
| Facturation | `payment_methods` | Moyens de paiement |
| Facturation | `billing_history` | Historique de facturation |
| Contenu | `articles` | Articles de blog/contenu |

---

## 3. Gestion des utilisateurs

### practitioners

**Role :** Table principale des praticiens (naturopathes). Liee directement a `auth.users` de Supabase.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | uuid | PK, FK -> auth.users(id) | Identifiant = auth user ID |
| `email` | text | NOT NULL, UNIQUE | Email du praticien |
| `full_name` | text | NOT NULL | Nom complet |
| `default_consultation_reason` | text | | Motif de consultation par defaut |
| `calendly_url` | text | | URL Calendly pour prise de RDV |
| `phone` | text | | Numero de telephone |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Date de creation |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() | Derniere modification |

**Relations :** Referencee par `consultants`, `appointments`, `care_plans`, `consultant_plans`, `notifications`, `subscriptions`, `invoices`, `payment_methods`, `billing_history`, `consultant_invitations`, `practitioner_notes`, `consultant_analysis_results`, `consultant_anamnesis`, `preliminary_questionnaires`, `otp_codes`.

---

### practitioners_public

**Role :** Vue publique/admin des praticiens avec statut d'abonnement. Utilisee pour l'interface admin.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | uuid | PK, FK -> auth.users(id) | Identifiant = auth user ID |
| `email` | text | | Email |
| `full_name` | text | | Nom complet |
| `status` | text | NOT NULL, DEFAULT 'active', CHECK | Statut du praticien |
| `calendly_url` | text | | URL Calendly |
| `subscription_status` | text | CHECK | Statut d'abonnement |
| `created_at` | timestamptz | DEFAULT now() | Date de creation |
| `updated_at` | timestamptz | DEFAULT now() | Derniere modification |

**CHECK constraints :**
```sql
status IN ('active', 'suspended')
subscription_status IN ('active', 'past_due', 'canceled') -- ou NULL
```

**Relations :** Referencee par `consultants_identity`, `stripe_subscriptions`.

---

### consultants

**Role :** Table principale des consultants (patients). Chaque consultant est lie a un praticien.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | Identifiant unique |
| `practitioner_id` | uuid | NOT NULL, FK -> practitioners(id) | Praticien referent |
| `email` | text | | Email du consultant |
| `name` | text | NOT NULL | Nom (champ historique) |
| `full_name` | text | | Nom complet |
| `first_name` | text | | Prenom |
| `last_name` | text | | Nom de famille |
| `phone` | text | | Telephone |
| `city` | text | | Ville |
| `age` | integer | | Age |
| `date_of_birth` | date | | Date de naissance |
| `consultation_reason` | text | | Motif de consultation |
| `status` | text | DEFAULT 'standard', CHECK | Statut (standard/premium) |
| `is_premium` | boolean | DEFAULT false | Flag premium |
| `activated` | boolean | DEFAULT false | Compte active (app mobile) |
| `activated_at` | timestamptz | | Date d'activation |
| `deleted_at` | timestamptz | | Date de suppression (soft delete) |
| `circular_enabled` | boolean | DEFAULT false | Integration Circular activee |
| `last_circular_sync_at` | timestamptz | | Derniere synchronisation Circular |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Date de creation |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() | Derniere modification |

**CHECK constraints :**
```sql
status IN ('standard', 'premium')
```

**Relations :** Referencee par la majorite des tables : `anamneses`, `anamnese_instances`, `appointments`, `case_files`, `consultations`, `journal_entries`, `messages`, `notifications`, `wearable_data`, `wearable_summaries`, `wearable_insights`, `complement_tracking`, `plans`, `consultant_plans`, `care_plans`, `consultant_invitations`, `consultant_invites`, `consultant_memberships`, `consultant_questionnaire_codes`, `daily_journals`, `otp_codes`, `practitioner_notes`, `consultant_analysis_results`, `consultant_anamnesis`, `preliminary_questionnaires`.

---

### consultants_identity

**Role :** Vue d'identite des consultants pour l'interface admin. Separee pour le controle RLS.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | uuid | PK | Identifiant (= consultants.id) |
| `practitioner_id` | uuid | NOT NULL, FK -> practitioners_public(id) | Praticien referent |
| `full_name` | text | NOT NULL | Nom complet |
| `email` | text | | Email |
| `phone` | text | | Telephone |
| `age` | integer | | Age |
| `city` | text | | Ville |
| `status` | text | NOT NULL, DEFAULT 'standard', CHECK | Statut |
| `is_premium` | boolean | NOT NULL, DEFAULT false | Flag premium |
| `circular_enabled` | boolean | NOT NULL, DEFAULT false | Integration Circular |
| `last_circular_sync_at` | timestamptz | | Derniere sync Circular |
| `last_circular_sync_status` | text | | Statut derniere sync |
| `created_at` | timestamptz | DEFAULT now() | Date de creation |
| `updated_at` | timestamptz | DEFAULT now() | Derniere modification |

**CHECK constraints :**
```sql
status IN ('standard', 'premium')
```

**Relations :** Referencee par `consultants_health`.

---

### users

**Role :** Comptes utilisateurs pour l'application mobile. Separes de `auth.users` de Supabase.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | Identifiant unique |
| `email` | text | NOT NULL, UNIQUE | Email |
| `password_hash` | text | NOT NULL | Hash du mot de passe |
| `role` | text | NOT NULL, CHECK | Role utilisateur |
| `status` | text | DEFAULT 'ACTIVE', CHECK | Statut du compte |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Date de creation |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() | Derniere modification |

**CHECK constraints :**
```sql
role IN ('PATIENT', 'PRACTITIONER', 'ADMIN')
status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')
```

---

### patient_profiles

**Role :** Profils detailles des patients pour l'application mobile.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `user_id` | uuid | PK | ID utilisateur (= users.id) |
| `first_name` | varchar | | Prenom |
| `last_name` | varchar | | Nom |
| `phone` | varchar | | Telephone |
| `birth_date` | date | | Date de naissance |
| `age` | integer | | Age |
| `city` | varchar | | Ville |
| `gender` | varchar | | Genre |
| `address` | text | | Adresse |
| `avatar_url` | text | | URL de l'avatar |
| `created_at` | timestamp | DEFAULT now() | Date de creation |
| `updated_at` | timestamp | DEFAULT now() | Derniere modification |

---

### admin_allowlist

**Role :** Liste blanche des emails autorises a acceder a l'interface d'administration.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `email` | text | PK | Email autorise |
| `created_at` | timestamptz | DEFAULT now() | Date d'ajout |
| `created_by` | uuid | | Utilisateur ayant ajoute l'email |

---

### otp_codes

**Role :** Codes OTP (One-Time Password) pour l'activation, la connexion et la reinitialisation des comptes consultants.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | Identifiant unique |
| `email` | text | NOT NULL | Email destinataire |
| `code` | text | NOT NULL | Code OTP |
| `type` | text | DEFAULT 'activation', CHECK | Type de code |
| `practitioner_id` | uuid | FK -> practitioners(id) | Praticien associe |
| `consultant_id` | uuid | FK -> consultants(id) | Consultant associe |
| `consultant_first_name` | text | | Prenom du consultant |
| `consultant_last_name` | text | | Nom du consultant |
| `consultant_phone` | text | | Telephone du consultant |
| `consultant_city` | text | | Ville du consultant |
| `expires_at` | timestamptz | NOT NULL | Date d'expiration |
| `used` | boolean | DEFAULT false | Code utilise |
| `used_at` | timestamptz | | Date d'utilisation |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Date de creation |

**CHECK constraints :**
```sql
type IN ('activation', 'login', 'reset')
```

---

## 4. Invitations et onboarding

### consultant_invitations

**Role :** Invitations envoyees par les praticiens a de nouveaux consultants. Systeme actuel d'invitation.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | Identifiant unique |
| `practitioner_id` | uuid | NOT NULL, FK -> practitioners(id) | Praticien invitant |
| `email` | text | NOT NULL | Email du consultant invite |
| `full_name` | text | | Nom complet |
| `first_name` | text | | Prenom |
| `last_name` | text | | Nom |
| `phone` | text | | Telephone |
| `city` | text | | Ville |
| `age` | integer | | Age |
| `date_of_birth` | date | | Date de naissance |
| `invitation_code` | text | NOT NULL | Code d'invitation |
| `code_expires_at` | timestamptz | NOT NULL | Expiration du code |
| `status` | text | DEFAULT 'pending', CHECK | Statut de l'invitation |
| `invited_at` | timestamptz | NOT NULL, DEFAULT now() | Date d'envoi |
| `accepted_at` | timestamptz | | Date d'acceptation |
| `consultant_id` | uuid | FK -> consultants(id) | Consultant cree apres acceptation |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Date de creation |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() | Derniere modification |

**CHECK constraints :**
```sql
status IN ('pending', 'accepted', 'cancelled', 'expired')
```

---

### consultant_invites

**Role :** Systeme d'invitation legacy par token. Utilise pour les invitations basees sur un token unique.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | Identifiant unique |
| `practitioner_id` | uuid | NOT NULL, FK -> practitioners(id) | Praticien invitant |
| `patient_id` | uuid | NOT NULL, FK -> consultants(id) | Consultant cible |
| `email` | text | NOT NULL | Email du consultant |
| `token` | text | NOT NULL, UNIQUE | Token d'invitation unique |
| `expires_at` | timestamptz | | Date d'expiration |
| `claimed_at` | timestamptz | | Date de reclamation |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Date de creation |

---

### consultant_memberships

**Role :** Liaison entre un consultant et un compte utilisateur (app mobile).

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | Identifiant unique |
| `consultant_id` | uuid | NOT NULL, FK -> consultants(id) | Consultant |
| `consultant_user_id` | uuid | NOT NULL | ID du compte utilisateur |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Date de creation |

---

## 5. Anamnese et questionnaires

> **Note :** Plusieurs implementations d'anamnese coexistent dans le schema. Voir la section [Notes importantes](#16-notes-importantes) pour les details.

### consultant_anamnesis

**Role :** Table d'anamnese principale actuellement utilisee. Stocke les reponses sous forme JSON avec versionnage.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | Identifiant unique |
| `consultant_id` | uuid | NOT NULL, UNIQUE, FK -> consultants(id) | Consultant (1 anamnese par consultant) |
| `naturopath_id` | uuid | FK -> practitioners(id) | Praticien responsable |
| `answers` | jsonb | | Reponses au questionnaire (JSON) |
| `version` | integer | DEFAULT 1 | Numero de version |
| `source` | text | DEFAULT 'manual', CHECK | Source de creation |
| `preliminary_questionnaire_id` | uuid | FK -> preliminary_questionnaires(id) | Questionnaire preliminaire lie |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Date de creation |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() | Derniere modification |

**CHECK constraints :**
```sql
source IN ('manual', 'preliminary_questionnaire', 'mobile_app')
```

---

### anamneses

**Role :** Anamnese detaillee avec champs structures (motif, alimentation, digestion, etc.). Liee aux dossiers.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | Identifiant unique |
| `consultant_id` | uuid | NOT NULL, UNIQUE, FK -> consultants(id) | Consultant |
| `case_file_id` | uuid | FK -> case_files(id) | Dossier de suivi lie |
| `motif` | text | | Motif de consultation |
| `objectifs` | text | | Objectifs du consultant |
| `alimentation` | text | | Description de l'alimentation |
| `digestion` | text | | Etat de la digestion |
| `sommeil` | text | | Qualite du sommeil |
| `stress` | text | | Niveau de stress |
| `complement` | text | | Supplements actuels |
| `allergies` | text | | Allergies connues |
| `data` | jsonb | | Donnees supplementaires (JSON) |
| `completed` | boolean | DEFAULT false | Questionnaire complete |
| `completed_at` | timestamptz | | Date de completion |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Date de creation |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() | Derniere modification |

---

### anamnese_instances

**Role :** Instances de questionnaire d'anamnese. Represente une session de remplissage.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | Identifiant unique |
| `consultant_id` | uuid | NOT NULL, UNIQUE, FK -> consultants(id) | Consultant |
| `status` | text | DEFAULT 'PENDING', CHECK | Statut de l'instance |
| `answers` | jsonb | | Reponses (JSON) |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Date de creation |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() | Derniere modification |

**CHECK constraints :**
```sql
status IN ('PENDING', 'COMPLETED')
```

---

### anamnesis

**Role :** Table d'anamnese legacy. Ancienne implementation avec structure detaillee.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | uuid | PK, DEFAULT uuid_generate_v4() | Identifiant unique |
| `patient_id` | uuid | NOT NULL | ID patient |
| `practitioner_id` | uuid | NOT NULL | ID praticien |
| `main_concerns` | jsonb | | Preoccupations principales |
| `current_medications` | jsonb | | Medicaments actuels |
| `current_supplements` | jsonb | | Supplements actuels |
| `allergies` | text | | Allergies |
| `medical_history` | jsonb | | Historique medical |
| `family_history` | jsonb | | Historique familial |
| `diet_description` | text | | Description du regime |
| `physical_activity` | text | | Activite physique |
| `sleep_quality` | text | | Qualite du sommeil |
| `stress_level` | text | | Niveau de stress |
| `goals` | jsonb | | Objectifs |
| `completed_at` | timestamptz | | Date de completion |
| `created_at` | timestamptz | DEFAULT now() | Date de creation |
| `updated_at` | timestamptz | DEFAULT now() | Derniere modification |

> **Legacy :** Cette table n'a pas de FK declarees. Preferez `consultant_anamnesis`.

---

### anamnesis_history

**Role :** Historique des modifications apportees a l'anamnese. Permet l'audit trail.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | Identifiant unique |
| `anamnesis_id` | uuid | NOT NULL, FK -> consultant_anamnesis(id) | Anamnese modifiee |
| `consultant_id` | uuid | NOT NULL, FK -> consultants(id) | Consultant concerne |
| `modified_section` | text | NOT NULL | Section modifiee |
| `old_value` | jsonb | | Ancienne valeur |
| `new_value` | jsonb | | Nouvelle valeur |
| `full_snapshot` | jsonb | | Snapshot complet au moment du changement |
| `version` | integer | NOT NULL | Numero de version |
| `modified_by_type` | text | NOT NULL, CHECK | Type de l'auteur |
| `modified_by_id` | uuid | | ID de l'auteur |
| `modified_at` | timestamptz | NOT NULL, DEFAULT now() | Date de modification |

**CHECK constraints :**
```sql
modified_by_type IN ('consultant', 'practitioner', 'system')
```

---

### preliminary_questionnaires

**Role :** Questionnaires preliminaires remplis publiquement avant la premiere consultation. Peuvent etre lies a un consultant.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | Identifiant unique |
| `naturopath_id` | uuid | NOT NULL, FK -> practitioners(id) | Praticien destinataire |
| `first_name` | text | NOT NULL | Prenom du repondant |
| `last_name` | text | NOT NULL | Nom du repondant |
| `email` | text | NOT NULL | Email du repondant |
| `phone` | text | | Telephone |
| `responses` | jsonb | NOT NULL, DEFAULT '{}' | Reponses au questionnaire |
| `status` | text | DEFAULT 'pending', CHECK | Statut de traitement |
| `linked_consultant_id` | uuid | FK -> consultants(id) | Consultant lie |
| `linked_at` | timestamptz | | Date de liaison |
| `submitted_from_ip` | text | | IP de soumission |
| `user_agent` | text | | User agent du navigateur |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Date de creation |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() | Derniere modification |

**CHECK constraints :**
```sql
status IN ('pending', 'linked_to_consultant', 'archived')
```

---

### consultant_questionnaire_codes

**Role :** Codes d'acces securises permettant aux consultants de remplir leurs questionnaires.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | Identifiant unique |
| `consultant_id` | uuid | NOT NULL, FK -> consultants(id) | Consultant |
| `code_hash` | text | NOT NULL | Hash du code (securise) |
| `expires_at` | timestamptz | NOT NULL | Date d'expiration |
| `used_at` | timestamptz | | Date d'utilisation |
| `revoked_at` | timestamptz | | Date de revocation |
| `sent_to_email` | text | | Email de destination |
| `created_by_user_id` | uuid | FK -> auth.users(id) | Utilisateur ayant genere le code |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Date de creation |

---

## 6. Dossiers et consultations

### case_files

**Role :** Dossiers de suivi. Un dossier par consultant, cree par le praticien.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | Identifiant unique |
| `patient_id` | uuid | NOT NULL, UNIQUE, FK -> consultants(id) | Consultant (1 dossier par consultant) |
| `practitioner_id` | uuid | NOT NULL, FK -> practitioners(id) | Praticien responsable |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Date de creation |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() | Derniere modification |

**Relations :** Referencee par `anamneses`, `complements`, `daily_journals`.

---

### consultations

**Role :** Enregistrement des consultations (visites) entre un praticien et un consultant.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | Identifiant unique |
| `consultant_id` | uuid | NOT NULL, FK -> consultants(id) | Consultant |
| `date` | date | NOT NULL | Date de la consultation |
| `notes` | text | | Notes de consultation |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Date de creation |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() | Derniere modification |

---

### consultation_notes

**Role :** Notes detaillees de consultation avec symptomes, observations et recommandations.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | uuid | PK, DEFAULT uuid_generate_v4() | Identifiant unique |
| `patient_id` | uuid | NOT NULL | ID du patient |
| `practitioner_id` | uuid | NOT NULL | ID du praticien |
| `consultation_date` | timestamptz | NOT NULL | Date de la consultation |
| `title` | text | | Titre de la note |
| `symptoms` | jsonb | | Symptomes observes |
| `observations` | text | | Observations cliniques |
| `recommendations` | text | | Recommandations |
| `private_notes` | text | | Notes privees (praticien seul) |
| `shared_notes` | text | | Notes partagees avec le consultant |
| `attachments` | ARRAY | | Pieces jointes |
| `created_at` | timestamptz | DEFAULT now() | Date de creation |
| `updated_at` | timestamptz | DEFAULT now() | Derniere modification |

> **Note :** Cette table n'a pas de FK declarees. Probablement une table legacy.

---

### appointments

**Role :** Gestion des rendez-vous entre praticiens et consultants.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | Identifiant unique |
| `consultant_id` | uuid | NOT NULL, FK -> consultants(id) | Consultant |
| `practitioner_id` | uuid | NOT NULL, FK -> practitioners(id) | Praticien |
| `starts_at` | timestamptz | NOT NULL | Debut du rendez-vous |
| `ends_at` | timestamptz | | Fin du rendez-vous |
| `status` | text | DEFAULT 'scheduled', CHECK | Statut du RDV |
| `notes` | text | | Notes |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Date de creation |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() | Derniere modification |

**CHECK constraints :**
```sql
status IN ('scheduled', 'cancelled', 'completed', 'done')
```

---

### practitioner_notes

**Role :** Notes libres du praticien sur un consultant, separees des notes de consultation.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | Identifiant unique |
| `consultant_id` | uuid | NOT NULL, FK -> consultants(id) | Consultant |
| `practitioner_id` | uuid | NOT NULL, FK -> practitioners(id) | Praticien |
| `content` | text | | Contenu de la note |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Date de creation |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() | Derniere modification |

---

### consultant_analysis_results

**Role :** Stockage des resultats d'analyses medicales (fichiers uploades) pour un consultant.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | Identifiant unique |
| `consultant_id` | uuid | NOT NULL, FK -> consultants(id) | Consultant |
| `practitioner_id` | uuid | NOT NULL, FK -> practitioners(id) | Praticien |
| `file_name` | text | NOT NULL | Nom du fichier |
| `file_path` | text | NOT NULL | Chemin de stockage |
| `file_type` | text | | Type MIME du fichier |
| `file_size` | integer | | Taille en octets |
| `description` | text | | Description |
| `analysis_date` | date | | Date de l'analyse |
| `uploaded_at` | timestamptz | NOT NULL, DEFAULT now() | Date d'upload |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Date de creation |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() | Derniere modification |

---

## 7. Sante des consultants

### consultants_health

**Role :** Donnees de sante des consultants (notes, resultats labo, questionnaire). Separee pour controle RLS admin.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `consultant_id` | uuid | PK, FK -> consultants_identity(id) | Consultant |
| `practitioner_id` | uuid | NOT NULL, FK -> practitioners(id) | Praticien |
| `notes` | jsonb | | Notes de sante (JSON) |
| `lab_results` | jsonb | | Resultats de laboratoire |
| `questionnaire` | jsonb | | Reponses au questionnaire sante |
| `created_at` | timestamptz | DEFAULT now() | Date de creation |
| `updated_at` | timestamptz | DEFAULT now() | Derniere modification |

---

## 8. Plans de soins

### plans

**Role :** Table racine des plans de soins. Un plan par consultant, avec systeme de versionnage.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | Identifiant unique |
| `consultant_id` | uuid | NOT NULL, UNIQUE, FK -> consultants(id) | Consultant (1 plan par consultant) |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Date de creation |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() | Derniere modification |

**Relations :** Referencee par `plan_versions`.

---

### plan_versions

**Role :** Versions d'un plan de soins. Permet de maintenir un historique des plans.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | Identifiant unique |
| `plan_id` | uuid | NOT NULL, FK -> plans(id) | Plan parent |
| `version` | integer | NOT NULL, DEFAULT 1 | Numero de version |
| `title` | text | NOT NULL | Titre de la version |
| `published_at` | timestamptz | | Date de publication |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Date de creation |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() | Derniere modification |

**Relations :** Referencee par `plan_sections`.

---

### plan_sections

**Role :** Sections individuelles d'une version de plan. Ordonnees par `sort_order`.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | Identifiant unique |
| `plan_version_id` | uuid | NOT NULL, FK -> plan_versions(id) | Version de plan |
| `title` | text | NOT NULL | Titre de la section |
| `body` | text | | Contenu de la section |
| `sort_order` | integer | DEFAULT 0 | Ordre d'affichage |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Date de creation |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() | Derniere modification |

---

### consultant_plans

**Role :** Conseillanciers (Programme d'Hygiene Vitale) assignes aux consultants avec gestion de version et partage. Le champ `content` (JSONB) contient la structure enrichie du conseillancier.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | Identifiant unique |
| `consultant_id` | uuid | NOT NULL, FK -> consultants(id) | Consultant |
| `practitioner_id` | uuid | NOT NULL, FK -> practitioners(id) | Praticien |
| `version` | integer | DEFAULT 1 | Numero de version |
| `status` | text | DEFAULT 'draft', CHECK | Statut du conseillancier |
| `content` | jsonb | | Contenu enrichi du conseillancier (voir structure ci-dessous) |
| `shared_at` | timestamptz | | Date de partage au consultant |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Date de creation |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() | Derniere modification |

**CHECK constraints :**
```sql
status IN ('draft', 'shared')
```

**Structure du champ `content` (JSONB) — definie dans `lib/conseillancier.ts` :**

Le conseillancier contient 16 sections, chacune composee de champs texte :

| Section | Cles JSONB | Description |
|---------|-----------|-------------|
| Message d'accueil | `message_accueil`, `duree_programme`, `date_debut_conseille` | Mot personnalise, cadre temporel |
| Objectifs | `objectifs_principaux`, `actions_prioritaires_semaine_1` | Axes de travail et quick wins |
| Alimentation | `principes_alimentaires`, `aliments_a_privilegier`, `aliments_a_limiter`, `rythme_repas`, `objectif_hydratation`, `type_eau`, `moments_hydratation` | Recommandations alimentaires et hydratation |
| Phytotherapie | `phytotherapie_plantes`, `phytotherapie_posologie`, `phytotherapie_precautions` | Plantes medicinales |
| Micronutrition | `complements`, `precautions_complements` | Complements alimentaires |
| Aromatologie | `huiles_essentielles`, `precautions_he` | Huiles essentielles |
| Hydrologie | `hydrologie` | Techniques d'hydrotherapie |
| Activite physique | `activite_type`, `activite_frequence`, `activite_conseils` | Exercice et mouvement |
| Equilibre psycho-emotionnel | `equilibre_psycho`, `gestion_charge_mentale` | Gestion du stress |
| Techniques respiratoires | `techniques_respiratoires` | Exercices de respiration |
| Techniques manuelles | `automassages`, `points_reflexes`, `seances_recommandees` | Auto-massages et reflexes |
| Sommeil | `sommeil_routine`, `sommeil_environnement`, `sommeil_conseils` | Routine et environnement |
| Environnement | `environnement_air`, `environnement_produits`, `environnement_perturbateurs` | Hygiene de vie |
| Suivi | `suivi_indicateurs`, `suivi_prochain_rdv`, `suivi_entre_temps` | Indicateurs et prochain RDV |
| Message de cloture | `message_cloture` | Mot d'encouragement |
| Notes libres | `notes_libres` | Notes additionnelles |

> **Retrocompatibilite :** Les anciens plans (format plat avec cles `objectifs`, `alimentation_recommandations`, etc.) sont migres automatiquement via `migrateOldPlanContent()` dans `lib/conseillancier.ts`.

---

### care_plans

**Role :** Plans de soins alternatifs avec contenu JSON et gestion de statut d'envoi.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | Identifiant unique |
| `patient_id` | uuid | NOT NULL, FK -> consultants(id) | Consultant |
| `practitioner_id` | uuid | NOT NULL, FK -> practitioners(id) | Praticien |
| `title` | text | | Titre du plan |
| `description` | text | | Description |
| `content` | jsonb | | Contenu detaille (JSON) |
| `status` | text | DEFAULT 'draft', CHECK | Statut |
| `sent_at` | timestamptz | | Date d'envoi |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Date de creation |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() | Derniere modification |

**CHECK constraints :**
```sql
status IN ('draft', 'sent', 'viewed')
```

---

### recommendations

**Role :** Recommandations individuelles liees a un patient et potentiellement a une consultation.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | Identifiant unique |
| `patient_id` | uuid | NOT NULL | ID du patient |
| `consultation_id` | uuid | | ID de la consultation |
| `category` | text | NOT NULL | Categorie de la recommandation |
| `title` | text | NOT NULL | Titre |
| `description` | text | NOT NULL | Description detaillee |
| `priority` | text | DEFAULT 'medium' | Priorite |
| `is_active` | boolean | DEFAULT true | Recommandation active |
| `created_at` | timestamptz | DEFAULT now() | Date de creation |

> **Note :** Pas de FK declarees. Probablement une table legacy.

---

## 9. Supplements et prescriptions

### complements

**Role :** Supplements prescrits dans le cadre d'un dossier de suivi.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | Identifiant unique |
| `case_file_id` | uuid | NOT NULL, FK -> case_files(id) | Dossier de suivi |
| `name` | text | NOT NULL | Nom du supplement |
| `dosage` | text | | Dosage |
| `frequency` | text | | Frequence de prise |
| `duration_days` | integer | | Duree en jours |
| `start_date` | date | | Date de debut |
| `end_date` | date | | Date de fin |
| `instructions` | text | | Instructions de prise |
| `active` | boolean | DEFAULT true | Supplement actif |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Date de creation |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() | Derniere modification |

---

### complement_tracking

**Role :** Suivi quotidien de la prise des supplements par le consultant.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | Identifiant unique |
| `consultant_id` | uuid | NOT NULL, FK -> consultants(id) | Consultant |
| `complement_id` | uuid | NOT NULL, FK -> complements(id) | Supplement |
| `date` | date | NOT NULL | Date du suivi |
| `taken` | boolean | DEFAULT false | Supplement pris |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Date de creation |

---

### supplement_items

**Role :** Items de supplementation au sein d'un plan. Inclut marque, dosage et instructions.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | Identifiant unique |
| `plan_id` | uuid | NOT NULL | ID du plan |
| `name` | text | NOT NULL | Nom du supplement |
| `brand` | text | | Marque |
| `dosage` | text | NOT NULL | Dosage |
| `frequency` | text | NOT NULL | Frequence |
| `timing` | text | | Moment de prise |
| `duration` | text | | Duree |
| `notes` | text | | Notes |
| `image_url` | text | | URL de l'image |
| `order_index` | integer | DEFAULT 0 | Ordre d'affichage |
| `created_at` | timestamptz | DEFAULT now() | Date de creation |

> **Note :** Pas de FK declaree sur `plan_id`.

---

### prescription_items

**Role :** Items de prescription medicale individuels.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | Identifiant unique |
| `prescription_id` | uuid | NOT NULL | ID de la prescription |
| `name` | text | NOT NULL | Nom du produit prescrit |
| `dosage` | text | | Dosage |
| `frequency` | text | | Frequence |
| `duration` | integer | | Duree (en jours) |
| `instructions` | text | | Instructions |
| `created_at` | timestamptz | DEFAULT now() | Date de creation |

> **Note :** Pas de FK declaree sur `prescription_id`. Pas de table `prescriptions` dans le schema.

---

## 10. Journaux et suivi quotidien

### journal_entries

**Role :** Entrees de journal quotidien actuelles. Le consultant note son humeur, energie et adherence.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | Identifiant unique |
| `consultant_id` | uuid | NOT NULL, FK -> consultants(id) | Consultant |
| `date` | date | NOT NULL | Date de l'entree |
| `mood` | text | CHECK | Humeur |
| `energy` | text | CHECK | Niveau d'energie |
| `text` | text | | Texte libre |
| `adherence_hydratation` | boolean | DEFAULT false | Adherence hydratation |
| `adherence_respiration` | boolean | DEFAULT false | Adherence respiration |
| `adherence_mouvement` | boolean | DEFAULT false | Adherence mouvement |
| `adherence_plantes` | boolean | DEFAULT false | Adherence plantes |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Date de creation |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() | Derniere modification |

**CHECK constraints :**
```sql
mood IN ('happy', 'neutral', 'sad')
energy IN ('Bas', 'Moyen', 'Eleve')
```

---

### daily_journals

**Role :** Journaux quotidiens detailles avec suivi nutritionnel, sommeil, energie et supplements.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | Identifiant unique |
| `patient_id` | uuid | NOT NULL, FK -> consultants(id) | Consultant |
| `case_file_id` | uuid | FK -> case_files(id) | Dossier de suivi lie |
| `date` | date | NOT NULL | Date |
| `mood` | text | | Humeur |
| `alimentation_quality` | text | | Qualite de l'alimentation |
| `sleep_quality` | text | | Qualite du sommeil |
| `energy_level` | text | | Niveau d'energie |
| `complements_taken` | jsonb | DEFAULT '[]' | Supplements pris (JSON) |
| `problemes_particuliers` | text | | Problemes particuliers |
| `note_naturopathe` | text | | Note pour le naturopathe |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Date de creation |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() | Derniere modification |

---

### daily_logs

**Role :** Logs quotidiens simplifies (format booleen/checklist).

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | Identifiant unique |
| `patient_id` | uuid | NOT NULL | ID du patient |
| `log_date` | date | NOT NULL | Date du log |
| `good_nutrition` | boolean | | Bonne nutrition |
| `good_sleep` | boolean | | Bon sommeil |
| `good_mood` | boolean | | Bonne humeur |
| `supplements_taken` | boolean | | Supplements pris |
| `specific_issues` | ARRAY | | Problemes specifiques |
| `note_for_practitioner` | text | | Note pour le praticien |
| `created_at` | timestamptz | DEFAULT now() | Date de creation |
| `updated_at` | timestamptz | DEFAULT now() | Derniere modification |

> **Note :** Pas de FK declarees. Probablement une table legacy.

---

### journal

**Role :** Table de journal legacy avec notes sur humeur, energie, sommeil et stress (echelles numeriques).

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | uuid | PK, DEFAULT uuid_generate_v4() | Identifiant unique |
| `patient_id` | uuid | NOT NULL | ID du patient |
| `date` | date | NOT NULL | Date |
| `mood` | text | | Humeur |
| `energy_level` | integer | CHECK (1-10) | Niveau d'energie (1 a 10) |
| `sleep_quality` | integer | | Qualite du sommeil |
| `stress_level` | integer | CHECK (1-10) | Niveau de stress (1 a 10) |
| `notes` | text | | Notes |
| `symptoms` | ARRAY | | Symptomes |
| `supplements_taken` | boolean | | Supplements pris |
| `diet_followed` | boolean | | Regime suivi |
| `exercise_done` | boolean | | Exercice fait |
| `created_at` | timestamptz | DEFAULT now() | Date de creation |
| `updated_at` | timestamptz | DEFAULT now() | Derniere modification |

**CHECK constraints :**
```sql
energy_level >= 1 AND energy_level <= 10
stress_level >= 1 AND stress_level <= 10
```

> **Legacy :** Pas de FK declarees. Preferez `journal_entries` ou `daily_journals`.

---

## 11. Communication

### messages

**Role :** Messagerie entre consultants et praticiens. Chaque message est lie a un consultant.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | Identifiant unique |
| `consultant_id` | uuid | NOT NULL, FK -> consultants(id) | Consultant (= conversation) |
| `sender` | text | NOT NULL, CHECK | Emetteur (ancien champ) |
| `sender_role` | text | CHECK | Role de l'emetteur |
| `sender_type` | text | CHECK | Type de l'emetteur |
| `text` | text | | Contenu du message (ancien champ) |
| `body` | text | | Contenu du message (nouveau champ) |
| `read` | boolean | DEFAULT false | Message lu |
| `read_at` | timestamptz | | Date de lecture |
| `sent_at` | timestamptz | NOT NULL, DEFAULT now() | Date d'envoi |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Date de creation |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() | Derniere modification |

**CHECK constraints :**
```sql
sender IN ('consultant', 'praticien')
sender_role IN ('consultant', 'practitioner')
sender_type IN ('consultant', 'practitioner')
```

> **Note :** Les champs `sender`/`text` et `sender_role`/`sender_type`/`body` coexistent (migration en cours). `sender_role`/`body` sont les champs recommandes.

---

### notifications

**Role :** Notifications envoyees aux praticiens (anamnese modifiee, nouveau questionnaire, message, RDV...).

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | Identifiant unique |
| `practitioner_id` | uuid | NOT NULL, FK -> practitioners(id) | Praticien destinataire |
| `consultant_id` | uuid | FK -> consultants(id) | Consultant concerne |
| `type` | text | DEFAULT 'general', CHECK | Type de notification |
| `title` | text | NOT NULL | Titre |
| `description` | text | | Description |
| `level` | text | DEFAULT 'info', CHECK | Niveau d'importance |
| `read` | boolean | DEFAULT false | Notification lue |
| `metadata` | jsonb | | Donnees supplementaires |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Date de creation |

**CHECK constraints :**
```sql
type IN ('general', 'anamnesis_modified', 'new_preliminary_questionnaire', 'questionnaire_linked', 'message', 'appointment')
level IN ('info', 'attention')
```

---

## 12. Donnees wearables (Circular)

### wearable_data

**Role :** Donnees brutes des wearables (sommeil, HRV, activite, temperature) synchronisees depuis Circular.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | uuid | PK, DEFAULT uuid_generate_v4() | Identifiant unique |
| `consultant_id` | uuid | NOT NULL | Consultant |
| `recorded_date` | date | NOT NULL | Date d'enregistrement |
| `data_type` | text | NOT NULL, CHECK | Type de donnee |
| `value` | jsonb | NOT NULL | Valeur (JSON) |
| `source` | text | DEFAULT 'circular' | Source des donnees |
| `synced_at` | timestamptz | DEFAULT now() | Date de synchronisation |
| `created_at` | timestamptz | DEFAULT now() | Date de creation |

**CHECK constraints :**
```sql
data_type IN ('sleep', 'hrv', 'activity', 'temperature')
```

---

### wearable_summaries

**Role :** Resumes quotidiens agreges des donnees wearables.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | Identifiant unique |
| `consultant_id` | uuid | NOT NULL, FK -> consultants(id) | Consultant |
| `date` | date | NOT NULL | Date |
| `sleep_duration` | integer | | Duree du sommeil (minutes) |
| `sleep_score` | integer | | Score de sommeil |
| `hrv_avg` | integer | | HRV moyen |
| `activity_level` | integer | | Niveau d'activite |
| `completeness` | integer | | Completude des donnees (%) |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Date de creation |

---

### wearable_insights

**Role :** Insights et alertes generes a partir des donnees wearables pour le praticien.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | Identifiant unique |
| `consultant_id` | uuid | NOT NULL, FK -> consultants(id) | Consultant |
| `type` | text | CHECK | Type d'insight |
| `level` | text | CHECK | Niveau |
| `message` | text | | Message de l'insight |
| `suggested_action` | text | | Action suggeree |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Date de creation |

**CHECK constraints :**
```sql
type IN ('sleep', 'hrv', 'activity')
level IN ('info', 'attention')
```

---

## 13. Facturation et abonnements

### subscription_plans

**Role :** Plans d'abonnement disponibles pour les praticiens (free, premium).

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | Identifiant unique |
| `name` | text | NOT NULL, UNIQUE, CHECK | Nom technique du plan |
| `display_name` | text | NOT NULL | Nom affiche |
| `description` | text | | Description |
| `price_monthly` | numeric | DEFAULT 0 | Prix mensuel |
| `price_yearly` | numeric | DEFAULT 0 | Prix annuel |
| `features` | jsonb | DEFAULT '[]' | Fonctionnalites incluses |
| `max_patients` | integer | | Nombre max de patients |
| `circular_integration` | boolean | DEFAULT false | Integration Circular incluse |
| `is_active` | boolean | DEFAULT true | Plan actif |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Date de creation |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() | Derniere modification |

**CHECK constraints :**
```sql
name IN ('free', 'premium')
```

---

### subscriptions

**Role :** Abonnements actifs des praticiens. Lie a un plan et synchronise avec Stripe.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | Identifiant unique |
| `practitioner_id` | uuid | NOT NULL, FK -> practitioners(id) | Praticien |
| `plan_id` | uuid | NOT NULL, FK -> subscription_plans(id) | Plan d'abonnement |
| `status` | text | DEFAULT 'active', CHECK | Statut |
| `billing_cycle` | text | DEFAULT 'monthly', CHECK | Cycle de facturation |
| `current_period_start` | timestamptz | NOT NULL | Debut de la periode |
| `current_period_end` | timestamptz | NOT NULL | Fin de la periode |
| `cancel_at_period_end` | boolean | DEFAULT false | Annulation en fin de periode |
| `canceled_at` | timestamptz | | Date d'annulation |
| `trial_end` | timestamptz | | Fin de la periode d'essai |
| `stripe_customer_id` | text | | ID client Stripe |
| `stripe_subscription_id` | text | UNIQUE | ID abonnement Stripe |
| `stripe_price_id` | text | | ID prix Stripe |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Date de creation |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() | Derniere modification |

**CHECK constraints :**
```sql
status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete')
billing_cycle IN ('monthly', 'yearly')
```

---

### stripe_subscriptions

**Role :** Table de synchronisation directe avec les abonnements Stripe. Liee a `practitioners_public`.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | text | PK | ID Stripe de l'abonnement |
| `practitioner_id` | uuid | NOT NULL, FK -> practitioners_public(id) | Praticien |
| `customer_id` | text | | ID client Stripe |
| `status` | text | | Statut Stripe |
| `price_id` | text | | ID prix Stripe |
| `current_period_end` | timestamptz | | Fin de la periode |
| `cancel_at_period_end` | boolean | DEFAULT false | Annulation en fin de periode |
| `latest_invoice_id` | text | | ID derniere facture |
| `payment_failed` | boolean | DEFAULT false | Paiement echoue |
| `updated_at` | timestamptz | DEFAULT now() | Derniere modification |

---

### invoices

**Role :** Factures generees pour les abonnements des praticiens.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | Identifiant unique |
| `subscription_id` | uuid | NOT NULL, FK -> subscriptions(id) | Abonnement |
| `practitioner_id` | uuid | NOT NULL, FK -> practitioners(id) | Praticien |
| `invoice_number` | text | NOT NULL, UNIQUE | Numero de facture |
| `amount_subtotal` | numeric | NOT NULL | Montant HT |
| `amount_tax` | numeric | DEFAULT 0 | Montant TVA |
| `amount_total` | numeric | NOT NULL | Montant TTC |
| `currency` | text | DEFAULT 'EUR' | Devise |
| `status` | text | DEFAULT 'open', CHECK | Statut |
| `invoice_date` | date | NOT NULL | Date de facturation |
| `due_date` | date | | Date d'echeance |
| `paid_at` | timestamptz | | Date de paiement |
| `description` | text | | Description |
| `billing_reason` | text | | Raison de facturation |
| `stripe_invoice_id` | text | UNIQUE | ID facture Stripe |
| `stripe_invoice_pdf` | text | | URL du PDF Stripe |
| `metadata` | jsonb | DEFAULT '{}' | Metadonnees |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Date de creation |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() | Derniere modification |

**CHECK constraints :**
```sql
status IN ('draft', 'open', 'paid', 'void', 'uncollectible')
```

---

### payment_methods

**Role :** Moyens de paiement enregistres par les praticiens.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | Identifiant unique |
| `practitioner_id` | uuid | NOT NULL, FK -> practitioners(id) | Praticien |
| `type` | text | NOT NULL, CHECK | Type de moyen de paiement |
| `is_default` | boolean | DEFAULT false | Moyen de paiement par defaut |
| `card_brand` | text | | Marque de la carte |
| `card_last4` | text | | 4 derniers chiffres de la carte |
| `card_exp_month` | integer | | Mois d'expiration |
| `card_exp_year` | integer | | Annee d'expiration |
| `sepa_last4` | text | | 4 derniers chiffres SEPA |
| `stripe_payment_method_id` | text | UNIQUE | ID Stripe du moyen de paiement |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Date de creation |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() | Derniere modification |

**CHECK constraints :**
```sql
type IN ('card', 'sepa_debit', 'paypal')
```

---

### billing_history

**Role :** Historique des evenements de facturation (creation, paiement, echec, annulation).

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | Identifiant unique |
| `practitioner_id` | uuid | NOT NULL, FK -> practitioners(id) | Praticien |
| `subscription_id` | uuid | FK -> subscriptions(id) | Abonnement |
| `invoice_id` | uuid | FK -> invoices(id) | Facture |
| `event_type` | text | NOT NULL, CHECK | Type d'evenement |
| `description` | text | | Description |
| `metadata` | jsonb | DEFAULT '{}' | Metadonnees |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Date de creation |

**CHECK constraints :**
```sql
event_type IN ('subscription_created', 'subscription_updated', 'subscription_canceled', 'payment_succeeded', 'payment_failed', 'invoice_created')
```

---

## 14. Contenu

### articles

**Role :** Articles de blog ou contenu editorial publie sur la plateforme.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | uuid | PK, DEFAULT uuid_generate_v4() | Identifiant unique |
| `title` | text | NOT NULL | Titre |
| `slug` | text | NOT NULL, UNIQUE | Slug URL |
| `content` | text | NOT NULL | Contenu de l'article |
| `excerpt` | text | | Extrait |
| `category` | text | | Categorie |
| `tags` | ARRAY | | Tags |
| `image_url` | text | | URL de l'image principale |
| `author` | text | | Auteur |
| `published` | boolean | DEFAULT false | Publie |
| `published_at` | timestamptz | | Date de publication |
| `created_at` | timestamptz | DEFAULT now() | Date de creation |
| `updated_at` | timestamptz | DEFAULT now() | Derniere modification |

---

## 15. Diagramme relationnel

```
                            auth.users
                           /          \
                          /            \
              practitioners          practitioners_public
              /    |    \                  |        \
             /     |     \                |         \
    consultants  subscriptions    consultants_identity  stripe_subscriptions
    /  |  |  \       |                    |
   /   |  |   \      |            consultants_health
  /    |  |    \     subscription_plans
 /     |  |     \
|      |  |      \
|      |  |    case_files -------- anamneses
|      |  |       |    \
|      |  |    complements  daily_journals
|      |  |       |
|      |  |  complement_tracking
|      |  |
|      |  plans ---------- plan_versions ---- plan_sections
|      |
|    consultant_anamnesis -- anamnesis_history
|      |
|   preliminary_questionnaires
|
|-- appointments
|-- consultations
|-- messages
|-- notifications
|-- journal_entries
|-- wearable_data / wearable_summaries / wearable_insights
|-- consultant_plans / care_plans
|-- consultant_invitations / consultant_invites
|-- consultant_memberships
|-- consultant_questionnaire_codes
|-- consultant_analysis_results
|-- practitioner_notes
|-- otp_codes
|
practitioners
    |-- invoices
    |-- payment_methods
    |-- billing_history
    |-- notifications
```

**Relations principales :**

- `auth.users` -> `practitioners` (1:1, id = auth user id)
- `auth.users` -> `practitioners_public` (1:1, vue admin)
- `practitioners` -> `consultants` (1:N, un praticien a plusieurs consultants)
- `consultants` -> `case_files` (1:1, un dossier par consultant)
- `consultants` -> `plans` (1:1, un plan par consultant)
- `plans` -> `plan_versions` (1:N) -> `plan_sections` (1:N)
- `consultants` -> `consultant_anamnesis` (1:1)
- `consultant_anamnesis` -> `anamnesis_history` (1:N)
- `case_files` -> `complements` (1:N) -> `complement_tracking` (1:N)
- `practitioners` -> `subscriptions` (1:N) -> `invoices` (1:N)
- `subscription_plans` -> `subscriptions` (1:N)

---

## 16. Notes importantes

### Tables legacy vs tables actuelles

Plusieurs domaines ont des tables en doublon, resultant de l'evolution du schema :

| Domaine | Tables legacy | Table actuelle recommandee |
|---------|--------------|---------------------------|
| Anamnese | `anamnesis`, `anamnese_instances`, `anamneses` | `consultant_anamnesis` |
| Journal | `journal`, `daily_logs` | `journal_entries`, `daily_journals` |
| Notes de consultation | `consultation_notes` | `practitioner_notes`, `consultations` |
| Invitations | `consultant_invites` | `consultant_invitations` |

### Evolution du schema d'anamnese

L'anamnese a connu 4 implementations successives :

1. **`anamnesis`** : Premiere version avec champs structures (main_concerns, medical_history...). Pas de FK. Legacy.
2. **`anamneses`** : Deuxieme version avec champs en francais (motif, alimentation, digestion...). Liee a `case_files`.
3. **`anamnese_instances`** : Version simplifiee avec statut PENDING/COMPLETED et reponses JSON.
4. **`consultant_anamnesis`** : Version actuelle avec versionnage, source, et lien vers les questionnaires preliminaires. **Table recommandee.**

### Tables sans FK declarees

Certaines tables n'ont pas de foreign keys declarees dans le schema. Elles sont probablement legacy ou proviennent d'une ancienne architecture :

- `anamnesis` (patient_id, practitioner_id)
- `consultation_notes` (patient_id, practitioner_id)
- `daily_logs` (patient_id)
- `journal` (patient_id)
- `recommendations` (patient_id, consultation_id)
- `supplement_items` (plan_id)
- `prescription_items` (prescription_id)

### Conventions de nommage

- **`patient_id` vs `consultant_id`** : Le projet a ete renomme de "patient" a "consultant". Les anciens noms (`patient_id`) coexistent avec les nouveaux (`consultant_id`). Les FK portent parfois encore des noms avec "patient" (ex: `patient_invitations_practitioner_id_fkey`).
- **`text` vs `body` (messages)** : Migration en cours des champs de message. `body` est le champ recommande.
- **`sender` vs `sender_role`/`sender_type` (messages)** : Triple champ pour le type d'emetteur. `sender_role` est le champ recommande.

### Double systeme de facturation

Deux systemes de gestion des abonnements Stripe coexistent :
- **`subscriptions`** + `subscription_plans` : Systeme complet avec gestion interne.
- **`stripe_subscriptions`** : Table de synchronisation directe avec Stripe, liee a `practitioners_public`.

### Soft delete

Les consultants utilisent un systeme de soft delete via le champ `deleted_at`. Un consultant avec `deleted_at IS NOT NULL` est considere comme supprime.
