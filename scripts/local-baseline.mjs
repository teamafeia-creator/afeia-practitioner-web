// Copie la STRUCTURE (tables, fonctions, règles de sécurité) de la base de production dans
// supabase/migrations, pour que le Supabase local ait exactement le même schéma.
// Aucune donnée de production n'est copiée : uniquement le schéma.
//
// Usage : npm run local:baseline   (Rancher Desktop doit tourner)
// L'adresse de connexion se trouve dans Supabase > ton projet > bouton « Connect »
// > « Session pooler » (elle commence par postgresql://postgres.xxxx:...@...pooler.supabase.com:5432/postgres).
// Elle n'est enregistrée nulle part.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const DOSSIER = 'supabase/migrations';
const FICHIER = `${DOSSIER}/20261125000000_baseline_production.sql`;
const CLI = fileURLToPath(new URL('../node_modules/supabase/dist/supabase.js', import.meta.url));

if (existsSync(DOSSIER) && readdirSync(DOSSIER).some((f) => f.endsWith('_baseline_production.sql'))) {
  console.log('✅ La photo du schéma de production existe déjà, rien à faire.');
  process.exit(0);
}
mkdirSync(DOSSIER, { recursive: true });

const rl = createInterface({ input: process.stdin, output: process.stdout });
const url = (await rl.question('Colle l\'adresse « Session pooler » de la base de production, puis Entrée :\n> ')).trim();
rl.close();
if (!url.startsWith('postgres')) {
  console.error('❌ Adresse invalide : elle doit commencer par postgresql://');
  process.exit(1);
}

console.log('⏳ Copie du schéma (1 à 2 minutes)…');
const r = spawnSync(process.execPath, [CLI, 'db', 'dump', '--db-url', url, '-f', FICHIER], { stdio: 'inherit' });
if (r.status !== 0) {
  console.error('❌ La copie a échoué. Vérifie l\'adresse (mot de passe compris) et que Rancher Desktop tourne.');
  process.exit(1);
}
console.log(`✅ Schéma copié dans ${FICHIER}`);
