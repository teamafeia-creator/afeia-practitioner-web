import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, createSupabaseAuthClient } from '@/lib/server/supabaseAdmin';
import { sendEmail } from '@/lib/server/email';

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * POST /api/consultants/[consultantId]/relance
 * Relance d'un consultant (liste des consultants) : message Afeia ou e-mail,
 * avec le lien de prise de rendez-vous si demandé. L'action est consignée (type « relance »).
 */
export async function POST(request: Request, { params }: { params: Promise<{ consultantId: string }> }) {
  try {
    const { consultantId } = await params;
    const token = request.headers.get('authorization')?.replace('Bearer ', '').trim();
    if (!token) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });

    const { data: authData, error: authError } = await createSupabaseAuthClient().auth.getUser(token);
    if (authError || !authData.user) return NextResponse.json({ error: 'Session invalide.' }, { status: 401 });
    const practitionerId = authData.user.id;
    const supabase = createSupabaseAdminClient();

    const { data: consultant } = await supabase
      .from('consultants')
      .select('id, practitioner_id, email, name, first_name')
      .eq('id', consultantId)
      .single();
    if (!consultant) return NextResponse.json({ error: 'Consultant non trouvé.' }, { status: 404 });
    if (consultant.practitioner_id !== practitionerId) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });

    const body = (await request.json()) as { channel?: 'app' | 'email'; text?: string; withLink?: boolean };
    const channel = body.channel === 'email' ? 'email' : 'app';
    let text = (body.text ?? '').trim();
    if (!text) return NextResponse.json({ error: 'Le message ne peut pas être vide.' }, { status: 400 });

    const { data: practitioner } = await supabase
      .from('practitioners')
      .select('booking_slug, full_name, name, email')
      .eq('id', practitionerId)
      .maybeSingle();

    if (body.withLink) {
      if (!practitioner?.booking_slug) {
        return NextResponse.json({ error: 'Votre page de réservation n’a pas encore d’adresse (Paramètres › Réservation).' }, { status: 400 });
      }
      const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
      text += `\n\nPour réserver une séance : ${origin}/rdv/${practitioner.booking_slug}`;
    }

    const now = new Date().toISOString();
    if (channel === 'app') {
      const { error } = await supabase.from('messages').insert({
        consultant_id: consultantId,
        sender: 'praticien',
        sender_role: 'practitioner',
        text,
        body: text,
        sent_at: now,
        created_at: now,
        read_at: null,
      });
      if (error) return NextResponse.json({ error: 'Le message n’a pas pu être envoyé.' }, { status: 500 });
    } else {
      if (!consultant.email) return NextResponse.json({ error: 'Ce consultant n’a pas d’adresse e-mail.' }, { status: 400 });
      const practitionerName = practitioner?.full_name || practitioner?.name || 'Votre praticien';
      await sendEmail({
        to: consultant.email,
        from: process.env.RESEND_FROM_EMAIL || 'AFEIA <contact@afeia.fr>',
        subject: `Des nouvelles de ${practitionerName}`,
        text,
        html: `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#1f2937">${escapeHtml(text).replace(/\n/g, '<br>')}</div>`,
      });
    }

    await supabase.from('practitioner_actions').insert({
      practitioner_id: practitionerId,
      consultant_id: consultantId,
      type: 'relance',
      metadata: { channel, with_link: !!body.withLink },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Exception relance POST:', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
