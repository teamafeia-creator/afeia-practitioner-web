import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  ACCEPTED_DOC_TYPES,
  MAX_DOC_BYTES,
  passwordOk,
  siretDigits,
  siretValid,
} from '@/lib/verification/types';
import {
  VERIFICATION_BUCKET,
  appUrl,
  docExtension,
  emailLayout,
  notifyAdminsOfSignup,
  runAutomaticChecks,
} from '@/lib/server/verification';
import { sendEmail } from '@/lib/server/email';

export const runtime = 'nodejs';
export const maxDuration = 60;

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'AFEIA <contact@afeia.fr>';
const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
const bad = (error: string, field?: string) => NextResponse.json({ error, field }, { status: 400 });

function checkDoc(f: FormDataEntryValue | null): File | string {
  if (!f || typeof f === 'string' || f.size === 0) return 'Document manquant.';
  if (f.size > MAX_DOC_BYTES) return 'Fichier trop lourd (10 Mo maximum).';
  if (f.type && !ACCEPTED_DOC_TYPES.includes(f.type)) return 'Format accepté : PDF, JPG ou PNG.';
  return f;
}

export async function POST(request: NextRequest) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return bad('Requête invalide.');
  }

  const firstName = str(form, 'firstName');
  const lastName = str(form, 'lastName');
  const email = str(form, 'email').toLowerCase();
  const password = String(form.get('password') ?? '');
  const school = str(form, 'school');
  const year = Number(str(form, 'year'));
  const siret = siretDigits(str(form, 'siret'));
  const city = str(form, 'city');
  const charter = str(form, 'charter') === 'true';

  if (!firstName || !lastName) return bad('Indiquez votre prénom et votre nom.', 'name');
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) return bad('Adresse e-mail invalide.', 'email');
  if (!passwordOk(password)) return bad('Le mot de passe ne respecte pas les règles.', 'password');
  if (!school) return bad('Indiquez votre école de formation.', 'school');
  const thisYear = new Date().getFullYear();
  if (!Number.isInteger(year) || year < 1970 || year > thisYear) return bad('Année de certification invalide.', 'year');
  if (!siretValid(siret)) return bad('Ce SIRET ne semble pas valide.', 'siret');
  if (!city) return bad('Indiquez votre ville d’exercice.', 'city');
  if (!charter) return bad('Acceptez la charte de pratique pour continuer.', 'charter');
  const training = checkDoc(form.get('training'));
  if (typeof training === 'string') return bad(training, 'training');
  const identity = checkDoc(form.get('identity'));
  if (typeof identity === 'string') return bad(identity, 'identity');

  const supabase = createAdminClient();
  const fullName = `${firstName} ${lastName}`;

  // Crée le compte et récupère le lien de confirmation (envoyé par notre e-mail).
  const { data: link, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'signup',
    email,
    password,
    options: {
      data: { full_name: fullName, first_name: firstName, last_name: lastName, role: 'practitioner' },
      redirectTo: `${appUrl()}/compte/verification`,
    },
  });
  if (linkError || !link?.user) {
    const msg = linkError?.message ?? '';
    if (/already|registered|exists/i.test(msg)) {
      return NextResponse.json(
        { error: 'Un compte existe déjà avec cette adresse. Connectez-vous ou réinitialisez votre mot de passe.', field: 'email' },
        { status: 409 }
      );
    }
    console.error('[signup] generateLink', linkError);
    return NextResponse.json({ error: 'La création du compte a échoué. Réessayez dans un instant.' }, { status: 500 });
  }

  const uid = link.user.id;
  const rollback = async () => {
    const { data: files } = await supabase.storage.from(VERIFICATION_BUCKET).list(uid);
    if (files?.length) await supabase.storage.from(VERIFICATION_BUCKET).remove(files.map((f) => `${uid}/${f.name}`));
    await supabase.auth.admin.deleteUser(uid).catch(() => undefined);
  };

  try {
    const stamp = Date.now();
    const trainingPath = `${uid}/formation-${stamp}.${docExtension(training)}`;
    const idPath = `${uid}/identite-${stamp}.${docExtension(identity)}`;
    const up1 = await supabase.storage.from(VERIFICATION_BUCKET).upload(trainingPath, training, { contentType: training.type || undefined });
    if (up1.error) throw up1.error;
    const up2 = await supabase.storage.from(VERIFICATION_BUCKET).upload(idPath, identity, { contentType: identity.type || undefined });
    if (up2.error) throw up2.error;

    // Ligne praticien (normalement créée par le trigger) : on la complète.
    const { error: pErr } = await supabase.from('practitioners').upsert(
      {
        id: uid,
        email,
        full_name: fullName,
        first_name: firstName,
        last_name: lastName,
        siret,
        formations: `${school} (${year})`,
        account_status: 'pending_validation',
      },
      { onConflict: 'id' }
    );
    if (pErr) throw pErr;

    const { error: vErr } = await supabase.from('practitioner_verifications').upsert({
      practitioner_id: uid,
      school,
      training_year: year,
      siret,
      city,
      charter_accepted_at: new Date().toISOString(),
      training_doc_path: trainingPath,
      training_doc_name: training.name,
      id_doc_path: idPath,
      id_doc_name: identity.name,
    });
    if (vErr) throw vErr;
  } catch (e) {
    console.error('[signup] enregistrement', e);
    await rollback();
    return NextResponse.json({ error: 'L’envoi des documents a échoué. Réessayez dans un instant.' }, { status: 500 });
  }

  await runAutomaticChecks(uid).catch((e) => console.error('[signup] contrôles', e));

  const confirmUrl = link.properties?.action_link;
  if (confirmUrl) {
    const body = emailLayout({
      eyebrow: 'Afeia',
      title: 'Confirmez votre adresse e-mail',
      paragraphs: [
        `Bonjour ${firstName}, merci pour votre inscription.`,
        "Confirmez votre adresse en cliquant sur le bouton ci-dessous. L'équipe Afeia vérifie ensuite votre dossier sous 48 h ouvrées : vous recevrez un e-mail dès que votre espace sera ouvert.",
      ],
      cta: { label: 'Confirmer mon adresse', href: confirmUrl },
    });
    await sendEmail({ to: email, from: FROM_EMAIL, subject: 'Afeia : confirmez votre adresse e-mail', html: body.html, text: body.text }).catch((e) =>
      console.error('[signup] e-mail de confirmation', e)
    );
  }

  await notifyAdminsOfSignup(uid).catch((e) => console.error('[signup] e-mail admin', e));

  return NextResponse.json({ ok: true });
}
