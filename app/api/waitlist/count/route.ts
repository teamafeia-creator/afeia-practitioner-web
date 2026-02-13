import { NextRequest, NextResponse } from 'next/server';
import { getWaitlistCount } from '@/lib/queries/waitlist';
import { createSupabaseAuthClient } from '@/lib/server/supabaseAdmin';

/**
 * GET /api/waitlist/count — Get active waitlist count for the practitioner badge
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '').trim();
    if (!token) {
      return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
    }

    const supabaseAuth = createSupabaseAuthClient();
    const { data: authData, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Session invalide.' }, { status: 401 });
    }

    const count = await getWaitlistCount(authData.user.id);

    return NextResponse.json({ count });
  } catch (error) {
    console.error('Error in waitlist count:', error);
    return NextResponse.json({ error: 'Une erreur est survenue.' }, { status: 500 });
  }
}
