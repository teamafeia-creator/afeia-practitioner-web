'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { PractitionerStats, PeriodKey } from '@/lib/types/stats';
import { getPeriodRange } from '@/lib/types/stats';

const EMPTY_STATS: PractitionerStats = {
  sessionsCount: 0,
  newConsultants: 0,
  activeConsultants: 0,
  totalConsultants: 0,
  retentionRate: 0,
  avgJournalFillRate: 0,
  revenue: 0,
  sessionsByWeek: [],
  revenueByMonth: [],
  carePlansCount: 0,
  carePlansShared: 0,
  topConcerns: [],
  avgObservanceRate: 0,
  lowObservanceConsultants: [],
  inactiveJournalConsultants: [],
};

export function usePractitionerStats(periodKey: PeriodKey = 'this_month') {
  const [stats, setStats] = useState<PractitionerStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        setError('Non authentifie');
        return;
      }

      const { start, end } = getPeriodRange(periodKey);

      const { data, error: rpcError } = await supabase.rpc('get_practitioner_stats', {
        p_practitioner_id: userData.user.id,
        p_period_start: start.toISOString(),
        p_period_end: end.toISOString(),
      });

      const userId = userData.user.id;

      // Load observance and journal stats (always computed client-side)
      const observanceStats = await loadObservanceStats(userId);

      if (rpcError) {
        // Fallback: compute basic stats client-side
        console.warn('RPC get_practitioner_stats not available, computing client-side:', rpcError.message);

        const [consultantsRes, plansRes] = await Promise.all([
          supabase
            .from('consultants')
            .select('id, created_at, activated, main_concern, consultation_reason')
            .eq('practitioner_id', userId)
            .is('deleted_at', null),
          supabase
            .from('consultant_plans')
            .select('id, status, created_at')
            .eq('practitioner_id', userId),
        ]);

        const allConsultants = consultantsRes.data || [];
        const totalConsultants = allConsultants.filter((c) => c.activated).length;
        const newConsultants = allConsultants.filter(
          (c) => new Date(c.created_at) >= start && new Date(c.created_at) <= end
        ).length;

        const allPlans = plansRes.data || [];
        const carePlansCount = allPlans.filter(
          (p) => new Date(p.created_at) >= start && new Date(p.created_at) <= end
        ).length;
        const carePlansShared = allPlans.filter(
          (p) => p.status === 'shared' && new Date(p.created_at) >= start && new Date(p.created_at) <= end
        ).length;

        // Top concerns
        const concernCounts: Record<string, number> = {};
        allConsultants.forEach((c) => {
          const concern = c.main_concern || c.consultation_reason;
          if (concern) {
            concernCounts[concern] = (concernCounts[concern] || 0) + 1;
          }
        });
        const topConcerns = Object.entries(concernCounts)
          .map(([concern, count]) => ({ concern, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 6);

        setStats({
          ...EMPTY_STATS,
          totalConsultants,
          newConsultants,
          carePlansCount,
          carePlansShared,
          topConcerns,
          ...observanceStats,
        });
        return;
      }

      if (data) {
        const raw = typeof data === 'string' ? JSON.parse(data) : data;
        setStats({
          sessionsCount: raw.sessions_count ?? 0,
          newConsultants: raw.new_consultants ?? 0,
          activeConsultants: raw.active_consultants ?? 0,
          totalConsultants: raw.total_consultants ?? 0,
          retentionRate: raw.retention_rate ?? 0,
          avgJournalFillRate: raw.avg_journal_fill_rate ?? 0,
          revenue: raw.revenue ?? 0,
          sessionsByWeek: raw.sessions_by_week ?? [],
          revenueByMonth: raw.revenue_by_month ?? [],
          carePlansCount: raw.care_plans_count ?? 0,
          carePlansShared: raw.care_plans_shared ?? 0,
          topConcerns: raw.top_concerns ?? [],
          ...observanceStats,
        });
      }
    } catch (err) {
      console.error('Error loading stats:', err);
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, [periodKey]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return { stats, loading, error, reload: loadStats };
}

/** Compute observance + journal fill rates client-side */
async function loadObservanceStats(practitionerId: string): Promise<{
  avgObservanceRate: number;
  lowObservanceConsultants: Array<{ consultant_id: string; name: string; rate: number }>;
  inactiveJournalConsultants: Array<{ consultant_id: string; name: string; last_entry_date: string | null }>;
  avgJournalFillRate: number;
}> {
  try {
    // Get all active consultants
    const { data: consultants } = await supabase
      .from('consultants')
      .select('id, name')
      .eq('practitioner_id', practitionerId)
      .is('deleted_at', null)
      .eq('activated', true);

    if (!consultants || consultants.length === 0) {
      return { avgObservanceRate: 0, lowObservanceConsultants: [], inactiveJournalConsultants: [], avgJournalFillRate: 0 };
    }

    const consultantIds = consultants.map((c) => c.id);

    // Get latest journal entries for each consultant (for inactive detection + fill rate)
    const { data: journalEntries } = await supabase
      .from('journal_entries')
      .select('consultant_id, date')
      .in('consultant_id', consultantIds)
      .order('date', { ascending: false });

    // Build last entry map & count entries per consultant
    const lastEntryMap = new Map<string, string>();
    const entryCountMap = new Map<string, number>();
    (journalEntries || []).forEach((j: { consultant_id: string; date: string }) => {
      if (!lastEntryMap.has(j.consultant_id)) {
        lastEntryMap.set(j.consultant_id, j.date);
      }
      entryCountMap.set(j.consultant_id, (entryCountMap.get(j.consultant_id) ?? 0) + 1);
    });

    // Calculate journal fill rate
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const threeDaysAgoStr = threeDaysAgo.toISOString().slice(0, 10);

    const inactiveJournalConsultants = consultants
      .filter((c) => {
        const lastDate = lastEntryMap.get(c.id);
        return !lastDate || lastDate < threeDaysAgoStr;
      })
      .slice(0, 5)
      .map((c) => ({
        consultant_id: c.id,
        name: c.name || 'Consultant',
        last_entry_date: lastEntryMap.get(c.id) ?? null,
      }));

    // Calculate fill rate: count consultants with an entry in the last 7 days / total
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);
    const activeJournalCount = consultants.filter((c) => {
      const lastDate = lastEntryMap.get(c.id);
      return lastDate && lastDate >= sevenDaysAgoStr;
    }).length;
    const avgJournalFillRate = consultants.length > 0 ? Math.round((activeJournalCount / consultants.length) * 100) : 0;

    // Get observance data: find consultants with active observance items
    const { data: observanceItems } = await supabase
      .from('plan_observance_items')
      .select('id, consultant_id')
      .in('consultant_id', consultantIds)
      .eq('is_active', true);

    const consultantsWithObservance = new Set<string>();
    (observanceItems || []).forEach((item: { consultant_id: string }) => {
      consultantsWithObservance.add(item.consultant_id);
    });

    if (consultantsWithObservance.size === 0) {
      return { avgObservanceRate: 0, lowObservanceConsultants: [], inactiveJournalConsultants, avgJournalFillRate };
    }

    // Get observance logs for the last 7 days
    const obsStartDate = new Date();
    obsStartDate.setDate(obsStartDate.getDate() - 7);
    const obsStartStr = obsStartDate.toISOString().slice(0, 10);

    const observanceItemIds = (observanceItems || []).map((i: { id: string }) => i.id);
    const { data: obsLogs } = await supabase
      .from('plan_observance_logs')
      .select('observance_item_id, done')
      .in('observance_item_id', observanceItemIds)
      .gte('date', obsStartStr)
      .eq('done', true);

    // Group done counts by consultant
    const itemToConsultant = new Map<string, string>();
    (observanceItems || []).forEach((item: { id: string; consultant_id: string }) => {
      itemToConsultant.set(item.id, item.consultant_id);
    });

    const doneCounts = new Map<string, number>();
    const totalItems = new Map<string, number>();

    (observanceItems || []).forEach((item: { id: string; consultant_id: string }) => {
      totalItems.set(item.consultant_id, (totalItems.get(item.consultant_id) ?? 0) + 1);
    });

    (obsLogs || []).forEach((log: { observance_item_id: string }) => {
      const cId = itemToConsultant.get(log.observance_item_id);
      if (cId) {
        doneCounts.set(cId, (doneCounts.get(cId) ?? 0) + 1);
      }
    });

    const observanceRates: Array<{ consultant_id: string; name: string; rate: number }> = [];
    const nameMap = new Map<string, string>(consultants.map((c) => [c.id, c.name || 'Consultant']));

    for (const cId of consultantsWithObservance) {
      const itemCount = totalItems.get(cId) ?? 0;
      const doneCount = doneCounts.get(cId) ?? 0;
      const maxPossible = itemCount * 7; // 7 days
      const rate = maxPossible > 0 ? Math.round((doneCount / maxPossible) * 100) : 0;
      observanceRates.push({ consultant_id: cId, name: nameMap.get(cId) ?? 'Consultant', rate });
    }

    const avgObservanceRate = observanceRates.length > 0
      ? Math.round(observanceRates.reduce((s, r) => s + r.rate, 0) / observanceRates.length)
      : 0;

    const lowObservanceConsultants = observanceRates
      .filter((r) => r.rate < 50)
      .sort((a, b) => a.rate - b.rate)
      .slice(0, 5);

    return { avgObservanceRate, lowObservanceConsultants, inactiveJournalConsultants, avgJournalFillRate };
  } catch (err) {
    console.error('Error loading observance stats:', err);
    return { avgObservanceRate: 0, lowObservanceConsultants: [], inactiveJournalConsultants: [], avgJournalFillRate: 0 };
  }
}
