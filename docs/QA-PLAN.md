# QA — Plan de tests AFEIA (Étape 2)

> Plan couvrant, pour chaque fonctionnalité inventoriée à l'Étape 0, le cas
> nominal, les cas limites et les cas d'erreur. L'implémentation est en
> **Playwright** (`e2e/`), avec la règle stricte : **toute erreur console
> d'origine applicative pendant un test le fait échouer**.

## 0. Contraintes d'environnement (à lire avant tout)

**Le réseau sortant est bloqué dans l'environnement d'exécution** (sandbox) :
Supabase, Google Fonts, Stripe et Daily.co sont injoignables
(`ERR_TUNNEL_CONNECTION_FAILED`, `ERR_CONNECTION_RESET`). Conséquences directes,
posées explicitement comme **hypothèses de travail** :

1. **Les flux dépendant du backend ne sont pas exerçables ici** : connexion
   réelle, chargement de données authentifiées, création (RDV, facture,
   consultant), paiement Stripe, vidéo Daily, envoi d'e-mails. Ces cas sont
   **spécifiés** dans ce plan mais marqués `⛔ backend requis` ; ils devront être
   rejoués dans un environnement disposant d'un Supabase/Stripe de test (ou avec
   mocking réseau dédié).
2. **La campagne automatisée ici se concentre sur la qualité front
   structurelle**, qui ne dépend pas du backend : routing, page 404, SEO/méta,
   accessibilité de base, responsive, validation **client** des formulaires,
   liens externes, erreurs d'hydratation, propreté de la console.
3. **Règle « erreur console = échec » — implémentation** : un test échoue si la
   page lève une exception non gérée (`pageerror`) OU logue une `console.error`
   **non attribuable au backend bloqué**. Une allowlist documentée
   (`e2e/console-guard.ts`) neutralise le bruit d'infrastructure
   (`Failed to fetch`, `net::ERR_*`, et les wrappers applicatifs connus autour de
   ces échecs réseau : « Error loading notifications », « Error fetching unread
   count », « Error loading practitioners »…). Ce bruit est **par ailleurs
   remonté comme constat** dans le rapport (l'app logue son état interne en
   `console.error`/`console.log` — cf. Étape 0).

Le plan ci-dessous reste **complet** (il décrit la cible QA du site) ; la colonne
« Automatisé ici » indique ce qui est réellement couvert par la suite Playwright
dans ce sandbox.

---

## 1. Périmètre & matrice par fonctionnalité

Réalms : **Public**, **Praticien** (auth Supabase), **Consultant** (auth
Supabase), **Admin** (session cookie). Détail des routes/formulaires : voir
`QA-INVENTAIRE.md`.

### 1.1 Navigation & routing

| Cas | Type | Automatisé ici |
|---|---|---|
| Tous les liens internes des pages publiques mènent à une route existante (aucun 404 involontaire) | Nominal | ✅ |
| Les 4 liens morts repérés (`/notifications`, `/consultant/demo/{add-supplements,daily-log,messages}`) renvoient bien un 404 | Erreur | ✅ (confirme le bug) |
| Route inexistante `/xxxx` → page 404 Next par défaut (statut 404, pas de crash) | Erreur | ✅ |
| `/rdv/slug-inexistant` → `not-found.tsx` dédié | Erreur | ✅ |
| Retour/aller navigateur (back/forward) ne casse pas l'app | Robustesse | ✅ |
| Liens externes en `target="_blank"` ont `rel="noopener"` | Sécurité | ✅ |
| Redirection `/` → `/dashboard` → `/login` (anonyme) | Nominal | ✅ |

### 1.2 Authentification

| Cas | Type | Automatisé ici |
|---|---|---|
| Login : champs requis, e-mail invalide, bouton désactivé/état chargement | Limite | ✅ (validation client) |
| Login : identifiants erronés → message d'erreur | Erreur | ⛔ backend requis |
| Login réussi → `/dashboard` | Nominal | ⛔ backend requis |
| Signup : mots de passe non concordants, e-mail invalide | Limite | ✅ (validation client) |
| Reset password : e-mail requis, double mode | Limite | ✅ (mode demande) |
| Déconnexion → `/login` | Nominal | ⛔ backend requis |
| Accès direct à une route protégée en anonyme → redirection `/login` | Sécurité | ✅ |
| Session expirée → redirection | Erreur | ⛔ backend requis |
| Admin login : accès `/admin` sans session → `/admin/login` | Sécurité | ✅ |

### 1.3 Formulaires (transverse)

| Cas | Type | Automatisé ici |
|---|---|---|
| Champs requis non remplis → soumission bloquée / message | Limite | ✅ (login, signup, reset, booking contact) |
| Formats invalides (e-mail, téléphone `^0\d{9}$`, SIRET 14 chiffres) | Limite | ✅ (validation client là où présente) |
| Double soumission (double-clic) ne crée pas 2 requêtes | Robustesse | ✅ (état bouton) |
| Envoi hors-ligne → message d'erreur géré | Erreur | ⚠️ partiel (simulation offline) |
| Message d'erreur serveur affiché | Erreur | ⛔ backend requis |
| Message de succès + état de chargement | Nominal | ⛔ backend requis (client visible partiel) |

Formulaires ciblés : login, signup, reset-password, booking (`/rdv/[slug]`
contact + waitlist), questionnaire public, invoicing (create/settings),
agenda (RDV/atelier), settings (booking/consultation-types/availability),
nouveau consultant, nouveau plan, ressource/fiche. (Détail Étape 0.)

