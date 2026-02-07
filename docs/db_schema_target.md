# Schéma cible minimal (dérivé du code)

Ce schéma est **le minimum nécessaire** pour faire tourner les flux applicatifs observés dans le repo. Les contraintes listées sont celles directement justifiées par le code (valeurs connues, relations attendues, filtres récurrents).

## Tables

### public.practitioners
- `id` UUID **PK** (doit référencer `auth.users.id`) — source de vérité côté Auth.
- `email` TEXT NOT NULL.
- `full_name` TEXT NOT NULL DEFAULT '' (alimenté par `raw_user_meta_data.full_name`).
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now().
- `updated_at` TIMESTAMPTZ NOT NULL DEFAULT now().

**RLS**: `auth.uid() = id` pour SELECT/INSERT/UPDATE/DELETE.

### public.consultants
- `id` UUID **PK** DEFAULT gen_random_uuid().
- `practitioner_id` UUID NOT NULL **FK** -> `public.practitioners(id)`.
- `name` TEXT NOT NULL.
- `email` TEXT NULL.
- `age` INTEGER NULL.
- `city` TEXT NULL.
- `status` TEXT NOT NULL DEFAULT 'standard' (valeurs utilisées: `standard|premium`).
- `is_premium` BOOLEAN NOT NULL DEFAULT false.
- `circular_enabled` BOOLEAN NOT NULL DEFAULT false.
- `circular_connected` BOOLEAN NOT NULL DEFAULT false.
- `last_circular_sync_at` TIMESTAMPTZ NULL.
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now().
- `updated_at` TIMESTAMPTZ NOT NULL DEFAULT now().

**RLS**: `practitioner_id = auth.uid()`.

### public.anamneses
- `id` UUID **PK** DEFAULT gen_random_uuid().
- `consultant_id` UUID NOT NULL **FK** -> `public.consultants(id)`.
- `motif` TEXT NULL.
- `objectifs` TEXT NULL.
- `alimentation` TEXT NULL.
- `digestion` TEXT NULL.
- `sommeil` TEXT NULL.
- `stress` TEXT NULL.
- `complement` TEXT NULL.
- `allergies` TEXT NULL.
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now().
- `updated_at` TIMESTAMPTZ NOT NULL DEFAULT now().

**RLS**: accès restreint aux consultants du praticien (`consultants.practitioner_id = auth.uid()`).

### public.consultations
- `id` UUID **PK** DEFAULT gen_random_uuid().
- `consultant_id` UUID NOT NULL **FK** -> `public.consultants(id)`.
- `date` TIMESTAMPTZ NOT NULL.
- `notes` TEXT NULL.
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now().
- `updated_at` TIMESTAMPTZ NOT NULL DEFAULT now().

**RLS**: accès restreint aux consultants du praticien.

### public.plans
- `id` UUID **PK** DEFAULT gen_random_uuid().
- `consultant_id` UUID NOT NULL **FK** -> `public.consultants(id)`.
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now().

**RLS**: accès restreint aux consultants du praticien.

### public.plan_versions
- `id` UUID **PK** DEFAULT gen_random_uuid().
- `plan_id` UUID NOT NULL **FK** -> `public.plans(id)`.
- `version` INTEGER NOT NULL.
- `title` TEXT NOT NULL.
- `published_at` TIMESTAMPTZ NULL.

**RLS**: accès restreint via jointure `plans -> consultants`.

### public.plan_sections
- `id` UUID **PK** DEFAULT gen_random_uuid().
- `plan_version_id` UUID NOT NULL **FK** -> `public.plan_versions(id)`.
- `title` TEXT NOT NULL.
- `body` TEXT NULL.
- `sort_order` INTEGER NOT NULL DEFAULT 0.

**RLS**: accès restreint via jointure `plan_versions -> plans -> consultants`.

### public.consultant_plans (Conseillanciers / PHV)
- `id` UUID **PK** DEFAULT gen_random_uuid().
- `consultant_id` UUID NOT NULL **FK** -> `public.consultants(id)`.
- `practitioner_id` UUID NOT NULL **FK** -> `public.practitioners(id)`.
- `version` INTEGER NOT NULL DEFAULT 1.
- `status` TEXT NOT NULL DEFAULT 'draft' (valeurs: `draft|shared`).
- `content` JSONB NULL — contenu enrichi du conseillancier (40+ champs). Structure définie dans `lib/conseillancier.ts`.
- `shared_at` TIMESTAMPTZ NULL — date de partage au consultant.
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now().
- `updated_at` TIMESTAMPTZ NOT NULL DEFAULT now().

**RLS**: accès restreint aux consultants du praticien (`practitioner_id = auth.uid()`).

### public.journal_entries
- `id` UUID **PK** DEFAULT gen_random_uuid().
- `consultant_id` UUID NOT NULL **FK** -> `public.consultants(id)`.
- `date` DATE NOT NULL.
- `mood` TEXT NULL.
- `energy` TEXT NULL.
- `text` TEXT NULL.
- `adherence_hydratation` BOOLEAN NOT NULL DEFAULT false.
- `adherence_respiration` BOOLEAN NOT NULL DEFAULT false.
- `adherence_mouvement` BOOLEAN NOT NULL DEFAULT false.
- `adherence_plantes` BOOLEAN NOT NULL DEFAULT false.
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now().

**RLS**: accès restreint aux consultants du praticien.

