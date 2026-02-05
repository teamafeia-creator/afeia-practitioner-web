import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/server/supabaseAdmin';
import { requireAdmin } from '@/lib/server/adminGuard';

export async function GET(request: NextRequest) {
  const guard = await requireAdmin(request);
  if ('response' in guard) {
    return guard.response;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const [practitionersResult, patientsResult, messagesResult, plansResult] = await Promise.all([
      supabase.from('practitioners').select('id', { count: 'exact', head: true }),
      supabase.from('patients').select('id', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('messages').select('id', { count: 'exact', head: true }),
      supabase.from('patient_plans').select('id', { count: 'exact', head: true })
    ]);

    if (practitionersResult.error) {
      console.error('[admin] database practitioners count error:', practitionersResult.error);
    }
    if (patientsResult.error) {
      console.error('[admin] database patients count error:', patientsResult.error);
    }
    if (messagesResult.error) {
      console.error('[admin] database messages count error:', messagesResult.error);
    }
    if (plansResult.error) {
      console.error('[admin] database plans count error:', plansResult.error);
    }

    return NextResponse.json({
      stats: {
        practitioners: practitionersResult.count ?? null,
        patients: patientsResult.count ?? null,
        messages: messagesResult.count ?? null,
        plans: plansResult.count ?? null
      }
    });
  } catch (error) {
    console.error('[admin] database stats exception:', error);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
