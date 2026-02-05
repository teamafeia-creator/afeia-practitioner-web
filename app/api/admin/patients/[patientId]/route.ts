import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/server/adminGuard';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const guard = await requireAdmin(request);
  if ('response' in guard) {
    return guard.response;
  }

  try {
    const { patientId } = await params;
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('patients_identity')
      .select(
        'id, practitioner_id, full_name, email, phone, age, city, status, is_premium, circular_enabled, last_circular_sync_at, last_circular_sync_status'
      )
      .eq('id', patientId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Patient non trouvé.' }, { status: 404 });
    }

    return NextResponse.json({
      patient: data
    });
  } catch (error) {
    console.error('[admin] patient detail error:', error);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const guard = await requireAdmin(request);
  if ('response' in guard) {
    return guard.response;
  }

  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const { patientId } = await params;

    const updates = {
      full_name: payload.full_name,
      email: payload.email,
      phone: payload.phone,
      age: payload.age,
      city: payload.city,
      status: payload.status,
      is_premium: payload.is_premium,
      circular_enabled: payload.circular_enabled,
      updated_at: new Date().toISOString()
    };

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('patients_identity')
      .update(updates)
      .eq('id', patientId)
      .select(
        'id, practitioner_id, full_name, email, phone, age, city, status, is_premium, circular_enabled, last_circular_sync_at, last_circular_sync_status'
      )
      .single();

    if (error) {
      console.error('[admin] patient update error:', error);
      return NextResponse.json({ error: 'Erreur lors de la mise à jour.' }, { status: 500 });
    }

    return NextResponse.json({
      patient: data
    });
  } catch (error) {
    console.error('[admin] patient update exception:', error);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
