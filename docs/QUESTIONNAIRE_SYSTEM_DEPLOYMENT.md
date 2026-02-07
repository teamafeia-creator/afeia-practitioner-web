# Guide de Déploiement - Système de Questionnaire Public

Ce document décrit le déploiement du nouveau système de questionnaire public pour l'application AFEIA Naturopathie.

## Vue d'ensemble

Le nouveau système comprend:
1. **Page publique de questionnaire** (`/questionnaire`) - Accessible sans authentification
2. **Section Questionnaires préliminaires** pour les naturopathes
3. **Liaison automatique** des questionnaires aux consultants
4. **Système de notifications** en temps réel
5. **Anamnèse optionnelle** dans l'application mobile

## Prérequis

- Compte Supabase avec accès admin
- Projet Next.js déployé (Vercel recommandé)
- Variables d'environnement configurées

## Étape 1: Migration de la Base de Données

### 1.1 Exécuter la migration SQL

Dans le dashboard Supabase, accédez à **SQL Editor** et exécutez le fichier:

```
supabase/migrations/20260129_public_questionnaire_system.sql
```

Cette migration crée:

| Table | Description |
|-------|-------------|
| `preliminary_questionnaires` | Stocke les questionnaires soumis publiquement |
| `anamnesis_history` | Historique des modifications d'anamnèse |
| Colonnes ajoutées à `consultant_anamnesis` | `version`, `naturopath_id`, `source`, `preliminary_questionnaire_id` |
| Colonnes ajoutées à `notifications` | `metadata` (JSONB), `type` |

### 1.2 Vérifier les policies RLS

Après la migration, vérifiez que les policies sont actives:

```sql
-- Vérifier les policies pour preliminary_questionnaires
SELECT * FROM pg_policies WHERE tablename = 'preliminary_questionnaires';

-- Vérifier les policies pour anamnesis_history
SELECT * FROM pg_policies WHERE tablename = 'anamnesis_history';
```

### 1.3 Activer Supabase Realtime

Dans le dashboard Supabase:
1. Aller dans **Database** > **Replication**
2. Activer la réplication pour la table `notifications`
3. Ou exécuter:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
```

## Étape 2: Configuration des Variables d'Environnement

Assurez-vous que ces variables sont configurées:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT (pour l'authentification mobile)
JWT_SECRET=your-secret-key

# Optionnel: Pepper pour le hachage des codes OTP
QUESTIONNAIRE_CODE_PEPPER=your-pepper-secret
```

## Étape 3: Déploiement Frontend

### 3.1 Build et déploiement

```bash
# Installer les dépendances
npm install

# Build de production
npm run build

# Déployer sur Vercel (automatique via GitHub)
git push origin main
```

### 3.2 Vérifications post-déploiement

1. **Page publique**: Accéder à `https://votre-domaine.com/questionnaire`
   - Vérifier que la liste des naturopathes se charge
   - Tester la soumission d'un questionnaire

2. **Interface naturopathe**:
   - Se connecter au dashboard
   - Vérifier la section "Questionnaires" dans la navigation
   - Vérifier que les notifications apparaissent

3. **Application mobile**:
   - Vérifier que l'inscription fonctionne
   - Vérifier que l'anamnèse est optionnelle
   - Vérifier l'accès à l'anamnèse depuis le profil

## Étape 4: Test des Fonctionnalités

### 4.1 Test du questionnaire public

```bash
# Tester la récupération des naturopathes
curl -X POST https://your-supabase-url.supabase.co/rest/v1/rpc/get_public_practitioners \
  -H "apikey: your-anon-key" \
  -H "Content-Type: application/json"

# Tester la soumission d'un questionnaire
curl -X POST https://your-supabase-url.supabase.co/rest/v1/rpc/submit_preliminary_questionnaire \
  -H "apikey: your-anon-key" \
  -H "Content-Type: application/json" \
  -d '{
    "p_naturopath_id": "uuid-du-naturopathe",
    "p_first_name": "Test",
    "p_last_name": "User",
    "p_email": "test@example.com",
    "p_responses": {"general": {"profession": "Test"}}
  }'
```

### 4.2 Test de la liaison automatique

1. Soumettre un questionnaire public avec un email
2. Créer un consultant avec le même email via l'interface naturopathe
3. Vérifier que:
   - Le questionnaire passe en statut `linked_to_consultant`
   - L'anamnèse du consultant contient les réponses
   - Une notification est créée

### 4.3 Test des notifications Realtime

