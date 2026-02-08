/**
 * Tests for consultant filtering logic
 * Tests the pure filtering functions used by useConsultantFilters hook
 */

import type { ConsultantListItem } from '@/lib/types/contraindications';
import type { ConsultantFilters, ConsultantSortOption } from '@/lib/types/filters';
import { DEFAULT_FILTERS } from '@/lib/types/filters';

// Pure filtering function extracted from the hook logic for testability
function filterConsultants(
  consultants: ConsultantListItem[],
  filters: ConsultantFilters,
  search: string
): ConsultantListItem[] {
  const now = new Date();

  return consultants.filter((c) => {
    // Search filter
    if (search) {
      const term = search.toLowerCase();
      const name = (c.full_name || c.name || '').toLowerCase();
      const matchSearch = [name, c.city, c.email, c.main_concern].some(
        (val) => val?.toLowerCase().includes(term)
      );
      if (!matchSearch) return false;
    }

    // Care plan status filter
    if (filters.carePlanStatus.length > 0) {
      const matchesAny = filters.carePlanStatus.some((status) => {
        switch (status) {
          case 'none': return !c.plan_status;
          case 'draft': return c.plan_status === 'draft';
          case 'shared': return c.plan_status === 'shared';
          case 'to_renew': {
            if (c.plan_status !== 'shared' || !c.plan_updated_at) return false;
            const threeMonthsAgo = new Date(now);
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
            return new Date(c.plan_updated_at) < threeMonthsAgo;
          }
          default: return false;
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

    // Adherence level filter
    if (filters.adherenceLevel.length > 0) {
      const matchesAdherence = filters.adherenceLevel.some((level) => {
        switch (level) {
          case 'active': return c.journal_entries_last_7d >= 3;
          case 'declining': return c.journal_entries_last_7d < 3 && c.journal_entries_last_30d >= 5;
          case 'inactive': return c.journal_entries_last_30d < 5;
          default: return false;
        }
      });
      if (!matchesAdherence) return false;
    }

    return true;
  });
}

// Mock consultant data
function makeConsultant(overrides: Partial<ConsultantListItem> = {}): ConsultantListItem {
  return {
    id: '1',
    name: 'Jean Dupont',
    full_name: 'Jean Dupont',
    first_name: 'Jean',
    last_name: 'Dupont',
    email: 'jean@test.fr',
    city: 'Paris',
    age: 35,
    is_premium: false,
    status: 'standard',
    main_concern: null,
    consultation_reason: null,
    practitioner_id: 'pract-1',
    created_at: new Date().toISOString(),
    activated: true,
    last_journal_entry: null,
    journal_entries_last_7d: 0,
    journal_entries_last_30d: 0,
    next_appointment: null,
    plan_status: null,
    plan_updated_at: null,
    total_sessions: 0,
    last_consultation_date: null,
    last_appointment_date: null,
    ...overrides,
  };
}

describe('filterConsultants', () => {
  const consultants = [
    makeConsultant({ id: '1', name: 'Alice Martin', full_name: 'Alice Martin', is_premium: true, plan_status: 'draft', journal_entries_last_7d: 5, journal_entries_last_30d: 20 }),
    makeConsultant({ id: '2', name: 'Bob Leroy', full_name: 'Bob Leroy', is_premium: false, plan_status: 'shared', journal_entries_last_7d: 1, journal_entries_last_30d: 8 }),
    makeConsultant({ id: '3', name: 'Claire Petit', full_name: 'Claire Petit', is_premium: false, plan_status: null, journal_entries_last_7d: 0, journal_entries_last_30d: 2 }),
    makeConsultant({ id: '4', name: 'David Moreau', full_name: 'David Moreau', city: 'Lyon', last_journal_entry: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() }),
    makeConsultant({ id: '5', name: 'Emma Richard', full_name: 'Emma Richard', last_journal_entry: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString() }),
  ];

  it('returns all consultants with default filters', () => {
    const result = filterConsultants(consultants, DEFAULT_FILTERS, '');
    expect(result).toHaveLength(5);
  });

  it('filters by search term (name)', () => {
    const result = filterConsultants(consultants, DEFAULT_FILTERS, 'Alice');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filters by search term (city)', () => {
    const result = filterConsultants(consultants, DEFAULT_FILTERS, 'Lyon');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('4');
  });

  it('filters by care plan status: none', () => {
    const filters: ConsultantFilters = { ...DEFAULT_FILTERS, carePlanStatus: ['none'] };
    const result = filterConsultants(consultants, filters, '');
    // Consultants 3, 4, 5 have no plan_status
    expect(result.every((c) => !c.plan_status)).toBe(true);
  });

  it('filters by care plan status: draft', () => {
    const filters: ConsultantFilters = { ...DEFAULT_FILTERS, carePlanStatus: ['draft'] };
    const result = filterConsultants(consultants, filters, '');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filters by care plan status: shared', () => {
    const filters: ConsultantFilters = { ...DEFAULT_FILTERS, carePlanStatus: ['shared'] };
    const result = filterConsultants(consultants, filters, '');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('filters by badge: premium', () => {
    const filters: ConsultantFilters = { ...DEFAULT_FILTERS, badge: ['premium'] };
    const result = filterConsultants(consultants, filters, '');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filters by badge: standard', () => {
    const filters: ConsultantFilters = { ...DEFAULT_FILTERS, badge: ['standard'] };
    const result = filterConsultants(consultants, filters, '');
    expect(result.every((c) => !c.is_premium)).toBe(true);
  });

  it('filters by adherence level: active (>=3 entries in 7 days)', () => {
    const filters: ConsultantFilters = { ...DEFAULT_FILTERS, adherenceLevel: ['active'] };
    const result = filterConsultants(consultants, filters, '');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filters by adherence level: declining (<3 in 7d, >=5 in 30d)', () => {
    const filters: ConsultantFilters = { ...DEFAULT_FILTERS, adherenceLevel: ['declining'] };
    const result = filterConsultants(consultants, filters, '');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('filters by adherence level: inactive (<5 in 30d)', () => {
    const filters: ConsultantFilters = { ...DEFAULT_FILTERS, adherenceLevel: ['inactive'] };
    const result = filterConsultants(consultants, filters, '');
    expect(result.length).toBeGreaterThanOrEqual(2); // 3, 4, 5
  });

  it('filters by last activity: never', () => {
    const filters: ConsultantFilters = { ...DEFAULT_FILTERS, lastActivity: 'never' };
    const result = filterConsultants(consultants, filters, '');
    expect(result.every((c) => !c.last_journal_entry)).toBe(true);
  });

  it('filters by last activity: <7d', () => {
    const filters: ConsultantFilters = { ...DEFAULT_FILTERS, lastActivity: '<7d' };
    const result = filterConsultants(consultants, filters, '');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('4'); // 3 days ago
  });

  it('filters by last activity: >30d', () => {
    const filters: ConsultantFilters = { ...DEFAULT_FILTERS, lastActivity: '>30d' };
    const result = filterConsultants(consultants, filters, '');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('5'); // 60 days ago
  });

  it('combines multiple filters (AND logic)', () => {
    const filters: ConsultantFilters = {
      ...DEFAULT_FILTERS,
      badge: ['premium'],
      carePlanStatus: ['draft'],
    };
    const result = filterConsultants(consultants, filters, '');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('returns empty when no consultant matches combined filters', () => {
    const filters: ConsultantFilters = {
      ...DEFAULT_FILTERS,
      badge: ['premium'],
      carePlanStatus: ['shared'],
    };
    const result = filterConsultants(consultants, filters, '');
    expect(result).toHaveLength(0);
  });
});
