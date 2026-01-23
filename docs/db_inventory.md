# AFEIA DB Inventory (derived from repo code)

## Sources scanned
- Supabase client calls (`.from(...)`, `.rpc(...)`) in `lib/`, `services/`, and `app/` routes/pages.
- Supabase SQL migrations and schema snapshots under `supabase/` (for triggers/RPC definitions referenced in code).

## Tables referenced in code

### practitioners
- **Where referenced**: Supabase migrations define trigger `handle_new_practitioner` inserting into `public.practitioners`.
- **Columns used**
  - `id` (UUID) — inserted from `auth.users.id` in trigger.
  - `email` (TEXT) — inserted from `auth.users.email`.
  - `full_name` (TEXT) — inserted from `auth.users.raw_user_meta_data.full_name`.
  - `created_at` / `updated_at` (TIMESTAMPTZ) — used in TypeScript types for practitioners.
- **Routes/pages/actions**: trigger on `auth.users` (SQL).

### patients
- **Where referenced**: `lib/queries.ts`, `services/patients.ts`, `services/invites.ts`, `app/api/questionnaire`, `app/api/patients/.../send-code`.
- **Columns used**
  - `id` (UUID) — `.eq('id', ...)`, `.select('id')`.
  - `practitioner_id` (UUID) — inserted when creating a patient; checked in API route.
  - `name` (TEXT) — selected and displayed.
  - `email` (TEXT, nullable) — selected, used for invites and questionnaire email.
  - `age` (INTEGER, nullable) — selected/inserted.
  - `city` (TEXT, nullable) — selected/inserted.
  - `status` (TEXT) — values `'standard' | 'premium'` used in UI and inserts.
  - `is_premium` (BOOLEAN) — selected/inserted; used in dashboard.
  - `circular_enabled` (BOOLEAN) — selected/inserted.
  - `circular_connected` (BOOLEAN) — selected.
  - `last_circular_sync_at` (TIMESTAMPTZ, nullable) — selected.
  - `created_at` / `updated_at` (TIMESTAMPTZ) — selected/updated.
- **Relations inferred**
  - `patients.practitioner_id -> practitioners.id` (checked in API).
- **Routes/pages/actions**: dashboard, patient list/detail, new patient form, invite creation, questionnaire APIs.

### anamneses
- **Where referenced**: `lib/queries.ts` (fetch patient details).
- **Columns used**
  - `patient_id` (UUID) — `.eq('patient_id', ...)`.
  - Additional fields read from `select('*')` and consumed in UI/types: `motif`, `objectifs`, `alimentation`, `digestion`, `sommeil`, `stress`, `complement`, `allergies` (TEXT); `created_at`, `updated_at` (TIMESTAMPTZ).
- **Routes/pages/actions**: patient details (consultations view).

### consultations
- **Where referenced**: `lib/queries.ts`.
- **Columns used**
  - `id` (UUID) — `.eq('id', ...)`.
  - `patient_id` (UUID) — `.eq('patient_id', ...)`.
  - `date` (TIMESTAMPTZ) — ordering and UI formatting.
  - `notes` (TEXT, nullable) — used in UI types.
  - `created_at` / `updated_at` (TIMESTAMPTZ) — in types.
- **Routes/pages/actions**: consultation detail (data load).

### plans
- **Where referenced**: `lib/queries.ts`.
- **Columns used**
  - `id` (UUID) — `.eq('id', ...)`.
  - `patient_id` (UUID) — `.eq('patient_id', ...)`.
  - `created_at` (TIMESTAMPTZ).
- **Relations inferred**
  - `plans.patient_id -> patients.id` (selects by patient).

### plan_versions
- **Where referenced**: `lib/queries.ts`.
- **Columns used**
  - `id` (UUID).
  - `plan_id` (UUID) — `.eq('plan_id', ...)`.
  - `version` (INTEGER) — ordering.
  - `title` (TEXT), `published_at` (TIMESTAMPTZ) — used in types/UI.

### plan_sections
- **Where referenced**: `lib/queries.ts`.
- **Columns used**
  - `id` (UUID).
  - `plan_version_id` (UUID) — `.eq('plan_version_id', ...)`.
  - `title` (TEXT), `body` (TEXT, nullable), `sort_order` (INTEGER) — ordering and UI.

### journal_entries
- **Where referenced**: `lib/queries.ts`.
- **Columns used**
  - `patient_id` (UUID) — `.eq('patient_id', ...)`.
  - `date` (DATE/TIMESTAMPTZ) — ordering.
  - Additional fields consumed via `select('*')` and UI/types: `text` (TEXT), `mood`, `energy`, `adherence_hydratation`, `adherence_respiration`, `adherence_mouvement`, `adherence_plantes`.

