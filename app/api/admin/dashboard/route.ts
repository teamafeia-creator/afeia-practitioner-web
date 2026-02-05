import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/server/adminGuard';

const DASHBOARD_PREVIEW_LIMIT = 8;

export async function GET(request: NextRequest) {
  const guard = await requireAdmin(request);
  if ('response' in guard) {
    return guard.response;
  }

  try {
    const supabase = createAdminClient();

    const [
      practitionersCountResult,
      patientsCountResult,
      premiumPatientsCountResult,
      suspendedPractitionersCountResult,
      practitionersResult,
      patientsResult
    ] = await Promise.all([
      supabase.from('practitioners_public').select('id', { count: 'exact', head: true }),
      supabase.from('patients_identity').select('id', { count: 'exact', head: true }),
      supabase
        .from('patients_identity')
        .select('id', { count: 'exact', head: true })
        .or('is_premium.eq.true,status.eq.premium'),
      supabase
        .from('practitioners_public')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'suspended'),
      supabase
        .from('practitioners_public')
        .select('id, full_name, email, status, subscription_status, created_at')
        .order('created_at', { ascending: false })
        .limit(DASHBOARD_PREVIEW_LIMIT),
      supabase
        .from('patients_identity')
        .select(
          'id, practitioner_id, full_name, email, status, is_premium, created_at, practitioners_public(full_name)'
        )
        .order('created_at', { ascending: false })
        .limit(DASHBOARD_PREVIEW_LIMIT)
    ]);

    if (practitionersCountResult.error) {
      console.error('[admin] practitioners count error:', practitionersCountResult.error);
    }
    if (patientsCountResult.error) {
      console.error('[admin] patients count error:', patientsCountResult.error);
    }
    if (premiumPatientsCountResult.error) {
      console.error('[admin] premium count error:', premiumPatientsCountResult.error);
    }
    if (suspendedPractitionersCountResult.error) {
      console.error('[admin] suspended count error:', suspendedPractitionersCountResult.error);
    }

    if (practitionersResult.error) {
      console.error('[admin] practitioners preview error:', practitionersResult.error);
    }
    if (patientsResult.error) {
      console.error('[admin] patients preview error:', patientsResult.error);
    }

    const practitioners = practitionersResult.data ?? [];
    const patients =
      patientsResult.data?.map((patient) => ({
        ...patient,
        practitioner_name: patient.practitioners_public?.[0]?.full_name ?? null
      })) ?? [];

    return NextResponse.json({
      stats: {
        practitioners: practitionersCountResult.count ?? null,
        patients: patientsCountResult.count ?? null,
        premiumPatients: premiumPatientsCountResult.count ?? null,
        suspendedPractitioners: suspendedPractitionersCountResult.count ?? null
      },
      practitioners,
      patients
    });
  } catch (error) {
    console.error('[admin] dashboard error:', error);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
