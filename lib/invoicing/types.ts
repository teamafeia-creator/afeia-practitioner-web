export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'cancelled' | 'refunded';

export type PaymentMethod = 'especes' | 'cheque' | 'cb' | 'virement' | 'stripe';

export type InvoiceDocumentType = 'facture' | 'recu' | 'facture-recu';

export interface PractitionerSnapshot {
  nom: string;
  prenom: string;
  adresse: string;
  siret: string;
  mention_tva: string;
  statut_juridique: string;
}

export interface ConsultantSnapshot {
  nom: string;
  prenom: string;
  email: string;
  adresse?: string;
}

export interface ConsultationInvoice {
  id: string;
  practitioner_id: string;
  consultant_id: string;
  consultation_id: string | null;

  numero: string | null;
  date_emission: string | null;
  annee_fiscale: number;

  template_id: string | null;
  description: string;
  montant: number;

  tva_applicable: boolean;
  taux_tva: number | null;
  montant_ttc: number | null;

  status: InvoiceStatus;

  payment_method: PaymentMethod | null;
  payment_date: string | null;
  payment_notes: string | null;

  practitioner_snapshot: PractitionerSnapshot;
  consultant_snapshot: ConsultantSnapshot;

  // V2: Avoir
  is_avoir: boolean;
  facture_origine_id: string | null;
  motif_remboursement: string | null;

  // V2: Stripe Payment Link
  stripe_payment_link_url: string | null;
  stripe_payment_link_expires_at: string | null;
  stripe_payment_intent_id: string | null;

  created_at: string;
  updated_at: string;
}

export interface InvoiceHistory {
  id: string;
  invoice_id: string;
  action: string;
  user_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface InvoiceTemplate {
  id: string;
  practitioner_id: string;
  label: string;
  description: string;
  montant_defaut: number;
  duree_defaut: number | null;
  ordre: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PractitionerBillingSettings {
  practitioner_id: string;
  siret: string;
  adresse_facturation: string;
  mention_tva: string;
  statut_juridique: string;
  libelle_document: InvoiceDocumentType;
  email_auto_consultant: boolean;
  email_copie_praticien: boolean;
  derniere_annee_fiscale: number | null;
  dernier_numero_emis: number | null;

  // V2: Stripe Connect
  stripe_account_id: string | null;
  stripe_onboarding_completed: boolean;
  stripe_charges_enabled: boolean;
  stripe_details_submitted: boolean;
  stripe_connected_at: string | null;

  // V2: Relances automatiques
  relances_auto: boolean;
  delai_relance_j7: boolean;
  delai_relance_j15: boolean;
  delai_relance_j30: boolean;
  email_template_relance_j7: string | null;
  email_template_relance_j15: string | null;
  email_template_relance_j30: string | null;

  created_at: string;
  updated_at: string;
}

export interface InvoiceStats {
  ca_mois: number;
  ca_annee: number;
  nb_factures: number;
  nb_factures_payees: number;
  montant_en_attente: number;
  ticket_moyen: number;
}

// V2 types

export interface StripeWebhookEvent {
  id: string;
  event_id: string;
  event_type: string;
  stripe_account_id: string | null;
  payload: Record<string, unknown>;
  processed: boolean;
  processed_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface ReminderQueueItem {
  id: string;
  invoice_id: string;
  reminder_type: 'j7' | 'j15' | 'j30';
  scheduled_for: string;
  sent: boolean;
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
}

export type MotifRemboursement =
  | 'consultation_annulee'
  | 'erreur_facturation'
  | 'geste_commercial'
  | 'autre';

export interface StripeConnectStatus {
  connected: boolean;
  account_id?: string;
  charges_enabled?: boolean;
  details_submitted?: boolean;
  payouts_enabled?: boolean;
  email?: string;
}
