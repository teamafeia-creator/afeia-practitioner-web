// Colonnes de consultation_types exposées sur la page publique de prise de RDV.
// Fichier sans dépendance serveur : importable côté client (réglages) comme
// côté serveur (lib/queries/booking.ts). Toute colonne ajoutée ici doit exister
// en base, sinon la page publique /rdv/[slug] passe en erreur technique.
export const PUBLIC_CONSULTATION_TYPE_COLUMNS =
  'id, name, duration_minutes, price_cents, color, description, buffer_minutes, sort_order, is_group, price_per_participant' as const;
