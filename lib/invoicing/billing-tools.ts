// Outils de facturation proposés à l'écran de choix (Facturation).
// Afeia ne se connecte à aucun de ces outils : on garde le choix du praticien
// et on lui propose un lien direct vers son outil.

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
