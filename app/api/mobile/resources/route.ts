/**
 * GET /api/mobile/resources
 * Get all resource assignments for the authenticated consultant
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

    const { data: assignments, error } = await getSupabaseAdmin()
      .from('resource_assignments')
      .select(`
        id,
        resource_id,
        message,
        read_at,
        sent_at,
        plan_section_key,
        resource:educational_resources(
          id,
          title,
          summary,
          content_type,
          category,
          source
        )
      `)
      .eq('consultant_id', consultantId)
      .order('sent_at', { ascending: false });

    if (error) {
      console.error('Error fetching resource assignments:', error);
      throw error;
    }

    const formatted = (assignments ?? []).map((a) => ({
      id: a.id,
      resource_id: a.resource_id,
      message: a.message,
      read_at: a.read_at,
      sent_at: a.sent_at,
      plan_section_key: a.plan_section_key,
      resource: a.resource ? {
        id: (a.resource as any).id,
        title: (a.resource as any).title,
        summary: (a.resource as any).summary,
        content_type: (a.resource as any).content_type,
        category: (a.resource as any).category,
        source: (a.resource as any).source,
      } : null,
    }));

    return NextResponse.json({
      resources: formatted,
      total: formatted.length,
    });
  } catch (error) {
    console.error('Error getting resources:', error);
    return NextResponse.json(
      { message: 'Erreur lors de la récupération des fiches' },
      { status: 500 }
    );
  }
}
