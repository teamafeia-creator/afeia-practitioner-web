// Prise de rendez-vous en ligne : acompte (Stripe Connect), confirmation, annulation.
// Serveur uniquement.

import Stripe from 'stripe';
import { createAdminClient } from '../supabase/admin';
import { sendEmail } from './email';
import { buildConfirmationEmail, buildPractitionerNotificationEmail } from '../emails/booking-confirmation';
import { markAsFulfilled } from '../queries/waitlist';

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'AFEIA <contact@afeia.fr>';
export const appUrl = () => process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://app.afeia.fr';

let stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
    stripe = new Stripe(key);
  }
  return stripe;
}

export type DepositConfig = { percent: number; cents: number; stripeAccountId: string | null };

/**
 * Acompte demandé pour un type de séance : % du type, sinon % du praticien (30 % par défaut).
 * Sans compte Stripe Connect actif, aucun acompte n'est encaissé en ligne (cents = 0).
 */
export async function getDepositConfig(practitionerId: string, typeId: string, priceCents: number | null): Promise<DepositConfig> {
  const supabase = createAdminClient();
  const [{ data: prac }, { data: type }, { data: billing }] = await Promise.all([
    supabase.from('practitioners').select('booking_deposit_percent').eq('id', practitionerId).maybeSingle(),
    supabase.from('consultation_types').select('deposit_percent').eq('id', typeId).maybeSingle(),
    supabase.from('practitioner_billing_settings').select('stripe_account_id, stripe_charges_enabled').eq('practitioner_id', practitionerId).maybeSingle(),
  ]);
  const percent = (type as { deposit_percent: number | null } | null)?.deposit_percent ?? (prac as { booking_deposit_percent: number | null } | null)?.booking_deposit_percent ?? 30;
  const account = billing && (billing as { stripe_charges_enabled: boolean }).stripe_charges_enabled ? (billing as { stripe_account_id: string | null }).stripe_account_id : null;
  const cents = account && priceCents && percent > 0 ? Math.max(100, Math.round((priceCents * percent) / 100)) : 0;
  return { percent, cents, stripeAccountId: account };
}

/** Session de paiement Stripe (page sécurisée) pour l'acompte d'une séance déjà réservée. */
export async function createDepositCheckout(params: {
  appointmentId: string;
  practitionerId: string;
  slug: string;
  stripeAccountId: string;
  cents: number;
  label: string;
  email: string;
}): Promise<string> {
  const base = appUrl();
  const session = await getStripe().checkout.sessions.create(
    {
      mode: 'payment',
      customer_email: params.email,
      line_items: [
        {
          price_data: { currency: 'eur', unit_amount: params.cents, product_data: { name: `Acompte · ${params.label}` } },
          quantity: 1,
        },
      ],
      payment_intent_data: { metadata: { type: 'booking_deposit', appointment_id: params.appointmentId } },
      metadata: { type: 'booking_deposit', appointment_id: params.appointmentId, practitioner_id: params.practitionerId },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      success_url: `${base}/rdv/${params.slug}?paiement=ok&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/rdv/${params.slug}?paiement=annule&rdv=${params.appointmentId}`,
    },
    { stripeAccount: params.stripeAccountId }
  );
  const supabase = createAdminClient();
  await supabase
    .from('appointments')
    .update({ deposit_cents: params.cents, deposit_status: 'pending', stripe_checkout_session_id: session.id, stripe_account_id: params.stripeAccountId })
    .eq('id', params.appointmentId);
  if (!session.url) throw new Error('Stripe checkout URL missing');
  return session.url;
}

type ApptRow = {
  id: string;
  practitioner_id: string;
  consultant_id: string | null;
  consultation_type_id: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
  location_type: string;
  video_link: string | null;
  booking_name: string | null;
  booking_email: string | null;
  booking_phone: string | null;
  notes_public: string | null;
  deposit_cents: number | null;
  deposit_status: string;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_account_id: string | null;
  confirmation_sent_at: string | null;
  cancel_token: string;
};

async function loadAppointment(id: string): Promise<ApptRow | null> {
  const { data } = await createAdminClient().from('appointments').select('*').eq('id', id).maybeSingle();
  return (data as ApptRow | null) ?? null;
}

const parisDate = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' });
const parisTime = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });

