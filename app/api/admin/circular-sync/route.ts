import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/server/supabaseAdmin';
import { requireAdmin } from '@/lib/server/adminGuard';

export async function POST(request: NextRequest) {
  const guard = await requireAdmin(request);
  if ('response' in guard) {
    return guard.response;
  }

  const body = await request.json();
  const patientId = String(body.patient_id ?? '').trim();

  if (!patientId) {
    return NextResponse.json({ error: 'patient_id requis' }, { status: 400 });
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { error: rpcError } = await supabaseAdmin.rpc('admin_trigger_circular_sync', {
    patient_id: patientId
  });

  if (rpcError) {
    const { error: updateError } = await supabaseAdmin
      .from('patients_identity')
      .update({
        last_circular_sync_at: new Date().toISOString(),
        last_circular_sync_status: 'queued',
        updated_at: new Date().toISOString()
      })
      .eq('id', patientId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
