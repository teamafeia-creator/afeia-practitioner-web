'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageShell } from '@/components/ui/PageShell';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';

type PractitionerPreview = {
  id: string;
  full_name: string | null;
  email: string | null;
  status: string | null;
  subscription_status: string | null;
};

type ConsultantPreview = {
  id: string;
  practitioner_id: string | null;
  full_name: string | null;
  email: string | null;
  status: string | null;
  is_premium: boolean | null;
  practitioner_name?: string | null;
};

type DashboardStats = {
  practitioners: number | null;
  consultants: number | null;
  premiumConsultants: number | null;
  suspendedPractitioners: number | null;
};

const shortcuts = [
  {
    title: 'Praticiens',
    description: 'Consulter les comptes praticiens et les statuts.',
    href: '/admin/practitioners'
  },
  {
    title: 'Consultants',
    description: 'Accéder aux identités et statuts consultants.',
    href: '/admin/consultants'
  },
  {
    title: 'Facturation',
    description: 'Suivre les abonnements et paiements.',
    href: '/admin/billing'
  },
  {
    title: 'Circular',
    description: 'Synchroniser les consultants et statuts Circular.',
    href: '/admin/circular'
  },
  {
    title: 'Base de donnees',
    description: 'Outils de maintenance et reinitialisation.',
    href: '/admin/database'
  }
];

const buttonClasses =
  'inline-flex items-center justify-center gap-2 rounded-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

const buttonVariants = {
  outline: 'border border-teal/30 bg-white text-teal hover:border-teal hover:bg-teal/5',
  ghost: 'bg-transparent text-charcoal hover:bg-sable/70'
};

