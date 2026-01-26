# AFEIA Patient - Application Mobile

Application mobile React Native (Expo) pour les patients de la plateforme de naturopathie AFEIA.

## Fonctionnalités

- **Authentification sécurisée** : Connexion via code OTP envoyé par le naturopathe
- **Questionnaire Anamnèse** : 12 sections complètes pour un bilan de santé détaillé
- **Dashboard patient** : Vue d'ensemble avec compléments, conseils, messages
- **Suivi des compléments** : Marquer les prises quotidiennes
- **Journal quotidien** : Tracker humeur, sommeil, énergie, alimentation
- **Messagerie** : Communication avec le naturopathe
- **Profil** : Gestion du compte et des paramètres

## Stack technique

- **Framework** : React Native avec Expo SDK 52
- **Language** : TypeScript
- **Navigation** : Expo Router
- **State Management** : React Context + Zustand
- **Forms** : React Hook Form
- **HTTP Client** : Axios
- **Stockage sécurisé** : expo-secure-store
- **Animations** : react-native-reanimated

## Prérequis

- Node.js 18+
- npm ou yarn
- Expo CLI (`npm install -g expo-cli`)
- Expo Go sur votre téléphone (pour les tests)

## Installation

```bash
# Cloner le repository
git clone https://github.com/teamafeia-creator/app-mobile.git
cd app-mobile

# Installer les dépendances
npm install

# Copier le fichier d'environnement
cp .env.example .env

# Configurer les variables d'environnement dans .env
```

## Configuration

Créez un fichier `.env` basé sur `.env.example` :

```env
# API Backend (plateforme web AFEIA)
EXPO_PUBLIC_API_URL=https://afeia-practitioner-web-ijov.vercel.app/api/mobile

# Supabase (même base que la plateforme web)
EXPO_PUBLIC_SUPABASE_URL=https://ldlojanehidmykveuqop.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Stripe (pour paiements Premium - optionnel)
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-key

# App Config
EXPO_PUBLIC_APP_NAME=AFEIA
EXPO_PUBLIC_APP_VERSION=1.0.0
```

## Développement

### Démarrer le serveur de développement

```bash
npm start
# ou
npx expo start
```

### Tester sur un appareil

