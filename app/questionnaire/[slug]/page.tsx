import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { QuestionnaireFlow } from './QuestionnaireFlow';

export const dynamic = 'force-dynamic';

type Props = { params: { slug: string } };

async function load(slug: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('practitioners')
    .select('id, full_name, first_name, last_name, booking_enabled, booking_address')
    .eq('booking_slug', slug)
    .maybeSingle();
  return data as
    | { id: string; full_name: string | null; first_name: string | null; last_name: string | null; booking_enabled: boolean | null; booking_address: string | null }
    | null;
}

/** Ville déduite de l'adresse du cabinet (« 12 rue …, 34000 Montpellier » → « Montpellier »). */
function cityOf(address: string | null): string | null {
  if (!address) return null;
  const m = address.match(/\b\d{5}\s+([^,\n]+)/);
  return m ? m[1].trim() : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await load(params.slug);
  const name = p?.full_name || [p?.first_name, p?.last_name].filter(Boolean).join(' ');
  return {
    title: name ? `Questionnaire préliminaire · ${name}` : 'Questionnaire préliminaire',
    robots: { index: false },
  };
}

export default async function PublicQuestionnairePage({ params }: Props) {
  const p = await load(params.slug);
  if (!p) notFound();
  const name = p.full_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || 'votre praticien';
  return (
    <QuestionnaireFlow
      slug={params.slug}
      practitioner={{ id: p.id, name, city: cityOf(p.booking_address), bookingEnabled: !!p.booking_enabled }}
    />
  );
}
