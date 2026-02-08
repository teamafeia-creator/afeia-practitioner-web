import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminAuth } from '@/lib/admin/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const guard = await requireAdminAuth(request);
  if ('response' in guard) {
    return guard.response;
  }

  try {
    const { patientId } = await params;
    const supabase = createAdminClient();

    // Get patient base info
    const { data: patient, error } = await supabase
      .from('consultants')
      .select(
        'id, practitioner_id, full_name, first_name, last_name, name, email, phone, age, city, status, is_premium, activated, activated_at, circular_enabled, last_circular_sync_at, last_circular_sync_status, source, created_at, updated_at'
      )
      .eq('id', patientId)
      .is('deleted_at', null)
      .single();

    if (error || !patient) {
      return NextResponse.json({ error: 'Patient non trouve.' }, { status: 404 });
    }

    // Fetch all related data in parallel
    const [
      practitionerResult,
      invitationsResult,
      journalCountResult,
      messagesCountResult,
      questionnairesCountResult,
      plansCountResult,
      lastJournalResult,
      lastMessageResult,
      lastQuestionnaireResult,
    ] = await Promise.all([
      // Practitioner info
      patient.practitioner_id
        ? supabase
            .from('practitioners')
            .select('id, full_name, email')
            .eq('id', patient.practitioner_id)
            .single()
        : Promise.resolve({ data: null, error: null }),
      // Invitations (for activation code)
      supabase
        .from('consultant_invitations')
        .select('id, invitation_code, status, code_expires_at, invited_at, accepted_at, practitioner_id, created_at')
        .eq('consultant_id', patientId)
        .order('created_at', { ascending: false }),
      // Journal entries count
      supabase
        .from('journal_entries')
        .select('id', { count: 'exact', head: true })
        .eq('consultant_id', patientId),
      // Messages count
      supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('consultant_id', patientId),
      // Questionnaires count (consultant_anamnesis)
      supabase
        .from('consultant_anamnesis')
        .select('id', { count: 'exact', head: true })
        .eq('consultant_id', patientId),
      // Plans count
      supabase
        .from('consultant_plans')
        .select('id', { count: 'exact', head: true })
        .eq('consultant_id', patientId),
      // Last journal entry date
      supabase
        .from('journal_entries')
        .select('created_at')
        .eq('consultant_id', patientId)
        .order('created_at', { ascending: false })
        .limit(1),
      // Last message date
      supabase
        .from('messages')
        .select('sent_at')
        .eq('consultant_id', patientId)
        .order('sent_at', { ascending: false })
        .limit(1),
      // Last preliminary questionnaire
      supabase
        .from('preliminary_questionnaires')
        .select('created_at')
        .eq('linked_consultant_id', patientId)
        .order('created_at', { ascending: false })
        .limit(1),
    ]);

    // Determine activation status
    const latestInvitation = (invitationsResult.data ?? [])[0] ?? null;
    let activationStatus: 'activated' | 'pending' | 'expired' = 'pending';
    if (patient.activated || latestInvitation?.status === 'accepted') {
      activationStatus = 'activated';
    } else if (latestInvitation?.code_expires_at && new Date(latestInvitation.code_expires_at) < new Date()) {
      activationStatus = 'expired';
    }

    const displayName = patient.full_name
      || (patient.first_name && patient.last_name ? `${patient.first_name} ${patient.last_name}` : null)
      || patient.name
      || 'Patient';

    // Compute last activity
    const activityDates = [
      patient.updated_at,
      (lastJournalResult.data ?? [])[0]?.created_at,
      (lastMessageResult.data ?? [])[0]?.sent_at,
    ].filter(Boolean) as string[];
    const lastActivity = activityDates.length > 0
      ? activityDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
      : null;

    // Journal frequency (entries per week over last 30 days)
    let journalFrequency = 0;
    const journalCount = journalCountResult.count ?? 0;
    if (journalCount > 0) {
      const accountAgeDays = Math.max(1, Math.floor(
        (Date.now() - new Date(patient.created_at).getTime()) / (1000 * 60 * 60 * 24)
      ));
      const weeks = Math.max(1, accountAgeDays / 7);
      journalFrequency = Math.round((journalCount / weeks) * 10) / 10;
    }

    return NextResponse.json({
      patient: {
        id: patient.id,
        practitioner_id: patient.practitioner_id,
        full_name: displayName,
        first_name: patient.first_name,
        last_name: patient.last_name,
        email: patient.email,
        phone: patient.phone,
        age: patient.age,
        city: patient.city,
        status: patient.is_premium ? 'premium' : (patient.status ?? 'standard'),
        is_premium: patient.is_premium ?? false,
        activated: patient.activated ?? false,
        activated_at: patient.activated_at,
        circular_enabled: patient.circular_enabled ?? false,
        last_circular_sync_at: patient.last_circular_sync_at,
        last_circular_sync_status: patient.last_circular_sync_status,
        source: patient.source,
        created_at: patient.created_at,
        updated_at: patient.updated_at,
      },
      practitioner: practitionerResult.data
        ? {
            id: practitionerResult.data.id,
            full_name: practitionerResult.data.full_name,
            email: practitionerResult.data.email,
          }
        : null,
      activation: {
        status: activationStatus,
        code: latestInvitation?.invitation_code ?? null,
        generated_at: latestInvitation?.created_at ?? null,
        used_at: latestInvitation?.accepted_at ?? null,
        expires_at: latestInvitation?.code_expires_at ?? null,
        generated_by_practitioner_id: latestInvitation?.practitioner_id ?? null,
      },
      engagement: {
        last_activity: lastActivity,
        journal_entries_count: journalCount,
        journal_frequency: journalFrequency,
        last_journal_entry: (lastJournalResult.data ?? [])[0]?.created_at ?? null,
        messages_count: messagesCountResult.count ?? 0,
        last_message: (lastMessageResult.data ?? [])[0]?.sent_at ?? null,
        questionnaires_count: (questionnairesCountResult.count ?? 0) + (lastQuestionnaireResult.data?.length ?? 0),
        last_questionnaire: (lastQuestionnaireResult.data ?? [])[0]?.created_at ?? null,
        plans_count: plansCountResult.count ?? 0,
      },
      invitations: (invitationsResult.data ?? []).map((inv) => ({
        id: inv.id,
        code: inv.invitation_code,
        status: inv.status,
        expires_at: inv.code_expires_at,
        invited_at: inv.invited_at,
        accepted_at: inv.accepted_at,
        created_at: inv.created_at,
      })),
    });
  } catch (error) {
    console.error('[admin] patient detail exception:', error);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