### 1.4 Responsive (375 / 768 / 1440 px)

| Cas | Type | Automatisé ici |
|---|---|---|
| Aucun débordement horizontal (scrollWidth ≤ clientWidth) | Nominal | ✅ (pages publiques) |
| Éléments cliquables ≥ 44×44px | Nominal | ✅ (échantillon) |
| Menu/hamburger utilisable en mobile | Nominal | ⛔ backend requis (AppShell auth) |

### 1.5 Robustesse

| Cas | Type | Automatisé ici |
|---|---|---|
| Rechargement en cours de parcours (wizard booking) | Robustesse | ✅ (partiel) |
| Query params invalides (`?debug=xxx`, `?foo=bar`) sans crash | Robustesse | ✅ |
| Back/forward | Robustesse | ✅ |
| Double-clic sur boutons d'action | Robustesse | ✅ |

### 1.6 Accessibilité de base

| Cas | Type | Automatisé ici |
|---|---|---|
| `alt` présent sur toutes les images | A11y | ✅ |
| Hiérarchie des titres (un seul `h1`, pas de saut de niveau majeur) | A11y | ✅ |
| `label` associé à chaque input (for/id, aria-label ou wrapping) | A11y | ✅ |
| Focus visible au clavier | A11y | ✅ (heuristique) |
| `<html lang="fr">` | A11y | ✅ |
| Contrastes suffisants | A11y | ⚠️ manuel (non fiable en auto sans axe-core) |

### 1.7 SEO / méta

| Cas | Type | Automatisé ici |
|---|---|---|
| `title` présent et unique par page | SEO | ✅ |
| `meta description` présente (et idéalement unique) | SEO | ✅ |
| Open Graph (og:title, og:type…) | SEO | ✅ (présence sur racine) |
| Favicon servi | SEO | ✅ |
| `sitemap.xml` | SEO | ✅ (constat : absent) |
| `robots.txt` | SEO | ✅ (constat : absent, `robots: index/follow` global) |

### 1.8 Performance

| Cas | Type | Automatisé ici |
|---|---|---|
| Erreurs d'hydratation (mismatch SSR/CSR) | Perf | ✅ (via pageerror/console) |
| Images non optimisées (`images.unoptimized: true`) | Perf | ✅ (constat de config) |
| Poids des images (public/) | Perf | ✅ (mesure statique) |

### 1.9 Fonctionnalités métier `⛔ backend requis` (spécifiées, non jouées ici)

Dashboard, Consultants (CRUD, activation, anamnèse), Agenda (RDV, ateliers,
conflits), Facturation (création facture, PDF, relances, Stripe Connect,
paiement), Abonnement (checkout Stripe), Messagerie, Questionnaires (envoi code,
vérification), Bibliothèque/Blocs, IA (génération conseillancier), Vidéo (Daily),
Morning-review, Admin (praticiens/consultants/fiches/logs). Pour chacun : cas
nominal + limites (quotas IA, conflits d'agenda, statuts de facture) + erreurs
(échec paiement, code OTP invalide/expiré, permissions). À rejouer avec backend
de test.

---

## 2. Organisation de la suite Playwright

```
playwright.config.ts        Config (chromium préinstallé, webServer next start, baseURL)
e2e/
  console-guard.ts          Garde console/pageerror + allowlist infra documentée
  fixtures.ts               Fixture `test` étendue : garde console + stub des hôtes externes
  helpers.ts                Utilitaires (routes publiques, collecte de liens, overflow…)
  navigation.spec.ts        Liens internes, 404, dead links, back/forward, rel=noopener
  auth-guard.spec.ts        Accès anonyme aux routes protégées → redirection
  forms.spec.ts             Validation client (login/signup/reset/booking), double-submit
  seo-meta.spec.ts          title/description/lang/OG/favicon/robots/sitemap
  a11y.spec.ts              alt, labels, hiérarchie titres, lang, focus
  responsive.spec.ts        375/768/1440 : overflow horizontal, tailles cibles
  console-hygiene.spec.ts   Chargement des pages publiques sans erreur front
```

### Règles d'exécution
- **Prérequis** : `npm run build` (l'environnement sandbox n'a pas de backend ;
  la suite tourne sur le build de prod servi localement).
- **Navigateur** : Chromium préinstallé (`/opt/pw-browsers/chromium`).
- **Attentes** : `waitUntil: 'domcontentloaded'` (les externes sont coupés par le
  stub, `networkidle` n'est pas fiable ici).
- **Isolation réseau** : la fixture coupe/park les requêtes vers les hôtes
  externes pour des tests déterministes ; seules les requêtes `localhost` passent.

### Sévérités (rappel pour Étape 3)
`bloquant` (parcours cassé / crash) · `majeur` (fonctionnalité importante KO) ·
`mineur` (dégradation limitée) · `cosmétique` (visuel).

---

## 3. Ce que la suite prouve vs. ce qu'elle ne prouve pas

- ✅ **Prouve** : structure de routing, absence de crash front, conformité
  SEO/méta/a11y/responsive des pages accessibles sans auth, validation client des
  formulaires, présence/absence de sitemap/robots, liens morts.
- ❌ **Ne prouve pas ici** : exactitude des flux backend (auth, paiement, données,
  e-mail, vidéo, IA). → environnement de test backend requis (hypothèse explicite).