### public.messages
- `id` UUID **PK** DEFAULT gen_random_uuid().
- `consultant_id` UUID NOT NULL **FK** -> `public.consultants(id)`.
- `text` TEXT NULL.
- `body` TEXT NULL.
- `sender` TEXT NULL.
- `sender_role` TEXT NULL (valeurs utilisées: `consultant|practitioner`).
- `read_by_practitioner` BOOLEAN NOT NULL DEFAULT false.
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now().
- `sent_at` TIMESTAMPTZ NOT NULL DEFAULT now().
- `updated_at` TIMESTAMPTZ NULL.

**RLS**: accès restreint aux consultants du praticien.

### public.wearable_summaries
- `id` UUID **PK** DEFAULT gen_random_uuid().
- `consultant_id` UUID NOT NULL **FK** -> `public.consultants(id)`.
- `date` DATE NOT NULL.
- `sleep_duration` NUMERIC NULL.
- `sleep_score` NUMERIC NULL.
- `hrv_avg` NUMERIC NULL.
- `activity_level` NUMERIC NULL.
- `completeness` NUMERIC NULL.
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now().

**RLS**: accès restreint aux consultants du praticien.

### public.wearable_insights
- `id` UUID **PK** DEFAULT gen_random_uuid().
- `consultant_id` UUID NOT NULL **FK** -> `public.consultants(id)`.
- `type` TEXT NULL.
- `level` TEXT NULL.
- `message` TEXT NULL.
- `suggested_action` TEXT NULL.
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now().

**RLS**: accès restreint aux consultants du praticien.

### public.notifications
- `id` UUID **PK** DEFAULT gen_random_uuid().
- `practitioner_id` UUID NOT NULL **FK** -> `public.practitioners(id)`.
- `consultant_id` UUID NULL **FK** -> `public.consultants(id)`.
- `title` TEXT NOT NULL.
- `description` TEXT NULL.
- `level` TEXT NOT NULL (valeurs utilisées: `info|attention`).
- `read` BOOLEAN NOT NULL DEFAULT false.
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now().

**RLS**: `practitioner_id = auth.uid()`.

### public.appointments
- `id` UUID **PK** DEFAULT gen_random_uuid().
- `consultant_id` UUID NOT NULL **FK** -> `public.consultants(id)`.
- `start_at` TIMESTAMPTZ NOT NULL.
- `status` TEXT NOT NULL DEFAULT 'scheduled' (valeurs utilisées: `scheduled|done|cancelled`).
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now().
- `updated_at` TIMESTAMPTZ NOT NULL DEFAULT now().

**RLS**: accès restreint aux consultants du praticien.

### public.anamnese_instances
- `consultant_id` UUID **PK** **FK** -> `public.consultants(id)`.
- `status` TEXT NOT NULL DEFAULT 'PENDING' (valeurs utilisées: `PENDING|COMPLETED`).
- `answers` JSONB NULL.
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now().
- `updated_at` TIMESTAMPTZ NOT NULL DEFAULT now().

**RLS**: accès praticien via consultant + accès consultant via `consultant_memberships`.

### public.consultant_invites
- `id` UUID **PK** DEFAULT gen_random_uuid().
- `practitioner_id` UUID NOT NULL **FK** -> `public.practitioners(id)`.
- `consultant_id` UUID NOT NULL **FK** -> `public.consultants(id)`.
- `token` TEXT NOT NULL **UNIQUE**.
- `email` TEXT NOT NULL.
- `expires_at` TIMESTAMPTZ NOT NULL.
- `used_at` TIMESTAMPTZ NULL.
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now().
- `updated_at` TIMESTAMPTZ NOT NULL DEFAULT now().

**RLS**: `practitioner_id = auth.uid()`.

### public.consultant_memberships
- `consultant_id` UUID NOT NULL **FK** -> `public.consultants(id)`.
- `consultant_user_id` UUID NOT NULL **FK** -> `auth.users(id)`.
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now().
- **PK** (`consultant_id`, `consultant_user_id`).
- **UNIQUE** (`consultant_id`), **UNIQUE** (`consultant_user_id`).

**RLS**: `consultant_user_id = auth.uid()` (lecture).

### public.consultant_questionnaire_codes
- `id` UUID **PK** DEFAULT gen_random_uuid().
- `consultant_id` UUID NOT NULL **FK** -> `public.consultants(id)`.
- `code_hash` TEXT NOT NULL.
- `attempts` INTEGER NOT NULL DEFAULT 0.
- `expires_at` TIMESTAMPTZ NOT NULL.
- `sent_to_email` TEXT NOT NULL.
- `created_by_user_id` UUID NOT NULL (utilise `auth.users.id`).
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now().
- `revoked_at` TIMESTAMPTZ NULL.
- `used_at` TIMESTAMPTZ NULL.

**RLS**: `consultant_id` appartient au praticien (`consultants.practitioner_id = auth.uid()`).

## RPC / Triggers
- **RPC**: `public.claim_consultant_invite(token TEXT)` — vérifie le token et crée `consultant_memberships` pour l’utilisateur authentifié.
- **Trigger**: `public.handle_new_practitioner()` `AFTER INSERT` sur `auth.users` pour créer `public.practitioners`.

## INFERENCES (non appliquées)
- Types/valeurs énumérées pour `journal_entries.mood` et `journal_entries.energy` (présentes dans les types TS mais non validées par le code métier).
- Format exact des valeurs `messages.sender` (legacy) — le code accepte `'praticien'` et `'consultant'`, sans contrainte SQL stricte.
- Nature exacte de `wearable_*` (NUMERIC vs INTEGER) — le code ne précise pas de précision.
