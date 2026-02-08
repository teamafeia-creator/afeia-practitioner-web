import { NextRequest, NextResponse } from 'next/server';
import { getSlotsForDay, getPractitionerBySlug } from '@/lib/queries/booking';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { searchParams } = request.nextUrl;
    const date = searchParams.get('date'); // YYYY-MM-DD
    const consultationTypeId = searchParams.get('consultation_type_id');

    if (!date || !consultationTypeId) {
      return NextResponse.json(
        { error: 'Les parametres date et consultation_type_id sont requis.' },
        { status: 400 }
      );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: 'Format de date invalide. Utilisez YYYY-MM-DD.' },
        { status: 400 }
      );
    }

    const practitioner = await getPractitionerBySlug(params.slug);
    if (!practitioner) {
      return NextResponse.json(
        { error: 'Praticien non trouve.' },
        { status: 404 }
      );
    }

    const ct = practitioner.consultation_types.find(t => t.id === consultationTypeId);
    if (!ct) {
      return NextResponse.json(
        { error: 'Type de consultation non trouve.' },
        { status: 404 }
      );
    }

    const slots = await getSlotsForDay(practitioner.id, consultationTypeId, date);

    return NextResponse.json({
      date,
      consultation_type: {
        id: ct.id,
        name: ct.name,
        duration_minutes: ct.duration_minutes,
        price_cents: ct.price_cents,
      },
      slots,
      practitioner: {
        full_name: practitioner.full_name,
        booking_address: practitioner.booking_address,
      },
    });
  } catch (error) {
    console.error('Error in slots API:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue.' },
      { status: 500 }
    );
  }
}
