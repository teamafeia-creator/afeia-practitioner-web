'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  Users,
  BarChart3,
  CheckSquare,
  Bell,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import type { ConsultantSummary, Trend, GlobalMetricsData } from '@/lib/morning-review/types';

interface GlobalMetricsProps {
  consultantsSummary: ConsultantSummary[];
}

function TrendBadge({ trend }: { trend: Trend }) {
  switch (trend) {
    case 'up':
      return (
        <span className="inline-flex items-center gap-1 text-xs text-sage">
          <TrendingUp className="w-3 h-3" />
        </span>
      );
    case 'down':
      return (
        <span className="inline-flex items-center gap-1 text-xs text-gold">
          <TrendingDown className="w-3 h-3" />
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 text-xs text-stone">
          <Minus className="w-3 h-3" />
        </span>
      );
  }
}

function calculateGlobalMetrics(summaries: ConsultantSummary[]): GlobalMetricsData {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(now);
  monthAgo.setDate(monthAgo.getDate() - 30);

  const activeThisWeek = summaries.filter(s => {
    const entries = s.consultant.journalEntries ?? [];
    return entries.some(e => new Date(e.date) >= weekAgo);
  }).length;

  const activeThisMonth = summaries.filter(s => {
    const entries = s.consultant.journalEntries ?? [];
    return entries.some(e => new Date(e.date) >= monthAgo);
  }).length;

  const totalConsultants = summaries.length;
  const presenceRate = totalConsultants > 0
    ? Math.round((activeThisMonth / totalConsultants) * 100)
    : 0;

  const adherenceValues = summaries
    .map(s => s.lastWeekStats.averageAdherence)
    .filter(v => v > 0);
  const averageAdherence = adherenceValues.length > 0
    ? Math.round((adherenceValues.reduce((a, b) => a + b, 0) / adherenceValues.length) * 100)
    : 0;

  const attentionSignals = summaries.filter(s => s.attentionScore >= 60).length;

  const consultationsThisWeek = summaries.filter(s => {
    if (!s.consultant.nextConsultationDate) return false;
    const nextDate = new Date(s.consultant.nextConsultationDate);
    const weekFromNow = new Date(now);
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    return nextDate >= now && nextDate <= weekFromNow;
  }).length;

  const nextConsultationDates = summaries
    .map(s => s.consultant.nextConsultationDate)
    .filter((d): d is string => d != null)
    .map(d => new Date(d))
    .filter(d => d >= now)
    .sort((a, b) => a.getTime() - b.getTime());

  const nextConsultation = nextConsultationDates.length > 0
    ? nextConsultationDates[0].toISOString()
    : null;

  const progressCount = summaries.filter(s => s.attentionLevel === 'progress').length;

  return {
    activeThisWeek,
    activeThisWeekTrend: 'stable',
    presenceRate,
    presenceRateTrend: 'stable',
    averageAdherence,
    adherenceTrend: 'stable',
    attentionSignals,
    attentionSignalsDiff: 0,
    consultationsThisWeek,
    nextConsultation,
    progressCount,
  };
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: Trend;
  subtitle?: string;
  highlight?: 'positive';
}

function MetricCard({ icon, label, value, trend, subtitle, highlight }: MetricCardProps) {
  return (
    <div className={`p-4 rounded-lg ${highlight === 'positive' ? 'bg-sage/8' : 'bg-neutral-50'}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-stone mb-1">{label}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-charcoal">{value}</span>
            {trend && <TrendBadge trend={trend} />}
          </div>
          {subtitle && <p className="text-xs text-stone mt-1">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

export function GlobalMetrics({ consultantsSummary }: GlobalMetricsProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const metrics = useMemo(() => calculateGlobalMetrics(consultantsSummary), [consultantsSummary]);

  const nextConsultStr = metrics.nextConsultation
    ? new Intl.DateTimeFormat('fr-FR', { weekday: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(metrics.nextConsultation))
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass-card p-4 md:p-6 mb-6"
    >
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between"
      >
        <h2 className="text-lg font-semibold text-charcoal">Metriques globales</h2>
        {isCollapsed ? (
          <ChevronDown className="w-5 h-5 text-stone" />
        ) : (
          <ChevronUp className="w-5 h-5 text-stone" />
        )}
      </button>

      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              <MetricCard
                icon={<Users className="w-5 h-5 text-sage" />}
                label="Consultants actifs cette semaine"
                value={metrics.activeThisWeek}
                trend={metrics.activeThisWeekTrend}
              />

              <MetricCard
                icon={<BarChart3 className="w-5 h-5 text-sage" />}
                label="Taux de presence ce mois"
                value={`${metrics.presenceRate}%`}
                trend={metrics.presenceRateTrend}
              />

              <MetricCard
                icon={<CheckSquare className="w-5 h-5 text-sage" />}
                label="Adhesion moyenne aux 4 piliers"
                value={`${metrics.averageAdherence}%`}
                trend={metrics.adherenceTrend}
              />

              <MetricCard
                icon={<Bell className="w-5 h-5 text-gold" />}
                label="Signaux d'attention"
                value={metrics.attentionSignals}
                subtitle={metrics.attentionSignalsDiff !== 0
                  ? `${metrics.attentionSignalsDiff > 0 ? '+' : ''}${metrics.attentionSignalsDiff} vs hier`
                  : undefined
                }
              />

              <MetricCard
                icon={<Calendar className="w-5 h-5 text-terracotta" />}
                label="Consultations cette semaine"
                value={metrics.consultationsThisWeek}
                subtitle={nextConsultStr ? `Prochaine : ${nextConsultStr}` : 'Aucune planifiee'}
              />

              <MetricCard
                icon={<TrendingUp className="w-5 h-5 text-sage" />}
                label="Belles progressions"
                value={metrics.progressCount}
                highlight="positive"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
