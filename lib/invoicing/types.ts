export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'cancelled';

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
