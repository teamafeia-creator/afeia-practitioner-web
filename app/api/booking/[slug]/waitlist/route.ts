import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getPractitionerBySlug } from '@/lib/queries/booking';
import { createWaitlistEntry, hasActiveWaitlistEntry, getActiveWaitlistEntries } from '@/lib/queries/waitlist';
import { createSupabaseAuthClient } from '@/lib/server/supabaseAdmin';

const waitlistInsertSchema = z.object({
  email: z.string().email('Format email invalide.'),
  first_name: z.string().min(2, 'Le prenom doit contenir au moins 2 caracteres.'),
  phone: z.string().optional(),
  consultation_type_id: z.string().uuid().optional(),
  preferred_time_of_day: z.enum(['morning', 'afternoon', 'evening', 'any']),
  preferred_days: z.array(z.number().int().min(1).max(6)).default([]),
});

/**
 * POST /api/booking/[slug]/waitlist — Public waitlist inscription
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const body = await request.json();

    const parsed = waitlistInsertSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message || 'Donnees invalides.';
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const data = parsed.data;

    // Get practitioner by slug
    const practitioner = await getPractitionerBySlug(params.slug);
    if (!practitioner) {
      return NextResponse.json(
        { error: 'Praticien non trouve.' },
        { status: 404 }
      );
    }

    // Check for duplicate
    const isDuplicate = await hasActiveWaitlistEntry(practitioner.id, data.email);
    if (isDuplicate) {
      return NextResponse.json(
        { error: 'DUPLICATE', message: 'Vous etes deja inscrit(e) sur la liste d\'attente.' },
        { status: 409 }
      );
    }

    // Validate consultation_type_id if provided
    if (data.consultation_type_id) {
      const typeExists = practitioner.consultation_types.some(t => t.id === data.consultation_type_id);
      if (!typeExists) {
        return NextResponse.json(
          { error: 'Type de consultation non trouve.' },
          { status: 400 }
        );
      }
    }

    // Create waitlist entry
    const entry = await createWaitlistEntry({
      practitioner_id: practitioner.id,
      consultation_type_id: data.consultation_type_id || null,
      email: data.email,
      first_name: data.first_name,
      phone: data.phone || null,
      preferred_time_of_day: data.preferred_time_of_day,
      preferred_days: data.preferred_days,
    });

    return NextResponse.json({ id: entry.id }, { status: 201 });
  } catch (error) {
    console.error('Error in waitlist POST:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue.' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/booking/[slug]/waitlist — Practitioner: list active waitlist entries
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
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

    // Verify practitioner owns this slug
    const practitioner = await getPractitionerBySlug(params.slug);
    if (!practitioner || practitioner.id !== authData.user.id) {
      return NextResponse.json({ error: 'Non autorise.' }, { status: 403 });
    }

    const entries = await getActiveWaitlistEntries(practitioner.id);

    return NextResponse.json({ entries });
  } catch (error) {
    console.error('Error in waitlist GET:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue.' },
      { status: 500 }
    );
  }
}
