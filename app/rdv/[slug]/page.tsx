import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  BookingDataError,
  getPractitionerBySlug,
  type PractitionerPublicProfile,
} from '@/lib/queries/booking';
import { BookingPageClient } from './BookingPageClient';

// Force dynamic rendering — booking data must always be fresh
export const dynamic = 'force-dynamic';

interface Props {
  params: { slug: string };
}

type LoadResult =
  | { status: 'ok'; practitioner: PractitionerPublicProfile }
  | { status: 'not_found' }
  | { status: 'error'; code: string | null };

async function loadPractitioner(slug: string): Promise<LoadResult> {
  try {
    const practitioner = await getPractitionerBySlug(slug);
    if (!practitioner) return { status: 'not_found' };
    return { status: 'ok', practitioner };
  } catch (error) {
    const code = error instanceof BookingDataError ? error.code : null;
    console.error('[rdv] Booking page technical error', { slug, code, error });
    return { status: 'error', code };
  }
}

// LOT 8 — SEO metadata
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const result = await loadPractitioner(params.slug);

  if (result.status === 'error') {
    return { title: 'Page indisponible — AFEIA' };
  }

  if (result.status === 'not_found') {
    return { title: 'Praticien non trouvé — AFEIA' };
  }

  const { practitioner } = result;

  return {
    title: `Prendre RDV avec ${practitioner.full_name} — AFEIA`,
    description: `Réservez une consultation avec ${practitioner.full_name}. Prise de rendez-vous en ligne simple et rapide.`,
    openGraph: {
      title: `Prendre RDV avec ${practitioner.full_name}`,
      description: `Consultation — ${practitioner.booking_address || 'Prise de rendez-vous en ligne'}`,
      type: 'website',
    },
  };
}

export default async function BookingPage({ params }: Props) {
  const result = await loadPractitioner(params.slug);

  if (result.status === 'not_found') {
    notFound();
  }

  if (result.status === 'error') {
    return (
      <div className="text-center py-16">
        <h1 className="text-xl font-semibold text-charcoal mb-2">
          Page non disponible
        </h1>
        <p className="text-sm text-stone">
          Un problème technique empêche l&apos;affichage de cette page. Réessayez plus tard.
        </p>
      </div>
    );
  }

  const { practitioner } = result;

  if (practitioner.consultation_types.length === 0) {
    return (
      <div className="text-center py-16">
        <h1 className="text-xl font-semibold text-charcoal mb-2">
          Page non disponible
        </h1>
        <p className="text-sm text-stone">
          Ce praticien n&apos;accepte pas les réservations en ligne pour le moment.
        </p>
      </div>
    );
  }

  return (
    <BookingPageClient
      practitioner={practitioner}
      slug={params.slug}
    />
  );
}
