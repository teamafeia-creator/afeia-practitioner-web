import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseAuthClient } from '@/lib/server/supabaseAdmin';
import { notifyWaitlistForAppointment } from '@/lib/server/waitlist-notify';

const notifySchema = z.object({
  appointmentId: z.string().uuid(),
});

/**
 * POST /api/waitlist/notify — Trigger waitlist notifications for a freed slot.
 * Called from the client after a cancellation or reschedule.
 * Accepts an appointmentId and looks up all needed info server-side.
 * Protected by practitioner auth.
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const token = request.headers.get('authorization')?.replace('Bearer ', '').trim();
    if (!token) {
      return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
    }

    const supabaseAuth = createSupabaseAuthClient();
    const { data: authData, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Session invalide.' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = notifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides.' }, { status: 400 });
    }

    const result = await notifyWaitlistForAppointment(parsed.data.appointmentId, authData.user.id);
    if (result.notFound) return NextResponse.json({ error: 'Rendez-vous non trouvé.' }, { status: 404 });
    if (result.forbidden) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 });
    return NextResponse.json({ notified: result.notified });
  } catch (error) {
    console.error('Error in waitlist notify:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue.' },
      { status: 500 }
    );
  }
}
