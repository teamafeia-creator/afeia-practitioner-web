import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/server/adminGuard';

export async function POST(request: NextRequest) {
  const guard = await requireAdmin(request);
  if ('response' in guard) {
    return guard.response;
  }

  const body = await request.json();
  const consultantId = String(body.consultant_id ?? '').trim();

  if (!consultantId) {
    return NextResponse.json({ error: 'consultant_id requis' }, { status: 400 });
  }

  const supabaseAdmin = createAdminClient();
  const { error: rpcError } = await supabaseAdmin.rpc('admin_trigger_circular_sync', {
    consultant_id: consultantId
  });

  if (rpcError) {
    const { error: updateError } = await supabaseAdmin
      .from('consultants_identity')
      .update({
        last_circular_sync_at: new Date().toISOString(),
        last_circular_sync_status: 'queued',
        updated_at: new Date().toISOString()
      })
      .eq('id', consultantId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
