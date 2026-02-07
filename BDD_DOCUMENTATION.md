# Documentation Base de Donnees AFEIA

> Genere automatiquement depuis l'analyse du code
> Date: 2026-01-30

## Table des matieres

1. [Vue d'ensemble](#vue-densemble)
2. [Tables par domaine](#tables-par-domaine)
3. [Detail des tables](#detail-des-tables)
4. [Relations entre tables](#relations-entre-tables)
5. [Comment mettre a jour la base de donnees](#comment-mettre-a-jour-la-base-de-donnees)

---

## Vue d'ensemble

L'application AFEIA utilise **36 tables** reparties en plusieurs domaines:

| Domaine | Nombre de tables |
|---------|-----------------|
| Utilisateurs & Auth | 8 |
| Donnees medicales | 5 |
| Rendez-vous & Consultations | 3 |
| Plans & Soins | 5 |
| Journal & Suivi | 4 |
| Wearables | 2 |
| Communication | 3 |
| Facturation | 5 |
| Analyses | 1 |

---

## Tables par domaine

### Utilisateurs & Authentification

| Table | Description |
|-------|-------------|
| `practitioners` | Praticiens/Naturopathes (lies a auth.users) |
| `consultants` | Consultants d'un praticien |
| `users` | Utilisateurs de l'app mobile (auth separee) |
| `consultant_memberships` | Lien consultant-user pour l'app mobile |
| `consultant_invitations` | Invitations envoyees aux consultants |
| `consultant_invites` | Invitations par token |
| `otp_codes` | Codes OTP pour activation |
| `consultant_questionnaire_codes` | Codes questionnaire (hashes) |

### Donnees Medicales

| Table | Description |
|-------|-------------|
| `anamneses` | Anamneses (structure legacy) |
| `anamnese_instances` | Instances d'anamnese (legacy) |
| `consultant_anamnesis` | Nouvelle table d'anamnese (moderne) |
| `preliminary_questionnaires` | Questionnaires preliminaires publics |
| `anamnesis_history` | Historique des modifications |

### Rendez-vous & Consultations

| Table | Description |
|-------|-------------|
| `consultations` | Historique des consultations |
| `appointments` | Rendez-vous planifies |
| `case_files` | Dossiers consultants |

### Plans & Soins

| Table | Description |
|-------|-------------|
| `plans` | Plans de soins (structure hierarchique) |
| `plan_versions` | Versions d'un plan |
| `plan_sections` | Sections d'une version |
| `consultant_plans` | Plans consultant (structure simplifiee) |
| `care_plans` | Plans de soins alternatifs (fallback) |

### Journal & Suivi

| Table | Description |
|-------|-------------|
| `journal_entries` | Journal de suivi (web) |
| `daily_journals` | Journal quotidien (app mobile) |
| `complements` | Complements alimentaires prescrits |
| `complement_tracking` | Suivi de prise des complements |

### Wearables

| Table | Description |
|-------|-------------|
| `wearable_summaries` | Donnees resumees des wearables |
| `wearable_insights` | Insights generes depuis les wearables |

### Communication

| Table | Description |
|-------|-------------|
| `messages` | Messages entre consultants et praticiens |
| `notifications` | Notifications |
| `practitioner_notes` | Notes du praticien sur un consultant |

### Facturation

| Table | Description |
|-------|-------------|
| `subscription_plans` | Plans d'abonnement disponibles |
| `subscriptions` | Abonnements des praticiens |
| `invoices` | Factures |
| `payment_methods` | Moyens de paiement |
| `billing_history` | Historique des evenements |

### Analyses

| Table | Description |
|-------|-------------|
| `consultant_analysis_results` | Resultats d'analyses consultant |

---

## Detail des tables

### practitioners

Praticiens/Naturopathes - lies a auth.users de Supabase.

| Colonne | Type | Description | Utilise dans |
|---------|------|-------------|--------------|
| `id` | UUID | ID (= auth.users.id) | Partout |
| `email` | TEXT | Email unique | `lib/queries.ts`, `services/practitioner.service.ts` |
| `full_name` | TEXT | Nom complet | `lib/queries.ts`, `app/api/mobile/plans/route.ts` |
| `default_consultation_reason` | TEXT | Raison par defaut | `lib/queries.ts` |
| `calendly_url` | TEXT | Lien Calendly | `lib/queries.ts`, `lib/calendly.ts` |
| `created_at` | TIMESTAMPTZ | Date creation | - |
| `updated_at` | TIMESTAMPTZ | Date maj | - |

---

### consultants

Consultants d'un praticien.

| Colonne | Type | Description | Utilise dans |
|---------|------|-------------|--------------|
| `id` | UUID | ID unique | Partout |
| `practitioner_id` | UUID | FK vers practitioners | `services/practitioner.service.ts`, `lib/queries.ts` |
| `email` | TEXT | Email | `services/invitation.service.ts`, `services/consultants.ts` |
| `name` | TEXT | Nom affiche | `services/consultants.ts`, `lib/queries.ts` |
| `full_name` | TEXT | Nom complet | `services/practitioner.service.ts` |
| `first_name` | TEXT | Prenom | `services/practitioner.service.ts` |
| `last_name` | TEXT | Nom | `services/practitioner.service.ts` |
| `phone` | TEXT | Telephone | `services/practitioner.service.ts` |
| `city` | TEXT | Ville | `services/consultants.ts`, `lib/queries.ts` |
| `age` | INTEGER | Age | `services/consultants.ts`, `lib/queries.ts` |
| `date_of_birth` | DATE | Date naissance | `services/invitation.service.ts` |
| `consultation_reason` | TEXT | Raison consultation | `lib/types.ts` |
| `status` | TEXT | Statut (standard/premium) | `lib/types.ts` |
| `is_premium` | BOOLEAN | Premium? | `lib/types.ts`, `app/api/mobile/auth/register/route.ts` |
| `activated` | BOOLEAN | Active? | `services/invitation.service.ts`, `services/practitioner.service.ts` |
| `activated_at` | TIMESTAMPTZ | Date activation | `services/consultants.ts` |
| `deleted_at` | TIMESTAMPTZ | Soft delete | `lib/queries.ts`, `services/invites.ts` |
| `created_at` | TIMESTAMPTZ | Date creation | `services/practitioner.service.ts` |
| `updated_at` | TIMESTAMPTZ | Date maj | `lib/queries.ts` |

---

### consultant_invitations

Invitations envoyees aux consultants (nouveau systeme).

| Colonne | Type | Description | Utilise dans |
|---------|------|-------------|--------------|
| `id` | UUID | ID unique | `services/invitation.service.ts` |
| `practitioner_id` | UUID | FK vers practitioners | `services/invitation.service.ts` |
| `email` | TEXT | Email consultant | `services/invitation.service.ts` |
| `full_name` | TEXT | Nom complet | `services/invitation.service.ts` |
| `first_name` | TEXT | Prenom | `services/invitation.service.ts` |
| `last_name` | TEXT | Nom | `services/invitation.service.ts` |
| `phone` | TEXT | Telephone | `services/invitation.service.ts` |
| `city` | TEXT | Ville | `services/invitation.service.ts` |
| `age` | INTEGER | Age | `services/invitation.service.ts` |
| `date_of_birth` | DATE | Date naissance | `services/invitation.service.ts` |
| `invitation_code` | TEXT | Code invitation | `services/invitation.service.ts` |
| `code_expires_at` | TIMESTAMPTZ | Expiration | `services/invitation.service.ts` |
| `status` | TEXT | pending/accepted/cancelled | `services/invitation.service.ts`, `services/practitioner.service.ts` |
| `invited_at` | TIMESTAMPTZ | Date invitation | `services/invitation.service.ts` |
| `accepted_at` | TIMESTAMPTZ | Date acceptation | - |

---

### otp_codes

Codes OTP pour activation consultant.

| Colonne | Type | Description | Utilise dans |
|---------|------|-------------|--------------|
| `id` | UUID | ID unique | - |
| `email` | TEXT | Email | `services/invitation.service.ts`, `services/practitioner.service.ts` |
| `code` | TEXT | Code OTP | `services/invitation.service.ts`, `services/practitioner.service.ts` |
| `type` | TEXT | activation/login/reset | `services/invitation.service.ts` |
| `practitioner_id` | UUID | FK praticien | `services/practitioner.service.ts` |
| `consultant_id` | UUID | FK consultant | `services/practitioner.service.ts` |
| `consultant_first_name` | TEXT | Prenom consultant | `services/practitioner.service.ts` |
| `consultant_last_name` | TEXT | Nom consultant | `services/practitioner.service.ts` |
| `consultant_phone` | TEXT | Tel consultant | `services/practitioner.service.ts` |
| `consultant_city` | TEXT | Ville consultant | `services/practitioner.service.ts` |
| `expires_at` | TIMESTAMPTZ | Expiration | `services/practitioner.service.ts` |
| `used` | BOOLEAN | Utilise? | `services/invitation.service.ts`, `services/practitioner.service.ts` |
| `used_at` | TIMESTAMPTZ | Date utilisation | - |

---

### messages

Messages entre consultants et praticiens.

| Colonne | Type | Description | Utilise dans |
|---------|------|-------------|--------------|
| `id` | UUID | ID unique | `lib/queries.ts`, `app/api/mobile/messages/route.ts` |
| `consultant_id` | UUID | FK consultant | `lib/queries.ts`, `services/consultants.ts` |
| `sender` | TEXT | consultant/praticien | `lib/queries.ts`, `app/api/mobile/messages/route.ts` |
| `sender_role` | TEXT | consultant/practitioner | `lib/queries.ts`, `services/consultants.ts` |
| `sender_type` | TEXT | consultant/practitioner | `services/consultants.ts` |
| `text` | TEXT | Contenu message | `lib/queries.ts`, `app/api/mobile/messages/route.ts` |
| `body` | TEXT | Contenu (alias) | `lib/queries.ts` |
| `read` | BOOLEAN | Lu? | `services/consultants.ts` |
| `read_at` | TIMESTAMPTZ | Date lecture | `lib/queries.ts`, `app/api/mobile/messages/route.ts` |
| `sent_at` | TIMESTAMPTZ | Date envoi | `lib/queries.ts`, `app/api/mobile/messages/route.ts` |
| `created_at` | TIMESTAMPTZ | Date creation | `services/consultants.ts` |

---

### notifications

Notifications pour les praticiens.

| Colonne | Type | Description | Utilise dans |
|---------|------|-------------|--------------|
| `id` | UUID | ID unique | `services/notifications.ts` |
| `practitioner_id` | UUID | FK praticien | `services/notifications.ts` |
| `consultant_id` | UUID | FK consultant (optionnel) | `lib/queries.ts` |
| `type` | TEXT | Type notification | `services/notifications.ts`, `lib/types.ts` |
| `title` | TEXT | Titre | `lib/types.ts` |
| `description` | TEXT | Description | `lib/types.ts` |
| `level` | TEXT | info/attention | `lib/types.ts` |
| `read` | BOOLEAN | Lue? | `services/notifications.ts`, `lib/queries.ts` |
| `metadata` | JSONB | Donnees additionnelles | `lib/types.ts` |
| `created_at` | TIMESTAMPTZ | Date creation | `services/notifications.ts` |

---

### consultant_anamnesis

Anamnese consultant (structure moderne).

| Colonne | Type | Description | Utilise dans |
|---------|------|-------------|--------------|
| `id` | UUID | ID unique | `services/anamnese.ts` |
| `consultant_id` | UUID | FK consultant (unique) | `services/anamnese.ts`, `lib/queries.ts` |
| `naturopath_id` | UUID | FK praticien | `services/anamnese.ts` |
| `answers` | JSONB | Reponses | `services/anamnese.ts`, `lib/queries.ts` |
| `version` | INTEGER | Version | `lib/types.ts`, `services/preliminary-questionnaire.ts` |
| `source` | TEXT | manual/preliminary_questionnaire/mobile_app | `services/anamnese.ts` |
| `preliminary_questionnaire_id` | UUID | FK questionnaire | `lib/types.ts` |
| `created_at` | TIMESTAMPTZ | Date creation | `lib/types.ts` |
| `updated_at` | TIMESTAMPTZ | Date maj | `services/anamnese.ts` |

---

### preliminary_questionnaires

Questionnaires preliminaires soumis publiquement.

| Colonne | Type | Description | Utilise dans |
|---------|------|-------------|--------------|
| `id` | UUID | ID unique | `services/preliminary-questionnaire.ts` |
| `naturopath_id` | UUID | FK praticien | `services/preliminary-questionnaire.ts` |
| `first_name` | TEXT | Prenom | `lib/types.ts` |
| `last_name` | TEXT | Nom | `lib/types.ts` |
| `email` | TEXT | Email | `lib/types.ts` |
| `phone` | TEXT | Telephone | `lib/types.ts` |
| `responses` | JSONB | Reponses | `lib/types.ts` |
| `status` | TEXT | pending/linked_to_consultant/archived | `services/preliminary-questionnaire.ts` |
| `linked_consultant_id` | UUID | FK consultant lie | `lib/types.ts`, `app/api/mobile/auth/register/route.ts` |
| `linked_at` | TIMESTAMPTZ | Date liaison | `lib/types.ts` |
| `submitted_from_ip` | TEXT | IP soumission | `lib/types.ts` |
| `user_agent` | TEXT | User agent | `lib/types.ts` |
| `created_at` | TIMESTAMPTZ | Date creation | `lib/types.ts` |
| `updated_at` | TIMESTAMPTZ | Date maj | `services/preliminary-questionnaire.ts` |

---

### subscriptions

Abonnements des praticiens.

| Colonne | Type | Description | Utilise dans |
|---------|------|-------------|--------------|
| `id` | UUID | ID unique | `services/billing-service.ts` |
| `practitioner_id` | UUID | FK praticien | `services/billing-service.ts` |
| `plan_id` | UUID | FK plan | `services/billing-service.ts` |
| `status` | TEXT | active/canceled/past_due/trialing/incomplete | `services/billing-service.ts` |
| `billing_cycle` | TEXT | monthly/yearly | `services/billing-service.ts` |
| `current_period_start` | TIMESTAMPTZ | Debut periode | `services/billing-service.ts` |
| `current_period_end` | TIMESTAMPTZ | Fin periode | `services/billing-service.ts` |
| `cancel_at_period_end` | BOOLEAN | Annulation fin periode | `services/billing-service.ts` |
| `canceled_at` | TIMESTAMPTZ | Date annulation | `services/billing-service.ts` |
| `trial_end` | TIMESTAMPTZ | Fin essai | `services/billing-service.ts` |
| `stripe_customer_id` | TEXT | ID client Stripe | `services/billing-service.ts` |
| `stripe_subscription_id` | TEXT | ID abo Stripe | `services/billing-service.ts` |
| `stripe_price_id` | TEXT | ID prix Stripe | `services/billing-service.ts` |

---

## Relations entre tables

### Diagramme des relations principales

```
auth.users
    |
    v
practitioners (1) ----< (N) consultants
    |                        |
    |                        +----< (N) messages
    |                        +----< (N) appointments
    |                        +----< (N) consultations
    |                        +----< (1) consultant_anamnesis
    |                        +----< (N) journal_entries
    |                        +----< (N) consultant_plans
    |                        +----< (1) case_files ----< (N) complements
    |                        +----< (N) wearable_summaries
    |                        +----< (N) wearable_insights
    |
    +----< (N) consultant_invitations
    +----< (N) notifications
    +----< (N) preliminary_questionnaires
    +----< (1) subscriptions ----< (N) invoices
    +----< (N) payment_methods
    +----< (N) billing_history

subscription_plans (1) ----< (N) subscriptions

users (mobile) (1) ----< (N) consultant_memberships ----< (1) consultants
```

### Relations detaillees

| Table source | Colonne | Table cible | Type |
|--------------|---------|-------------|------|
| `practitioners` | `id` | `auth.users` | 1:1 |
| `consultants` | `practitioner_id` | `practitioners` | N:1 |
| `consultant_invitations` | `practitioner_id` | `practitioners` | N:1 |
| `consultant_invites` | `practitioner_id` | `practitioners` | N:1 |
| `consultant_invites` | `consultant_id` | `consultants` | N:1 |
| `otp_codes` | `practitioner_id` | `practitioners` | N:1 |
| `otp_codes` | `consultant_id` | `consultants` | N:1 |
| `messages` | `consultant_id` | `consultants` | N:1 |
| `notifications` | `practitioner_id` | `practitioners` | N:1 |
| `notifications` | `consultant_id` | `consultants` | N:1 |
| `appointments` | `consultant_id` | `consultants` | N:1 |
| `appointments` | `practitioner_id` | `practitioners` | N:1 |
| `consultations` | `consultant_id` | `consultants` | N:1 |
| `consultant_anamnesis` | `consultant_id` | `consultants` | 1:1 |
| `consultant_anamnesis` | `naturopath_id` | `practitioners` | N:1 |
| `preliminary_questionnaires` | `naturopath_id` | `practitioners` | N:1 |
| `preliminary_questionnaires` | `linked_consultant_id` | `consultants` | N:1 |
| `consultant_plans` | `consultant_id` | `consultants` | N:1 |
| `consultant_plans` | `practitioner_id` | `practitioners` | N:1 |
| `subscriptions` | `practitioner_id` | `practitioners` | N:1 |
| `subscriptions` | `plan_id` | `subscription_plans` | N:1 |
| `invoices` | `subscription_id` | `subscriptions` | N:1 |
| `invoices` | `practitioner_id` | `practitioners` | N:1 |
| `payment_methods` | `practitioner_id` | `practitioners` | N:1 |

---

## Comment mettre a jour la base de donnees

### Option 1 : Installation propre (nouvelle BDD)

> **ATTENTION** : Cette option SUPPRIME toutes les donnees existantes!

1. Ouvrir **Supabase Dashboard** > **SQL Editor**
2. Copier-coller **TOUT** le contenu de `SCHEMA_COMPLET.sql`
3. Cliquer **Run**
4. Verifier qu'il n'y a pas d'erreur
5. Verifier le nombre de tables creees (devrait etre 36)

### Option 2 : Mise a jour (BDD existante avec donnees)

> Cette option **PRESERVE** les donnees existantes

1. Ouvrir **Supabase Dashboard** > **SQL Editor**
2. Copier-coller **TOUT** le contenu de `MIGRATION_UPDATE.sql`
3. Cliquer **Run**
4. Verifier les resultats dans la section **VERIFICATION**
5. Comparer les colonnes avec la documentation

### Que choisir ?

| Situation | Script a utiliser |
|-----------|-------------------|
| Nouvelle installation | `SCHEMA_COMPLET.sql` |
| Base existante avec donnees | `MIGRATION_UPDATE.sql` |
| Reset complet (dev/staging) | `SCHEMA_COMPLET.sql` |
| Production avec clients | `MIGRATION_UPDATE.sql` |

### Verification post-migration

Apres avoir execute un script, verifiez :

```sql
-- Nombre de tables
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';
-- Attendu: 36

-- Liste des tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' ORDER BY table_name;

-- Verifier les colonnes d'une table specifique
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'consultants'
ORDER BY ordinal_position;
```

---

## Fichiers generes

| Fichier | Description |
|---------|-------------|
| `SCHEMA_COMPLET.sql` | Schema complet avec DROP/CREATE (installation propre) |
| `MIGRATION_UPDATE.sql` | Script de mise a jour (preservant les donnees) |
| `BDD_DOCUMENTATION.md` | Cette documentation |

---

## Notes importantes

1. **Row Level Security (RLS)** : Toutes les tables ont RLS active. Les policies sont definies pour que chaque praticien n'accede qu'a ses propres donnees.

2. **Tables legacy** : Certaines tables (`anamneses`, `anamnese_instances`) sont conservees pour compatibilite arriere mais `consultant_anamnesis` est la table moderne.

3. **Plans multiples** : Il existe plusieurs systemes de plans (`plans`/`plan_versions`/`plan_sections` vs `consultant_plans` vs `care_plans`). `consultant_plans` est le systeme principal.

4. **Auth mobile** : L'app mobile utilise sa propre table `users` avec `consultant_memberships` pour lier aux `consultants`.

5. **Soft delete** : Les consultants utilisent `deleted_at` pour le soft delete. Les requetes filtrent avec `.is('deleted_at', null)`.

---

*Documentation generee automatiquement - 2026-01-30*
