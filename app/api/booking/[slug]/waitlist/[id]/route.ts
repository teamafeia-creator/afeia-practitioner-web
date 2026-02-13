import { NextRequest, NextResponse } from 'next/server';
import { getPractitionerBySlug } from '@/lib/queries/booking';
import { deleteWaitlistEntry } from '@/lib/queries/waitlist';
import { createSupabaseAuthClient } from '@/lib/server/supabaseAdmin';

/**
 * DELETE /api/booking/[slug]/waitlist/[id] — Practitioner deletes a waitlist entry
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { slug: string; id: string } }
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

    await deleteWaitlistEntry(params.id, practitioner.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in waitlist DELETE:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue.' },
      { status: 500 }
    );
  }
}
