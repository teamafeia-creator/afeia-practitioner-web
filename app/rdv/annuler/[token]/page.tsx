import type { Metadata } from 'next';
import { createAdminClient } from '@/lib/supabase/admin';
import { CancelClient } from './CancelClient';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Annuler un rendez-vous', robots: { index: false } };

export default async function CancelPage({ params }: { params: { token: string } }) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('appointments')
    .select('starts_at, status, deposit_status, deposit_cents, location_type, practitioner:practitioners(full_name, cancellation_policy_hours, booking_slug), consultation_type:consultation_types(name)')
    .eq('cancel_token', params.token)
    .maybeSingle();
  type Row = {
    starts_at: string;
    status: string;
    deposit_status: string;
    deposit_cents: number | null;
    location_type: string;
    practitioner: { full_name: string; cancellation_policy_hours: number | null; booking_slug: string | null } | null;
    consultation_type: { name: string } | null;
  };
  const a = data as unknown as Row | null;
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream p-4 text-charcoal">
      {!a ? (
        <div className="max-w-md rounded-[20px] border border-divider bg-surface p-8 text-center">
          <h1 className="font-serif text-2xl font-medium">Lien introuvable</h1>
          <p className="mt-2 text-sm text-stone">Ce lien d’annulation n’est plus valable. Contactez directement votre praticien.</p>
        </div>
      ) : (
        <CancelClient
          token={params.token}
          startsAt={a.starts_at}
          alreadyCancelled={a.status === 'cancelled'}
          typeName={a.consultation_type?.name ?? 'Séance'}
          practitioner={a.practitioner?.full_name ?? 'votre praticien'}
          slug={a.practitioner?.booking_slug ?? null}
          hours={a.practitioner?.cancellation_policy_hours ?? 24}
          depositCents={a.deposit_status === 'paid' ? a.deposit_cents ?? 0 : 0}
          visio={a.location_type === 'video'}
        />
      )}
    </div>
  );
}
