/**
 * @deprecated This route reads from the `conseils` table which is no longer
 * populated by the web dashboard. Conseils are now part of the conseillancier
 * (consultant_plans.content). Use GET /api/mobile/plans instead.
 *
 * GET /api/mobile/conseils
 * Get consultant's conseils from naturopathe (legacy)
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

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    // Get case file
    const { data: caseFile } = await getSupabaseAdmin()
      .from('case_files')
      .select('id')
      .eq('consultant_id', consultantId)
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
