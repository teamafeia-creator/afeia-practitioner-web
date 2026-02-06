'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageShell } from '@/components/ui/PageShell';
import { Card } from '@/components/ui/Card';
import { FreshDatabaseButton } from '@/components/admin/FreshDatabaseButton';
import { AdminBackBar } from '@/components/admin/AdminBackBar';

type Stats = {
  practitioners: number | null;
  patients: number | null;
  messages: number | null;
  plans: number | null;
};

export default function AdminDatabasePage() {
  const [stats, setStats] = useState<Stats>({
    practitioners: null,
    patients: null,
    messages: null,
    plans: null
  });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    async function loadStats() {
      try {
        const response = await fetch('/api/admin/database', { credentials: 'include' });
        if (!response.ok) {
          throw new Error('Erreur chargement stats');
        }
        const data = await response.json();
        setStats(data.stats ?? {});
        setErrorMessage(null);
      } catch (err) {
        console.error('Erreur chargement stats:', err);
        setErrorMessage('Erreur de chargement des statistiques.');
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [refreshKey]);

  const handleRefresh = () => {
    setRefreshKey((value) => value + 1);
  };

  return (
    <div className="space-y-8">
      <AdminBackBar />
      <PageHeader
        title="Gestion de la Base de Donnees"
        subtitle="Outils avances pour gerer la base de donnees."
      />

      <PageShell className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-charcoal">Statistiques actuelles</h2>
          <p className="text-sm text-warmgray">
            Nombre d&apos;enregistrements dans les tables principales.
          </p>
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="glass-card p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-warmgray">Praticiens</p>
            <p className="mt-3 text-3xl font-semibold text-charcoal">
              {loading ? '...' : errorMessage ? 'Erreur de chargement' : stats.practitioners ?? '—'}
            </p>
          </Card>
          <Card className="glass-card p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-warmgray">Patients</p>
            <p className="mt-3 text-3xl font-semibold text-charcoal">
              {loading ? '...' : errorMessage ? 'Erreur de chargement' : stats.patients ?? '—'}
            </p>
          </Card>
          <Card className="glass-card p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-warmgray">Messages</p>
            <p className="mt-3 text-3xl font-semibold text-charcoal">
              {loading ? '...' : errorMessage ? 'Erreur de chargement' : stats.messages ?? '—'}
            </p>
          </Card>
          <Card className="glass-card p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-warmgray">Plans</p>
            <p className="mt-3 text-3xl font-semibold text-charcoal">
              {loading ? '...' : errorMessage ? 'Erreur de chargement' : stats.plans ?? '—'}
            </p>
          </Card>
        </div>
      </PageShell>

      <PageShell className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-charcoal">Operations de maintenance</h2>
          <p className="text-sm text-warmgray">
            Actions avancees pour la gestion de la base de donnees.
          </p>
        </div>

        <FreshDatabaseButton onSuccess={handleRefresh} />
      </PageShell>
    </div>
  );
}
