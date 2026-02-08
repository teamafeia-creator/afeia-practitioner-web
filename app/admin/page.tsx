'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  CreditCard,
  UserPlus,
  AlertCircle,
  Activity,
} from 'lucide-react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminMetricCard } from '@/components/admin/AdminMetricCard';
import { AdminAlertItem } from '@/components/admin/AdminAlertItem';
import { AdminActivityItem } from '@/components/admin/AdminActivityItem';

type DashboardMetrics = {
  activePractitioners: number;
  totalPractitioners: number;
  activePercentage: number;
  mrr: number;
  mrrTrend: number;
  newSignups: number;
  newSignupsTrend: number;
  failedPayments: number;
  activityRate: number;
};

type AdminAlert = {
  id: string;
  level: 'critical' | 'warning' | 'info';
  type: string;
  title: string;
  description: string;
  practitionerId: string;
  practitionerName: string;
  createdAt: string;
};

type ActivityEvent = {
  id: string;
  practitionerName: string;
  practitionerId: string;
  eventType: string;
  description: string;
  createdAt: string;
};

type DashboardData = {
  metrics: DashboardMetrics;
  alerts: AdminAlert[];
  activity: ActivityEvent[];
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      try {
        const response = await fetch('/api/admin/dashboard', {
          credentials: 'include',
        });
        if (!isMounted) return;

        if (!response.ok) return;

        const json = await response.json();
        if (isMounted) {
          setData(json);
        }
      } catch (err) {
        console.error('[admin] dashboard fetch error:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const metrics = data?.metrics;
  const alerts = data?.alerts ?? [];
  const activity = data?.activity ?? [];

  return (
    <div className="space-y-6">
        <AdminHeader
          title="Dashboard Admin"
          subtitle="Vue d'ensemble de la plateforme AFEIA."
          actions={
            <Link
              href="/admin/settings/admins"
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Gerer les admins
            </Link>
          }
        />

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-16 text-sm text-slate-500">
            Chargement...
          </div>
        )}

        {/* Metrics grid */}
        {!loading && metrics && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <AdminMetricCard
              icon={Users}
              label="Praticiens actifs"
              value={metrics.activePractitioners}
              subtext={`sur ${metrics.totalPractitioners} total`}
              accentColor="teal"
            />
            <AdminMetricCard
              icon={CreditCard}
              label="MRR"
              value={`${metrics.mrr} EUR`}
              trend={metrics.mrrTrend}
              accentColor="emerald"
            />
            <AdminMetricCard
              icon={UserPlus}
              label="Nouveaux inscrits"
              value={metrics.newSignups}
              trend={metrics.newSignupsTrend}
              accentColor="blue"
            />
            <div className="relative">
              <AdminMetricCard
                icon={AlertCircle}
                label="Paiements echoues"
                value={metrics.failedPayments}
                accentColor="red"
              />
              {metrics.failedPayments > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {metrics.failedPayments}
                </span>
              )}
            </div>
            <AdminMetricCard
              icon={Activity}
              label="Taux d'activite"
              value={`${metrics.activityRate}%`}
              accentColor="teal"
              progress={metrics.activityRate}
            />
          </div>
        )}

        {/* Alerts section */}
        {!loading && alerts.length > 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="text-base font-semibold text-slate-800">
              A traiter
            </h2>
            <div className="mt-3 space-y-2">
              {alerts.slice(0, 10).map((alert) => (
                <AdminAlertItem
                  key={alert.id}
                  level={alert.level}
                  title={alert.title}
                  description={alert.description}
                  practitionerId={alert.practitionerId}
                />
              ))}
            </div>
          </div>
        )}

        {/* Activity timeline */}
        {!loading && activity.length > 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="text-base font-semibold text-slate-800">
              Activite recente
            </h2>
            <div className="mt-3 divide-y divide-slate-100">
              {activity.map((event) => (
                <AdminActivityItem
                  key={event.id}
                  eventType={event.eventType}
                  description={event.description}
                  createdAt={event.createdAt}
                />
              ))}
            </div>
          </div>
        )}
    </div>
  );
}
