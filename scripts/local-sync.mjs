// Synchro automatique de l'environnement LOCAL avec GitHub.
// Toutes les 30 secondes : si la branche en cours a reçu de nouveaux commits sur GitHub
// (par exemple poussés par Claude), on les récupère. `next dev` recharge alors la page tout seul.
//  - nouvelles migrations de base → appliquées à la base locale (sans effacer les données) ;
//  - nouvelles dépendances → message pour relancer lancer-afeia.cmd ;
//  - modifications locales non enregistrées → la synchro se met en pause (rien n'est écrasé).
// Usage : npm run local:sync   (lancé automatiquement par outils-windows/lancer-afeia.cmd)
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const INTERVALLE_MS = 30_000;
const CLI = fileURLToPath(new URL('../node_modules/supabase/dist/supabase.js', import.meta.url));
const git = (...args) => {
  const r = spawnSync('git', args, { encoding: 'utf8' });
  return { ok: r.status === 0, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() };
};
const heure = () => new Date().toLocaleTimeString('fr-FR');
let dernierAvertissement = '';
const avertir = (msg) => {
  if (msg !== dernierAvertissement) console.log(`[${heure()}] ${msg}`);
  dernierAvertissement = msg;
};

function synchroniser() {
  const branche = git('rev-parse', '--abbrev-ref', 'HEAD').out;
  if (!branche || branche === 'HEAD') return avertir('⚠️  Pas de branche active, synchro en pause.');
  if (!git('fetch', '--quiet', 'origin', branche).ok) return avertir('⚠️  GitHub injoignable, nouvel essai dans 30 s.');

  const local = git('rev-parse', 'HEAD').out;
  const distant = git('rev-parse', `origin/${branche}`).out;
  if (!distant || local === distant) return;
  if (git('merge-base', '--is-ancestor', distant, local).ok) return; // rien de nouveau à récupérer

  // npm réécrit parfois package-lock.json sous Windows : ce n'est pas une vraie modification.
  git('checkout', '--', 'package-lock.json');
  const modifs = git('status', '--porcelain', '--untracked-files=no').out;
  if (modifs) {
    return avertir(`⏸️  Mise à jour disponible sur « ${branche} », mais des fichiers ont été modifiés ici :\n${modifs}\n   Synchro en pause tant que ces modifications sont là.`);
  }

  const changes = git('diff', '--name-only', local, distant).out.split('\n').filter(Boolean);
  const pull = git('pull', '--ff-only', '--quiet');
  if (!pull.ok) return avertir(`⚠️  Mise à jour impossible : ${pull.err}`);
  dernierAvertissement = '';
  console.log(`[${heure()}] ✅ ${changes.length} fichier(s) mis à jour depuis GitHub (${branche}) : la page se recharge.`);

  if (changes.some((f) => f.startsWith('supabase/migrations/'))) {
    console.log(`[${heure()}] 🗄️  Nouvelle(s) migration(s) : application à la base locale…`);
    const r = spawnSync(process.execPath, [CLI, 'migration', 'up'], { stdio: 'inherit' });
    if (r.status !== 0) console.log('   ⚠️  Échec : lance outils-windows\\reinitialiser-donnees.cmd pour repartir de zéro.');
  }
  if (changes.some((f) => f === 'package.json' || f === 'package-lock.json')) {
    console.log(`[${heure()}] 📦 Nouvelles dépendances : ferme la fenêtre AFEIA et relance lancer-afeia.cmd.`);
  }
}

console.log(`[${heure()}] 🔄 Synchro automatique avec GitHub active (toutes les 30 s). Laisse cette fenêtre ouverte.`);
synchroniser();
setInterval(synchroniser, INTERVALLE_MS);
