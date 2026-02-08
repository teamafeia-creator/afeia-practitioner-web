'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { StatCard } from '@/components/ui/StatCard';
import { PeriodSelector } from '@/components/ui/PeriodSelector';
import { usePractitionerStats } from '@/hooks/usePractitionerStats';
import { useRequireAuth } from '@/hooks/useAuth';
import type { PeriodKey } from '@/lib/types/stats';
import { getPeriodRange } from '@/lib/types/stats';

const CHART_COLORS = ['#2A8080', '#5BA6A6', '#7BBFBF', '#85004F', '#FF9A3D', '#40464F'];

const shortDateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
});

const monthFormatter = new Intl.DateTimeFormat('fr-FR', {
  month: 'short',
  year: '2-digit',
});

export default function StatisticsPage() {
  const { loading: authLoading, isAuthenticated } = useRequireAuth('/login');
  const [period, setPeriod] = useState<PeriodKey>('this_month');
  const { stats, loading } = usePractitionerStats(period);

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-warmgray">Chargement...</div>
      </div>
    );
  }

  // Format sessions by week for chart
  const sessionsChartData = stats.sessionsByWeek.map((item) => ({
    ...item,
    label: shortDateFormatter.format(new Date(item.week_start)),
  }));

  // Format revenue by month for chart
  const revenueChartData = stats.revenueByMonth.map((item) => ({
    ...item,
    label: monthFormatter.format(new Date(item.month_start)),
    total: typeof item.total === 'number' ? item.total / 100 : 0,
  }));

  // URSSAF quarter calculation
  const { start: quarterStart } = getPeriodRange('this_quarter');
  const quarterRevenue = stats.revenueByMonth
    .filter((m) => new Date(m.month_start) >= quarterStart)
    .reduce((sum, m) => sum + (typeof m.total === 'number' ? m.total : 0), 0);

  return (
    <div className="space-y-8">
      {/* Header + Period Selector */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
      >
        <div>
          <h2 className="text-xl font-semibold text-charcoal tracking-tight">Statistiques</h2>
          <p className="text-sm text-warmgray mt-1">Vue d&apos;ensemble de votre activite</p>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </motion.div>

      {/* Stats Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 h-28 animate-pulse" />
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <StatCard icon="📅" value={stats.sessionsCount} label="Seances" color="#2A8080" />
          <StatCard icon="👥" value={stats.newConsultants} label="Nouveaux consultants" color="#2A8080" />
          <StatCard
            icon="🟢"
            value={`${stats.activeConsultants}/${stats.totalConsultants}`}
            label="Actifs cette semaine"
            color="#2A8080"
          />
          <StatCard
            icon="🔄"
            value={`${stats.retentionRate}%`}
            label="Fidelisation"
            color={stats.retentionRate >= 70 ? '#10B981' : stats.retentionRate >= 50 ? '#F59E0B' : '#EF4444'}
          />
          <StatCard
            icon="💰"
            value={stats.revenue > 0 ? `${(stats.revenue / 100).toFixed(0)} €` : '—'}
            label="CA periode"
            color="#2A8080"
          />
          <StatCard
            icon="📓"
            value={`${stats.avgJournalFillRate}%`}
            label="Remplissage journal"
            color={stats.avgJournalFillRate >= 60 ? '#10B981' : stats.avgJournalFillRate >= 30 ? '#F59E0B' : '#EF4444'}
          />
        </motion.div>
      )}

      {/* Activity Section */}
      <section>
        <h3 className="text-lg font-semibold text-charcoal mb-4">Activite</h3>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Sessions per week */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h4 className="text-sm font-medium text-warmgray mb-4">Seances par semaine (12 semaines)</h4>
            {sessionsChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={sessionsChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#8C8680" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#8C8680" />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#2A8080"
                    strokeWidth={2}
                    dot={{ fill: '#2A8080', r: 4 }}
                    name="Seances"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-sm text-warmgray">
                Aucune donnee pour cette periode
              </div>
            )}
          </div>

          {/* Conseillanciers stats */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h4 className="text-sm font-medium text-warmgray mb-4">Conseillanciers</h4>
            <div className="flex items-center justify-center gap-8 h-[250px]">
              <div className="text-center">
                <div className="text-4xl font-bold text-teal">{stats.carePlansCount}</div>
                <div className="text-sm text-warmgray mt-1">Crees</div>
              </div>
              <div className="h-16 w-px bg-gray-200" />
              <div className="text-center">
                <div className="text-4xl font-bold text-aubergine">{stats.carePlansShared}</div>
                <div className="text-sm text-warmgray mt-1">Partages</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Financial Section */}
      {revenueChartData.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-charcoal mb-4">Financier</h3>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Revenue chart */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h4 className="text-sm font-medium text-warmgray mb-4">CA mensuel (12 mois)</h4>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={revenueChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#8C8680" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#8C8680" />
                  <Tooltip formatter={(value: number) => [`${value.toFixed(0)} €`, 'CA']} />
                  <Bar dataKey="total" fill="#2A8080" radius={[4, 4, 0, 0]} name="CA" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* URSSAF reminder */}
            {quarterRevenue > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h4 className="text-sm font-medium text-warmgray mb-4">Declaration URSSAF</h4>
                <div className="flex flex-col items-center justify-center h-[250px]">
                  <div className="text-4xl font-bold text-charcoal">
                    {(quarterRevenue / 100).toFixed(0)} €
                  </div>
                  <p className="text-sm text-warmgray mt-3 text-center max-w-xs">
                    Rappel : montant a declarer a l&apos;URSSAF pour le trimestre en cours
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Engagement Section */}
      <section>
        <h3 className="text-lg font-semibold text-charcoal mb-4">Engagement</h3>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Top concerns pie chart */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h4 className="text-sm font-medium text-warmgray mb-4">Motifs de consultation principaux</h4>
            {stats.topConcerns.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={stats.topConcerns}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="count"
                    nameKey="concern"
                    label={({ concern, percent }) =>
                      `${concern} (${(percent * 100).toFixed(0)}%)`
                    }
                    labelLine={false}
                  >
                    {stats.topConcerns.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-sm text-warmgray">
                Aucun motif renseigne
              </div>
            )}
          </div>

          {/* Journal fill rate */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h4 className="text-sm font-medium text-warmgray mb-4">Taux moyen de remplissage journal</h4>
            <div className="flex flex-col items-center justify-center h-[250px]">
              <div className="relative h-40 w-40">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#2A8080"
                    strokeWidth="3"
                    strokeDasharray={`${stats.avgJournalFillRate}, 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-bold text-charcoal">{stats.avgJournalFillRate}%</span>
                </div>
              </div>
              <p className="text-sm text-warmgray mt-3">
                Sur les 30 derniers jours
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
