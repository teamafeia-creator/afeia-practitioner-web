import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/server/adminGuard';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ consultantId: string }> }
) {
  const guard = await requireAdmin(request);
  if ('response' in guard) {
    return guard.response;
  }

  try {
    const { consultantId } = await params;
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('consultants_identity')
      .select(
        'id, practitioner_id, full_name, email, phone, age, city, status, is_premium, bague_connectee_enabled, last_bague_connectee_sync_at, last_bague_connectee_sync_status'
      )
      .eq('id', consultantId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Consultant non trouvé.' }, { status: 404 });
    }

    return NextResponse.json({
      consultant: data
    });
  } catch (error) {
    console.error('[admin] consultant detail error:', error);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ consultantId: string }> }
) {
  const guard = await requireAdmin(request);
  if ('response' in guard) {
    return guard.response;
  }

  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const { consultantId } = await params;

    const updates = {
      full_name: payload.full_name,
      email: payload.email,
      phone: payload.phone,
      age: payload.age,
      city: payload.city,
      status: payload.status,
      is_premium: payload.is_premium,
      bague_connectee_enabled: payload.bague_connectee_enabled,
      updated_at: new Date().toISOString()
    };

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('consultants_identity')
      .update(updates)
      .eq('id', consultantId)
      .select(
        'id, practitioner_id, full_name, email, phone, age, city, status, is_premium, bague_connectee_enabled, last_bague_connectee_sync_at, last_bague_connectee_sync_status'
      )
      .single();

    if (error) {
      console.error('[admin] consultant update error:', error);
      return NextResponse.json({ error: 'Erreur lors de la mise à jour.' }, { status: 500 });
    }

    return NextResponse.json({
      consultant: data
    });
  } catch (error) {
    console.error('[admin] consultant update exception:', error);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
