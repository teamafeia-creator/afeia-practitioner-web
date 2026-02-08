'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { ConsultantListItem } from '@/lib/types/contraindications';
import type { ConsultantFilters, ConsultantSortOption } from '@/lib/types/filters';
import { DEFAULT_FILTERS } from '@/lib/types/filters';

function getDisplayName(item: ConsultantListItem): string {
  if (item.full_name) return item.full_name;
  const parts = [item.first_name, item.last_name].filter(Boolean);
  if (parts.length > 0) return parts.join(' ');
  return item.name || item.email || 'Non renseigne';
}

export function useConsultantFilters() {
  const [consultants, setConsultants] = useState<ConsultantListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ConsultantFilters>(DEFAULT_FILTERS);
  const [search, setSearch] = useState('');
  const [sortOption, setSortOption] = useState<ConsultantSortOption>({
    field: 'name',
    order: 'asc',
  });

  const loadConsultants = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from('consultant_list_view')
        .select('*');

      if (queryError) {
        // Fallback: if view doesn't exist, load from consultants table directly
        console.warn('consultant_list_view not available, falling back to consultants table:', queryError.message);
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('consultants')
          .select('*')
          .is('deleted_at', null)
          .order('name');

        if (fallbackError) {
          throw fallbackError;
        }

        // Map fallback data to ConsultantListItem shape
        const mapped: ConsultantListItem[] = (fallbackData || []).map((c) => ({
          id: c.id,
          name: c.name,
          full_name: c.full_name ?? null,
          first_name: c.first_name ?? null,
          last_name: c.last_name ?? null,
          email: c.email ?? null,
          city: c.city ?? null,
          age: c.age ?? null,
          is_premium: c.is_premium ?? false,
          status: c.status ?? null,
          main_concern: c.main_concern ?? null,
          consultation_reason: c.consultation_reason ?? null,
          practitioner_id: c.practitioner_id,
          created_at: c.created_at,
          activated: c.activated ?? false,
          last_journal_entry: null,
          journal_entries_last_7d: 0,
          journal_entries_last_30d: 0,
          next_appointment: null,
          plan_status: null,
          plan_updated_at: null,
          total_sessions: 0,
          last_consultation_date: null,
          last_appointment_date: null,
        }));

        setConsultants(mapped);
        return;
      }

      setConsultants((data || []) as ConsultantListItem[]);
    } catch (err) {
      console.error('Error loading consultants:', err);
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConsultants();
  }, [loadConsultants]);

  const setFilter = useCallback(<K extends keyof ConsultantFilters>(
    key: K,
    value: ConsultantFilters[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.carePlanStatus.length > 0) count++;
    if (filters.lastActivity) count++;
    if (filters.badge.length > 0) count++;
    if (filters.nextAppointment) count++;
    if (filters.mainConcern.length > 0) count++;
    if (filters.adherenceLevel.length > 0) count++;
    if (filters.registrationDate) count++;
    return count;
  }, [filters]);

  const filteredConsultants = useMemo(() => {
    const now = new Date();

    let result = consultants.filter((c) => {
      // Search filter
      if (search) {
        const term = search.toLowerCase();
        const name = getDisplayName(c).toLowerCase();
        const matchSearch = [name, c.city, c.email, c.main_concern, c.consultation_reason].some(
          (val) => val?.toLowerCase().includes(term)
        );
        if (!matchSearch) return false;
      }

      // Care plan status filter
      if (filters.carePlanStatus.length > 0) {
        const matchesAny = filters.carePlanStatus.some((status) => {
          switch (status) {
            case 'none':
              return !c.plan_status;
            case 'draft':
              return c.plan_status === 'draft';
            case 'shared':
              return c.plan_status === 'shared';
            case 'to_renew': {
              if (c.plan_status !== 'shared' || !c.plan_updated_at) return false;
              const threeMonthsAgo = new Date(now);
              threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
              return new Date(c.plan_updated_at) < threeMonthsAgo;
            }
            default:
              return false;
          }
        });
        if (!matchesAny) return false;
      }

      // Last activity filter
      if (filters.lastActivity) {
        const lastEntry = c.last_journal_entry ? new Date(c.last_journal_entry) : null;
        switch (filters.lastActivity) {
          case '<7d': {
            const sevenDaysAgo = new Date(now);
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            if (!lastEntry || lastEntry < sevenDaysAgo) return false;
            break;
          }
          case '<30d': {
            const thirtyDaysAgo = new Date(now);
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            if (!lastEntry || lastEntry < thirtyDaysAgo) return false;
            break;
          }
          case '>30d': {
            const thirtyDaysAgo = new Date(now);
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            if (!lastEntry || lastEntry >= thirtyDaysAgo) return false;
            break;
          }
          case 'never':
            if (lastEntry) return false;
            break;
        }
      }

      // Badge filter
      if (filters.badge.length > 0) {
        const isPremium = c.is_premium || c.status === 'premium';
        const matchesBadge = filters.badge.some((b) =>
          b === 'premium' ? isPremium : !isPremium
        );
        if (!matchesBadge) return false;
      }

      // Next appointment filter
      if (filters.nextAppointment) {
        const nextApt = c.next_appointment ? new Date(c.next_appointment) : null;
        switch (filters.nextAppointment) {
          case 'this_week': {
            const weekEnd = new Date(now);
            weekEnd.setDate(weekEnd.getDate() + 7);
            if (!nextApt || nextApt > weekEnd) return false;
            break;
          }
          case 'this_month': {
            const monthEnd = new Date(now);
            monthEnd.setDate(monthEnd.getDate() + 30);
            if (!nextApt || nextApt > monthEnd) return false;
            break;
          }
          case 'none':
            if (nextApt) return false;
            break;
        }
      }

      // Adherence level filter (V2)
      if (filters.adherenceLevel.length > 0) {
        const matchesAdherence = filters.adherenceLevel.some((level) => {
          switch (level) {
            case 'active':
              return c.journal_entries_last_7d >= 3;
            case 'declining':
              return c.journal_entries_last_7d < 3 && c.journal_entries_last_30d >= 5;
            case 'inactive':
              return c.journal_entries_last_30d < 5;
            default:
              return false;
          }
        });
        if (!matchesAdherence) return false;
      }

      // Main concern filter (V2)
      if (filters.mainConcern.length > 0) {
        const concern = c.main_concern || c.consultation_reason || '';
        if (!filters.mainConcern.some((mc) => concern.toLowerCase().includes(mc.toLowerCase()))) {
          return false;
        }
      }

      // Registration date filter (V2)
      if (filters.registrationDate) {
        const createdAt = new Date(c.created_at);
        const monthsAgo = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30);
        switch (filters.registrationDate) {
          case '<1m':
            if (monthsAgo >= 1) return false;
            break;
          case '1-6m':
            if (monthsAgo < 1 || monthsAgo >= 6) return false;
            break;
          case '>6m':
            if (monthsAgo < 6) return false;
            break;
        }
      }

      return true;
    });

    // Sort
    result.sort((a, b) => {
      const dir = sortOption.order === 'asc' ? 1 : -1;
      switch (sortOption.field) {
        case 'name': {
          const nameA = getDisplayName(a).toLowerCase();
          const nameB = getDisplayName(b).toLowerCase();
          return nameA.localeCompare(nameB, 'fr') * dir;
        }
        case 'last_activity': {
          const dateA = a.last_journal_entry ? new Date(a.last_journal_entry).getTime() : 0;
          const dateB = b.last_journal_entry ? new Date(b.last_journal_entry).getTime() : 0;
          return (dateA - dateB) * dir;
        }
        case 'next_appointment': {
          const dateA = a.next_appointment ? new Date(a.next_appointment).getTime() : Infinity;
          const dateB = b.next_appointment ? new Date(b.next_appointment).getTime() : Infinity;
          return (dateA - dateB) * dir;
        }
        case 'created_at': {
          return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
        }
        case 'attention_priority': {
          // Priority: no plan > inactive > declining > active
          const getScore = (c: ConsultantListItem) => {
            let score = 0;
            if (!c.plan_status) score += 3;
            if (c.journal_entries_last_30d < 5) score += 2;
            else if (c.journal_entries_last_7d < 3) score += 1;
            if (!c.next_appointment) score += 1;
            return score;
          };
          return (getScore(b) - getScore(a)) * dir;
        }
        default:
          return 0;
      }
    });

    return result;
  }, [consultants, search, filters, sortOption]);

  // Extract unique concerns for filter options
  const availableConcerns = useMemo(() => {
    const concerns = new Set<string>();
    consultants.forEach((c) => {
      const concern = c.main_concern || c.consultation_reason;
      if (concern) concerns.add(concern);
    });
    return Array.from(concerns).sort();
  }, [consultants]);

  return {
    consultants: filteredConsultants,
    allConsultants: consultants,
    loading,
    error,
    filters,
    setFilter,
    clearFilters,
    activeFilterCount,
    search,
    setSearch,
    sortOption,
    setSortOption,
    availableConcerns,
    reload: loadConsultants,
  };
}
