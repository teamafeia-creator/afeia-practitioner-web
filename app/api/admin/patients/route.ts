import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminAuth } from '@/lib/admin/auth';

export const dynamic = 'force-dynamic';

const DEFAULT_PAGE_SIZE = 20;

function getNumber(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const SORT_FIELDS = new Set(['created_at', 'full_name', 'status', 'updated_at']);

export async function GET(request: NextRequest) {
  const guard = await requireAdminAuth(request);
  if ('response' in guard) {
    return guard.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = getNumber(searchParams.get('page'), 1);
    const pageSize = getNumber(searchParams.get('pageSize'), DEFAULT_PAGE_SIZE);
    const search = searchParams.get('search')?.trim() ?? '';
    const status = searchParams.get('status')?.trim() ?? '';
    const practitionerId = searchParams.get('practitioner')?.trim() ?? '';
    const activation = searchParams.get('activation')?.trim() ?? '';
    const appMobile = searchParams.get('appMobile')?.trim() ?? '';
    const circular = searchParams.get('circular')?.trim() ?? '';
    const sortField = SORT_FIELDS.has(searchParams.get('sortField') ?? '')
      ? (searchParams.get('sortField') as string)
      : 'created_at';
    const sortDirection = searchParams.get('sortDirection') === 'asc' ? 'asc' : 'desc';

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const supabase = createAdminClient();

    // Build the main query on consultants
    let query = supabase
      .from('consultants')
      .select(
        'id, practitioner_id, full_name, first_name, last_name, name, email, phone, age, city, status, is_premium, activated, activated_at, circular_enabled, last_circular_sync_at, deleted_at, created_at, updated_at',
        { count: 'exact' }
      )
      .is('deleted_at', null)
      .order(sortField, { ascending: sortDirection === 'asc' });

    // Filter by status
    if (status === 'premium') {
      query = query.or('status.eq.premium,is_premium.eq.true');
    } else if (status === 'standard') {
      query = query.or('status.eq.standard,is_premium.neq.true');
    }

    // Filter by practitioner
    if (practitionerId) {
      query = query.eq('practitioner_id', practitionerId);
    }

    // Filter by circular
    if (circular === 'connected') {
      query = query.eq('circular_enabled', true);
    } else if (circular === 'disconnected') {
      query = query.or('circular_enabled.eq.false,circular_enabled.is.null');
    }

    // Filter by search
    if (search) {
      const sanitized = search.replace(/[%_]/g, '');
      if (sanitized) {
        const term = `%${sanitized}%`;
        query = query.or(`full_name.ilike.${term},email.ilike.${term},name.ilike.${term}`);
      }
    }

    query = query.range(from, to);

    const { data, count, error } = await query;

    if (error) {
      console.error('[admin] patients list error:', error);
      return NextResponse.json({ error: 'Erreur lors de la recuperation des patients.' }, { status: 500 });
    }

    const patients = data ?? [];
    const patientIds = patients.map((p) => p.id);
    const practitionerIds = [...new Set(patients.map((p) => p.practitioner_id).filter(Boolean))];

    // Fetch practitioner names, invitations, and engagement counts in parallel
    const [practitionersResult, invitationsResult, journalCountsResult, messagesCountsResult] = await Promise.all([
      practitionerIds.length > 0
        ? supabase
            .from('practitioners')
            .select('id, full_name, email')
            .in('id', practitionerIds)
        : Promise.resolve({ data: [], error: null }),
      patientIds.length > 0
        ? supabase
            .from('consultant_invitations')
            .select('consultant_id, invitation_code, status, code_expires_at, invited_at, accepted_at')
            .in('consultant_id', patientIds)
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      patientIds.length > 0
        ? supabase
            .from('journal_entries')
            .select('consultant_id')
            .in('consultant_id', patientIds)
        : Promise.resolve({ data: [], error: null }),
      patientIds.length > 0
        ? supabase
            .from('messages')
            .select('consultant_id')
            .in('consultant_id', patientIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    // Build lookup maps
    const practitionerMap = new Map<string, { full_name: string | null; email: string | null }>();
    for (const p of practitionersResult.data ?? []) {
      practitionerMap.set(p.id, { full_name: p.full_name, email: p.email });
    }

    // Latest invitation per patient
    const invitationMap = new Map<string, {
      invitation_code: string | null;
      status: string | null;
      code_expires_at: string | null;
      invited_at: string | null;
      accepted_at: string | null;
    }>();
    for (const inv of invitationsResult.data ?? []) {
      if (inv.consultant_id && !invitationMap.has(inv.consultant_id)) {
        invitationMap.set(inv.consultant_id, {
          invitation_code: inv.invitation_code,
          status: inv.status,
          code_expires_at: inv.code_expires_at,
          invited_at: inv.invited_at,
          accepted_at: inv.accepted_at,
        });
      }
    }

    // Journal entry count per patient
    const journalCountMap = new Map<string, number>();
    for (const j of journalCountsResult.data ?? []) {
      journalCountMap.set(j.consultant_id, (journalCountMap.get(j.consultant_id) ?? 0) + 1);
    }

    // Messages count per patient
    const messagesCountMap = new Map<string, number>();
    for (const m of messagesCountsResult.data ?? []) {
      messagesCountMap.set(m.consultant_id, (messagesCountMap.get(m.consultant_id) ?? 0) + 1);
    }

    // Enrich patient data
    const enrichedPatients = patients.map((patient) => {
      const practitioner = patient.practitioner_id
        ? practitionerMap.get(patient.practitioner_id)
        : null;
      const invitation = invitationMap.get(patient.id);

      // Determine activation status
      let activationStatus: 'activated' | 'pending' | 'expired' = 'pending';
      if (patient.activated || invitation?.status === 'accepted') {
        activationStatus = 'activated';
      } else if (invitation?.code_expires_at && new Date(invitation.code_expires_at) < new Date()) {
        activationStatus = 'expired';
      }

      const displayName = patient.full_name
        || (patient.first_name && patient.last_name ? `${patient.first_name} ${patient.last_name}` : null)
        || patient.name
        || 'Patient';

      return {
        id: patient.id,
        practitioner_id: patient.practitioner_id,
        full_name: displayName,
        email: patient.email,
        phone: patient.phone,
        status: patient.is_premium ? 'premium' : (patient.status ?? 'standard'),
        is_premium: patient.is_premium ?? false,
        activated: patient.activated ?? false,
        activated_at: patient.activated_at,
        circular_enabled: patient.circular_enabled ?? false,
        last_circular_sync_at: patient.last_circular_sync_at,
        created_at: patient.created_at,
        updated_at: patient.updated_at,
        practitioner_name: practitioner?.full_name ?? null,
        practitioner_email: practitioner?.email ?? null,
        invitation_code: invitation?.invitation_code ?? null,
        activation_status: activationStatus,
        invitation_invited_at: invitation?.invited_at ?? null,
        invitation_accepted_at: invitation?.accepted_at ?? null,
        journal_entries_count: journalCountMap.get(patient.id) ?? 0,
        messages_count: messagesCountMap.get(patient.id) ?? 0,
      };
    });

    // Apply activation filter (post-query because it depends on invitation data)
    let filteredPatients = enrichedPatients;
    if (activation === 'activated') {
      filteredPatients = enrichedPatients.filter((p) => p.activation_status === 'activated');
    } else if (activation === 'pending') {
      filteredPatients = enrichedPatients.filter((p) => p.activation_status === 'pending');
    } else if (activation === 'expired') {
      filteredPatients = enrichedPatients.filter((p) => p.activation_status === 'expired');
    }

    // Fetch summary metrics
    const [totalPatientsResult, premiumResult, circularResult, pendingActivationResult] = await Promise.all([
      supabase.from('consultants').select('id', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('consultants').select('id', { count: 'exact', head: true }).is('deleted_at', null).or('is_premium.eq.true,status.eq.premium'),
      supabase.from('consultants').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('circular_enabled', true),
      supabase.from('consultant_invitations').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    ]);

    const totalPatients = totalPatientsResult.count ?? 0;
    const premiumCount = premiumResult.count ?? 0;
    const circularCount = circularResult.count ?? 0;
    const pendingActivation = pendingActivationResult.count ?? 0;

    return NextResponse.json({
      patients: filteredPatients,
      total: count ?? 0,
      metrics: {
        totalPatients,
        premiumCount,
        circularCount,
        pendingActivation,
      },
    });
  } catch (error) {
    console.error('[admin] patients list exception:', error);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
