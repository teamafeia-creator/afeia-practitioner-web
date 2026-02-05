import Link from 'next/link';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageShell } from '@/components/ui/PageShell';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';
import { createSupabaseAdminClient } from '@/lib/server/supabaseAdmin';

export const revalidate = 0;
// Keep this page server-rendered without AdminDataTable to avoid client render props.

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
  full_name: string | null;
  email: string | null;
  status: string | null;
  is_premium: boolean | null;
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
  const supabase = createSupabaseAdminClient();

  const [
    practitionersCountResult,
    patientsCountResult,
    premiumPatientsCountResult,
    suspendedPractitionersCountResult,
    practitionersResult,
    patientsResult
  ] = await Promise.all([
    supabase.from('practitioners_public').select('id', { count: 'exact', head: true }),
    supabase.from('patients_identity').select('id', { count: 'exact', head: true }),
    supabase
      .from('patients_identity')
      .select('id', { count: 'exact', head: true })
      .or('is_premium.eq.true,status.eq.premium'),
    supabase
      .from('practitioners_public')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'suspended'),
    supabase
      .from('practitioners_public')
      .select('id, full_name, email, status, subscription_status, created_at')
      .order('created_at', { ascending: false })
      .limit(DASHBOARD_PREVIEW_LIMIT),
    supabase
      .from('patients_identity')
      .select('id, practitioner_id, full_name, email, status, is_premium, created_at')
      .order('created_at', { ascending: false })
      .limit(DASHBOARD_PREVIEW_LIMIT)
  ]);

  const practitioners = (practitionersResult.data ?? []) as PractitionerPreview[];
  const patients = (patientsResult.data ?? []) as PatientPreview[];

  const practitionerIds = Array.from(
    new Set(patients.map((patient) => patient.practitioner_id).filter(Boolean))
  ) as string[];

  const practitionerNamesResult = practitionerIds.length
    ? await supabase.from('practitioners_public').select('id, full_name').in('id', practitionerIds)
    : { data: [] };

  const practitionerNameMap = new Map(
    (practitionerNamesResult.data ?? []).map((row) => [row.id, row.full_name])
  );

  const stats = [
    {
      label: 'Naturopathes total',
      value: practitionersCountResult.count ?? 0
    },
    {
      label: 'Patients total',
      value: patientsCountResult.count ?? 0
    },
    {
      label: 'Patients premium',
      value: premiumPatientsCountResult.count ?? 0
    },
    {
      label: 'Naturopathes suspendus',
      value: suspendedPractitionersCountResult.count ?? 0
    }
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard Admin"
        subtitle="Vue d'ensemble de la plateforme AFEIA."
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="glass-card p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-warmgray">{stat.label}</p>
              <p className="mt-3 text-3xl font-semibold text-charcoal">{stat.value}</p>
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
              {practitioners.length === 0 ? (
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
            <h2 className="text-lg font-semibold text-charcoal">Derniers patients</h2>
            <p className="text-sm text-warmgray">
              Identités patients sans données médicales.
            </p>
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
              {patients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-warmgray">
                    Aucun patient récent.
                  </td>
                </tr>
              ) : (
                patients.map((row) => (
                  <tr key={row.id} className="text-charcoal">
                    <td className="px-4 py-3">{row.full_name ?? '—'}</td>
                    <td className="px-4 py-3">{row.email ?? '—'}</td>
                    <td className="px-4 py-3">
                      {practitionerNameMap.get(row.practitioner_id ?? '') ?? '—'}
                    </td>
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
