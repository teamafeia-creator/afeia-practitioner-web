# QA — Rapport de campagne AFEIA (Étape 3)

> Exécution de la suite Playwright (`e2e/`) + constats d'inspection.

> ## ✅ Addendum — Correctifs appliqués (post-arbitrage)
> À la demande, **les 12 correctifs du §5 ont été appliqués**. Après corrections,
> la suite passe à **56/56 verts (0 échec)**. Détail des changements :
> - **M1** titres uniques : `layout.tsx` serveur (metadata) par route publique.
> - **M2** labels : `htmlFor/id` (consultant login/register) + `aria-label` (login) ;
>   audit OK sur les pages publiques.
> - **M3** liens morts : lien « Voir toutes les notifications » retiré ; tuiles de
>   démo (`daily-log`, `messages`) rendues non-navigantes ; hint `add-supplements` retiré.
> - **M4** CORS : suppression de `Access-Control-Allow-Credentials: true` (l'API mobile
>   utilise Bearer, le web est same-origin) ; `Allow-Origin: *` conservé.
> - **m1/m2** : ajout de `app/robots.ts` (interdit l'espace authentifié) et `app/sitemap.ts`.
> - **m3** : `h1` ajouté sur `/questionnaire`.
> - **m4** : bouton œil ≥44px + `min-h-[44px]` sur les tailles `md`/`lg` de `Button`.
> - **m5** : timeout (8s) + écran « Réessayer » sur la vérification de session (AppShell).
> - **m6** : optimisation Next/Image réactivée (`remotePatterns` Supabase, AVIF/WebP).
>   Mesuré : `dashboard-header.jpg` 421 KB → 77 KB (‑82 %) en 640px.
> - **m7** : logs `console.log` de `lib/supabase.ts` et `hooks/useAuth.ts` mis derrière un garde dev.
> - **c1** : `?from` désormais préservé aussi dans `onAuthStateChange`.
> - **c2** : liens « Aide » câblés en `mailto:contact@afeia.fr`.
>
> Le corps du rapport ci-dessous décrit les constats **tels qu'observés avant correction**.

## 0. Synthèse d'exécution

- **Suite** : 56 tests Playwright (Chromium), 1 worker×2.
- **Résultat** : **50 réussis / 6 échoués** (stables sur plusieurs exécutions).
- **Commande** : `npm run build` puis `npm run e2e` (rapport HTML : `npm run e2e:report`).

### Contexte d'environnement (déterminant — cf. QA-PLAN §0)
Le **réseau sortant est bloqué** dans le sandbox (Supabase/Stripe/Fonts injoignables).
La campagne couvre donc la **qualité front structurelle** ; les flux backend (auth
réelle, paiement, données, e-mail, vidéo, IA) sont `⛔ backend requis` et **non
jouables ici** — à rejouer sur un environnement de test.

> ⚠️ **Incident de test résolu** : un premier run affichait 19 échecs (auth,
> formulaires). Cause identifiée : un serveur `next` **obsolète/corrompu** resté
> sur le port 3210 pendant les diagnostics, réutilisé par Playwright
> (`reuseExistingServer`). Sur serveur propre, l'app s'hydrate correctement et
> ces 13 « échecs » disparaissent. **Ce n'étaient pas des bugs applicatifs.** Les
> 6 échecs ci-dessous sont, eux, reproductibles et réels.

---

## 1. Tableau récapitulatif

| # | Fonctionnalité / axe | Statut | Sévérité |
|---|---|---|---|
| M1 | SEO — titres de page uniques | ❌ Échec | **Majeur** |
| M2 | A11y — labels de champs (login, consultant/login, consultant/register) | ❌ Échec | **Majeur** |
| M3 | Navigation — liens morts (4 routes 404) | ❌ Constat | **Majeur** |
| M4 | Sécurité — CORS `*` + `Allow-Credentials: true` sur toute l'API | ❌ Constat | **Majeur** |
| m1 | SEO — `robots.txt` absent | ❌ Échec | Mineur |
| m2 | SEO — `sitemap.xml` absent | ❌ Échec | Mineur |
| m3 | A11y — `h1` manquant sur `/questionnaire` | ❌ Échec | Mineur |
| m4 | Responsive — cibles tactiles < 44px (@375px) | ❌ Échec | Mineur |
| m5 | Robustesse — « Chargement… » infini si la session ne résout pas | ❌ Constat | Mineur |
| m6 | Perf — images non optimisées (`images.unoptimized`, header 421 KB) | ❌ Constat | Mineur |
| m7 | Hygiène — bruit console (`console.error/log` en fonctionnement normal) | ❌ Constat | Mineur |
| c1 | Auth — `?from` non préservé de façon cohérente à la redirection | ⚠️ Observé | Cosmétique |
| c2 | UI — liens « Aide » inertes (`href="#"`) | ⚠️ Constat | Cosmétique |
| — | Navigation — pas de 404 involontaire sur liens internes | ✅ OK | — |
| — | Navigation — page 404 + `not-found` rdv | ✅ OK | — |
| — | Navigation — `rel="noopener"` sur liens externes | ✅ OK | — |
| — | Navigation — back/forward, query params invalides | ✅ OK | — |
| — | Auth — redirection anonyme des routes protégées (client) | ✅ OK | — |
| — | Formulaires — validation client (login/signup/reset) | ✅ OK | — |
| — | SEO — meta description, `lang=fr`, favicon, Open Graph | ✅ OK | — |
| — | A11y — `alt` images, hiérarchie des titres, focus clavier | ✅ OK | — |
| — | Responsive — aucun débordement horizontal (375/768/1440) | ✅ OK | — |
| — | Hygiène console — aucune erreur front sur pages publiques | ✅ OK | — |
| — | Métier (dashboard, agenda, facturation, IA, vidéo, messagerie…) | ⛔ backend requis | — |

---

## 2. Fiches d'échec (format rapport debug)

> Ces constats sont d'ordre **structurel/statique** (pas des exceptions runtime).
> Le format reprend celui du mode debug pour cohérence ; le bloc « Requête
> réseau » est omis quand non pertinent.

### M1 — Titres de page non uniques (SEO)

```
## Constat AFEIA — SEO/titres
- Type: seo
- Route: (toutes les pages publiques)
- Message: 9 pages partagent le même <title> « AFEIA — Espace Naturopathe »
- Composant / fichier suspecté: app/layout.tsx (title.default) + pages en 'use client' sans metadata

### Détail
Pages concernées: /login, /signup, /reset-password, /welcome, /questionnaire,
/consultant/login, /consultant/register, /admin/login, /paiement/succes.
Cause: 63/70 pages sont des Client Components ('use client'), qui NE PEUVENT PAS
exporter `metadata`. Elles héritent donc toutes du titre par défaut du layout racine.

### Reproduction
1. Charger chaque page publique et lire document.title.
2. Observer un titre identique partout.

### Comportement attendu
Un <title> unique et descriptif par page (ex. « Connexion | AFEIA »,
« Prendre rendez-vous | AFEIA »), pour le SEO et l'onglet navigateur.
```

### M2 — Champs de formulaire sans label accessible (a11y)

```
## Constat AFEIA — a11y/labels
- Type: a11y
- Route: /login, /consultant/login, /consultant/register
- Message: des champs de saisie n'ont aucun libellé accessible (placeholder seul)
- Composant / fichier suspecté: app/login/page.tsx, app/consultant/login/page.tsx, app/consultant/register/page.tsx

### Détail
Champs sans <label for>, aria-label, aria-labelledby ni wrapping <label> :
- /login : « votre@email.com », « Mot de passe »
- /consultant/login : « votre@email.com », « Votre mot de passe »
- /consultant/register : « votre@email.com », « Minimum 8 caractères », « Retapez votre mot de passe »
Le placeholder n'est PAS un substitut de label (disparaît à la saisie, non lu de façon fiable).

### Reproduction
1. Ouvrir /login au lecteur d'écran (ou inspecter le DOM).
2. Les champs n'exposent pas de nom accessible.

### Comportement attendu
Chaque input associé à un <label> (via for/id) ou porteur d'un aria-label.
```

### M3 — Liens morts dans l'UI (404)

```
## Constat AFEIA — navigation/liens morts
- Type: navigation
- Route: liens présents dans l'UI pointant vers des routes inexistantes
- Message: 4 liens mènent à un 404
- Composant / fichier suspecté: NotificationDropdown (/notifications) + app/consultant/demo/*

### Détail (confirmé par test : ces routes renvoient 404)
- /notifications
- /consultant/demo/add-supplements
- /consultant/demo/daily-log
- /consultant/demo/messages

### Reproduction
1. Depuis l'UI, suivre l'un de ces liens (ou GET direct).
2. Réponse HTTP 404.

### Comportement attendu
Soit créer les pages cibles, soit retirer/masquer les liens, soit rediriger.
```

### M4 — CORS permissif sur toute l'API (sécurité)

```
## Constat AFEIA — sécurité/CORS
- Type: server
- Route: /api/:path*
- Message: Access-Control-Allow-Origin: * combiné à Access-Control-Allow-Credentials: true
- Composant / fichier suspecté: middleware.ts + next.config.mjs (headers)

### Détail
next.config.mjs pose `Allow-Credentials: true` avec `Allow-Origin: *` sur /api/:path*,
et middleware.ts renvoie `Allow-Origin: *` sur /api/mobile & /api/consultant.
Autoriser toute origine AVEC credentials est une configuration à risque (exfiltration
de réponses authentifiées cross-origin). Les navigateurs ignorent souvent cette
combinaison, mais elle traduit une intention permissive à corriger.

### Comportement attendu
Restreindre `Allow-Origin` à une allowlist d'origines de confiance quand des
credentials sont autorisés, ou retirer `Allow-Credentials`.
```

### m1 / m2 — robots.txt & sitemap.xml absents (SEO)

```
## Constat AFEIA — SEO/robots+sitemap
- Type: seo
- Route: /robots.txt (404), /sitemap.xml (404)
- Message: ni robots.txt ni sitemap.xml ne sont servis
- Composant / fichier suspecté: absence de app/robots.ts et app/sitemap.ts

### Détail
Aucune convention App Router détectée. `app/layout.tsx` déclare robots: index/follow
alors que l'app est majoritairement un espace authentifié — à arbitrer.

### Comportement attendu
Ajouter app/robots.ts et app/sitemap.ts (au moins pour les pages publiques :
/welcome, /rdv/[slug], /questionnaire).
```

### m3 — h1 manquant sur /questionnaire (a11y)

```
## Constat AFEIA — a11y/hiérarchie titres
- Type: a11y
- Route: /questionnaire
- Message: la page ne comporte aucun <h1>
- Composant / fichier suspecté: app/questionnaire/page.tsx

### Comportement attendu
Exactement un <h1> décrivant la page (ex. « Questionnaire préliminaire »).
```

### m4 — Cibles tactiles < 44px (@375px)

```
## Constat AFEIA — responsive/cibles tactiles
- Type: responsive
- Route: /login, /signup, /questionnaire (viewport 375px)
- Message: éléments cliquables sous 44px
- Composant / fichier suspecté: bouton œil (afficher/masquer mdp) 20×20 ; boutons primaires 40px de haut

### Détail
- /login : bouton afficher/masquer mot de passe 20×20 px (bien sous 44).
- /signup : « Créer mon compte » 277×40 (hauteur 40).
- /questionnaire : « Commencer le questionnaire » 198×40.

### Comportement attendu
Zone tactile ≥ 44×44px (agrandir le bouton œil, hauteur des CTA à 44px).
```

### m5 — « Chargement… » potentiellement infini

```
## Constat AFEIA — robustesse/chargement
- Type: react
- Route: routes protégées (AppShell) + espaces consultant/admin
- Message: si supabase.auth.getSession() ne résout jamais, l'UI reste bloquée sur « Chargement… »
- Composant / fichier suspecté: components/shell/AppShell.tsx (checkingAuth), app/consultant/(app)/layout.tsx, app/admin/layout.tsx

### Détail
Observé dans le sandbox (backend injoignable) : aucun timeout ni état d'erreur ;
l'utilisateur reste sur un spinner indéfini. En prod le cas se produit si Supabase
est lent/indisponible.

### Comportement attendu
Timeout + message d'erreur / bouton « réessayer » sur l'échec de vérification de session.
```

### m6 — Images non optimisées (perf)

```
## Constat AFEIA — perf/images
- Type: perf
- Route: (global)
- Message: images.unoptimized = true ; public/images/dashboard-header.jpg = 421 KB
- Composant / fichier suspecté: next.config.mjs (images.unoptimized), public/images/*

### Détail
Toutes les images sont servies brutes (pas de redimensionnement/format moderne).
Plus lourdes : dashboard-header.jpg 421 KB, eucalyptus-minimal.jpg 180 KB.

### Comportement attendu
Activer l'optimisation Next/Image (ou pré-compresser + servir en AVIF/WebP).
```

### m7 — Bruit console en fonctionnement normal

```
## Constat AFEIA — hygiène/console
- Type: console
- Route: (global)
- Message: console.log/console.error abondants (auth, supabase, notifications)
- Composant / fichier suspecté: hooks/useAuth.ts, lib/supabase.ts, AppShell, dropdowns

### Détail
En marche normale l'app logue son état interne et ses échecs réseau en console.
Impact : diagnostic bruité, et incompatibilité avec une règle « console propre »
stricte. (La suite QA neutralise ce bruit via une allowlist documentée.)

### Comportement attendu
Réduire les logs de production (garder derrière un flag debug), gérer les échecs
sans console.error systématique.
```

### c1 — `?from` non préservé de façon cohérente (cosmétique)

```
## Constat AFEIA — auth/redirection
- Type: react
- Route: routes protégées → /login
- Message: la cible ?from n'est pas toujours conservée
- Composant / fichier suspecté: components/shell/AppShell.tsx

### Détail
`loadSession()` redirige vers `/login?from=<route>` mais
`onAuthStateChange` redirige vers `/login` (sans from). Selon l'ordre, l'utilisateur
peut perdre sa page cible après connexion.

### Comportement attendu
Uniformiser : toujours conserver ?from (ou l'appliquer après connexion).
```

### c2 — Liens « Aide » inertes (cosmétique)

```
## Constat AFEIA — UI/liens inertes
- Type: navigation
- Route: (global, bouton flottant Aide de AppShell)
- Message: « Centre d'aide », « Contacter l'assistance », « Signaler un abus » sont des href="#"
- Composant / fichier suspecté: components/shell/AppShell.tsx

### Comportement attendu
Câbler ces liens ou les retirer tant qu'ils ne mènent nulle part.
```

---

## 3. Ce qui a été validé (✅)

- **Routing** : aucune 404 involontaire sur les liens internes des pages publiques ;
  404 générique OK ; `not-found` dédié pour `/rdv/[slug]` inexistant ; back/forward
  et query params invalides sans crash.
- **Auth (garde client)** : l'accès anonyme aux routes protégées (`/dashboard`,
  `/consultants`, `/agenda`, `/messages`, `/facturation`, `/statistics`, `/settings`)
  redirige bien vers `/login`, et `/admin` vers `/admin/login`.
