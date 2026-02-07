# AFEIA Admin Platform

## Variables d'environnement

Ajoutez les variables suivantes a votre `.env.local` (ou a votre gestionnaire de secrets):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only, pour les routes admin)
- `NEXT_PUBLIC_SITE_URL` (optionnel, utilisé pour les liens d'invitation/reset)
- `NEXT_PUBLIC_APP_URL` (optionnel, fallback pour les liens d'invitation/reset)

## Tester localement

1. Appliquer la migration SQL admin (dans `supabase/migrations`).
2. Ajouter votre email dans `admin_allowlist` (ou utiliser `team.afeia@gmail.com`).
3. Lancer l'app Next.js puis connecter un compte admin.
4. Acceder a `http://localhost:3000/admin`.

## Verifications rapides

- Un non-admin est redirige vers `/`.
- L'admin peut voir `consultants_identity` mais pas `consultants_health` (RLS).
- Les actions invite/reset/circular passent par `/api/admin/*`.
