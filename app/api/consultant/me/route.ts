// GET /api/consultant/me
// Profil du consultant connecté (espace consultant web), lu côté serveur.
// Authentification : `Authorization: Bearer <jeton Supabase>`.
//
// Pourquoi côté serveur : un consultant créé par son praticien puis activé sur le web
// a un compte auth dont l'ID diffère de consultants.id, et le lien
// (consultant_memberships) n'était pas créé à l'activation. resolveConsultantId
// retrouve le consultant et crée ce lien s'il manque, puis on lit la fiche avec le
// client admin (les règles RLS de `consultants` ne visent que les praticiens).
import { NextRequest, NextResponse } from 'next/server';
import { resolveConsultantId } from '@/lib/mobile-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const consultantId = await resolveConsultantId(request);
  if (!consultantId) {
    return NextResponse.json({ error: 'not_found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }

  const supabase = getSupabaseAdmin();

  // Pas de jointure embarquée `practitioners(...)` : `consultants` a plusieurs clés
  // étrangères vers `practitioners`, PostgREST la refuse (PGRST201, relation ambiguë).
  const { data: consultant, error } = await supabase
    .from('consultants')
    .select('*')
    .eq('id', consultantId)
    .maybeSingle();

  if (error) {
    console.error('[consultant/me] lecture impossible', { consultantId, code: error.code });
    return NextResponse.json({ error: 'server_error' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
  if (!consultant) {
    console.warn('[consultant/me] fiche introuvable', { consultantId });
    return NextResponse.json({ error: 'not_found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }

  // Auto-correction : un consultant qui se connecte à son espace est activé par définition.
  // Si l'activation web n'a pas basculé le drapeau (ancien flux), on le fait ici et on
  // clôt l'invitation en attente, sinon le praticien voit encore « En attente d'activation ».
  if (consultant.activated !== true) {
    const now = new Date().toISOString();
    const { error: activateError } = await supabase
      .from('consultants')
      .update({ activated: true, activated_at: consultant.activated_at ?? now })
      .eq('id', consultantId);
    if (activateError) {
      console.warn('[consultant/me] activation impossible', { consultantId, code: activateError.code });
    } else {
      consultant.activated = true;
      consultant.activated_at = consultant.activated_at ?? now;
      const { error: inviteError } = await supabase
        .from('consultant_invitations')
        .update({ status: 'accepted', accepted_at: now })
        .eq('consultant_id', consultantId)
        .eq('status', 'pending');
      if (inviteError) {
        console.warn('[consultant/me] clôture invitation impossible', { consultantId, code: inviteError.code });
      }
      console.info('[consultant/me] consultant activé à la connexion', { consultantId });
    }
  }

  let practitioner = null;
  if (consultant.practitioner_id) {
    const { data, error: practitionerError } = await supabase
      .from('practitioners')
      .select('name, full_name, phone, email')
      .eq('id', consultant.practitioner_id)
      .maybeSingle();
    if (practitionerError) {
      console.warn('[consultant/me] praticien illisible', { consultantId, code: practitionerError.code });
    }
    practitioner = data ?? null;
  }

  return NextResponse.json(
    { consultant: { ...consultant, practitioners: practitioner } },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
