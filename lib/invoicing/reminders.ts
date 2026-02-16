import type { ConsultationInvoice, PractitionerBillingSettings } from './types';

/**
 * Templates d'emails de relance par defaut
 */
export const DEFAULT_REMINDER_TEMPLATES = {
  j7: {
    subject: 'Rappel - Facture {numero_facture} en attente de règlement',
    body: `Bonjour,

Sauf erreur de notre part, la facture n°{numero_facture} d'un montant de {montant} €, émise le {date_emission}, n'a pas encore été réglée.

Nous vous remercions de bien vouloir procéder au règlement dans les meilleurs délais.

N'hésitez pas à nous contacter si vous avez la moindre question.

Cordialement,
{prenom_consultant} {nom_consultant}`,
  },
  j15: {
    subject: 'Deuxième rappel - Facture {numero_facture}',
    body: `Bonjour,

Nous nous permettons de revenir vers vous concernant la facture n°{numero_facture} d'un montant de {montant} €, émise le {date_emission}, qui reste à ce jour impayée.

Merci de régulariser cette situation dans les plus brefs délais.

Cordialement,
{prenom_consultant} {nom_consultant}`,
  },
  j30: {
    subject: 'Dernier rappel - Facture {numero_facture}',
    body: `Bonjour,

Malgré nos précédentes relances, la facture n°{numero_facture} d'un montant de {montant} €, émise le {date_emission}, demeure impayée.

Sans régularisation de votre part sous 7 jours, nous serons contraints d'envisager d'autres démarches.

Cordialement,
{prenom_consultant} {nom_consultant}`,
  },
} as const;

/**
 * Remplace les variables dans un template de relance.
 *
 * Variables supportees :
 *   {prenom_consultant}, {nom_consultant} — nom du praticien (signataire)
 *   {prenom_praticien}, {nom_praticien}   — alias praticien
 *   {numero_facture}, {numero}            — numero de facture
 *   {montant}                             — montant (nombre formate, sans symbole €)
 *   {date_emission}, {date_consultation}, {date} — date d'emission
 */
export function interpolateReminderTemplate(
  template: string,
  invoice: ConsultationInvoice
): string {
  const { practitioner_snapshot } = invoice;
  const dateEmission = invoice.date_emission
    ? new Date(invoice.date_emission).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';
  const montant = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(invoice.montant));

  return template
    .replace(/\{prenom_consultant\}/g, practitioner_snapshot.prenom)
    .replace(/\{nom_consultant\}/g, practitioner_snapshot.nom)
    .replace(/\{prenom_praticien\}/g, practitioner_snapshot.prenom)
    .replace(/\{nom_praticien\}/g, practitioner_snapshot.nom)
    .replace(/\{numero_facture\}/g, invoice.numero || '')
    .replace(/\{numero\}/g, invoice.numero || '')
    .replace(/\{date_emission\}/g, dateEmission)
    .replace(/\{date_consultation\}/g, dateEmission)
    .replace(/\{date\}/g, dateEmission)
    .replace(/\{montant\}/g, montant);
}

/**
 * Construit l'email de relance pour une facture
 */
export function buildReminderEmail(
  invoice: ConsultationInvoice,
  reminderType: 'j7' | 'j15' | 'j30',
  settings?: PractitionerBillingSettings | null
): { subject: string; text: string; html: string } {
  const defaults = DEFAULT_REMINDER_TEMPLATES[reminderType];

  // Utiliser le template personnalise du praticien si disponible
  const customTemplateKey = `email_template_relance_${reminderType}` as const;
  const customBody = settings?.[customTemplateKey];
  const bodyTemplate = customBody || defaults.body;

  const subject = interpolateReminderTemplate(defaults.subject, invoice);
  const text = interpolateReminderTemplate(bodyTemplate, invoice);

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      ${text
        .split('\n')
        .map((line) => (line.trim() ? `<p>${line}</p>` : ''))
        .join('\n')}
      ${
        invoice.stripe_payment_link_url
          ? `<p><a href="${invoice.stripe_payment_link_url}" style="display: inline-block; padding: 12px 24px; background-color: #1A6C6C; color: white; text-decoration: none; border-radius: 6px; margin-top: 16px;">Payer en ligne</a></p>`
          : ''
      }
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #999;">Ce message a ete envoye automatiquement depuis AFEIA.</p>
    </div>
  `.trim();

  return { subject, text, html };
}
