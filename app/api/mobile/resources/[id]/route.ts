/**
 * GET /api/mobile/resources/[id]
 * Get full content of a resource assignment for the authenticated consultant
 * [id] is the resource_assignment id
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { resolveConsultantId } from '@/lib/mobile-auth';

export async function GET(
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
    const supabase = getSupabaseAdmin();

    // Verify assignment belongs to this consultant
    const { data: assignment, error: assignError } = await supabase
      .from('resource_assignments')
      .select(`
        id,
        resource_id,
        message,
        read_at,
        sent_at,
        resource:educational_resources(*)
      `)
      .eq('id', assignmentId)
      .eq('consultant_id', consultantId)
      .single();

    if (assignError || !assignment) {
      return NextResponse.json(
        { message: 'Fiche non trouvée' },
        { status: 404 }
      );
    }

    const resource = assignment.resource as any;
    if (!resource) {
      return NextResponse.json(
        { message: 'Ressource non trouvée' },
        { status: 404 }
      );
    }

    // Build response based on content type
    const result: any = {
      id: assignment.id,
      resource_id: resource.id,
      title: resource.title,
      summary: resource.summary,
      content_type: resource.content_type,
      category: resource.category,
      source: resource.source,
      read_time_minutes: resource.read_time_minutes,
      tags: resource.tags,
      message: assignment.message,
      read_at: assignment.read_at,
      sent_at: assignment.sent_at,
    };

    if (resource.content_type === 'article') {
      result.content_markdown = resource.content_markdown;
    } else if (resource.content_type === 'pdf' || resource.content_type === 'image') {
      if (resource.file_path) {
        const { data: signedUrlData } = await supabase.storage
          .from('educational-resources')
          .createSignedUrl(resource.file_path, 3600);
        result.file_url = signedUrlData?.signedUrl ?? null;
        result.file_name = resource.file_name;
      }
    } else if (resource.content_type === 'video_link') {
      result.video_url = resource.video_url;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error getting resource detail:', error);
    return NextResponse.json(
      { message: 'Erreur lors de la récupération de la fiche' },
      { status: 500 }
    );
  }
}
