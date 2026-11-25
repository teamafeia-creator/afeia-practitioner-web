// Écrit .env.local pour l'environnement LOCAL à partir du Supabase local (`npx supabase status`).
// Usage : npm run local:env   (Supabase local doit être démarré : npm run db:start)
//
// - Si un .env.local existe déjà et ne vient pas de ce script, il est d'abord copié en
//   .env.local.sauvegarde (rien n'est perdu).
// - Les services payants (Stripe, Resend, Anthropic, Daily, Polar) restent vides : l'app
//   fonctionne sans, seules les fonctions concernées sont indisponibles. Les e-mails
//   s'affichent alors dans le terminal au lieu d'être envoyés.
import { execSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

const MARQUEUR = '# Généré par scripts/local-env.mjs';
const FICHIER = '.env.local';

let sortie;
try {
  sortie = execSync('npx supabase status -o env', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
} catch {
  console.error('❌ Supabase local ne répond pas. Lance d\'abord : npm run db:start');
  process.exit(1);
}

const valeurs = {};
for (const ligne of sortie.split(/\r?\n/)) {
  const m = ligne.match(/^([A-Z_]+)="?(.*?)"?$/);
  if (m) valeurs[m[1]] = m[2];
}
const url = valeurs.API_URL;
const anon = valeurs.ANON_KEY || valeurs.PUBLISHABLE_KEY;
const service = valeurs.SERVICE_ROLE_KEY || valeurs.SECRET_KEY;
if (!url || !anon || !service) {
  console.error('❌ Clés Supabase locales introuvables dans `supabase status`.');
  process.exit(1);
}

if (existsSync(FICHIER) && !readFileSync(FICHIER, 'utf8').includes(MARQUEUR)) {
  copyFileSync(FICHIER, '.env.local.sauvegarde');
  console.log('ℹ️  Ancien .env.local copié dans .env.local.sauvegarde');
}

const secret = () => randomBytes(32).toString('hex');
writeFileSync(
  FICHIER,
  `${MARQUEUR} — environnement LOCAL, ne pas utiliser en production.
NEXT_PUBLIC_SUPABASE_URL=${url}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${anon}
SUPABASE_SERVICE_ROLE_KEY=${service}

NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000

JWT_SECRET=${secret()}
QUESTIONNAIRE_CODE_PEPPER=${secret()}
QUESTIONNAIRE_CODE_TTL_MINUTES=30
QUESTIONNAIRE_JWT_SECRET=${secret()}
POLAR_STATE_SECRET=${secret()}
CRON_SECRET=${secret()}
WEARABLES_ENABLED_FOR=internal
WEARABLES_INTERNAL_EMAILS=

# Services externes : vides en local (fonctions concernées indisponibles).
# Pour en tester un, copie ici sa clé de TEST (jamais une clé de production).
RESEND_API_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
ANTHROPIC_API_KEY=
POLAR_CLIENT_ID=
POLAR_CLIENT_SECRET=
POLAR_REDIRECT_URI=http://localhost:3000/api/wearables/polar/callback
`,
);
console.log('✅ .env.local prêt pour l\'environnement local.');
