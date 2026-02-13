import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const supabase = createAdminClient();

    // Load the session with registrations
    const { data: session, error: sessionError } = await supabase
      .from('group_sessions')
      .select(`
        id, practitioner_id, consultation_type_id,
        consultation_type:consultation_types(id, price_cents)
      `)
      .eq('id', params.sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Seance introuvable.' }, { status: 404 });
    }

    // Get attended registrations with consultant_id
    const { data: attendees, error: regError } = await supabase
      .from('group_session_registrations')
      .select('id, consultant_id, name, email')
      .eq('group_session_id', params.sessionId)
      .eq('status', 'attended');

    if (regError) {
      return NextResponse.json({ error: 'Erreur chargement inscriptions.' }, { status: 500 });
    }

    if (!attendees || attendees.length === 0) {
      return NextResponse.json({ error: 'Aucun participant present a facturer.' }, { status: 400 });
    }

    // Supabase may return the join as array or object depending on context
    const ctRaw = session.consultation_type;
    const consultationType = (Array.isArray(ctRaw) ? ctRaw[0] : ctRaw) as { id: string; price_cents: number | null } | undefined;
    const priceCents = consultationType?.price_cents || 0;

    // Filter only those with a consultant_id (can create invoices)
    const invoiceable = attendees.filter((a) => a.consultant_id);
    const skipped = attendees.filter((a) => !a.consultant_id);

    let invoiceCount = 0;

    for (const attendee of invoiceable) {
      const { error: invoiceError } = await supabase
        .from('consultation_invoices')
        .insert({
          practitioner_id: session.practitioner_id,
          consultant_id: attendee.consultant_id,
          appointment_id: null,
          amount_cents: priceCents,
          status: 'draft',
          issued_at: new Date().toISOString(),
        });

      if (!invoiceError) {
        invoiceCount++;
      } else {
        console.error('Invoice error for', attendee.name, invoiceError);
      }
    }

    return NextResponse.json({
      invoices_created: invoiceCount,
      skipped_no_consultant: skipped.length,
      skipped_names: skipped.map((s) => s.name),
    });
  } catch (error) {
    console.error('Error in batch-invoice:', error);
    return NextResponse.json({ error: 'Erreur lors de la facturation.' }, { status: 500 });
  }
}
