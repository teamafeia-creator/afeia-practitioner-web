# AFEIA Practitioner Web

> Application web pour naturopathes - Gestion de patients, consultations et suivi bien-être

## 🎯 Fonctionnalités

- **Dashboard** : Vue d'ensemble des patients et notifications
- **Gestion patients** : Profil, anamnèse, journal quotidien
- **Plans personnalisés** : Création et versioning de plans d'accompagnement
- **Intégration Circular** (Premium) : Données sommeil, HRV, activité
- **Messagerie** : Communication praticien-patient
- **Consultations** : Notes et historique des séances

## 🛠 Stack technique

- **Framework** : Next.js 14 (App Router)
- **Langage** : TypeScript
- **Styling** : Tailwind CSS
- **Base de données** : Supabase (PostgreSQL)
- **Auth** : Supabase Auth
- **Déploiement** : Vercel

## 🚀 Installation

### Prérequis

- Node.js 18+
- npm ou yarn
- Compte Supabase (gratuit)

### Étapes

```bash
# 1. Cloner le repo
git clone https://github.com/VOTRE-USERNAME/afeia-practitioner-web.git
cd afeia-practitioner-web

# 2. Installer les dépendances
npm install

# 3. Configurer l'environnement
cp .env.example .env.local
# Puis éditer .env.local avec vos clés Supabase

# 4. Lancer en développement
npm run dev
```

L'application sera accessible sur [http://localhost:3000](http://localhost:3000)

## 📁 Structure du projet

```
afeia-practitioner-web/
├── app/                    # Routes Next.js (App Router)
│   ├── (app)/             # Routes authentifiées
│   │   ├── dashboard/     # Tableau de bord
│   │   ├── patients/      # Liste et détail patients
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
│   ├── patients/         # Composants spécifiques patients
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
- [ ] Application mobile patient

## 📄 Licence

Propriétaire - Tous droits réservés

---

*AFEIA ne remplace pas un suivi médical. Consultez un professionnel de santé pour tout problème de santé.*