const buttonSizes = {
  sm: 'px-3 py-1.5 text-[13px]',
  md: 'px-4 py-2.5 text-[13px]'
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    practitioners: null,
    consultants: null,
    premiumConsultants: null,
    suspendedPractitioners: null
  });
  const [practitioners, setPractitioners] = useState<PractitionerPreview[]>([]);
  const [consultants, setConsultants] = useState<ConsultantPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsHasError, setStatsHasError] = useState(false);
  const [practitionersHasError, setPractitionersHasError] = useState(false);
  const [consultantsHasError, setConsultantsHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      try {
        const response = await fetch('/api/admin/dashboard', { credentials: 'include' });
        if (!isMounted) return;

        if (!response.ok) {
          setStatsHasError(true);
          setPractitionersHasError(true);
          setConsultantsHasError(true);
          return;
        }

        const data = await response.json();

        setStats(data.stats ?? {});
        setPractitioners(data.practitioners ?? []);
        setConsultants(data.consultants ?? []);

        const s = data.stats;
        if (
          s?.practitioners === null &&
          s?.consultants === null &&
          s?.premiumConsultants === null &&
          s?.suspendedPractitioners === null
        ) {
          setStatsHasError(true);
        }
      } catch (err) {
        console.error('[admin] dashboard fetch error:', err);
        if (isMounted) {
          setStatsHasError(true);
          setPractitionersHasError(true);
          setConsultantsHasError(true);
        }
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

  const statsRows = [
    { label: 'Naturopathes total', value: stats.practitioners },
    { label: 'Consultants total', value: stats.consultants },
    { label: 'Consultants premium', value: stats.premiumConsultants },
    { label: 'Naturopathes suspendus', value: stats.suspendedPractitioners }
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard Admin"
        subtitle="Vue d&apos;ensemble de la plateforme AFEIA."
        actions={
          <Link
            href="/admin/admins"
            className={cn(buttonClasses, buttonVariants.outline, buttonSizes.md)}
          >
            Gérer les admins
          </Link>
        }
      />

      <PageShell className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-charcoal">Vue d&apos;ensemble</h2>
          <p className="text-sm text-warmgray">
            Indicateurs clefs issus des données Supabase.
          </p>
        </div>
        {statsHasError ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Certaines statistiques n&apos;ont pas pu être chargées.
          </div>
        ) : null}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statsRows.map((stat) => (
            <Card key={stat.label} className="glass-card p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-warmgray">{stat.label}</p>
              <p className="mt-3 text-3xl font-semibold text-charcoal">
                {loading ? '...' : stat.value ?? '—'}
              </p>
            </Card>
          ))}
        </div>
      </PageShell>

      <PageShell className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-charcoal">Raccourcis admin</h2>
          <p className="text-sm text-warmgray">Accès rapide aux sections principales.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {shortcuts.map((shortcut) => (
            <Link
              key={shortcut.href}
              href={shortcut.href}
              className="rounded-2xl border border-white/30 bg-white/80 p-5 text-left shadow-sm transition hover:border-teal/40"
            >
              <p className="text-lg font-semibold text-charcoal">{shortcut.title}</p>
              <p className="mt-2 text-sm text-warmgray">{shortcut.description}</p>
            </Link>
          ))}
        </div>
      </PageShell>

      <PageShell className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-charcoal">Derniers naturopathes</h2>
            <p className="text-sm text-warmgray">Aperçu des inscriptions récentes.</p>
          </div>
          <Link
            href="/admin/practitioners"
            className={cn(buttonClasses, buttonVariants.ghost, buttonSizes.md)}
          >
            Voir tous
          </Link>
        </div>
        <div className="overflow-hidden rounded-2xl border border-white/20 bg-white/80 shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-sand">
              <tr className="text-left text-xs uppercase tracking-wide text-warmgray">
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Abonnement</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-warmgray">
                    Chargement...
                  </td>
                </tr>
              ) : practitionersHasError ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-amber-600">
                    Impossible de charger les praticiens.
                  </td>
                </tr>
              ) : practitioners.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-warmgray">
                    Aucun praticien récent.
                  </td>
                </tr>
              ) : (
                practitioners.map((row) => (
                  <tr key={row.id} className="text-charcoal">
                    <td className="px-4 py-3">{row.full_name ?? '—'}</td>
                    <td className="px-4 py-3">{row.email ?? '—'}</td>
                    <td className="px-4 py-3">{row.status ?? '—'}</td>
                    <td className="px-4 py-3">{row.subscription_status ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/practitioners/${row.id}`}
                        className={cn(buttonClasses, buttonVariants.outline, buttonSizes.sm)}
                      >
                        Voir
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </PageShell>

      <PageShell className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-charcoal">Derniers consultants</h2>
            <p className="text-sm text-warmgray">Identités consultants sans données médicales.</p>
          </div>
          <Link
            href="/admin/consultants"
            className={cn(buttonClasses, buttonVariants.ghost, buttonSizes.md)}
          >
            Voir tous
          </Link>
        </div>
        <div className="overflow-hidden rounded-2xl border border-white/20 bg-white/80 shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-sand">
              <tr className="text-left text-xs uppercase tracking-wide text-warmgray">
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Naturopathe associé</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-warmgray">
                    Chargement...
                  </td>
                </tr>
              ) : consultantsHasError ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-amber-600">
                    Impossible de charger les consultants.
                  </td>
                </tr>
              ) : consultants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-warmgray">
                    Aucun consultant récent.
                  </td>
                </tr>
              ) : (
                consultants.map((row) => (
                  <tr key={row.id} className="text-charcoal">
                    <td className="px-4 py-3">{row.full_name ?? '—'}</td>
                    <td className="px-4 py-3">{row.email ?? '—'}</td>
                    <td className="px-4 py-3">{row.practitioner_name ?? '—'}</td>
                    <td className="px-4 py-3">
                      {row.is_premium || row.status === 'premium' ? 'premium' : 'standard'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/consultants/${row.id}`}
                        className={cn(buttonClasses, buttonVariants.outline, buttonSizes.sm)}
                      >
                        Voir
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </PageShell>
    </div>
  );
}
