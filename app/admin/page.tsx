import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageShell } from '@/components/ui/PageShell';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAdminEmailFromCookies, isAdminEmail } from '@/lib/server/adminAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DASHBOARD_PREVIEW_LIMIT = 8;

type PractitionerPreview = {
  id: string;
  full_name: string | null;
  email: string | null;
  status: string | null;
  subscription_status: string | null;
};

type PatientPreview = {
  id: string;
  practitioner_id: string | null;
  name: string | null;
  email: string | null;
  status: string | null;
  is_premium: boolean | null;
  practitioner_name?: string | null;
  practitioners?: { full_name: string | null }[] | { full_name: string | null } | null;
};

type DashboardStats = {
  practitioners: number | null;
  patients: number | null;
  premiumPatients: number | null;
  suspendedPractitioners: number | null;
};

const shortcuts = [
  {
    title: 'Praticiens',
    description: 'Consulter les comptes praticiens et les statuts.',
    href: '/admin/practitioners'
  },
  {
    title: 'Patients',
    description: 'Accéder aux identités et statuts patients.',
    href: '/admin/patients'
  },
  {
    title: 'Facturation',
    description: 'Suivre les abonnements et paiements.',
    href: '/admin/billing'
  },
  {
    title: 'Circular',
    description: 'Synchroniser les patients et statuts Circular.',
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

export default async function AdminDashboardPage() {
  const adminEmail = getAdminEmailFromCookies();
  if (!adminEmail || !(await isAdminEmail(adminEmail))) {
    redirect('/admin/login');
  }

  const supabase = createAdminClient();

  let hasError = false;

  const [
    practitionersCountResult,
    patientsCountResult,
    premiumPatientsCountResult,
    suspendedPractitionersCountResult,
    practitionersResult,
    patientsResult
  ] = await Promise.all([
    supabase.from('practitioners').select('id', { count: 'exact', head: true }),
    supabase.from('patients').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    supabase
      .from('patients')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null)
      .or('is_premium.eq.true,status.eq.premium'),
    supabase
      .from('practitioners')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'suspended'),
    supabase
      .from('practitioners')
      .select('id, full_name, email, status, subscription_status, created_at')
      .order('created_at', { ascending: false })
      .limit(DASHBOARD_PREVIEW_LIMIT),
    supabase
      .from('patients')
      .select(
        'id, practitioner_id, name, email, status, is_premium, created_at, practitioners(full_name)'
      )
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(DASHBOARD_PREVIEW_LIMIT)
  ]);

  const errors = [
    practitionersCountResult.error,
    patientsCountResult.error,
    premiumPatientsCountResult.error,
    suspendedPractitionersCountResult.error,
    practitionersResult.error,
    patientsResult.error
  ].filter(Boolean);

  if (errors.length > 0) {
    hasError = true;
    errors.forEach((error) => {
      console.error('[admin] dashboard query error:', error);
    });
  }

  const stats: DashboardStats = {
    practitioners: hasError ? null : practitionersCountResult.count ?? null,
    patients: hasError ? null : patientsCountResult.count ?? null,
    premiumPatients: hasError ? null : premiumPatientsCountResult.count ?? null,
    suspendedPractitioners: hasError ? null : suspendedPractitionersCountResult.count ?? null
  };

  const practitioners = hasError ? [] : practitionersResult.data ?? [];
  const patients: PatientPreview[] = hasError
    ? []
    : ((patientsResult.data as PatientPreview[] | null)?.map((patient) => ({
        ...patient,
        practitioner_name: Array.isArray(patient.practitioners)
          ? patient.practitioners[0]?.full_name ?? null
          : patient.practitioners?.full_name ?? null
      })) ?? []);

  const statsRows = [
    {
      label: 'Naturopathes total',
      value: stats.practitioners
    },
    {
      label: 'Patients total',
      value: stats.patients
    },
    {
      label: 'Patients premium',
      value: stats.premiumPatients
    },
    {
      label: 'Naturopathes suspendus',
      value: stats.suspendedPractitioners
    }
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

      {hasError ? (
        <PageShell>
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Erreur de chargement.
          </div>
        </PageShell>
      ) : null}

      <PageShell className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-charcoal">Vue d&apos;ensemble</h2>
          <p className="text-sm text-warmgray">
            Indicateurs clefs issus des données Supabase.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statsRows.map((stat) => (
            <Card key={stat.label} className="glass-card p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-warmgray">{stat.label}</p>
              <p className="mt-3 text-3xl font-semibold text-charcoal">
                {hasError ? 'Erreur de chargement' : stat.value ?? '—'}
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
              {hasError ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-red-600">
                    Erreur de chargement.
                  </td>
                </tr>
              ) : practitioners.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-warmgray">
                    Aucun praticien récent.
                  </td>
                </tr>
              ) : (
                practitioners.slice(0, DASHBOARD_PREVIEW_LIMIT).map((row) => (
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
            <h2 className="text-lg font-semibold text-charcoal">Derniers patients</h2>
            <p className="text-sm text-warmgray">Identités patients sans données médicales.</p>
          </div>
          <Link
            href="/admin/patients"
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
              {hasError ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-red-600">
                    Erreur de chargement.
                  </td>
                </tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-warmgray">
                    Aucun patient récent.
                  </td>
                </tr>
              ) : (
                patients.slice(0, DASHBOARD_PREVIEW_LIMIT).map((row) => (
                  <tr key={row.id} className="text-charcoal">
                    <td className="px-4 py-3">{row.name ?? '—'}</td>
                    <td className="px-4 py-3">{row.email ?? '—'}</td>
                    <td className="px-4 py-3">{row.practitioner_name ?? '—'}</td>
                    <td className="px-4 py-3">
                      {row.is_premium || row.status === 'premium' ? 'premium' : 'standard'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/patients/${row.id}`}
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
