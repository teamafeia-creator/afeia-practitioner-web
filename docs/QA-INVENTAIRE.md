# QA — Inventaire réel du site AFEIA (espace praticien)

> Document produit à l'**Étape 0** (reconnaissance). Tout ce qui suit est constaté dans le code du repo à la date du 2026-08-11, branche `claude/afeia-debug-panel-qa-joylv2`. **Rien n'est inventé** ; les hypothèses sont signalées explicitement par le préfixe **[HYPOTHÈSE]**.

## 0. Notes de cadrage (à valider avec toi)

- **[HYPOTHÈSE / divergence de branche]** Tes contraintes demandent une branche `qa/mode-debug`. La configuration de ma session m'impose de développer et pousser sur `claude/afeia-debug-panel-qa-joylv2`. Je travaille donc sur cette dernière. Dis-moi si tu veux que je renomme/rebase.
- **[HYPOTHÈSE]** Le repo contient aussi un dossier `mobile-app/` (application Expo/React Native distincte) et une API `/api/mobile/*` qui la sert. La mission (« tester l'ensemble des fonctionnalités **du site** ») porte sur l'application **web**. J'inventorie l'API mobile pour complétude mais je **n'inclurai pas** l'app Expo dans la campagne Playwright, sauf demande contraire.
- Le repo est **volumineux** : 70 pages, ~130 routes API, 3 réalms d'authentification. L'inventaire ci-dessous est exhaustif sur les routes/API et représentatif+priorisé sur les formulaires.

---

## 1. Stack technique exacte

| Élément | Détail (constaté) |
|---|---|
| Framework | **Next.js 14.2.5** — App Router |
| Langage | **TypeScript 5.5** (`strict: true`), cible ES2022 |
| React | 18.3.1 (`reactStrictMode: true`) |
| Styling | **Tailwind CSS 3.4** + `app/globals.css`, glassmorphism ; `clsx` / helper `lib/cn.ts` |
| État / données | **@tanstack/react-query 5** (`QueryProvider`, staleTime 60s, `refetchOnWindowFocus: false`) ; état local `useState` (pas de Redux/Zustand) |
| Formulaires | **Aucun `react-hook-form` en pratique** : tous les formulaires sont contrôlés en `useState`, validation client manuelle. `@hookform/resolvers` + `react-hook-form` sont installés mais non utilisés côté formulaires réels. |
| Validation | **zod 3** utilisé **uniquement côté serveur** (`lib/invoicing/schemas.ts`) |
| Animations | framer-motion 11 |
| Icônes | lucide-react |
| BDD & Auth | **Supabase** (`@supabase/supabase-js 2.91`) — PostgreSQL + Supabase Auth |
| Paiement | **Stripe** (`stripe 20.2` serveur, `@stripe/stripe-js 8.6` client) + Stripe Connect |
| IA | **@anthropic-ai/sdk 0.74** — modèle `claude-haiku-4-5-20251001` |
| Email | **Resend** (via `fetch` REST brut, pas de SDK) |
| Vidéo | **Daily.co** (`@daily-co/daily-js` + `daily-react`) |
| PDF | `@react-pdf/renderer` |
| Calendrier | `react-big-calendar` + `moment` / `date-fns` |
| Dessin | `@excalidraw/excalidraw` |
| Toasts | `react-hot-toast` |
| Graphiques | `recharts` |
| Déploiement | **Vercel** (région `cdg1`), 1 cron (`/api/waitlist/cleanup` à 3h) |
| Images | **`images.unoptimized: true`** dans `next.config.mjs` (⚠️ aucune optimisation Next/Image) |
| Analytics | **Aucun** (pas de GA/Plausible/PostHog/Sentry/Vercel Analytics dans le code applicatif) |

### Tests déjà présents
- **Tests unitaires** (fichiers `*.test.ts`) dans `__tests__/` : `contraindications/matching-logic`, `cycle/cycle-utils`, `filters/consultant-filter-logic`, `invoicing/{email-templates,schemas,templates,utils}`.
  - **[HYPOTHÈSE]** Aucun runner configuré : `package.json` n'a **pas** de script `test` ni de dépendance Jest/Vitest. Ces fichiers ne sont donc pas exécutés en l'état.
- **Scripts de smoke** (Node, hors runner) : `scripts/auth-smoke-test.mjs` (`npm run auth:smoke`), `scripts/questionnaire-code-smoke-test.mjs` (`npm run questionnaire:smoke`), `scripts/screenshot-dashboard.mjs`.
- **Playwright 1.58 déjà installé** (`playwright` + `@playwright/test` en devDeps) mais **aucune config ni test E2E** (`playwright.config.*` absent, aucun `*.spec.ts`). → À initialiser en Étape 2.

---

## 2. Authentification & rôles (3 réalms distincts)

| Réalm | Mécanisme | Où | Protection des routes |
|---|---|---|---|
| **Praticien (web)** | Supabase Auth (email/password), session persistée `localStorage` (`storageKey: afeia-auth-token`) | `hooks/useAuth.ts`, `components/shell/AppShell.tsx` | **Côté client uniquement** : `AppShell` vérifie `supabase.auth.getSession()` et `router.replace('/login')` sinon. Pas de garde serveur/middleware sur `(app)`. |
| **Consultant (web)** | Supabase Auth (rôle `consultant` dans user metadata), + activation par code OTP / invite token | `app/consultant/(app)/layout.tsx`, `app/invite/*`, `app/consultant/*` | Client : layout consultant redirige vers `/consultant/login` si pas de session. |
| **Admin AFEIA** | Session cookie custom (`/api/admin/login` → cookie `afeia_admin_email`) **ou** Bearer Supabase + allowlist ; allowlist via `ADMIN_EMAILS` (env), table `admin_profiles`, ou `admin_allowlist` | `lib/admin/auth.ts` (`requireAdminAuth`, `checkIsAdmin`), `app/admin/layout.tsx` (vérifie `/api/admin/session`) | Client : layout admin appelle `/api/admin/session`, sinon redirige `/admin/login`. Les routes `/api/admin/*` appliquent `requireAdminAuth`. |
| **API mobile / consultant** | **JWT custom HS256** (`lib/auth.ts`, `lib/mobile-auth.ts`), Bearer token, exp 7j | `app/api/mobile/*`, `app/api/consultant/*` | CORS ouvert `*` (voir `middleware.ts`). |

**Points d'attention sécurité déjà repérés (Étape 0)** :
- Le badge « Admin » dans la sidebar praticien s'affiche selon la table `admin_allowlist` lue **côté client** (`AppShell`), mais la vraie protection admin est côté serveur — cohérent, à confirmer en test.
- `lib/auth.ts` : **secret JWT par défaut** `dev-jwt-secret-change-in-production` utilisé si `NODE_ENV=development`.
- `middleware.ts` : **CORS `Access-Control-Allow-Origin: *`** sur toute l'API + `next.config.mjs` ajoute `Access-Control-Allow-Credentials: true` avec `Origin: *` sur `/api/:path*` (combinaison à signaler — voir Étape 3).

---

## 3. Routes / pages (constatées, 70 pages)

### 3.1 Public (non authentifié)
| Route | Fichier | Rôle |
|---|---|---|
| `/` | `app/page.tsx` | Redirige vers `/dashboard` |
| `/login` | `app/login/page.tsx` | Connexion praticien |
| `/signup` | `app/signup/page.tsx` | Inscription praticien |
| `/reset-password` | `app/reset-password/page.tsx` | Demande / réinitialisation mot de passe (double mode) |
| `/logout` | `app/logout/page.tsx` | Déconnexion |
| `/welcome` | `app/welcome/page.tsx` | Page d'accueil marketing/onboarding |
| `/invite` | `app/invite/page.tsx` (+ `InviteClient.tsx`) | Consultant réclame un invite token |
| `/questionnaire` | `app/questionnaire/page.tsx` | Questionnaire préliminaire public (anamnèse) |
| `/rdv/[slug]` | `app/rdv/[slug]/page.tsx` (+ `BookingPageClient` & steps) | **Prise de RDV publique** (wizard) |
| `/rdv/[slug]` (404) | `app/rdv/[slug]/not-found.tsx` | Not-found spécifique au booking |
| `/paiement/succes` | `app/paiement/succes/page.tsx` | Retour paiement |
| `/onboarding/anamnese` | `app/onboarding/anamnese/page.tsx` | Anamnèse obligatoire consultant (auth) |
| `/consultation/video/[appointmentId]` | `app/consultation/video/[appointmentId]/page.tsx` | Salle vidéo Daily.co |

### 3.2 Espace praticien `(app)` (auth Supabase, `AppShell`)
Navigation principale (source `AppShell.tsx`) :
- **Suivi** : `/dashboard`, `/consultants`, `/agenda`
- **Outils** : `/messages`, `/questionnaires`, `/bibliotheque` (sous-menu : `/bibliotheque`, `/bibliotheque/blocs`)
- **Gestion** : `/facturation`, `/statistics`
- **Paramètres** : `/settings`

Pages complètes du groupe `(app)` :

| Route | Fichier |
|---|---|
| `/dashboard` | `app/(app)/dashboard/page.tsx` |
| `/consultants` | `app/(app)/consultants/page.tsx` |
| `/consultants/new` | `app/(app)/consultants/new/page.tsx` |
| `/consultants/[id]` | `app/(app)/consultants/[id]/page.tsx` |
| `/consultants/[id]/plan` | `app/(app)/consultants/[id]/plan/page.tsx` |
| `/consultants/[id]/plan/new` | `app/(app)/consultants/[id]/plan/new/page.tsx` |
| `/consultation/[consultantId]/bilan` | `app/(app)/consultation/[consultantId]/bilan/page.tsx` |
| `/consultations/[id]` | `app/(app)/consultations/[id]/page.tsx` |
| `/agenda` | `app/(app)/agenda/page.tsx` (+ AgendaView, AppointmentForm/Detail, GroupSessionForm/Detail) |
| `/messages` | `app/(app)/messages/page.tsx` |
| `/questionnaires` | `app/(app)/questionnaires/page.tsx` |
| `/questionnaires/[id]` | `app/(app)/questionnaires/[id]/page.tsx` |
| `/bibliotheque` | `app/(app)/bibliotheque/page.tsx` |
| `/bibliotheque/[slug]` | `app/(app)/bibliotheque/[slug]/page.tsx` |
| `/bibliotheque/nouvelle` | `app/(app)/bibliotheque/nouvelle/page.tsx` |
| `/bibliotheque/blocs` | `app/(app)/bibliotheque/blocs/page.tsx` |
| `/plans/[id]` | `app/(app)/plans/[id]/page.tsx` |
| `/facturation` | `app/(app)/facturation/page.tsx` (+ _components: InvoiceList/Filters/Stats) |
| `/facturation/[id]` | `app/(app)/facturation/[id]/page.tsx` (+ InvoiceActions/Detail/HistoryTimeline) |
| `/billing` | `app/(app)/billing/page.tsx` |
| `/billing/invoices` | `app/(app)/billing/invoices/page.tsx` |
| `/billing/manage` | `app/(app)/billing/manage/page.tsx` |
| `/billing/success` | `app/(app)/billing/success/page.tsx` |
| `/statistics` | `app/(app)/statistics/page.tsx` |
| `/morning-review` | `app/(app)/morning-review/page.tsx` |
| `/bague-connectee/en-savoir-plus` | `app/(app)/bague-connectee/en-savoir-plus/page.tsx` |
| `/circular/en-savoir-plus` | `app/(app)/circular/en-savoir-plus/page.tsx` |
| `/settings` | `app/(app)/settings/page.tsx` |
| `/settings/ai` | `app/(app)/settings/ai/page.tsx` |
| `/settings/availability` | `app/(app)/settings/availability/page.tsx` |
| `/settings/booking` | `app/(app)/settings/booking/page.tsx` |
| `/settings/consultation-types` | `app/(app)/settings/consultation-types/page.tsx` |
| `/settings/documents` | `app/(app)/settings/documents/page.tsx` |
| `/settings/rgpd` | `app/(app)/settings/rgpd/page.tsx` |
| `/settings/abonnement` | `app/(app)/settings/abonnement/page.tsx` |
| `/settings/facturation` | `app/(app)/settings/facturation/page.tsx` (+ BillingSettingsForm, InvoiceTemplatesManager) |
| `/settings/facturation/relances` | `app/(app)/settings/facturation/relances/page.tsx` |
| `/settings/facturation/stripe` | `app/(app)/settings/facturation/stripe/page.tsx` |

### 3.3 Espace consultant (`app/consultant`)
| Route | Fichier |
|---|---|
| `/consultant/login` | `app/consultant/login/page.tsx` |
| `/consultant/register` | `app/consultant/register/page.tsx` |
| `/consultant/activate` | `app/consultant/activate/page.tsx` |
| `/consultant/home` | `app/consultant/(app)/home/page.tsx` (auth) |
| `/consultant/demo` | `app/consultant/demo/page.tsx` |
| `/consultant/demo/create-plan` | `app/consultant/demo/create-plan/page.tsx` |

### 3.4 Espace admin (`app/admin`)
| Route | Fichier |
|---|---|
| `/admin/login` | `app/admin/login/page.tsx` |
| `/admin` | `app/admin/page.tsx` |
| `/admin/practitioners` | `app/admin/practitioners/page.tsx` |
| `/admin/practitioners/[id]` | `app/admin/practitioners/[id]/page.tsx` |
| `/admin/patients` | `app/admin/patients/page.tsx` |
| `/admin/patients/[id]` | `app/admin/patients/[id]/page.tsx` |
| `/admin/billing` | `app/admin/billing/page.tsx` |
| `/admin/blocs` | `app/admin/blocs/page.tsx` |
| `/admin/fiches` | `app/admin/fiches/page.tsx` |
| `/admin/fiches/nouvelle` | `app/admin/fiches/nouvelle/page.tsx` |
| `/admin/bague-connectee` | `app/admin/bague-connectee/page.tsx` |
| `/admin/circular` | `app/admin/circular/page.tsx` |
| `/admin/settings/admins` | `app/admin/settings/admins/page.tsx` |
| `/admin/settings/logs` | `app/admin/settings/logs/page.tsx` |

### 3.5 Métadonnées / assets dynamiques
`app/icon.tsx`, `app/apple-icon.tsx`, `app/favicon.ico/route.tsx` (favicon dynamique). **Aucun `sitemap.ts` / `robots.ts` / `opengraph-image` détecté** (voir Étape 3 SEO). Métadonnées globales dans `app/layout.tsx` (title template `%s | AFEIA`, OG, robots index/follow).

### 3.6 ⚠️ Liens internes vers des routes **absentes** (candidats 404 — pré-repérés Étape 0)
Références `href`/`router.push` sans page correspondante dans l'arborescence :
- `/notifications`
- `/consultant/demo/add-supplements`
- `/consultant/demo/daily-log`
- `/consultant/demo/messages`

Aussi présents en navigation mais **rendus inertes** (`href="#"`, `preventDefault`) : « Centre d'aide », « Contacter l'assistance », « Signaler un abus » (bouton flottant Aide de `AppShell`).

---

## 4. Formulaires et champs (par domaine)

> Rappel : validation **client manuelle** partout (`useState` + `if`/regex) ; zod seulement côté serveur pour l'invoicing.

### A. Authentification
1. **Login praticien** — `app/login/page.tsx` : `email`*, `password`* (toggle voir), « Se souvenir » (checkbox **non câblée**). → `supabase.auth.signInWithPassword`. Bouton secondaire « Accès Admin » → `/admin/login`.
2. **Signup praticien** — `app/signup/page.tsx` : `fullName`*, `email`*, `password`*, `confirmation`* (match). → `supabase.auth.signUp` (metadata `role: practitioner`).
3. **Reset password** — `app/reset-password/page.tsx` : mode demande (`email`*) / mode récupération (`newPassword`*, `confirmation`*). → `resetPasswordForEmail` / `updateUser`.
4. **Login admin** — `app/admin/login/page.tsx` : `email`*, `password`*. → `POST /api/admin/login`.
5. **Invite consultant** — `app/invite/InviteClient.tsx` : signup (`email`*,`password`*,`confirmation`*) / login (`email`*,`password`*). → `supabase.auth.*` puis `claimConsultantInvite(token)`.

### B. Public / consultant
6. **Prise de RDV** — `app/rdv/[slug]/BookingPageClient.tsx` (wizard type→date/groupe→contact→confirm). Étape contact : `name`*, `first_name`*, `email`* (regex), `phone`* (regex `^0\d{9}$`), `reason`, `consent_rgpd`* , `consent_cancellation`* (si politique). → `POST /api/booking/{slug}/book` ou `/group-sessions/{id}/register`.
7. **Liste d'attente** — `WaitlistForm.tsx` : `firstName`* (≥2), `email`*, `phone`, `consultationTypeId`, `preferredTimeOfDay`, `preferredDays[]`. → `POST /api/booking/{slug}/waitlist` (gère `DUPLICATE`).
8. **Questionnaire préliminaire public** — `app/questionnaire/page.tsx` : `naturopathId`*, `firstName`*, `lastName`*, `email`* (regex), `phone` + sections dynamiques `ANAMNESIS_SECTIONS`. → `submitPreliminaryQuestionnaire(...)`.
9. **Onboarding anamnèse** — `app/onboarding/anamnese/page.tsx` : champs dynamiques (`select`/textarea) → `submitAnamnese(consultantId, answers)`.

### C. Gestion consultants
10. **Nouveau consultant** — `app/(app)/consultants/new/page.tsx` : `name`*, `email`* (regex, sauf mode démo), `city`, `phone`, `isDemo`. → `invitationService.createInvitation` / `createDemoConsultant` → modale code d'activation.
11. **Nouveau conseillancier/plan** — `app/(app)/consultants/[id]/plan/new/page.tsx` : `title`*, `description`, `sections[]{title,content}`. → `POST /api/consultants/{id}/plans`.
12. **Messagerie** — `app/(app)/messages/page.tsx` : `messageText` (Enter), `searchQuery`. → `POST /api/consultants/{id}/messages`.

### D. Agenda
13. **RDV (create/edit)** — `AppointmentForm.tsx` : `consultant_id`*, `consultation_type_id`*, `date`*, `start_time`*, `end_time`, `location_type`, `video_link`, `notes_internal`. → `create/updateNativeAppointment` (+ `POST /api/video/provision` si Daily). Contrôle de conflit live.
14. **Séance de groupe / atelier** — `GroupSessionForm.tsx` : `consultation_type_id`* (groupe), `title`*, `description`, `date`, `start_time`/`end_time`, `location_type`, `location_details`, `max_participants` (2–50), `notes_internal`.

### E. Facturation
15. **Créer facture** — `components/invoicing/InvoiceModal.tsx` : `templateId`, `description`, `montant`, `paymentMethod`, `paymentNotes`, `createAsDraft`. → `POST /api/invoicing/create` (zod `createInvoiceSchema`).
16. **Modèles de facture** — `InvoiceTemplatesManager.tsx` : `label`*, `description`*, `montant`*, `duree`. → `POST /api/invoicing/templates`.
17. **Paramètres facturation** — `BillingSettingsForm.tsx` : `siret`* (14 chiffres), `adresse`* (≥10), `mentionTva`* (≥5), `statutJuridique`, `libelleDocument`, `emailAutoConsultant`, `emailCopiePraticien`. → `PUT /api/invoicing/settings`.
18. **Relances** — `settings/facturation/relances/page.tsx` : `relancesAuto`, `delaiJ7/J15/J30`, `templateJ7/J15/J30`. → `PUT /api/invoicing/settings/reminders`.
19. **Actions facture** — `facturation/[id]/_components/InvoiceActions.tsx` : mark-paid / refund (avoir) / cancel / update / payment-link / send-email.

### F. Paramètres praticien
20. **Prise de RDV** — `settings/booking/page.tsx` : `booking_enabled`, `booking_slug` (regex + dispo async), `booking_intro_text`, `booking_address`, `booking_phone`, `cancellation_policy_hours`, `cancellation_policy_text`, `video_provider`. → `supabase.from('practitioners').update`.
21. **Types de consultation** — `settings/consultation-types/page.tsx` : `name`*, `duration_minutes`, `price_cents`, `color`, `buffer_minutes`, `description`, `is_group`, `max_participants`, `is_bookable_online`.
22. **Disponibilités** — `settings/availability/page.tsx` : planning hebdo `{active, slots[]}` + modale exception (`date`*, `is_available`, `all_day`, `start/end`, `reason`).

### G. Contenu / Admin
23. **Ressource éducative** — `bibliotheque/nouvelle` + `components/resources/ResourceEditor.tsx` : `title`, `summary`, `content_type` (article/pdf/image/video_link), `content_markdown`/`video_url`, `category`, `tags`, `read_time_minutes`, upload `file` (storage `educational-resources`).
24. **Fiche admin** — `admin/fiches/nouvelle/page.tsx` : `title`*, `category`*, `summary`, `tags[]`, `read_time_minutes`, `is_published`, `content_markdown`* (preview). → `POST/PATCH /api/admin/fiches`.

Autres modales/actions notées : `SnoozeModal` (morning-review), `ActivationCodeModal` (affichage seul), invite praticien admin (`/api/admin/invite-practitioner`), renvoi codes activation/questionnaire.

---

## 5. API routes / server actions (constatées)

**Pas de Server Actions** (`'use server'`) détectées ; tout passe par des **Route Handlers** `app/api/**/route.ts` appelés en `fetch` client, ou par des appels **Supabase directs** depuis le client (agenda, settings, ressources).

Surface complète (méthodes réelles extraites du code) :

**Auth / session** : `/api/auth/login [POST]`, `/api/me [GET]`, `/api/admin/login [POST]`, `/api/admin/logout [POST]`, `/api/admin/session [GET]`.

**Admin** : `/api/admin/admins [GET,POST,DELETE]`, `/api/admin/audit-logs [GET]`, `/api/admin/dashboard [GET]`, `/api/admin/database [GET]`, `/api/admin/fresh-database [POST]`, `/api/admin/reset-database [POST]`, `/api/admin/reset-password [POST]`, `/api/admin/invite-practitioner [POST]`, `/api/admin/practitioners [GET]` (+ `/options [GET]`, `/[id] [GET,PATCH,DELETE]`), `/api/admin/patients [GET]` (+ `/[id] [GET]`), `/api/admin/consultants [GET]` (+ `/[id] [GET,PATCH]`), `/api/admin/billing [GET]`, `/api/admin/blocks [GET,POST]`, `/api/admin/fiches [GET,POST]` (+ `/[id] [GET,PATCH,DELETE]`), `/api/admin/bague-connectee [GET]`, `/api/admin/bague-connectee-sync [POST]`, `/api/admin/circular []` & `/circular-sync []` (ré-exports, aucune méthode propre).

**IA** : `/api/ai/generate-conseillancier [POST]`, `/api/ai/suggest-section [POST]`.

**Booking public** : `/api/booking/[slug]/available-days [GET]`, `/slots [GET]`, `/book [POST]`, `/ics [GET]`, `/group-sessions [GET]` (+ `/[sessionId]/register [POST]`), `/waitlist [POST,GET]` (+ `/[id] [DELETE]`).

**Consultants** : `/api/consultants/[id] [GET,PUT,DELETE]`, `/current-code [GET]`, `/dossier-pdf [GET]`, `/drawings/[drawingId]/pdf [GET]`, `/messages [GET,POST]` (+ `/mark-read [POST]`), `/plans [GET,POST]` (+ `/[planId]/pdf [GET]`, `/[planId]/share [POST]`), `/questionnaire/send-code [POST]`, `/api/consultants/send-activation-code [POST]`, `/send-activation-email [POST]`.

**Facturation (invoicing)** : `/create [POST]`, `/list [GET]`, `/stats [GET]`, `/[id] [GET]`, `/[id]/update [PATCH]`, `/mark-paid [POST]`, `/cancel [POST]`, `/refund [POST]`, `/payment-link [POST]`, `/generate-pdf [POST]`, `/send-email [POST]`, `/export/csv [GET]`, `/export/pdf-summary [GET]`, `/templates [GET,POST]`, `/settings [GET,PUT]`, `/settings/reminders [PUT]`, `/reminders/process [POST]` (cron, `CRON_SECRET`). `/api/group-sessions/[sessionId]/batch-invoice [POST]`.

**Billing (abonnement)** : `/api/billing/create-checkout [POST]`, `/cancel-subscription [POST]`, `/manage-subscription [POST]`, `/invoices/[id]/download [GET]`, `/webhooks [POST]`.

**Stripe Connect** : `/api/stripe/connect/onboarding [POST]`, `/account-status [GET]`, `/webhooks [POST]`.

**Blocs / templates / items** : `/api/blocks [GET,POST]` (+ `/[blockId] [GET,PUT,DELETE]`, `/favorite [POST]`, `/insert [POST]`), `/api/templates [GET,POST]` (+ `/[templateId] [GET,PUT,DELETE]`), `/api/items [GET]` (+ `/[id] [GET]`).

**Vidéo** : `/api/video/provision [POST]`, `/[appointmentId]/token [GET,POST]`, `/cleanup [GET]`.

**Divers** : `/api/messages [GET]`, `/api/summary [GET]`, `/api/invites/token [GET]`, `/api/questionnaire/verify-code [POST]`, `/api/consultant/finalize-auth [POST]`, `/api/waitlist/count [GET]`, `/notify [POST]`, `/cleanup [GET]` (cron).

**API mobile** (`/api/mobile/*`, hors périmètre test web) : auth (login/register/verify-otp/refresh-token/logout), anamnese, complements, conseils, cycle, dashboard, journal (+v2), messages, observance, plans, resources, consultant profile/naturopathe-info.

---

## 6. Appels réseau externes (constatés)

| Intégration | SDK / transport | Fichiers clés | Env |
|---|---|---|---|
| **Supabase** (BDD + Auth + Storage) | `@supabase/supabase-js` | client browser `lib/supabase.ts` (anon) ; `lib/supabase-admin.ts`, `lib/server/supabaseAdmin.ts`, `lib/supabase/admin.ts` (service role + auth) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| **Stripe** (abonnement) | `stripe` / `@stripe/stripe-js` | `lib/stripe/{client,server,config}.ts`, `app/api/billing/*` | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRODUCT_ID`, `STRIPE_PRICE_{MONTHLY,YEARLY,PREMIUM_MONTHLY,PREMIUM_YEARLY}` |
| **Stripe Connect** (paiements factures) | `stripe` | `lib/invoicing/stripe.ts`, `app/api/stripe/connect/*`, `/api/invoicing/[id]/{payment-link,refund}` | `STRIPE_CONNECT_WEBHOOK_SECRET` |
| **Anthropic** (IA) | `@anthropic-ai/sdk` | `app/api/ai/*`, `lib/ai/*` — modèle `claude-haiku-4-5-20251001` | `ANTHROPIC_API_KEY` |
| **Resend** (email) | `fetch` REST → `api.resend.com/emails` | `lib/email.ts`, `lib/server/email.ts`, `lib/server/questionnaireEmail.ts`, invoicing send-email/reminders, edge `send-otp` | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` |
| **Daily.co** (vidéo) | `fetch` REST → `api.daily.co/v1` + SDK client | `lib/server/daily.ts`, `app/api/video/*`, `components/video/*` | `DAILY_API_KEY`, `DAILY_DOMAIN` |
| **Bague connectée / Circular** | **Aucun appel externe direct** — délégué à un RPC Supabase (`admin_trigger_bague_connectee_sync`) | `app/api/admin/bague-connectee*` | (côté BDD) |
| **Google Fonts** | `<link>` preconnect | `app/layout.tsx` | — |
| **Notion / screenshots** | scripts dev uniquement (`https-proxy-agent`) | `scripts/*` | `NOTION_TOKEN`, `HTTPS_PROXY` |

Autres env non-tiers : `JWT_SECRET`, `QUESTIONNAIRE_{JWT_SECRET,CODE_PEPPER,CODE_TTL_MINUTES}`, `ADMIN_EMAILS`, `ADMIN_PASSWORD`, `CRON_SECRET`, `ENABLE_FRESH_DATABASE`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL`.

---

## 7. Constats préliminaires utiles pour les Étapes 1 et 2

Ces points ne sont pas encore des « bugs confirmés » : ils orientent le mode debug et le plan de test.

1. **Aucun Error Boundary / `error.tsx` / `global-error.tsx` / `not-found.tsx` racine** (seul `app/rdv/[slug]/not-found.tsx` existe). → Étape 1 devra en ajouter (pour capter les erreurs de rendu React) ; le 404 global utilise la page par défaut de Next.
2. **Bruit console important** : `console.log`/`console.error` nombreux (`hooks/useAuth.ts`, `lib/supabase.ts`, layouts…). La règle Étape 2 « toute erreur console échoue le test » nécessitera soit un nettoyage préalable, soit une **liste d'exceptions documentée** (je proposerai la seconde option, sans modifier la logique métier).
3. **`images.unoptimized: true`** : toutes les images sont servies brutes → item « performance / images non optimisées » déjà attendu.
4. **Protection des routes 100% côté client** (praticien & consultant) : l'accès direct anonyme à une route protégée provoque un flash de contenu puis redirection. À tester explicitement (Étape 2 – robustesse/auth).
5. **CORS `*` + `Allow-Credentials: true`** sur toute l'API : à signaler en sécurité.
6. **Liens morts** (§3.6) : 4 routes candidates 404 + 3 liens « Aide » inertes.
7. **Pas de `sitemap`/`robots` dédiés**, `robots: index/follow` global alors que l'app est surtout un espace authentifié → à discuter (SEO).
8. **63/70 pages sont des Client Components** (`'use client'`) : le mode debug côté client aura une bonne visibilité sur les données de page.

---

## 8. Périmètre proposé pour la suite (à confirmer)

- **Étape 1 (mode debug)** : panneau à onglets extensible, 4 outils (Erreurs, Réseau, Route & données, Environnement), activation `?debug=1`, import dynamique, format de rapport copiable, masquage des secrets. Ajout des `error.tsx`/`global-error.tsx` requis (ne modifie pas la logique métier).
- **Étape 2 (Playwright)** : init config + tests E2E sur le **web** (praticien/public/consultant/admin), règle « erreur console = échec » avec liste d'exceptions documentée. **[HYPOTHÈSE]** l'exécution réelle nécessitera un environnement Supabase/Stripe de test ou du mocking ; je le préciserai dans `QA-PLAN.md`.
- **Étape 3** : rapport `QA-RAPPORT.md` (tableau + fiches d'échec au format debug + correctifs proposés, non appliqués).

---

*Fin de l'inventaire — Étape 0. J'attends ta validation avant de démarrer l'Étape 1.*
