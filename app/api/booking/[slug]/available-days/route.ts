import { NextRequest, NextResponse } from 'next/server';
import { getAvailableDaysForMonth, getPractitionerPublicInfo } from '@/lib/queries/booking';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { searchParams } = request.nextUrl;
    const month = searchParams.get('month'); // YYYY-MM
    const consultationTypeId = searchParams.get('consultation_type_id');

    if (!month || !consultationTypeId) {
      return NextResponse.json(
        { error: 'Les parametres month et consultation_type_id sont requis.' },
        { status: 400 }
      );
    }

    const monthMatch = month.match(/^(\d{4})-(\d{2})$/);
    if (!monthMatch) {
      return NextResponse.json(
        { error: 'Format de mois invalide. Utilisez YYYY-MM.' },
        { status: 400 }
      );
    }

    const year = parseInt(monthMatch[1]);
    const monthNum = parseInt(monthMatch[2]);
    if (monthNum < 1 || monthNum > 12) {
      return NextResponse.json({ error: 'Mois invalide.' }, { status: 400 });
    }

    const practitioner = await getPractitionerPublicInfo(params.slug);
    if (!practitioner) {
      return NextResponse.json(
        { error: 'Praticien non trouve.' },
        { status: 404 }
      );
    }

    if (!practitioner.booking_enabled) {
      return NextResponse.json(
        { error: 'La reservation en ligne n\'est pas activee.' },
        { status: 403 }
      );
    }

    const availableDays = await getAvailableDaysForMonth(
      practitioner.id,
      consultationTypeId,
      year,
      monthNum
    );

    return NextResponse.json({ available_days: availableDays });
  } catch (error) {
    console.error('Error in available-days API:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue.' },
      { status: 500 }
    );
  }
}
