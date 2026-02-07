import type { ConsultationInvoice, InvoiceDocumentType } from './types';

export function buildInvoiceEmailText(
  invoice: ConsultationInvoice,
  documentType: InvoiceDocumentType = 'facture'
): { subject: string; text: string; html: string } {
  const { consultant_snapshot, practitioner_snapshot } = invoice;
  const dateStr = invoice.date_emission
    ? new Date(invoice.date_emission).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

  const docLabel = documentType === 'recu' ? 'recu' : 'facture';

  const subject = `${documentType === 'recu' ? 'Recu' : 'Facture'} de votre consultation du ${dateStr}`;

  const text = [
    `Bonjour ${consultant_snapshot.prenom},`,
    '',
    `Merci pour votre visite du ${dateStr}.`,
    '',
    `Vous trouverez ci-joint le ${docLabel} de votre consultation, que vous pouvez transmettre a votre mutuelle pour un eventuel remboursement partiel.`,
    '',
    `A bientot,`,
    `${practitioner_snapshot.prenom} ${practitioner_snapshot.nom}`,
  ].join('\n');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <p>Bonjour ${consultant_snapshot.prenom},</p>
      <p>Merci pour votre visite du <strong>${dateStr}</strong>.</p>
      <p>Vous trouverez ci-joint le ${docLabel} de votre consultation, que vous pouvez transmettre a votre mutuelle pour un eventuel remboursement partiel.</p>
      <p>A bientot,<br/><strong>${practitioner_snapshot.prenom} ${practitioner_snapshot.nom}</strong></p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #999;">Ce message a ete envoye automatiquement depuis AFEIA.</p>
    </div>
  `.trim();

  return { subject, text, html };
}
