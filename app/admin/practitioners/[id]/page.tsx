import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { AdminBackBar } from '@/components/admin/AdminBackBar';
import { AdminPractitionerDetailClient } from '@/components/admin/AdminPractitionerDetailClient';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAdminEmailFromCookies, isAdminEmail } from '@/lib/server/adminAuth';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

type PageProps = {
  params: { id: string };
};

export default async function AdminPractitionerDetailPage({ params }: PageProps) {
  const adminEmail = getAdminEmailFromCookies();
  if (!adminEmail || !(await isAdminEmail(adminEmail))) {
    redirect('/admin/login');
  }

  const supabase = createAdminClient();

  try {
    const { data: practitioner, error } = await supabase
      .from('practitioners')
      .select('id, email, full_name, status, calendly_url, subscription_status, created_at')
      .eq('id', params.id)
      .maybeSingle();

    if (error) {
      console.error('[admin] practitioner detail error:', error);
      return (
        <div className="space-y-6">
          <AdminBackBar
            secondaryHref="/admin/practitioners"
            secondaryLabel="← Retour a la liste des praticiens"
          />
          <PageHeader title="Praticien" subtitle="Erreur de chargement." />
        </div>
      );
    }

    if (!practitioner) {
      return (
        <div className="space-y-6">
          <AdminBackBar
            secondaryHref="/admin/practitioners"
            secondaryLabel="← Retour a la liste des praticiens"
          />
          <PageHeader title="Praticien" subtitle="Praticien introuvable." />
        </div>
      );
    }

    const { count: patientsCount } = await supabase
      .from('patients')
      .select('id', { count: 'exact', head: true })
      .eq('practitioner_id', practitioner.id)
      .is('deleted_at', null);

    return (
      <AdminPractitionerDetailClient
        practitioner={practitioner}
        patientsCount={patientsCount ?? null}
      />
    );
  } catch (error) {
    console.error('[admin] practitioner detail exception:', error);
    return (
      <div className="space-y-6">
        <AdminBackBar
          secondaryHref="/admin/practitioners"
          secondaryLabel="← Retour a la liste des praticiens"
        />
        <PageHeader title="Praticien" subtitle="Erreur de chargement." />
      </div>
    );
  }
}
