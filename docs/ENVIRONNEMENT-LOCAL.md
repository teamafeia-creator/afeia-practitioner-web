# Environnement local d'AFEIA

Ce guide sert à faire tourner AFEIA **sur ton PC**, pour voir et tester tes modifications avant de les mettre en production. Tout est gratuit et open source, et rien de ce que tu fais en local ne touche le site en ligne.

## Ce qui tourne sur ton PC

| Outil | Rôle | Licence |
|---|---|---|
| Git | Récupère le code et garde l'historique des modifications | Libre (GPL) |
| Node.js | Fait tourner l'application Next.js | Libre (MIT) |
| Rancher Desktop | Fait tourner les « conteneurs » dont Supabase a besoin (remplace Docker Desktop) | Libre (Apache 2.0) |
| Supabase CLI | Une copie complète de Supabase sur ton PC : base de données, connexion, stockage de fichiers | Libre (MIT) |

Les services payants (Stripe, Resend, Anthropic, Daily, Polar) sont **désactivés en local** : l'application marche sans, seules les fonctions concernées ne répondent pas. Les e-mails que l'application enverrait s'affichent dans la fenêtre noire au lieu de partir.

## Installation (une seule fois)

1. Double-clique sur **`1-installer-les-outils.cmd`**, accepte les installations, puis **redémarre le PC**.
2. Ouvre **Rancher Desktop** (menu Démarrer). Au premier lancement :
   - décoche **Enable Kubernetes** (inutile ici, et ça consomme de la mémoire) ;
   - choisis le moteur **dockerd (moby)** ;
   - attends que Rancher indique que tout est prêt.
3. Double-clique sur **`2-installer-afeia.cmd`**. Il télécharge le code, installe ce qu'il faut, prépare la base locale, puis lance l'application.
   - La première fois, le navigateur s'ouvre sur Supabase : clique **Authorize** (si un code s'affiche, recopie-le dans la fenêtre noire). Seule la *structure* de la base de production (tables, règles) est copiée, aucune donnée réelle. Aucun mot de passe à saisir.
   - Le premier démarrage de Supabase télécharge environ 2 Go : compte 10 à 20 minutes.

## Tous les jours

1. Ouvre **Rancher Desktop** et attends qu'il soit prêt.
2. Double-clique sur **`outils-windows\lancer-afeia.cmd`**. Le navigateur s'ouvre sur http://localhost:3000 (actualise la page si elle n'est pas encore prête).
3. Connecte-toi avec un compte de test :
   - praticien : `demo@afeia.local` / `afeia-demo`
   - admin : `admin@afeia.local` / `afeia-admin`
4. Pour arrêter : ferme la fenêtre noire, puis double-clique sur **`arreter-afeia.cmd`**. Quitte Rancher Desktop pour libérer la mémoire.

Adresses utiles pendant que ça tourne :

- **Application** : http://localhost:3000
- **Studio**, pour voir et modifier les données de test : http://localhost:54323
- **Boîte mail de test** (e-mails de connexion et de mot de passe) : http://localhost:54324

Quand tu modifies le code, la page se met à jour toute seule, sans relancer quoi que ce soit.

### Tester sur ton téléphone

Pendant qu'AFEIA tourne, double-clique sur `outils-windows\partager-sur-telephone.cmd`. Il affiche un lien `https://….trycloudflare.com` (tunnel Cloudflare gratuit, sans compte) : ouvre-le sur ton téléphone, en 4G ou en Wi-Fi. Le lien change à chaque fois et fonctionne tant que la fenêtre est ouverte. Il est accessible à quiconque le connaît : ne le partage pas, et ferme la fenêtre quand tu as fini. Les mises à jour en direct (notifications instantanées) ne passent pas par ce lien : recharge la page pour les voir.

### Mise à jour automatique depuis GitHub

`lancer-afeia.cmd` ouvre aussi une petite fenêtre réduite **« AFEIA - synchro GitHub »**. Toutes les 30 secondes, elle regarde si la branche en cours a reçu de nouveaux changements sur GitHub (par exemple poussés par Claude) et les récupère : la page se recharge toute seule. Laisse-la ouverte.

- Nouvelle structure de base (migration) : appliquée automatiquement à la base locale, sans effacer les données de test.
- Nouvelles dépendances : la fenêtre te demande de relancer `lancer-afeia.cmd`.
- Si tu as modifié des fichiers toi-même, la synchro se met en pause pour ne rien écraser.

Si les données de test sont abîmées, `reinitialiser-donnees.cmd` repart de zéro avec les données de démo.

## Du local à la production

1. Les modifications se font sur une **branche** (jamais directement sur `master`).
2. Tu les testes en local jusqu'à être satisfaite.
3. Tu fusionnes la branche dans `master` (bouton **Merge** de la pull request sur GitHub). **C'est le seul moment où Vercel met en ligne.**

Vercel ne déploie plus les autres branches (réglage `git.deploymentEnabled` dans `vercel.json`) : l'aperçu se fait sur ton PC.

### Changements de base de données

- Une modification de structure se fait dans un nouveau fichier `supabase/migrations/AAAAMMJJHHMMSS_description.sql` (14 chiffres, un nom unique).
- En local, `reinitialiser-donnees.cmd` (ou `npm run db:reset`) l'applique pour la tester.
- Une fois validée, on l'applique en production comme aujourd'hui (éditeur SQL de Supabase), **avant** de fusionner le code qui en dépend.
- `supabase/migrations_historique/` contient les anciens scripts : ils ont été appliqués à la main en production et ne se rejouent pas d'un bloc. On ne les modifie plus.

## Si ça ne marche pas

- **« Rancher Desktop n'est pas démarré »** : ouvre Rancher Desktop, attends qu'il soit prêt, relance le fichier.
- **Le PC rame** : ferme les onglets inutiles. Avec 8 Go de RAM, évite d'avoir en même temps de gros logiciels ouverts.
- **Port déjà utilisé (3000)** : une autre fenêtre AFEIA est déjà ouverte, ferme-la.
- Sinon : copie le message d'erreur de la fenêtre noire et envoie-le à Claude.

## Pour les développeurs

```bash
npm run db:start        # Supabase local (Rancher Desktop / Docker requis)
npm run local:baseline  # 1re fois : copie le schéma de prod dans supabase/migrations
npm run local:env       # écrit .env.local avec les clés locales
npm run dev             # http://localhost:3000
npm run db:reset        # rejoue migrations + supabase/seed.sql
npm run db:stop
```
