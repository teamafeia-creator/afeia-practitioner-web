// Copie la STRUCTURE (tables, fonctions, règles de sécurité) de la base de production dans
// supabase/migrations, pour que le Supabase local ait exactement le même schéma.
// Aucune donnée de production n'est copiée : uniquement le schéma.
//
// Usage : npm run local:baseline   (Rancher Desktop doit tourner)
// Pas de mot de passe à saisir : la 1re fois, le navigateur s'ouvre pour autoriser la
// connexion à ton compte Supabase (bouton « Authorize »).
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Projet Supabase de production d'AFEIA (sous-domaine de NEXT_PUBLIC_SUPABASE_URL).
const PROJET = process.env.AFEIA_SUPABASE_PROJECT_REF || 'cveopgnckcawxcvgehxj';
const DOSSIER = 'supabase/migrations';
const FICHIER = `${DOSSIER}/20261125000000_baseline_production.sql`;
const CLI = fileURLToPath(new URL('../node_modules/supabase/dist/supabase.js', import.meta.url));
const supabase = (...args) => spawnSync(process.execPath, [CLI, ...args], { stdio: 'inherit' }).status === 0;

if (existsSync(DOSSIER) && readdirSync(DOSSIER).some((f) => f.endsWith('_baseline_production.sql'))) {
  console.log('✅ La photo du schéma de production existe déjà, rien à faire.');
  process.exit(0);
}
mkdirSync(DOSSIER, { recursive: true });

console.log('🔑 Connexion à ton compte Supabase : autorise l\'accès dans le navigateur qui s\'ouvre.');
if (!supabase('login')) {
  console.error('❌ Connexion à Supabase impossible.');
  process.exit(1);
}

console.log('⏳ Copie du schéma de production (1 à 2 minutes)…');
if (!supabase('db', 'dump', `--remote=${PROJET}`, '-f', FICHIER)) {
  console.error('❌ La copie a échoué. Vérifie que Rancher Desktop tourne, puis relance.');
  process.exit(1);
}
console.log(`✅ Schéma copié dans ${FICHIER}`);
