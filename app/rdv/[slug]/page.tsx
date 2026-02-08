import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPractitionerBySlug } from '@/lib/queries/booking';
import { BookingPageClient } from './BookingPageClient';

interface Props {
  params: { slug: string };
}

// LOT 8 — SEO metadata
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const practitioner = await getPractitionerBySlug(params.slug);

  if (!practitioner) {
    return { title: 'Praticien non trouve — AFEIA' };
  }

  return {
    title: `Prendre RDV avec ${practitioner.full_name} — AFEIA`,
    description: `Reservez une consultation avec ${practitioner.full_name}. Prise de rendez-vous en ligne simple et rapide.`,
    openGraph: {
      title: `Prendre RDV avec ${practitioner.full_name}`,
      description: `Consultation — ${practitioner.booking_address || 'Prise de rendez-vous en ligne'}`,
      type: 'website',
    },
  };
}

export default async function BookingPage({ params }: Props) {
  const practitioner = await getPractitionerBySlug(params.slug);

  if (!practitioner) {
    notFound();
  }

  if (practitioner.consultation_types.length === 0) {
    return (
      <div className="text-center py-16">
        <h1 className="text-xl font-semibold text-charcoal mb-2">
          Page non disponible
        </h1>
        <p className="text-sm text-warmgray">
          Ce praticien n&apos;accepte pas les reservations en ligne pour le moment.
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
