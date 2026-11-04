import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, createSupabaseAuthClient } from '@/lib/server/supabaseAdmin';
import { sendEmail } from '@/lib/server/email';

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

type Kind = 'survey' | 'relance' | 'close' | 'answer';
const ACTION: Record<Kind, string> = { survey: 'dropout_survey', relance: 'dropout_relance', close: 'followup_closed', answer: 'dropout_answer' };

/**
 * POST /api/statistics/outreach
 * Consultants qui décrochent (Statistiques › Activité des consultants).
 *  - survey  : envoie le questionnaire de 2 questions (texte validé par le praticien)
 *  - relance : envoie le message adapté à la cause (texte validé par le praticien)
 *  - close   : envoie le message de clôture et consigne la fin d'accompagnement
 *  - answer  : consigne la réponse au questionnaire (cause, refaire le point), rien n'est envoyé
 * Body : { consultant_id, kind, channel?: 'app' | 'email' | 'both', text?, with_link?, cause?, point?, step?, signal? }
 */
export async function POST(request: Request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '').trim();
    if (!token) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
    const { data: authData, error: authError } = await createSupabaseAuthClient().auth.getUser(token);
    if (authError || !authData.user) return NextResponse.json({ error: 'Session invalide.' }, { status: 401 });
    const practitionerId = authData.user.id;

    const body = (await request.json()) as {
      consultant_id?: string;
      kind?: Kind;
      channel?: 'app' | 'email' | 'both';
      text?: string;
      with_link?: boolean;
      cause?: string;
      point?: string | null;
      step?: string;
      signal?: string;
    };
    const kind = body.kind;
    if (!body.consultant_id || !kind || !(kind in ACTION)) return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });

    const supabase = createSupabaseAdminClient();
    const { data: consultant } = await supabase.from('consultants').select('id, practitioner_id, email').eq('id', body.consultant_id).single();
    if (!consultant) return NextResponse.json({ error: 'Consultant non trouvé.' }, { status: 404 });
    if (consultant.practitioner_id !== practitionerId) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });

    const channel = body.channel === 'email' || body.channel === 'both' ? body.channel : 'app';
    const metadata: Record<string, unknown> = { channel: kind === 'answer' ? null : channel };
    if (body.cause) metadata.cause = body.cause;
    if (body.point) metadata.point = body.point;
    if (body.step) metadata.step = body.step;
    if (body.signal) metadata.signal = body.signal;

    if (kind !== 'answer') {
      let text = (body.text ?? '').trim();
      if (!text) return NextResponse.json({ error: 'Le message ne peut pas être vide.' }, { status: 400 });
      const { data: practitioner } = await supabase.from('practitioners').select('booking_slug, full_name, name').eq('id', practitionerId).maybeSingle();
      if (body.with_link) {
        if (!practitioner?.booking_slug) return NextResponse.json({ error: 'Votre page de réservation n’a pas encore d’adresse (Paramètres › Réservation).' }, { status: 400 });
        const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
        text += `\n\nPrendre rendez-vous : ${origin}/rdv/${practitioner.booking_slug}`;
        metadata.with_link = true;
      }
      if ((channel === 'email' || channel === 'both') && !consultant.email) {
        return NextResponse.json({ error: 'Ce consultant n’a pas d’adresse e-mail.' }, { status: 400 });
      }
      if (channel === 'app' || channel === 'both') {
        const now = new Date().toISOString();
        const { error } = await supabase.from('messages').insert({
          consultant_id: consultant.id,
          sender: 'praticien',
          sender_role: 'practitioner',
          text,
          body: text,
          sent_at: now,
          created_at: now,
          read_at: null,
        });
        if (error) return NextResponse.json({ error: 'Le message n’a pas pu être envoyé.' }, { status: 500 });
      }
      if (channel === 'email' || channel === 'both') {
        const name = practitioner?.full_name || practitioner?.name || 'Votre praticien';
        await sendEmail({
          to: consultant.email as string,
          from: process.env.RESEND_FROM_EMAIL || 'AFEIA <contact@afeia.fr>',
          subject: kind === 'survey' ? `${name} prend de vos nouvelles` : `Des nouvelles de ${name}`,
          text,
          html: `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#1f2937">${escapeHtml(text).replace(/\n/g, '<br>')}</div>`,
        });
      }
    }

    const { error: logError } = await supabase.from('practitioner_actions').insert({
      practitioner_id: practitionerId,
      consultant_id: consultant.id,
      type: ACTION[kind],
      metadata,
    });
    if (logError) {
      console.error('practitioner_actions insert:', logError);
      // Message parti mais suivi non consigné (migration 20261104 non appliquée ?)
      return NextResponse.json({ ok: true, logged: false });
    }
    return NextResponse.json({ ok: true, logged: true });
  } catch (err) {
    console.error('Exception statistics/outreach POST:', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
