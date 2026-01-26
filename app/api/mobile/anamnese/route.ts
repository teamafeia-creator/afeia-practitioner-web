/**
 * GET/POST /api/mobile/anamnese
 * Get or submit anamnese questionnaire
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getBearerToken } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

async function getPatientFromToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = getBearerToken(authHeader);

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_SECRET)
    );
    return payload.patientId as string;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const patientId = await getPatientFromToken(request);

    if (!patientId) {
      return NextResponse.json(
        { message: 'Non autorisé' },
        { status: 401 }
      );
    }

    // Get anamnese
    const { data: anamnese } = await getSupabaseAdmin()
      .from('anamneses')
      .select('id, data, completed, completed_at, created_at, updated_at')
      .eq('patient_id', patientId)
      .maybeSingle();

    return NextResponse.json({
      anamnese: anamnese ? {
        id: anamnese.id,
        data: anamnese.data,
        completed: anamnese.completed,
        completedAt: anamnese.completed_at,
        createdAt: anamnese.created_at,
        updatedAt: anamnese.updated_at,
      } : null,
      completed: anamnese?.completed || false,
    });
  } catch (error) {
    console.error('Error getting anamnese:', error);
    return NextResponse.json(
      { message: 'Erreur lors de la récupération de l\'anamnèse' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const patientId = await getPatientFromToken(request);

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

    // Get case file ID
    const { data: caseFile } = await getSupabaseAdmin()
      .from('case_files')
      .select('id')
      .eq('patient_id', patientId)
      .maybeSingle();

    const now = new Date().toISOString();

    // Check if anamnese already exists
    const { data: existing } = await getSupabaseAdmin()
      .from('anamneses')
      .select('id')
      .eq('patient_id', patientId)
      .maybeSingle();

    let anamneseId;

    if (existing) {
      // Update existing
      const { data, error } = await getSupabaseAdmin()
        .from('anamneses')
        .update({
          data: sections,
          completed: true,
          completed_at: now,
          updated_at: now,
        })
        .eq('id', existing.id)
        .select('id')
        .single();

      if (error) {
        throw error;
      }
      anamneseId = data.id;
    } else {
      // Create new
      const { data, error } = await getSupabaseAdmin()
        .from('anamneses')
        .insert({
          patient_id: patientId,
          case_file_id: caseFile?.id,
          data: sections,
          completed: true,
          completed_at: now,
        })
        .select('id')
        .single();

      if (error) {
        throw error;
      }
      anamneseId = data.id;
    }

    // Also update the legacy anamneses fields if they exist
    // This ensures compatibility with the web platform
    if (sections.section3) {
      await getSupabaseAdmin()
        .from('anamneses')
        .update({
          motif: sections.section3.motifConsultation,
          objectifs: sections.section3.objectifsAmelioration,
        })
        .eq('id', anamneseId);
    }

    return NextResponse.json({
      anamneseId,
      completedAt: now,
    });
  } catch (error) {
    console.error('Error saving anamnese:', error);
    return NextResponse.json(
      { message: 'Erreur lors de la sauvegarde de l\'anamnèse' },
      { status: 500 }
    );
  }
}
