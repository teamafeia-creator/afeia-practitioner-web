// Relance manuelle des factures impayées (écran Facturation › Relancer).
// Fonctions pures : la même fonction remplit l'aperçu côté praticien et l'e-mail côté serveur,
// pour que le message envoyé soit exactement celui qui a été validé.

import type { ConsultationInvoice } from './types';

export const REMINDER_PLACEHOLDERS = ['{prénom}', '{numéro}', '{date}', '{montant}', '{lien de paiement}'] as const;

export function defaultReminderText(signature: string) {
  return [
    'Bonjour {prénom},',
    '',
    'Sauf erreur de ma part, la facture n° {numéro} du {date}, d’un montant de {montant}, reste à régler.',
    '{lien de paiement}',
    'Si vous l’avez déjà réglée, merci de ne pas tenir compte de ce message.',
    '',
    'Belle journée,',
    signature || '',
  ].join('\n').trim();
}

const money = (n: number) =>
  `${n.toLocaleString('fr-FR', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })} €`;

export function reminderSubject(invoice: Pick<ConsultationInvoice, 'numero'>) {
  return `Rappel : facture n° ${invoice.numero ?? ''}`.trim();
}

/** Remplace les mots entre accolades pour une facture. Sans lien de paiement, la ligne disparaît. */
export function fillReminder(
  template: string,
  invoice: Pick<ConsultationInvoice, 'numero' | 'date_emission' | 'montant' | 'consultant_snapshot' | 'stripe_payment_link_url'>
) {
  const first = invoice.consultant_snapshot?.prenom || '';
  const date = invoice.date_emission
    ? new Date(invoice.date_emission).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';
  const link = invoice.stripe_payment_link_url ? `Vous pouvez la régler en ligne en quelques secondes : ${invoice.stripe_payment_link_url}\n` : '';
  return template
    .split('{prénom}').join(first)
    .split('{prenom}').join(first)
    .split('{numéro}').join(invoice.numero ?? '')
    .split('{numero}').join(invoice.numero ?? '')
    .split('{date}').join(date)
    .split('{montant}').join(money(Number(invoice.montant)))
    .split('{lien de paiement}\n').join(link)
    .split('{lien de paiement}').join(link.trim())
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
