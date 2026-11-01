// lib/wearables/consent-text.ts
// Texte de consentement « objet connecté » : un seul fichier versionné, facile à faire relire
// (content/consents/wearables-v1.md), embarqué au build (import ?raw, voir next.config.mjs).
// Changer le SENS du texte = nouvelle version : créer wearables-v2.md et passer la constante à 'v2'
// (les patients déjà connectés devront accepter la nouvelle version avant de se reconnecter).
import WEARABLES_CONSENT_V1 from '@/content/consents/wearables-v1.md?raw';

export const WEARABLES_CONSENT_VERSION = 'v1';

/** Texte affiché au patient (le commentaire de tête, destiné aux relecteurs, est retiré). */
export const WEARABLES_CONSENT_TEXT: string = WEARABLES_CONSENT_V1.replace(/<!--[\s\S]*?-->\s*/, '').trim();
