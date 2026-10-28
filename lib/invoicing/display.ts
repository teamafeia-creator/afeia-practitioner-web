// Libellés et calculs d'affichage de la facturation (écran Facturation).

import type { ConsultationInvoice, InvoiceStatus, PaymentMethod } from './types';

export const STATUS_UI: Record<InvoiceStatus, { l: string; bg: string; fg: string }> = {
  draft: { l: 'Brouillon', bg: '#2A3140', fg: '#C9CFDA' },
  issued: { l: 'En attente', bg: '#373131', fg: '#E8A87C' },
  paid: { l: 'Payée', bg: '#23383B', fg: '#6DD4B8' },
  refunded: { l: 'Remboursée', bg: '#1F2640', fg: '#A9B8EC' },
  cancelled: { l: 'Annulée', bg: '#1C2230', fg: '#8B95A5' },
};

export const METHOD_LABELS: Record<PaymentMethod, string> = {
  cb: 'Carte bancaire',
  especes: 'Espèces',
  cheque: 'Chèque',
  virement: 'Virement',
  stripe: 'Paiement en ligne',
};
export const MANUAL_METHODS: PaymentMethod[] = ['cb', 'especes', 'cheque', 'virement'];

export const REFUND_REASONS = [
  ['consultation_annulee', 'Consultation annulée'],
  ['erreur_facturation', 'Erreur de facturation'],
  ['geste_commercial', 'Geste commercial'],
  ['autre', 'Autre'],
] as const;

export const eur = (n: number) =>
  `${n.toLocaleString('fr-FR', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })} €`;

const shortFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
export const dateShort = (iso: string | null | undefined) => (iso ? shortFmt.format(new Date(iso)) : '—');

export const consultantName = (i: ConsultationInvoice) =>
  [i.consultant_snapshot?.prenom, i.consultant_snapshot?.nom].filter(Boolean).join(' ') || 'Consultant';

/** Trimestre civil en cours, total encaissé et date limite de déclaration (micro-entreprise, déclaration trimestrielle). */
export function urssafQuarter(invoices: ConsultationInvoice[], now = new Date()) {
  const q = Math.floor(now.getMonth() / 3);
  const start = new Date(now.getFullYear(), q * 3, 1);
  const end = new Date(now.getFullYear(), q * 3 + 3, 1);
  const total = invoices
    .filter((i) => i.payment_date && (i.status === 'paid' || i.status === 'refunded'))
    .filter((i) => {
      const d = new Date(i.payment_date as string);
      return d >= start && d < end;
    })
    .reduce((s, i) => s + Number(i.montant), 0);
  const refunds = invoices
    .filter((i) => i.is_avoir && new Date(i.created_at) >= start && new Date(i.created_at) < end)
    .reduce((s, i) => s + Number(i.montant), 0);
  const deadlines = ['30 avril', '31 juillet', '31 octobre', '31 janvier'];
  const ordinal = ['1er', '2e', '3e', '4e'][q];
  const startLabel = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' }).format(start).replace(/^1 /, '1er ');
  return { label: `${ordinal} trimestre`, total: Math.max(0, total + refunds), since: startLabel, deadline: deadlines[q] };
}
