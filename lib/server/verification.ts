import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/server/email';
import { checkSiretWithPappers } from '@/lib/server/pappers';
import { buildConcordance, getDocumentExtractor } from '@/lib/server/documentExtractor';
import { formatSiret, type AccountStatus, type ConcordanceResult, type PappersResult } from '@/lib/verification/types';

export const VERIFICATION_BUCKET = 'practitioner-verification';
/** Délai pendant lequel l'administrateur peut annuler sa décision. */
export const UNDO_WINDOW_MS = 10 * 60 * 1000;

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'AFEIA <contact@afeia.fr>';
export const appUrl = () => process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://app.afeia.fr';

export type VerificationRow = {
  practitioner_id: string;
  school: string;
  training_year: number;
  siret: string;
  city: string;
  charter_accepted_at: string;
  training_doc_path: string | null;
  training_doc_name: string | null;
  id_doc_path: string | null;
  id_doc_name: string | null;
  id_doc_deleted_at: string | null;
  pappers: PappersResult | null;
  pappers_checked_at: string | null;
  concordance: ConcordanceResult | null;
  checks: { id?: boolean; siret?: boolean; doc?: boolean };
  decision_status: AccountStatus | null;
  decision_motive: string | null;
  decided_at: string | null;
  decided_by: string | null;
  practitioner_reply: string | null;
  replied_at: string | null;
  created_at: string;
  updated_at: string;
};

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Gabarit d'e-mail sobre (fond clair, une action). */
export function emailLayout(opts: { eyebrow: string; title: string; paragraphs: string[]; rows?: [string, string][]; cta?: { label: string; href: string }; footer?: string }) {
  const rows = (opts.rows ?? [])
    .map(
      ([l, v]) =>
        `<tr><td style="padding:8px 0;color:#5C6573;font-size:13px;width:170px;vertical-align:top">${esc(l)}</td><td style="padding:8px 0;color:#0A0E14;font-size:14px">${esc(v)}</td></tr>`
    )
    .join('');
  const html = `<!doctype html><html><body style="margin:0;background:#E9ECEF;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;padding:32px">
<tr><td style="font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#1F6F5E;font-weight:600">${esc(opts.eyebrow)}</td></tr>
<tr><td style="padding-top:10px;font-size:22px;font-weight:600;color:#0A0E14">${esc(opts.title)}</td></tr>
${opts.paragraphs.map((p) => `<tr><td style="padding-top:12px;font-size:15px;line-height:1.55;color:#2A3140">${esc(p).replace(/\n/g, '<br>')}</td></tr>`).join('')}
${rows ? `<tr><td style="padding-top:16px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #E1E5EA">${rows}</table></td></tr>` : ''}
${opts.cta ? `<tr><td style="padding-top:22px"><a href="${esc(opts.cta.href)}" style="display:inline-block;background:#1F6F5E;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 20px;border-radius:10px">${esc(opts.cta.label)}</a></td></tr>` : ''}
${opts.footer ? `<tr><td style="padding-top:22px;font-size:12px;line-height:1.5;color:#5C6573">${esc(opts.footer)}</td></tr>` : ''}
</table></td></tr></table></body></html>`;
  const text = [
    opts.title,
    '',
    ...opts.paragraphs,
    '',
    ...(opts.rows ?? []).map(([l, v]) => `${l} : ${v}`),
    ...(opts.cta ? ['', `${opts.cta.label} : ${opts.cta.href}`] : []),
    ...(opts.footer ? ['', opts.footer] : []),
  ].join('\n');
  return { html, text };
}

async function safeSend(to: string, subject: string, body: { html: string; text: string }) {
  try {
    await sendEmail({ to, from: FROM_EMAIL, subject, html: body.html, text: body.text });
  } catch (e) {
    console.error('[verification] e-mail non envoyé', e);
  }
}

