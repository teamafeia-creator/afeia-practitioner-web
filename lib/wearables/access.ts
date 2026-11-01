// lib/wearables/access.ts
// Ouverture progressive de la fonctionnalité « objet connecté ».
//   WEARABLES_ENABLED_FOR = internal (défaut) | all
//   WEARABLES_INTERNAL_EMAILS = e-mails de l'équipe, séparés par des virgules (mode internal)
// Passer à « all » en Production ne demande aucun code : seulement la variable.
// ⚠ Prérequis : décision HDS validée (docs/wearables/hds-decision.md) avant WEARABLES_ENABLED_FOR=all.
// Module pur (testable) ; une valeur inconnue retombe sur « internal » (fermé par défaut).

export type WearablesMode = 'internal' | 'all';

export type WearablesAccess = { mode: WearablesMode; internalEmails: ReadonlySet<string> };

export function parseWearablesAccess(env: Record<string, string | undefined>): WearablesAccess {
  const raw = env.WEARABLES_ENABLED_FOR?.trim().toLowerCase();
  const mode: WearablesMode = raw === 'all' ? 'all' : 'internal';
  const internalEmails = new Set(
    (env.WEARABLES_INTERNAL_EMAILS ?? '')
      .split(/[,;\s]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
  return { mode, internalEmails };
}

/** L'utilisateur peut-il connecter un objet connecté ? (mode all, ou e-mail de l'équipe en mode internal) */
export function canUseWearables(
  user: { email?: string | null } | null | undefined,
  access: WearablesAccess = parseWearablesAccess(process.env)
): boolean {
  if (access.mode === 'all') return true;
  const email = user?.email?.trim().toLowerCase();
  return !!email && access.internalEmails.has(email);
}
