# Historique des migrations (lecture seule)

Ces scripts ont été appliqués à la main en production au fil du projet. Ils se contredisent
parfois (tables renommées, colonnes recréées…) et ne peuvent pas être rejoués d'un bloc sur une
base vide. On les garde pour mémoire, sans les modifier.

La base locale part d'une photo du schéma de production (`supabase/migrations/*_baseline_production.sql`),
et les nouvelles migrations vont dans `supabase/migrations/`. Voir `docs/ENVIRONNEMENT-LOCAL.md`.
