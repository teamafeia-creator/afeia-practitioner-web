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

  const { data: consultant, error } = await getSupabaseAdmin()
    .from('consultants')
    .select('*, practitioners(name, full_name, phone, email)')
    .eq('id', consultantId)
    .maybeSingle();

  if (error) {
    console.error('[consultant/me] lecture impossible', { consultantId, code: error.code });
    return NextResponse.json({ error: 'server_error' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
  if (!consultant) {
    return NextResponse.json({ error: 'not_found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }

  return NextResponse.json({ consultant }, { headers: { 'Cache-Control': 'no-store' } });
}
