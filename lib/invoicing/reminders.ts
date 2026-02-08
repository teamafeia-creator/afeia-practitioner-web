import type { ConsultationInvoice, PractitionerBillingSettings } from './types';

/**
 * Templates d'emails de relance par defaut
 */
export const DEFAULT_REMINDER_TEMPLATES = {
  j7: {
    subject: 'Rappel amical — Consultation du {date}',
    body: `Bonjour {prenom_consultant},

Un petit rappel concernant votre consultation du {date_consultation}.

Si vous avez deja regle cette facture ({montant}), merci d'ignorer ce message.

Bien cordialement,
{prenom_praticien} {nom_praticien}`,
  },
  j15: {
    subject: 'Relance — Facture {numero} en attente',
    body: `Bonjour {prenom_consultant},

Je me permets de vous relancer concernant votre consultation du {date_consultation} ({montant}), qui n'a pas encore ete reglee.

Si vous rencontrez une difficulte, n'hesitez pas a me contacter directement.

Merci de votre comprehension.

{prenom_praticien} {nom_praticien}`,
  },
  j30: {
    subject: 'Derniere relance — Facture {numero}',
    body: `Bonjour {prenom_consultant},

Votre facture {numero} du {date_consultation} ({montant}) est impayee depuis plus de 30 jours.

Je vous remercie de bien vouloir proceder au reglement dans les plus brefs delais.

En l'absence de reglement, je serai contraint d'appliquer les penalites de retard prevues (3,87% + 40 EUR).

Cordialement,
{prenom_praticien} {nom_praticien}`,
  },
} as const;

/**
 * Remplace les variables dans un template de relance
 */
export function interpolateReminderTemplate(
  template: string,
  invoice: ConsultationInvoice
): string {
  const { consultant_snapshot, practitioner_snapshot } = invoice;
  const dateConsultation = invoice.date_emission
    ? new Date(invoice.date_emission).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';
  const montant = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number(invoice.montant));

  return template
    .replace(/\{prenom_consultant\}/g, consultant_snapshot.prenom)
    .replace(/\{nom_consultant\}/g, consultant_snapshot.nom)
    .replace(/\{prenom_praticien\}/g, practitioner_snapshot.prenom)
    .replace(/\{nom_praticien\}/g, practitioner_snapshot.nom)
    .replace(/\{date_consultation\}/g, dateConsultation)
    .replace(/\{date\}/g, dateConsultation)
    .replace(/\{montant\}/g, montant)
    .replace(/\{numero\}/g, invoice.numero || '');
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
