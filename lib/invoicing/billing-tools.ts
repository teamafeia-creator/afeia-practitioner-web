// Outils de facturation proposés à l'écran de choix (Facturation).
// Pennylane et Abby se connectent par clé API : Afeia y crée les brouillons de facture
// des séances terminées. Indy, Tiime et Freebe n'ont pas d'API publique (nov. 2026) :
// suivi manuel (lien direct, « Marquer comme facturée », export CSV).

export type ExternalTool = 'pennylane' | 'indy' | 'tiime' | 'abby' | 'freebe' | 'autre' | 'tableur';
export type BillingTool = ExternalTool | 'afeia';

export const EXTERNAL_TOOLS: Record<ExternalTool, { name: string; desc: string; color: string; url: string | null }> = {
  pennylane: { name: 'Pennylane', desc: 'Facturation et comptabilité', color: '#A9B8EC', url: 'https://www.pennylane.com' },
  indy: { name: 'Indy', desc: 'Comptabilité des indépendants', color: '#6DD4B8', url: 'https://www.indy.fr' },
  tiime: { name: 'Tiime', desc: 'Facturation et comptabilité', color: '#E8A87C', url: 'https://www.tiime.fr' },
  abby: { name: 'Abby', desc: 'Micro-entrepreneurs, suivi URSSAF', color: '#E8A5C6', url: 'https://www.abby.fr' },
  freebe: { name: 'Freebe', desc: 'Gestion des indépendants', color: '#D4A574', url: 'https://www.freebe.me' },
  autre: { name: 'Un autre logiciel', desc: 'Vous continuez comme aujourd’hui', color: '#8B95A5', url: null },
  tableur: { name: 'Tableur ou papier', desc: 'Excel, carnet à souches…', color: '#5C6573', url: null },
};

export type ToolIntegration =
  | { kind: 'api'; keyHelp: string[]; keyUrl: string }
  | { kind: 'manual'; reason: string };

/** Comment Afeia travaille avec chaque outil. */
export const INTEGRATIONS: Record<ExternalTool, ToolIntegration> = {
  pennylane: {
    kind: 'api',
    keyUrl: 'https://app.pennylane.com/',
    keyHelp: [
      'Dans Pennylane, ouvrez Paramètres › Connectivité › Développeurs.',
      'Générez un jeton API avec les droits « Clients » et « Factures clients » en lecture et écriture.',
      'Copiez le jeton : il ne s’affiche qu’une fois.',
    ],
  },
  abby: {
    kind: 'api',
    keyUrl: 'https://app.abby.fr/',
    keyHelp: ['Dans Abby, ouvrez Paramètres › Intégrations.', 'Cliquez sur « Créer une clé API » et copiez la clé affichée.'],
  },
  indy: { kind: 'manual', reason: 'Indy ne propose pas d’API ouverte aux autres logiciels.' },
  tiime: { kind: 'manual', reason: 'Tiime réserve son API à ses partenaires : pas de connexion directe pour l’instant.' },
  freebe: { kind: 'manual', reason: 'Freebe ne propose pas d’API ouverte aux autres logiciels.' },
  autre: { kind: 'manual', reason: '' },
  tableur: { kind: 'manual', reason: '' },
};

export function canConnect(t: ExternalTool): t is 'pennylane' | 'abby' {
  return INTEGRATIONS[t].kind === 'api';
}

export const TOOL_KEYS = Object.keys(EXTERNAL_TOOLS) as ExternalTool[];

export function isBillingTool(v: unknown): v is BillingTool {
  return v === 'afeia' || (typeof v === 'string' && v in EXTERNAL_TOOLS);
}

/** Nom affiché dans la phrase « Vous facturez avec … ». */
export function toolPhrase(t: ExternalTool) {
  if (t === 'autre') return 'votre logiciel';
  if (t === 'tableur') return 'votre tableur ou vos factures papier';
  return EXTERNAL_TOOLS[t].name;
}
