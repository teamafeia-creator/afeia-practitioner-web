// lib/wearables/polar/alerts.ts
// Alerte à l'équipe : même canal que les inscriptions praticien
// (sendEmail/Resend vers adminEmails(), gabarit emailLayout de lib/server/verification).
import 'server-only';
import { sendEmail } from '@/lib/server/email';
import { adminEmails, emailLayout } from '@/lib/server/verification';
import type { WebhookStatus } from './api';

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'AFEIA <contact@afeia.fr>';

/** Webhook Polar absent ou désactivé. Renvoie le nombre de destinataires. */
export async function alertWebhookDown(status: WebhookStatus): Promise<number> {
  const recipients = await adminEmails();
  if (!recipients.length) {
    console.error('[wearables/polar/alerts] aucun destinataire (ADMIN_EMAILS vide) : alerte webhook non envoyée');
    return 0;
  }
  const missing = !status.exists;
  const body = emailLayout({
    eyebrow: 'Afeia · Objets connectés',
    title: missing ? "Le webhook Polar n'existe plus" : 'Le webhook Polar est désactivé',
    paragraphs: [
      missing
        ? "Aucun webhook n'est enregistré pour le client Polar de production. Les nouvelles données des consultants n'arrivent plus en temps réel."
        : "Polar a désactivé le webhook, généralement après 7 jours d'échecs de livraison. Les nouvelles données des consultants n'arrivent plus en temps réel.",
      'Le rattrapage quotidien récupère les 3 derniers jours, mais au-delà les données manquées seront perdues pour le suivi.',
      missing
        ? 'À faire : vérifier que /api/webhooks/polar répond, puis `npm run polar:webhook -- create` et mettre le nouveau secret dans POLAR_WEBHOOK_SECRET.'
        : 'À faire : vérifier que /api/webhooks/polar répond 200, puis `npm run polar:webhook -- activate`.',
    ],
    rows: status.exists
      ? [
          ['Webhook', status.id],
          ['URL', status.url],
          ['Événements', status.events.join(', ')],
          ['État', 'inactif'],
        ]
      : [],
    footer: 'Alerte envoyée par le cron /api/cron/polar-sync (une fois par jour tant que le problème persiste).',
  });
  const subject = missing ? '[Afeia] Webhook Polar absent' : '[Afeia] Webhook Polar désactivé';
  await Promise.all(recipients.map((to) => sendEmail({ to, from: FROM_EMAIL, subject, html: body.html, text: body.text })));
  return recipients.length;
}
