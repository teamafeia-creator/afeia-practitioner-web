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

      if (rpcError) {
        // Fallback: compute basic stats client-side
        console.warn('RPC get_practitioner_stats not available, computing client-side:', rpcError.message);

        const userId = userData.user.id;

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
