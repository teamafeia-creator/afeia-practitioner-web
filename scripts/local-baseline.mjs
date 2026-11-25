// Copie la STRUCTURE (tables, fonctions, règles de sécurité) de la base de production dans
// supabase/migrations, pour que le Supabase local ait exactement le même schéma.
// Aucune donnée de production n'est copiée : uniquement le schéma.
//
// Usage : npm run local:baseline   (Rancher Desktop doit tourner)
// Pas de mot de passe à saisir : la 1re fois, le navigateur s'ouvre pour autoriser la
// connexion à ton compte Supabase (bouton « Authorize »).
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const DOSSIER = 'supabase/migrations';
const FICHIER = `${DOSSIER}/20261125000000_baseline_production.sql`;
const CLI = fileURLToPath(new URL('../node_modules/supabase/dist/supabase.js', import.meta.url));
const supabase = (...args) => spawnSync(process.execPath, [CLI, ...args], { stdio: 'inherit' }).status === 0;

if (existsSync(DOSSIER) && readdirSync(DOSSIER).some((f) => f.endsWith('_baseline_production.sql'))) {
  console.log('✅ La photo du schéma de production existe déjà, rien à faire.');
  process.exit(0);
}
mkdirSync(DOSSIER, { recursive: true });

const dejaConnecte = spawnSync(process.execPath, [CLI, 'projects', 'list'], { stdio: 'ignore' }).status === 0;
if (!dejaConnecte) console.log('🔑 Connexion à ton compte Supabase : autorise l\'accès dans le navigateur qui s\'ouvre.');
if (!dejaConnecte && !supabase('login')) {
  console.error('❌ Connexion à Supabase impossible.');
  process.exit(1);
}

// Choix du projet de production parmi ceux du compte.
const liste = spawnSync(process.execPath, [CLI, 'projects', 'list', '-o', 'json'], { encoding: 'utf8' });
let projets = [];
try {
  const brut = JSON.parse(liste.stdout);
  projets = (Array.isArray(brut) ? brut : brut.projects || []).map((p) => ({
    ref: p.ref || p.id, nom: p.name, statut: p.status,
  }));
} catch {
  console.error('❌ Impossible de lister tes projets Supabase.');
  process.exit(1);
}
const actifs = projets.filter((p) => !p.statut || /ACTIVE/i.test(p.statut));
let PROJET = process.env.AFEIA_SUPABASE_PROJECT_REF;
if (!PROJET) {
  if (actifs.length === 1) PROJET = actifs[0].ref;
  else {
    console.log('Projets Supabase de ton compte :');
    actifs.forEach((p, i) => console.log(`  ${i + 1}. ${p.nom} (${p.ref})`));
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const n = Number((await rl.question('Tape le numéro du projet de PRODUCTION d\'AFEIA, puis Entrée : ')).trim());
    rl.close();
    PROJET = actifs[n - 1]?.ref;
  }
}
if (!PROJET) {
  console.error('❌ Aucun projet Supabase actif trouvé.');
  process.exit(1);
}
console.log(`Projet choisi : ${PROJET}`);

// Le lien passe par le « pooler » Supabase (IPv4) : la connexion directe est IPv6 seulement.
let cible = '--remote';
if (!supabase('link', '--project-ref', PROJET)) {
  // Dernier recours : l'adresse « Session pooler » (Supabase > Connect), mot de passe compris.
  console.log('\nLe lien automatique a échoué. Dans Supabase, ouvre le projet, bouton « Connect » > « Session pooler »,');
  console.log('copie l\'adresse (remplace [YOUR-PASSWORD] par le mot de passe de la base), colle-la ici (clic droit) puis Entrée.');
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const url = (await rl.question('> ')).trim();
  rl.close();
  if (!url.startsWith('postgres')) {
    console.error('❌ Adresse invalide.');
    process.exit(1);
  }
  cible = `--remote=${url}`;
}

console.log('⏳ Copie du schéma de production (1 à 2 minutes)…');
if (!supabase('db', 'dump', cible, '-f', FICHIER)) {
  console.error('❌ La copie a échoué (voir le message ci-dessus).');
  process.exit(1);
}
console.log(`✅ Schéma copié dans ${FICHIER}`);
