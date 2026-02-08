// Types pour les statistiques du praticien

export interface PractitionerStats {
  sessionsCount: number;
  newConsultants: number;
  activeConsultants: number;
  totalConsultants: number;
  retentionRate: number;
  avgJournalFillRate: number;
  revenue: number;
  sessionsByWeek: { week_start: string; count: number }[];
  revenueByMonth: { month_start: string; total: number }[];
  carePlansCount: number;
  carePlansShared: number;
  topConcerns: { concern: string; count: number }[];
}

export type PeriodKey = 'this_week' | 'this_month' | 'this_quarter' | 'this_year' | 'custom';

export interface PeriodOption {
  key: PeriodKey;
  label: string;
  getRange: () => { start: Date; end: Date };
}

export function getPeriodRange(key: PeriodKey): { start: Date; end: Date } {
  const now = new Date();
  const end = now;

  switch (key) {
    case 'this_week': {
      const start = new Date(now);
      const day = start.getDay();
      const diff = day === 0 ? 6 : day - 1;
      start.setDate(start.getDate() - diff);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }
    case 'this_month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start, end };
    }
    case 'this_quarter': {
      const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
      const start = new Date(now.getFullYear(), quarterMonth, 1);
      return { start, end };
    }
    case 'this_year': {
      const start = new Date(now.getFullYear(), 0, 1);
      return { start, end };
    }
    case 'custom':
    default:
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end };
  }
}

export const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: 'this_week', label: 'Cette semaine' },
  { key: 'this_month', label: 'Ce mois' },
  { key: 'this_quarter', label: 'Ce trimestre' },
  { key: 'this_year', label: 'Cette annee' },
];
