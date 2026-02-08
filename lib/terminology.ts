/**
 * Terminologie naturopathique centralisée pour AFEIA.
 *
 * RÈGLE D'OR :
 * - L'UI affiche les termes métier (ce fichier)
 * - Le code, la BDD, les routes gardent les termes techniques (patient, plan, etc.)
 *
 * En naturopathie, la personne accompagnée est un « consultant » (pas un patient).
 * Le document remis après la séance est un « conseillancier » (Programme d'Hygiène Vitale).
 */

export const T = {
  // ─── Entités principales ─────────────────────────
  consultant: 'consultant',
  consultants: 'consultants',
  Consultant: 'Consultant',
  Consultants: 'Consultants',
  dossierConsultant: 'Dossier consultant',

  // ─── Le document central ─────────────────────────
  conseillancier: 'Conseillancier',
  conseillancierLower: 'conseillancier',
  conseillancierFull: 'Programme d\'Hygiène Vitale (PHV)',
  conseillancierPersonnalise: 'Conseillancier personnalisé',
  conseillancierNouveau: 'Nouveau conseillancier',
  conseillancierAucun: 'Aucun conseillancier créé',
  conseillancierDernier: 'Dernier conseillancier',
  conseillancierEnAttente: 'Conseillanciers en attente',
  conseillancierEnBrouillon: 'Conseillancier en brouillon',
  conseillancierCreer: 'Créer un conseillancier',
  conseillancierExporter: 'Exporter en PDF',

  // ─── Onglets du dossier consultant ───────────────
  tabProfil: 'Profil',
  tabRendezVous: 'Rendez-vous',
  tabAnamnese: 'Anamnèse',
  tabBagueConnectee: 'Bague connectée',
  tabJournal: 'Journal',
  tabNotesSeance: 'Notes de séance',
  tabConseillancier: 'Conseillancier',
  tabDocuments: 'Documents et analyses',
  tabMessages: 'Messages',

  // ─── Descriptions des onglets ────────────────────
  descProfil: 'Coordonnées clés et informations administratives.',
  descRendezVous: 'Historique et planification des consultations.',
  descAnamnese: 'Questionnaire santé et habitudes de vie.',
  descBagueConnectee: 'Synthèse sommeil, HRV et activité.',
  descJournal: 'Suivi quotidien du ressenti du consultant.',
  descNotesSeance: 'Notes internes réservées au praticien.',
  descConseillancier: 'Versions du conseillancier partagé au consultant.',
  descDocuments: 'Documents et résultats transmis par le consultant.',
  descMessages: 'Conversation directe avec le consultant.',

  // ─── Actions ─────────────────────────────────────
  partagerConsultant: 'Partager au consultant',
  ajouterConsultant: 'Ajouter un consultant',
  envoyerConsultant: 'Envoyer au consultant',

  // ─── Bilan → Conseillancier ──────────────────────
  bilansEnAttente: 'Conseillanciers en attente',
  bilanEnBrouillon: 'Conseillancier en brouillon',
  bilanDeVitalite: 'Bilan de vitalité',

  // ─── Labels du dashboard ────────────────────────
  plansEnBrouillon: 'Conseillanciers en brouillon à finaliser et partager',
} as const;

export type TerminologyKey = keyof typeof T;
