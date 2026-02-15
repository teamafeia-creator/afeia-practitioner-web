/**
 * PATCH /api/mobile/messages/read
 * Mark specific messages as read
 *
 * Body: { messageIds: string[] }
 * Only marks messages that belong to the authenticated consultant.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { resolveConsultantId } from '@/lib/mobile-auth';

export async function PATCH(request: NextRequest) {
  try {
    const consultantId = await resolveConsultantId(request);

    if (!consultantId) {
      return NextResponse.json(
        { message: 'Non autorisé' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { messageIds } = body;

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json(
        { message: 'messageIds requis (tableau non vide)' },
        { status: 400 }
      );
    }

    const { data, error } = await getSupabaseAdmin()
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('consultant_id', consultantId)
      .is('read_at', null)
      .in('id', messageIds)
      .select('id');

    if (error) {
      throw error;
    }

    return NextResponse.json({
      markedCount: data?.length || 0,
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return NextResponse.json(
      { message: 'Erreur lors du marquage des messages' },
      { status: 500 }
    );
  }
}
