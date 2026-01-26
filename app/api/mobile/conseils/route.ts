/**
 * GET /api/mobile/conseils
 * Get patient's conseils from naturopathe
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

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    // Get case file
    const { data: caseFile } = await getSupabaseAdmin()
      .from('case_files')
      .select('id')
      .eq('patient_id', patientId)
      .maybeSingle();

    if (!caseFile) {
      return NextResponse.json({ conseils: [] });
    }

    let query = getSupabaseAdmin()
      .from('conseils')
      .select('*')
      .eq('case_file_id', caseFile.id)
      .order('created_at', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    const { data: conseils, error } = await query;

    if (error) {
      throw error;
    }

    const formattedConseils = conseils?.map((c) => ({
      id: c.id,
      category: c.category,
      title: c.title,
      content: c.content,
      read: c.read || false,
      createdAt: c.created_at,
    })) || [];

    return NextResponse.json({ conseils: formattedConseils });
  } catch (error) {
    console.error('Error getting conseils:', error);
    return NextResponse.json(
      { message: 'Erreur lors de la récupération des conseils' },
      { status: 500 }
    );
  }
}