export async function adminEmails(): Promise<string[]> {
  const set = new Set<string>();
  (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .forEach((e) => set.add(e));
  try {
    const { data } = await createAdminClient().from('admin_allowlist').select('email');
    (data ?? []).forEach((r: { email: string | null }) => r.email && set.add(r.email.toLowerCase()));
  } catch {
    /* table absente */
  }
  return Array.from(set);
}

const levelText = (status: string | undefined, ok: string, warn: string, ko: string) =>
  status === 'ok' ? ok : status === 'warn' ? warn : status === 'ko' ? ko : 'non disponible, à vérifier à la main';

/** E-mail aux administrateurs : nouvelle demande (ou complément reçu). */
export async function notifyAdminsOfSignup(practitionerId: string, kind: 'new' | 'reply' = 'new') {
  const supabase = createAdminClient();
  const [{ data: p }, { data: v }] = await Promise.all([
    supabase.from('practitioners').select('full_name, first_name, last_name').eq('id', practitionerId).maybeSingle(),
    supabase.from('practitioner_verifications').select('*').eq('practitioner_id', practitionerId).maybeSingle(),
  ]);
  if (!p || !v) return;
  const row = v as VerificationRow;
  const name = p.full_name || [p.first_name, p.last_name].filter(Boolean).join(' ');
  const auto = [
    `Identité : ${levelText(row.concordance?.status, '✓ concordante', 'à vérifier', 'écart détecté')}`,
    `SIRET : ${levelText(row.pappers?.status, '✓ conforme', 'à vérifier', 'non conforme')}`,
    'reste à vérifier : authenticité du certificat',
  ].join(' · ');
  const body = emailLayout({
    eyebrow: 'Afeia · Administration',
    title: kind === 'new' ? 'Un praticien attend la validation de son compte' : 'Un praticien a répondu à votre demande de complément',
    paragraphs: [
      kind === 'new'
        ? `${name} vient de s'inscrire. Son espace reste fermé tant que la demande n'est pas validée.`
        : `${name} a envoyé les éléments demandés. La demande est revenue dans « À valider ».`,
    ],
    rows: [
      ['Praticien', name],
      ['Activité', `Praticien · ${row.city}`],
      ['Formation', `${row.school}, ${row.training_year}`],
      ['SIRET', `${formatSiret(row.siret)}${row.pappers?.status === 'ok' ? ' · ✓ vérifié via Pappers' : ''}`],
      ['Documents', 'Justificatif de formation et pièce d’identité déposés'],
      ['Contrôles automatiques', auto],
    ],
    cta: { label: 'Examiner la demande', href: `${appUrl()}/admin/inscriptions?id=${practitionerId}` },
    footer:
      "Les documents ne sont pas joints à cet e-mail : ils se consultent uniquement dans l'interface d'administration, après connexion. Délai de traitement annoncé au praticien : 48 h ouvrées.",
  });
  const subject = kind === 'new' ? `Nouvelle inscription à valider : ${name}` : `Complément reçu : ${name}`;
  for (const to of await adminEmails()) await safeSend(to, subject, body);
}

/** E-mail au praticien après la décision de l'équipe. */
export async function notifyPractitionerOfDecision(practitionerId: string, status: AccountStatus, motive: string | null) {
  const supabase = createAdminClient();
  const { data: p } = await supabase.from('practitioners').select('email, full_name, first_name').eq('id', practitionerId).maybeSingle();
  if (!p?.email) return;
  const first = p.first_name || (p.full_name ?? '').split(' ')[0] || '';
  if (status === 'validated') {
    await safeSend(
      p.email,
      'Votre espace Afeia est ouvert',
      emailLayout({
        eyebrow: 'Afeia',
        title: `Bienvenue ${first}, votre compte est validé`,
        paragraphs: ["L'équipe Afeia a vérifié votre inscription. Votre espace praticien est ouvert : vous pouvez vous connecter dès maintenant."],
        cta: { label: 'Accéder à mon espace', href: `${appUrl()}/login` },
      })
    );
  } else if (status === 'info_requested') {
    await safeSend(
      p.email,
      'Afeia : un élément à compléter pour votre inscription',
      emailLayout({
        eyebrow: 'Afeia',
        title: 'Il nous manque un élément',
        paragraphs: [motive ?? '', 'Connectez-vous pour envoyer ce complément. Votre demande sera réexaminée dès réception.'],
        cta: { label: 'Compléter ma demande', href: `${appUrl()}/compte/verification` },
      })
    );
  } else if (status === 'rejected') {
    await safeSend(
      p.email,
      'Afeia : votre demande d’inscription',
      emailLayout({
        eyebrow: 'Afeia',
        title: 'Votre inscription n’a pas été validée',
        paragraphs: [
          `Bonjour ${first}, après vérification, l'équipe Afeia ne peut pas ouvrir votre espace.`,
          `Motif : ${motive ?? ''}`,
          'Vous pouvez répondre à cet e-mail si vous pensez qu’il s’agit d’une erreur.',
        ],
      })
    );
  }
}

/** Lance Pappers et la lecture des documents, puis enregistre les résultats. */
export async function runAutomaticChecks(practitionerId: string, opts: { pappers?: boolean; documents?: boolean } = { pappers: true, documents: true }) {
  const supabase = createAdminClient();
  const [{ data: p }, { data: v }] = await Promise.all([
    supabase.from('practitioners').select('full_name, first_name, last_name').eq('id', practitionerId).maybeSingle(),
    supabase.from('practitioner_verifications').select('*').eq('practitioner_id', practitionerId).maybeSingle(),
  ]);
  if (!p || !v) return;
  const row = v as VerificationRow;
  const fullName = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.full_name || '';
  const patch: Partial<VerificationRow> = {};

  let pappers = row.pappers;
  if (opts.pappers) {
    pappers = await checkSiretWithPappers({ siret: row.siret, fullName, city: row.city });
    patch.pappers = pappers;
    patch.pappers_checked_at = new Date().toISOString();
  }

  if (opts.documents) {
    const extractor = getDocumentExtractor();
    const read = async (path: string | null) => {
      if (!path) return null;
      const { data } = await supabase.storage.from(VERIFICATION_BUCKET).download(path);
      if (!data) return null;
      return { buf: Buffer.from(await data.arrayBuffer()), type: data.type };
    };
    const [idFile, certFile] = await Promise.all([read(row.id_doc_path), read(row.training_doc_path)]);
    const [idFields, certFields] = await Promise.all([
      idFile ? extractor.readIdDocument(idFile.buf, idFile.type).catch(() => null) : Promise.resolve(null),
      certFile ? extractor.readCertificate(certFile.buf, certFile.type).catch(() => null) : Promise.resolve(null),
    ]);
    const leader = pappers?.rows.find((r) => r.label === 'Dirigeant')?.value;
    patch.concordance = buildConcordance(idFields, certFields, {
      fullName,
      school: row.school,
      year: row.training_year,
      pappersLeader: leader && leader !== '—' ? leader : undefined,
    });
  }

  await supabase
    .from('practitioner_verifications')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('practitioner_id', practitionerId);
}

/** Supprime les pièces d'identité dont la décision est définitive (fenêtre d'annulation passée). */
export async function purgeDecidedIdDocuments() {
  const supabase = createAdminClient();
  const limit = new Date(Date.now() - UNDO_WINDOW_MS).toISOString();
  const { data } = await supabase
    .from('practitioner_verifications')
    .select('practitioner_id, id_doc_path, decision_status')
    .not('id_doc_path', 'is', null)
    .in('decision_status', ['validated', 'rejected'])
    .lt('decided_at', limit);
  for (const r of (data ?? []) as { practitioner_id: string; id_doc_path: string }[]) {
    await supabase.storage.from(VERIFICATION_BUCKET).remove([r.id_doc_path]);
    await supabase
      .from('practitioner_verifications')
      .update({ id_doc_path: null, id_doc_deleted_at: new Date().toISOString() })
      .eq('practitioner_id', r.practitioner_id);
  }
}

export function docExtension(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  return file.type === 'application/pdf' ? 'pdf' : file.type.split('/')[1] || 'bin';
}
