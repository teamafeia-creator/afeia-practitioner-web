/**
 * PATCH /api/mobile/resources/[id]/read
 * Mark a resource assignment as read by the consultant
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { resolveConsultantId } from '@/lib/mobile-auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const consultantId = await resolveConsultantId(request);

    if (!consultantId) {
      return NextResponse.json(
        { message: 'Non autorisé' },
        { status: 401 }
      );
    }

    const { id: assignmentId } = await params;

    // Verify assignment belongs to this consultant and update read_at
    const { error } = await getSupabaseAdmin()
      .from('resource_assignments')
      .update({ read_at: new Date().toISOString() })
      .eq('id', assignmentId)
      .eq('consultant_id', consultantId);

    if (error) {
      console.error('Error marking resource as read:', error);
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking resource as read:', error);
    return NextResponse.json(
      { message: 'Erreur lors de la mise à jour' },
      { status: 500 }
    );
  }
}
