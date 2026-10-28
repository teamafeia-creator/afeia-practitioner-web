// Bibliothèque : thèmes, couleurs, formats et petites fonctions partagées.

import type { EducationalResource, ResourceCategory, ResourceContentType } from './types';

export const CATEGORY_LABELS: Record<ResourceCategory, string> = {
  alimentation: 'Alimentation',
  hydratation: 'Hydratation',
  phytotherapie: 'Phytothérapie',
  aromatherapie: 'Aromathérapie',
  respiration: 'Respiration',
  activite_physique: 'Activité physique',
  sommeil: 'Sommeil',
  gestion_stress: 'Gestion du stress',
  detox: 'Détox',
  digestion: 'Digestion',
  immunite: 'Immunité',
  peau: 'Peau',
  feminin: 'Féminin',
  general: 'Général',
};

export const CATEGORY_ORDER = Object.keys(CATEGORY_LABELS) as ResourceCategory[];

/** Couleur d'un thème, d'une section de conseillancier ou d'une catégorie de ressource. */
const COLORS: Record<string, string> = {
  Alimentation: '#D4A574', Sommeil: '#7B93DB', Phytothérapie: '#6DD4B8', 'Gestion du stress': '#E8A87C', Respiration: '#A9B8EC',
  Féminin: '#E8A5C6', Aromathérapie: '#B89FD9', Digestion: '#E8C46B', Hydratation: '#6DCFE0', 'Activité physique': '#9FD98A',
  Détox: '#C9A86B', Immunité: '#7FD1C1', Peau: '#F0B8A0', Général: '#C9CFDA',
  'En-tête': '#C9CFDA', Objectifs: '#C9CFDA', Aromatologie: '#B89FD9', Hydrologie: '#6DCFE0', 'Techniques respiratoires': '#A9B8EC',
  'Message de clôture': '#C9CFDA', Micronutrition: '#E8C46B', 'Équilibre psycho-émotionnel': '#E8A87C', 'Techniques manuelles': '#F0B8A0',
  Environnement: '#9FD98A', Suivi: '#C9CFDA', 'Notes libres': '#C9CFDA',
  Réglementation: '#E8A87C', Études: '#7B93DB', Outils: '#6DD4B8', Modèles: '#D4A574', Formations: '#E8A5C6',
};
export const colorOfTheme = (label: string) => COLORS[label] ?? '#C9CFDA';

export const ficheTheme = (r: Pick<EducationalResource, 'category'> & { theme_label?: string | null }) =>
  r.theme_label?.trim() || CATEGORY_LABELS[r.category] || 'Général';

export const FORMAT_LABELS: Record<ResourceContentType, string> = {
  article: 'Article',
  pdf: 'PDF',
  image: 'Image',
  video_link: 'Vidéo',
};

export const RESOURCE_FORMATS = [
  ['link', 'Lien'],
  ['pdf', 'PDF'],
  ['video', 'Vidéo'],
  ['model', 'Modèle à adapter'],
] as const;
export type ResourceFormat = (typeof RESOURCE_FORMATS)[number][0];
export const RESOURCE_CATEGORIES = ['Réglementation', 'Études', 'Outils', 'Modèles', 'Formations'];

export function readTime(markdown: string | null | undefined): number {
  const words = (markdown ?? '').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 180));
}

export function relativeSent(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return 'aujourd’hui';
  if (days === 1) return 'hier';
  if (days < 7) return `il y a ${days} j`;
  if (days < 30) return `il y a ${Math.round(days / 7)} sem.`;
  return `il y a ${Math.round(days / 30)} mois`;
}

/** Lignes d'aperçu (téléphone) à partir du markdown simplifié de l'éditeur. */
export function previewLines(md: string) {
  return md
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => {
      if (l.startsWith('## ')) return { kind: 'h' as const, t: l.slice(3) };
      if (l.startsWith('- ')) return { kind: 'li' as const, t: `•  ${l.slice(2)}` };
      return { kind: 'p' as const, t: l.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\[(.+?)\]\((.+?)\)/g, '$1') };
    });
}
