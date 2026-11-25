/**
 * Suivi du cycle, côté consultante (app web et mobile).
 *
 * GET  → { mode: 'off' | 'waiting' | 'on' | 'paused', invitedAt, activatedAt, pausedAt, pausedBy }
 * POST { action: 'activate' | 'deactivate' }
 *   - activate   : crée le profil s'il n'existe pas, is_tracking = true (par la consultante)
 *   - deactivate : is_tracking = false, données conservées
 * C'est ce que déclenche le bouton « Activer le suivi du cycle » du message d'invitation.
 */
import { NextRequest, NextResponse } from 'next/server';
import { resolveConsultantId } from '@/lib/mobile-auth';
import { createSupabaseAdminClient } from '@/lib/server/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const consultantId = await resolveConsultantId(request);
  if (!consultantId) return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });
  const supabase = createSupabaseAdminClient();
  const [{ data: profile }, { count }] = await Promise.all([
    supabase.from('cycle_profiles').select('*').eq('consultant_id', consultantId).maybeSingle(),
    supabase.from('cycle_entries').select('id', { count: 'exact', head: true }).eq('consultant_id', consultantId).eq('is_period', true),
  ]);
  const mode = !profile ? 'off' : !profile.is_tracking ? (profile.tracking_paused_at ? 'paused' : 'off') : (count ?? 0) > 0 ? 'on' : 'waiting';
  return NextResponse.json({
    mode,
    invitedAt: profile?.invite_sent_at ?? null,
    activatedAt: profile?.tracking_activated_at ?? null,
    pausedAt: profile?.tracking_paused_at ?? null,
    pausedBy: profile?.tracking_paused_by ?? null,
  });
}

export async function POST(request: NextRequest) {
  const consultantId = await resolveConsultantId(request);
  if (!consultantId) return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { action?: string };
  if (body.action !== 'activate' && body.action !== 'deactivate') return NextResponse.json({ message: 'action attendue : activate | deactivate' }, { status: 400 });
  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const patch =
    body.action === 'activate'
      ? { is_tracking: true, tracking_activated_at: now, tracking_activated_by: 'consultant', tracking_paused_at: null, tracking_paused_by: null, updated_at: now }
      : { is_tracking: false, tracking_paused_at: now, tracking_paused_by: 'consultant', updated_at: now };

  const { data: existing } = await supabase.from('cycle_profiles').select('id').eq('consultant_id', consultantId).maybeSingle();
  if (existing) {
    const { error } = await supabase.from('cycle_profiles').update(patch).eq('id', existing.id);
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  } else {
    const { data: consultant } = await supabase.from('consultants').select('practitioner_id').eq('id', consultantId).single();
    const { error } = await supabase.from('cycle_profiles').insert({ consultant_id: consultantId, practitioner_id: consultant?.practitioner_id ?? '', ...patch });
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, mode: body.action === 'activate' ? 'waiting' : 'paused' });
}
