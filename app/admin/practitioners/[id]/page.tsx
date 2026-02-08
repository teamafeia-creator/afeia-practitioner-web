import { redirect } from 'next/navigation';
import { AdminPractitionerDetailClient } from '@/components/admin/AdminPractitionerDetailClient';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAdminEmailFromCookies, isAdminEmail } from '@/lib/server/adminAuth';
import { computeHealthScore } from '@/lib/admin/health-score';

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
      .from('practitioners_public')
      .select('id, email, full_name, status, subscription_status, created_at, last_login_at, calendly_url')
      .eq('id', params.id)
      .maybeSingle();

    if (error) {
      console.error('[admin] practitioner detail error:', error);
      return (
        <div className="space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h1 className="text-xl font-semibold text-slate-800">Praticien</h1>
            <p className="mt-1 text-sm text-slate-500">Erreur de chargement.</p>
          </div>
        </div>
      );
    }

    if (!practitioner) {
      return (
        <div className="space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h1 className="text-xl font-semibold text-slate-800">Praticien</h1>
            <p className="mt-1 text-sm text-slate-500">Praticien introuvable.</p>
          </div>
        </div>
      );
    }

    // Fetch consultants list and subscription in parallel
    const [consultantsResult, subscriptionResult] = await Promise.all([
      supabase
        .from('consultants_identity')
        .select('id, full_name, email, status, is_premium, created_at')
        .eq('practitioner_id', practitioner.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('stripe_subscriptions')
        .select('id, status, price_id, current_period_end, payment_failed, customer_id')
        .eq('practitioner_id', practitioner.id)
        .maybeSingle(),
    ]);

    const consultants = consultantsResult.data ?? [];
    const subscription = subscriptionResult.data;

    // Compute health score
    let paymentStatus: 'ok' | 'late_short' | 'late_long' | 'free' = 'free';
    if (subscription) {
      if (subscription.payment_failed) {
        paymentStatus = 'late_long';
      } else if (subscription.status === 'active') {
        paymentStatus = 'ok';
      } else if (subscription.status === 'past_due') {
        paymentStatus = 'late_short';
      }
    }

    const healthScore = computeHealthScore({
      lastLoginAt: practitioner.last_login_at ?? null,
      consultantsCount: consultants.length,
      featuresUsedThisMonth: 0,
      totalFeatures: 5,
      paymentStatus,
      createdAt: practitioner.created_at ?? new Date().toISOString(),
    });

    return (
      <AdminPractitionerDetailClient
        practitioner={practitioner}
        consultantsCount={consultants.length}
        consultants={consultants}
        subscription={subscription ?? null}
        healthScore={healthScore}
      />
    );
  } catch (error) {
    console.error('[admin] practitioner detail exception:', error);
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h1 className="text-xl font-semibold text-slate-800">Praticien</h1>
          <p className="mt-1 text-sm text-slate-500">Erreur de chargement.</p>
        </div>
      </div>
    );
  }
}
