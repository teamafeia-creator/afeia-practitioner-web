/**
 * GET /api/mobile/messages/unread-count
 * Get unread messages count
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { resolvePatientId } from '@/lib/mobile-auth';

export async function GET(request: NextRequest) {
  try {
    const patientId = await resolvePatientId(request);

    if (!patientId) {
      return NextResponse.json(
        { message: 'Non autorisé' },
        { status: 401 }
      );
    }

    const { count, error } = await getSupabaseAdmin()
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('patient_id', patientId)
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