### messages
- **Where referenced**: `lib/queries.ts`, `services/patients.ts`.
- **Columns used**
  - `id` (UUID).
  - `patient_id` (UUID) — `.eq('patient_id', ...)`.
  - `text` (TEXT) — insert + UI fallback.
  - `body` (TEXT) — UI fallback.
  - `sender` (TEXT) — insert (`'patient' | 'praticien'`).
  - `sender_role` (TEXT) — filters and UI normalization (`'patient' | 'practitioner'`).
  - `read_by_practitioner` (BOOLEAN) — unread count filter.
  - `created_at`, `sent_at`, `updated_at` (TIMESTAMPTZ) — ordering / fallback timestamps.
- **Relations inferred**
  - `messages.patient_id -> patients.id`.

### wearable_summaries
- **Where referenced**: `lib/queries.ts`, `services/patients.ts`.
- **Columns used**
  - `id` (UUID).
  - `patient_id` (UUID) — `.eq('patient_id', ...)`.
  - `date` (DATE/TIMESTAMPTZ) — ordering.
  - `sleep_duration`, `sleep_score`, `hrv_avg`, `activity_level`, `completeness` (NUMERIC/INTEGER) — UI mapping.
  - `created_at` (TIMESTAMPTZ).

### wearable_insights
- **Where referenced**: `lib/queries.ts`, `services/patients.ts`.
- **Columns used**
  - `id` (UUID).
  - `patient_id` (UUID) — `.eq('patient_id', ...)`.
  - `type`, `level`, `message`, `suggested_action` (TEXT) — UI mapping.
  - `created_at` (TIMESTAMPTZ).

### notifications
- **Where referenced**: `lib/queries.ts`, `app/(app)/dashboard/page.tsx`.
- **Columns used**
  - `id` (UUID).
  - `practitioner_id` (UUID).
  - `patient_id` (UUID, nullable).
  - `title` (TEXT).
  - `description` (TEXT, nullable).
  - `level` (TEXT: `'info' | 'attention'`).
  - `read` (BOOLEAN).
  - `created_at` (TIMESTAMPTZ) — ordering.

### appointments
- **Where referenced**: `services/patients.ts`.
- **Columns used**
  - `id` (UUID).
  - `patient_id` (UUID).
  - `start_at` (TIMESTAMPTZ) — date ordering.
  - `status` (TEXT: `'scheduled' | 'done' | 'cancelled'`).

### anamnese_instances
- **Where referenced**: `services/anamnese.ts`, `services/patients.ts`, `app/onboarding/anamnese/page.tsx`.
- **Columns used**
  - `patient_id` (UUID) — upsert conflict key, filters.
  - `status` (TEXT: `'PENDING' | 'COMPLETED'`).
  - `answers` (JSONB) — stored questionnaire answers.
  - `created_at`, `updated_at` (TIMESTAMPTZ).

### patient_invites
- **Where referenced**: `services/invites.ts` (insert) and SQL RPC `claim_patient_invite`.
- **Columns used**
  - `id` (UUID).
  - `practitioner_id` (UUID).
  - `patient_id` (UUID).
  - `token` (TEXT).
  - `email` (TEXT).
  - `expires_at` (TIMESTAMPTZ).
  - `used_at` (TIMESTAMPTZ).
  - `created_at`, `updated_at` (TIMESTAMPTZ).

### patient_memberships
- **Where referenced**: `app/onboarding/anamnese/page.tsx`, `services/patients.ts` (RLS dependencies).
- **Columns used**
  - `patient_id` (UUID).
  - `patient_user_id` (UUID).
  - `created_at` (TIMESTAMPTZ).

### patient_questionnaire_codes
- **Where referenced**: `app/api/patients/[patientId]/questionnaire/send-code/route.ts`, `app/api/questionnaire/verify-code/route.ts`.
- **Columns used**
  - `id` (UUID).
  - `patient_id` (UUID).
  - `created_at` (TIMESTAMPTZ) — ordering and rate limit.
  - `code_hash` (TEXT).
  - `expires_at` (TIMESTAMPTZ).
  - `sent_to_email` (TEXT).
  - `created_by_user_id` (UUID).
  - `revoked_at`, `used_at` (TIMESTAMPTZ).
  - `attempts` (INTEGER).

## RPC / Functions / Triggers referenced
- **RPC**: `claim_patient_invite(token TEXT)` is called from the app (`services/invites.ts`).
- **Triggers**: `handle_new_practitioner` runs `AFTER INSERT` on `auth.users` to create a `public.practitioners` row (defined in migrations).

## SQL-only references
- SQL migrations under `supabase/migrations` also reference the same tables listed above and define RLS policies, constraints, and functions. No additional production tables beyond the list above are required by runtime code paths.