/** Données communes des e-mails de rendez-vous (gabarit de confirmation). */
async function bookingEmailData(a: ApptRow, name: string, email: string, reason: string | null) {
  const supabase = createAdminClient();
  const [{ data: prac }, { data: type }] = await Promise.all([
    supabase.from('practitioners').select('full_name, email, booking_address, cancellation_policy_hours, cancellation_policy_text').eq('id', a.practitioner_id).maybeSingle(),
    a.consultation_type_id ? supabase.from('consultation_types').select('name, duration_minutes, price_cents').eq('id', a.consultation_type_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const p = prac as { full_name: string; email: string | null; booking_address: string | null; cancellation_policy_hours: number | null; cancellation_policy_text: string | null } | null;
  const t = type as { name: string; duration_minutes: number; price_cents: number | null } | null;
  const start = new Date(a.starts_at);
  const first = name.split(' ')[0] ?? '';
  const deposit = a.deposit_status === 'paid' && a.deposit_cents ? a.deposit_cents / 100 : null;
  const balance = deposit != null && t?.price_cents ? Math.max(0, t.price_cents / 100 - deposit) : null;
  const data = {
    consultantFirstName: first,
    consultantName: name,
    consultantEmail: email,
    practitionerName: p?.full_name ?? '',
    practitionerAddress: p?.booking_address ?? null,
    dateFormatted: parisDate.format(start),
    timeFormatted: parisTime.format(start),
    consultationTypeName: t?.name ?? 'Séance',
    durationMinutes: t?.duration_minutes ?? Math.round((new Date(a.ends_at).getTime() - start.getTime()) / 60000),
    cancellationPolicyHours: p?.cancellation_policy_hours ?? 24,
    cancellationPolicyText: p?.cancellation_policy_text ?? null,
    reason,
    videoLink: a.video_link,
    depositEuros: deposit,
    balanceEuros: balance,
    cancelUrl: `${appUrl()}/rdv/annuler/${a.cancel_token}`,
    isVisio: a.location_type === 'video',
  };
  return { data, practitionerEmail: p?.email ?? null };
}

/** Séance déplacée par le praticien : e-mail de changement d'horaire au consultant. */
export async function notifyReschedule(appointmentId: string, previousStartsAt: string): Promise<boolean> {
  const supabase = createAdminClient();
  const a = await loadAppointment(appointmentId);
  if (!a) return false;
  let name = a.booking_name ?? '';
  let email = a.booking_email;
  if (a.consultant_id) {
    const { data: c } = await supabase.from('consultants').select('name, first_name, last_name, email').eq('id', a.consultant_id).maybeSingle();
    const row = c as { name: string | null; first_name: string | null; last_name: string | null; email: string | null } | null;
    if (row) {
      name = row.name || [row.first_name, row.last_name].filter(Boolean).join(' ') || name;
      email = row.email || email;
    }
  }
  if (!email) return false;
  const { data } = await bookingEmailData(a, name, email, null);
  const prev = new Date(previousStartsAt);
  const mail = buildConfirmationEmail({ ...data, previousDateFormatted: `${parisDate.format(prev)} à ${parisTime.format(prev)}` });
  await sendEmail({ to: email, from: FROM_EMAIL, subject: mail.subject, html: mail.html, text: mail.text });
  return true;
}

/** E-mails de confirmation (consultant + praticien), une seule fois par séance. */
export async function notifyBooking(appointmentId: string, opts: { reason?: string | null; isNewConsultant?: boolean } = {}) {
  const supabase = createAdminClient();
  const a = await loadAppointment(appointmentId);
  if (!a || a.confirmation_sent_at || !a.booking_email) return;
  await supabase.from('appointments').update({ confirmation_sent_at: new Date().toISOString() }).eq('id', a.id).is('confirmation_sent_at', null);

  const { data, practitionerEmail } = await bookingEmailData(a, a.booking_name ?? '', a.booking_email, opts.reason ?? null);
  const start = new Date(a.starts_at);
  try {
    const mail = buildConfirmationEmail(data);
    await sendEmail({ to: a.booking_email, from: FROM_EMAIL, subject: mail.subject, html: mail.html, text: mail.text });
  } catch (e) {
    console.error('[booking] confirmation email failed', e);
  }
  try {
    if (practitionerEmail) {
      const notif = buildPractitionerNotificationEmail({
        ...data,
        consultantPhone: a.booking_phone ?? '',
        agendaUrl: `${appUrl()}/agenda?date=${a.starts_at.slice(0, 10)}`,
        isNewConsultant: !!opts.isNewConsultant,
      });
      await sendEmail({ to: practitionerEmail, from: FROM_EMAIL, subject: notif.subject, html: notif.html, text: notif.text });
    }
  } catch (e) {
    console.error('[booking] practitioner email failed', e);
  }
  try {
    await markAsFulfilled(a.practitioner_id, start);
  } catch (e) {
    console.error('[booking] waitlist fulfil failed', e);
  }
}

/** Acompte payé (retour de Stripe ou webhook) : marque la séance et envoie les confirmations. Idempotent. */
export async function confirmDeposit(appointmentId: string, paymentIntentId: string | null) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('appointments')
    .update({ deposit_status: 'paid', stripe_payment_intent_id: paymentIntentId, status: 'confirmed' })
    .eq('id', appointmentId)
    .in('deposit_status', ['pending', 'expired'])
    .select('id');
  if (data && data.length) await notifyBooking(appointmentId);
}

/** Vérifie une session Stripe au retour du consultant. */
export async function verifyDepositSession(sessionId: string): Promise<{ appointmentId: string; paid: boolean } | null> {
  const supabase = createAdminClient();
  const { data } = await supabase.from('appointments').select('id, stripe_account_id').eq('stripe_checkout_session_id', sessionId).maybeSingle();
  const row = data as { id: string; stripe_account_id: string | null } | null;
  if (!row?.stripe_account_id) return null;
  const session = await getStripe().checkout.sessions.retrieve(sessionId, {}, { stripeAccount: row.stripe_account_id });
  const paid = session.payment_status === 'paid';
  if (paid) await confirmDeposit(row.id, typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? null);
  return { appointmentId: row.id, paid };
}

/** Paiement abandonné ou expiré : libère le créneau. */
export async function releasePendingAppointment(appointmentId: string) {
  const supabase = createAdminClient();
  await supabase
    .from('appointments')
    .update({ status: 'cancelled', deposit_status: 'expired', cancelled_by: 'consultant', cancelled_at: new Date().toISOString(), cancellation_reason: 'Acompte non réglé' })
    .eq('id', appointmentId)
    .eq('deposit_status', 'pending');
}

/** Rembourse l'acompte d'une séance (annulation dans les délais, ou par le praticien). */
export async function refundDeposit(appointmentId: string): Promise<boolean> {
  const a = await loadAppointment(appointmentId);
  if (!a || a.deposit_status !== 'paid' || !a.stripe_payment_intent_id || !a.stripe_account_id) return false;
  await getStripe().refunds.create({ payment_intent: a.stripe_payment_intent_id }, { stripeAccount: a.stripe_account_id });
  await createAdminClient().from('appointments').update({ deposit_status: 'refunded' }).eq('id', a.id);
  return true;
}

/** Annulation par le consultant via son lien : remboursement si au-delà du délai, acompte conservé sinon. */
export async function cancelByToken(token: string): Promise<{ ok: boolean; refunded: boolean; kept: boolean; message?: string }> {
  const supabase = createAdminClient();
  const { data } = await supabase.from('appointments').select('*').eq('cancel_token', token).maybeSingle();
  const a = data as ApptRow | null;
  if (!a) return { ok: false, refunded: false, kept: false, message: 'Ce lien d’annulation n’est plus valable.' };
  if (a.status === 'cancelled') return { ok: true, refunded: a.deposit_status === 'refunded', kept: a.deposit_status === 'kept' };
  if (new Date(a.starts_at).getTime() < Date.now()) return { ok: false, refunded: false, kept: false, message: 'La séance est déjà passée.' };

  const { data: prac } = await supabase.from('practitioners').select('cancellation_policy_hours').eq('id', a.practitioner_id).maybeSingle();
  const hours = (prac as { cancellation_policy_hours: number | null } | null)?.cancellation_policy_hours ?? 24;
  const inTime = new Date(a.starts_at).getTime() - Date.now() > hours * 3600000;

  await supabase
    .from('appointments')
    .update({ status: 'cancelled', cancelled_by: 'consultant', cancelled_at: new Date().toISOString(), cancellation_reason: 'Annulée par le consultant' })
    .eq('id', a.id);

  let refunded = false;
  let kept = false;
  if (a.deposit_status === 'paid') {
    if (inTime) refunded = await refundDeposit(a.id).catch(() => false);
    else {
      await supabase.from('appointments').update({ deposit_status: 'kept' }).eq('id', a.id);
      kept = true;
    }
  }
  return { ok: true, refunded, kept };
}
