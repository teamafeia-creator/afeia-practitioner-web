/**
 * GET /api/mobile/dashboard
 * Aggregated dashboard data for the mobile home screen
 *
 * Returns all key data in a single call:
 * - naturopathe info + calendlyUrl
 * - next consultation date
 * - unread message count
 * - observance summary for today
 * - journal completion status for today
 * - latest shared plan summary
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { resolveConsultantId } from '@/lib/mobile-auth';

export async function GET(request: NextRequest) {
  try {
    const consultantId = await resolveConsultantId(request);

    if (!consultantId) {
      return NextResponse.json(
        { message: 'Non autorisé' },
        { status: 401 }
      );
    }

    const supabase = getSupabaseAdmin();
    const today = new Date().toISOString().split('T')[0];

    // Run all queries in parallel
    const [
      consultantResult,
      unreadResult,
      journalResult,
      observanceItemsResult,
      observanceLogsResult,
      latestPlanResult,
      nextAppointmentResult,
    ] = await Promise.all([
      // Consultant + practitioner
      supabase
        .from('consultants')
        .select(`
          practitioner_id,
          practitioners:practitioner_id (
            id, full_name, email, phone, avatar_url, calendly_url
          )
        `)
        .eq('id', consultantId)
        .single(),

      // Unread messages count
      supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('consultant_id', consultantId)
        .eq('sender', 'praticien')
        .is('read_at', null),

      // Today's journal entry
      supabase
        .from('journal_entries')
        .select('id')
        .eq('consultant_id', consultantId)
        .eq('date', today)
        .maybeSingle(),

      // Active observance items
      supabase
        .from('plan_observance_items')
        .select('id')
        .eq('consultant_id', consultantId)
        .eq('is_active', true),

      // Today's observance logs
      supabase
        .from('plan_observance_logs')
        .select('observance_item_id, done')
        .eq('consultant_id', consultantId)
        .eq('date', today)
        .eq('done', true),

      // Latest shared plan
      supabase
        .from('consultant_plans')
        .select('id, version, status, shared_at, created_at')
        .eq('consultant_id', consultantId)
        .eq('status', 'shared')
        .order('shared_at', { ascending: false })
        .limit(1)
        .maybeSingle(),

      // Next scheduled appointment
      supabase
        .from('appointments')
        .select('starts_at')
        .eq('consultant_id', consultantId)
        .eq('status', 'scheduled')
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);

    // Build naturopathe info
    const practitioner = consultantResult.data?.practitioners as any;
    const naturopathe = practitioner
      ? {
          id: practitioner.id,
          fullName: practitioner.full_name,
          email: practitioner.email,
          phone: practitioner.phone,
          avatarUrl: practitioner.avatar_url,
        }
      : null;

    // Observance summary
    const totalItems = observanceItemsResult.data?.length || 0;
    const doneItems = observanceLogsResult.data?.length || 0;
    const observancePercent = totalItems > 0
      ? Math.round((doneItems / totalItems) * 100)
      : 0;

    return NextResponse.json({
      naturopathe,
      nextConsultation: nextAppointmentResult.data?.starts_at || null,
      calendlyUrl: practitioner?.calendly_url || null,
      unreadCount: unreadResult.count || 0,
      observanceSummary: {
        total: totalItems,
        done: doneItems,
        percent: observancePercent,
      },
      journalCompleted: !!journalResult.data,
      latestPlan: latestPlanResult.data
        ? {
            id: latestPlanResult.data.id,
            version: latestPlanResult.data.version,
            status: latestPlanResult.data.status,
            sharedAt: latestPlanResult.data.shared_at,
            createdAt: latestPlanResult.data.created_at,
          }
        : null,
    });
  } catch (error) {
    console.error('Error getting dashboard:', error);
    return NextResponse.json(
      { message: 'Erreur lors de la récupération du tableau de bord' },
      { status: 500 }
    );
  }
}
