/**
 * GET/POST /api/mobile/anamnese/draft
 * Save or retrieve anamnese draft (partial questionnaire data)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { resolvePatientId } from '@/lib/mobile-auth';

/**
 * GET - Retrieve the current draft
 */
export async function GET(request: NextRequest) {
  try {
    const patientId = await resolvePatientId(request);

    if (!patientId) {
      return NextResponse.json(
        { message: 'Non autorisé' },
        { status: 401 }
      );
    }

    // Get draft from anamnese_drafts table
    const { data: draft, error } = await getSupabaseAdmin()
      .from('anamnese_drafts')
      .select('data, updated_at')
      .eq('patient_id', patientId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = "The result contains 0 rows" - this is OK
      console.error('Error getting draft:', error);
      return NextResponse.json(
        { message: 'Erreur lors de la récupération du brouillon' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      draft: draft?.data || null,
      updatedAt: draft?.updated_at || null,
    });
  } catch (error) {
    console.error('Error getting anamnese draft:', error);
    return NextResponse.json(
      { message: 'Erreur lors de la récupération du brouillon' },
      { status: 500 }
    );
  }
}

/**
 * POST - Save draft (partial data)
 */
export async function POST(request: NextRequest) {
  try {
    const patientId = await resolvePatientId(request);

    if (!patientId) {
      return NextResponse.json(
        { message: 'Non autorisé' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { sections } = body;

    if (!sections) {
      return NextResponse.json(
        { message: 'Données manquantes' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // Check if draft already exists
    const { data: existing } = await getSupabaseAdmin()
      .from('anamnese_drafts')
      .select('id')
      .eq('patient_id', patientId)
      .maybeSingle();

    if (existing) {
      // Update existing draft
      const { error } = await getSupabaseAdmin()
        .from('anamnese_drafts')
        .update({
          data: sections,
          updated_at: now,
        })
        .eq('id', existing.id);

      if (error) {
        throw error;
      }
    } else {
      // Create new draft
      const { error } = await getSupabaseAdmin()
        .from('anamnese_drafts')
        .insert({
          patient_id: patientId,
          data: sections,
          created_at: now,
          updated_at: now,
        });

      if (error) {
        throw error;
      }
    }

    return NextResponse.json({
      success: true,
      savedAt: now,
    });
  } catch (error) {
    console.error('Error saving anamnese draft:', error);
    return NextResponse.json(
      { message: 'Erreur lors de la sauvegarde du brouillon' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Clear draft (after submission)
 */
export async function DELETE(request: NextRequest) {
  try {
    const patientId = await resolvePatientId(request);

    if (!patientId) {
      return NextResponse.json(
        { message: 'Non autorisé' },
        { status: 401 }
      );
    }

    await getSupabaseAdmin()
      .from('anamnese_drafts')
      .delete()
      .eq('patient_id', patientId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting anamnese draft:', error);
    return NextResponse.json(
      { message: 'Erreur lors de la suppression du brouillon' },
      { status: 500 }
    );
  }
}
