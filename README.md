# AFEIA Practitioner Web

> Application web pour naturopathes - Gestion de consultants, consultations et suivi bien-être

## 🎯 Fonctionnalités

- **Dashboard** : Vue d'ensemble des consultants et notifications
- **Gestion consultants** : Profil, anamnèse, journal quotidien
- **Plans personnalisés** : Création et versioning de plans d'accompagnement
- **Intégration Circular** (Premium) : Données sommeil, HRV, activité
- **Messagerie** : Communication praticien-consultant
- **Consultations** : Notes et historique des séances

## 🛠 Stack technique

- **Framework** : Next.js 14 (App Router)
- **Langage** : TypeScript
- **Styling** : Tailwind CSS
- **Base de données** : Supabase (PostgreSQL)
- **Auth** : Supabase Auth
- **Déploiement** : Vercel (branche `master` uniquement)
- **Local** : Supabase CLI + Rancher Desktop

## 🎨 Direction artistique (2024)

- Palette beige/sable dominante, accents teal, aubergine et doré.
- Glassmorphism (backdrop blur) et grandes zones respirantes.
- Illustrations abstraites nature en fond pour l’ambiance wellness premium.
- Favicon blanc décliné en `.svg` et routes dynamiques (PNG/ICO) via `app/icon.tsx` et `app/favicon.ico/route.tsx`.

## 🚀 Installation locale

Tout est décrit pas à pas, pour Windows, dans [docs/ENVIRONNEMENT-LOCAL.md](docs/ENVIRONNEMENT-LOCAL.md) : Git, Node.js, Rancher Desktop et Supabase en local (gratuits et open source), comptes de test et données de démo.

En bref : `npm install`, `npm run db:start`, `npm run local:env`, `npm run dev`, puis [http://localhost:3000](http://localhost:3000).

Vercel ne met en ligne que la branche `master`. On teste en local avant de fusionner.

## 📁 Structure du projet

```
afeia-practitioner-web/
├── app/                    # Routes Next.js (App Router)
│   ├── (app)/             # Routes authentifiées
│   │   ├── dashboard/     # Tableau de bord
│   │   ├── consultants/      # Liste et détail consultants
│   │   ├── consultations/ # Consultations
│   │   ├── plans/         # Plans d'accompagnement
│   │   └── settings/      # Paramètres
│   ├── login/             # Page de connexion
│   ├── signup/            # Page d'inscription
│   ├── reset-password/    # Réinitialisation du mot de passe
│   ├── logout/            # Déconnexion
│   └── layout.tsx         # Layout racine
├── components/            # Composants React
│   ├── ui/               # Composants UI de base
│   ├── shell/            # Navigation, layout app
│   ├── consultants/         # Composants spécifiques consultants
│   └── charts/           # Graphiques
├── lib/                   # Utilitaires et configurations
│   ├── mock.ts           # Données de test (temporaire)
│   └── cn.ts             # Utilitaire Tailwind
└── public/               # Assets statiques
```

## 🔒 Sécurité & RGPD

- Hébergement données UE (Supabase région eu-west)
- Authentification sécurisée
- Pas de diagnostic médical - accompagnement bien-être uniquement
- Audit trail des modifications

## 📝 Scripts disponibles

```bash
npm run dev      # Serveur de développement
npm run build    # Build production
npm run start    # Serveur production
npm run lint     # Vérification ESLint
```

## 🗺 Roadmap

- [x] MVP avec données mockées
- [ ] Base de données Supabase
- [ ] Authentification réelle
- [ ] API CRUD complète
- [ ] Intégration Circular Ring
- [ ] Export PDF des plans
- [ ] Application mobile consultant

## 📄 Licence

Propriétaire - Tous droits réservés

---

*AFEIA ne remplace pas un suivi médical. Consultez un professionnel de santé pour tout problème de santé.*