1. Installez **Expo Go** sur votre téléphone :
   - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)
   - [Android Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. Scannez le QR code affiché dans le terminal avec :
   - iOS : Application Camera
   - Android : Application Expo Go

### Commandes utiles

```bash
# iOS uniquement
npm run ios

# Android uniquement
npm run android

# Web (preview)
npm run web

# Vérification TypeScript
npm run typecheck

# Lint
npm run lint
```

## Structure du projet

```
mobile-app/
├── app/                      # Écrans (Expo Router)
│   ├── (auth)/              # Authentification
│   │   ├── welcome.tsx      # Écran de bienvenue
│   │   ├── otp.tsx          # Vérification OTP
│   │   ├── register.tsx     # Création de compte
│   │   └── login.tsx        # Connexion
│   ├── (onboarding)/        # Onboarding
│   │   ├── anamnese.tsx     # Questionnaire
│   │   └── complete.tsx     # Confirmation
│   ├── (tabs)/              # Navigation principale
│   │   ├── index.tsx        # Dashboard
│   │   ├── journal.tsx      # Journal quotidien
│   │   ├── messages.tsx     # Messagerie
│   │   └── profile.tsx      # Profil
│   ├── _layout.tsx          # Layout racine
│   └── index.tsx            # Point d'entrée
├── components/
│   ├── ui/                  # Composants réutilisables
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Avatar.tsx
│   │   ├── ProgressBar.tsx
│   │   └── LoadingSpinner.tsx
│   ├── anamnese/            # Composants anamnèse
│   └── dashboard/           # Composants dashboard
├── constants/
│   ├── Colors.ts            # Palette AFEIA
│   ├── Typography.ts        # Styles de texte
│   └── Layout.ts            # Espacements, tailles
├── contexts/
│   └── AuthContext.tsx      # Contexte d'authentification
├── hooks/
│   ├── useComplements.ts
│   ├── useMessages.ts
│   └── useJournal.ts
├── services/
│   ├── api/                 # Services API
│   │   ├── client.ts        # Client Axios
│   │   ├── auth.ts
│   │   ├── patient.ts
│   │   ├── anamnese.ts
│   │   ├── complements.ts
│   │   ├── conseils.ts
│   │   ├── messages.ts
│   │   └── journal.ts
│   └── storage/
│       └── secureStore.ts   # Stockage sécurisé
├── types/
│   └── index.ts             # Types TypeScript
├── app.json                 # Configuration Expo
├── package.json
└── tsconfig.json
```

## Design System AFEIA

### Couleurs principales

| Couleur | Hex | Usage |
|---------|-----|-------|
| Teal Principal | `#2A8080` | Navigation, boutons, liens |
| Teal Profond | `#1A5C5C` | Headers, éléments d'autorité |
| Doré | `#FF9A3D` | CTA, notifications positives |
| Aubergine | `#85004F` | Badges Premium (avec parcimonie) |
| Sable | `#F5EFE7` | Backgrounds, cards |
| Charcoal | `#3D3D3D` | Textes principaux |

### Répartition des couleurs
- **70%** Teal → Professionnalisme clinique
- **15%** Aubergine → Identité distinctive premium
- **10%** Doré → Dynamisme & action
- **5%** Neutres → Respiration & lisibilité

## API Backend

L'application communique avec les endpoints `/api/mobile/*` de la plateforme web.

### Endpoints principaux

#### Authentification
- `POST /api/mobile/auth/verify-otp` - Vérification du code OTP
- `POST /api/mobile/auth/register` - Création de compte
- `POST /api/mobile/auth/login` - Connexion
- `POST /api/mobile/auth/refresh-token` - Rafraîchissement du token

#### Patient
- `GET /api/mobile/patient/profile` - Profil patient
- `PUT /api/mobile/patient/profile` - Mise à jour profil
- `GET /api/mobile/patient/naturopathe-info` - Info naturopathe

#### Anamnèse
- `GET /api/mobile/anamnese` - Récupérer l'anamnèse
- `POST /api/mobile/anamnese` - Soumettre l'anamnèse

#### Compléments
- `GET /api/mobile/complements` - Liste des compléments
- `POST /api/mobile/complements/track` - Tracker une prise

#### Messages
- `GET /api/mobile/messages` - Liste des messages
- `POST /api/mobile/messages` - Envoyer un message
- `GET /api/mobile/messages/unread-count` - Compteur non-lus

#### Journal
- `GET /api/mobile/journal/today` - Journal du jour
- `POST /api/mobile/journal` - Créer/modifier une entrée
- `GET /api/mobile/journal/history` - Historique

## Build et déploiement

### Build de développement

```bash
# Configuration EAS
npx eas-cli login
npx eas build:configure

# Build iOS (simulateur)
npx eas build --platform ios --profile development

# Build Android (APK)
npx eas build --platform android --profile development
```

### Build de production

```bash
# iOS (soumission App Store)
npx eas build --platform ios --profile production
npx eas submit --platform ios

# Android (soumission Play Store)
npx eas build --platform android --profile production
npx eas submit --platform android
```

## Sécurité

- Les tokens JWT sont stockés dans `expo-secure-store` (chiffré)
- Les mots de passe doivent contenir : 8+ caractères, 1 majuscule, 1 minuscule, 1 chiffre
- Refresh automatique des tokens avant expiration
- Données sensibles jamais stockées en clair

## Fonctionnalités à venir (V2)

- [ ] Intégration bague Circular Ring (Premium)
- [ ] Notifications push intelligentes
- [ ] Graphiques de tendances avancés
- [ ] Mode hors ligne complet
- [ ] Widgets iOS/Android
- [ ] Intégration Apple Health / Google Fit
- [ ] Dark mode

## Support

Pour toute question ou problème :
- Email : support@afeia.com
- Documentation : https://docs.afeia.com

## Licence

Propriétaire - AFEIA © 2026