- **Formulaires** : validation client OK (champs requis HTML5, e-mail invalide rejeté,
  mots de passe non concordants signalés) ; double-clic sans crash.
- **SEO** : meta description présente, `lang="fr"`, favicon servi, Open Graph présent.
- **A11y** : toutes les images ont un `alt` ; hiérarchie des titres sans saut ; premier
  élément focusable atteignable au clavier.
- **Responsive** : aucun débordement horizontal à 375 / 768 / 1440 px.
- **Hygiène console** : aucune erreur console **d'origine front** sur les pages publiques
  (hors bruit réseau du sandbox, neutralisé et documenté).
- **Error boundaries** : `app/error.tsx` et `app/global-error.tsx` ajoutés à l'Étape 1
  (il n'y en avait aucun) — repli utilisateur en place.

---

## 4. Non couvert ici (`⛔ backend requis`)

À rejouer avec un Supabase/Stripe de test (ou mocking réseau dédié) : connexion réelle
et échec de connexion, déconnexion, session expirée ; CRUD consultants + activation +
anamnèse ; agenda (RDV, ateliers, conflits) ; facturation (création, PDF, relances,
Stripe Connect, paiement) ; abonnement (checkout) ; messagerie ; questionnaires (codes) ;
IA (génération conseillancier, quotas) ; vidéo Daily ; morning-review ; back-office admin.

---

## 5. Correctifs proposés (triés par sévérité — NON appliqués)

### Majeur
1. **(M2) A11y labels** — associer un `<label>`/`aria-label` à chaque champ de
   `login`, `consultant/login`, `consultant/register` (et auditer les autres formulaires).
2. **(M1) Titres uniques** — donner un `<title>` propre à chaque page. Deux voies :
   extraire la partie serveur des pages en `export const metadata`, ou ajouter un
   petit composant qui fixe `document.title` par page (moins propre). Prioriser
   `login`, `signup`, `welcome`, `rdv/[slug]`, `questionnaire`.
3. **(M3) Liens morts** — créer ou retirer `/notifications` et les 3 `/consultant/demo/*`.
4. **(M4) CORS** — restreindre `Allow-Origin` à une allowlist quand `Allow-Credentials:true`
   (middleware.ts + next.config.mjs).

### Mineur
5. **(m1/m2) robots + sitemap** — ajouter `app/robots.ts` et `app/sitemap.ts` (pages publiques).
6. **(m3) h1** — ajouter un `<h1>` à `/questionnaire`.
7. **(m4) Cibles tactiles** — agrandir le bouton œil (≥44px) et porter les CTA à 44px de haut.
8. **(m5) Chargement** — timeout + état d'erreur sur la vérification de session (AppShell, layouts).
9. **(m6) Images** — réactiver l'optimisation Next/Image ou pré-compresser (AVIF/WebP) ;
   `dashboard-header.jpg` en priorité.
10. **(m7) Console** — réduire les logs de production derrière un flag.

### Cosmétique
11. **(c1) ?from** — uniformiser la préservation de la cible dans AppShell.
12. **(c2) Liens Aide** — câbler ou retirer les `href="#"`.

---

## 6. Reproduire la campagne

```bash
npm ci
npm run build          # requis (sandbox sans backend, on sert le build de prod)
npm run e2e            # 56 tests ; 50 verts / 6 rouges attendus (= les constats ci-dessus)
npm run e2e:report     # rapport HTML détaillé
```

*Fin du rapport — Étape 3. Les correctifs ci-dessus ne sont pas appliqués : j'attends ton arbitrage.*
