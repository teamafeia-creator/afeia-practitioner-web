/**
 * GET /api/mobile/messages/unread-count
 * Get unread messages count
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { resolveConsultantId } from '@/lib/mobile-auth';

export async function GET(request: NextRequest) {
  try {
    const consultantId = await resolveConsultantId(request);

    if (!consultantId) {
      return NextResponse.json(
        { message: 'Non autorisé' },
        { status: 401 }
      );
    }

    const { count, error } = await getSupabaseAdmin()
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('consultant_id', consultantId)
      .eq('sender', 'praticien')
      .is('read_at', null);

    if (error) {
      throw error;
    }

    return NextResponse.json({ count: count || 0 });
  } catch (error) {
    console.error('Error getting unread count:', error);
    return NextResponse.json(
      { message: 'Erreur lors de la récupération du compteur' },
      { status: 500 }
    );
  }
}
