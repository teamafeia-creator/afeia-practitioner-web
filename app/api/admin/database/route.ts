import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/server/adminGuard';

export async function GET(request: NextRequest) {
  const guard = await requireAdmin(request);
  if ('response' in guard) {
    return guard.response;
  }

  try {
    const supabase = createAdminClient();
    const [practitionersResult, consultantsResult, messagesResult, plansResult] = await Promise.all([
      supabase.from('practitioners_public').select('id', { count: 'exact', head: true }),
      supabase.from('consultants_identity').select('id', { count: 'exact', head: true }),
      supabase.from('messages').select('id', { count: 'exact', head: true }),
      supabase.from('consultant_plans').select('id', { count: 'exact', head: true })
    ]);

    if (practitionersResult.error) {
      console.error('[admin] database practitioners count error:', practitionersResult.error);
    }
    if (consultantsResult.error) {
      console.error('[admin] database consultants count error:', consultantsResult.error);
    }
    if (messagesResult.error) {
      console.error('[admin] database messages count error:', messagesResult.error);
    }
    if (plansResult.error) {
      console.error('[admin] database plans count error:', plansResult.error);
    }

    return NextResponse.json({
      stats: {
        practitioners: practitionersResult.error ? null : practitionersResult.count ?? null,
        consultants: consultantsResult.error ? null : consultantsResult.count ?? null,
        messages: messagesResult.error ? null : messagesResult.count ?? null,
        plans: plansResult.error ? null : plansResult.count ?? null
      }
    });
  } catch (error) {
    console.error('[admin] database stats exception:', error);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