1. Ouvrir deux onglets: un en tant que consultant, un en tant que naturopathe
2. Modifier l'anamnèse côté consultant
3. Vérifier qu'une notification apparaît en temps réel côté naturopathe

## Étape 5: Rollback (si nécessaire)

En cas de problème, vous pouvez revenir en arrière:

```sql
-- Supprimer les nouvelles tables
DROP TABLE IF EXISTS public.anamnesis_history;
DROP TABLE IF EXISTS public.preliminary_questionnaires CASCADE;

-- Supprimer les colonnes ajoutées
ALTER TABLE public.consultant_anamnesis DROP COLUMN IF EXISTS version;
ALTER TABLE public.consultant_anamnesis DROP COLUMN IF EXISTS naturopath_id;
ALTER TABLE public.consultant_anamnesis DROP COLUMN IF EXISTS source;
ALTER TABLE public.consultant_anamnesis DROP COLUMN IF EXISTS preliminary_questionnaire_id;

ALTER TABLE public.notifications DROP COLUMN IF EXISTS metadata;
ALTER TABLE public.notifications DROP COLUMN IF EXISTS type;

-- Supprimer les fonctions
DROP FUNCTION IF EXISTS public.link_preliminary_questionnaire_on_consultant_create();
DROP FUNCTION IF EXISTS public.track_anamnesis_changes();
DROP FUNCTION IF EXISTS public.notify_new_preliminary_questionnaire();
DROP FUNCTION IF EXISTS public.get_public_practitioners();
DROP FUNCTION IF EXISTS public.submit_preliminary_questionnaire(UUID, TEXT, TEXT, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.create_consultant_from_questionnaire(UUID);
DROP FUNCTION IF EXISTS public.get_preliminary_questionnaires(TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.get_anamnesis_history(UUID, TEXT, INTEGER);
```

## Structure des Fichiers Créés/Modifiés

### Nouveaux fichiers
```
supabase/migrations/20260129_public_questionnaire_system.sql
app/questionnaire/page.tsx
app/(app)/questionnaires/page.tsx
app/(app)/questionnaires/[id]/page.tsx
services/preliminary-questionnaire.ts
services/notifications.ts
components/notifications/NotificationDropdown.tsx
docs/QUESTIONNAIRE_SYSTEM_DEPLOYMENT.md
```

### Fichiers modifiés
```
lib/types.ts                          # Nouveaux types
services/anamnese.ts                  # Nouvelles fonctions
components/shell/AppShell.tsx         # Navigation + notifications
app/api/mobile/auth/register/route.ts # Check anamnesis
mobile-app/App.tsx                    # Flow optionnel
mobile-app/screens/RegisterScreen.tsx # Callback modifié
mobile-app/screens/ProfileScreen.tsx  # Section anamnèse
mobile-app/screens/AnamneseScreen.tsx # Bouton skip
```

## Policies RLS - Résumé

| Table | INSERT | SELECT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `preliminary_questionnaires` | Public | Naturopathe propriétaire | Naturopathe propriétaire | Naturopathe propriétaire |
| `anamnesis_history` | Trigger only | Naturopathe/Consultant | - | - |
| `consultant_anamnesis` | Auth | Naturopathe/Consultant | Naturopathe/Consultant | Naturopathe |
| `notifications` | Trigger only | Naturopathe propriétaire | Naturopathe propriétaire | Naturopathe propriétaire |

## Monitoring

### Métriques à surveiller

1. **Questionnaires soumis**: Compter les entrées dans `preliminary_questionnaires`
2. **Taux de liaison**: Ratio questionnaires liés / soumis
3. **Notifications non lues**: Alertes si accumulation

### Requêtes utiles

```sql
-- Questionnaires en attente par naturopathe
SELECT
  p.full_name,
  COUNT(pq.id) as pending_count
FROM practitioners p
LEFT JOIN preliminary_questionnaires pq
  ON pq.naturopath_id = p.id AND pq.status = 'pending'
GROUP BY p.id, p.full_name;

-- Modifications d'anamnèse récentes
SELECT
  ah.modified_section,
  COUNT(*) as modification_count
FROM anamnesis_history ah
WHERE ah.modified_at > NOW() - INTERVAL '7 days'
GROUP BY ah.modified_section
ORDER BY modification_count DESC;
```

## Support

En cas de problème:
1. Vérifier les logs Supabase (Dashboard > Logs)
2. Vérifier les logs Vercel
3. Tester les policies RLS avec l'éditeur SQL
4. Contacter l'équipe technique

---

**Version**: 1.0.0
**Date**: 2026-01-29
**Auteur**: Claude Code
