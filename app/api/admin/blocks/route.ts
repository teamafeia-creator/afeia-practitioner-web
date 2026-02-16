import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminAuth } from '@/lib/admin/auth';
import type { BlockSection, ConsultationMotif } from '@/lib/blocks-types';

/**
 * GET /api/admin/blocks
 * List all blocks (all sources, including archived) with filters. Admin only.
 */
export async function GET(request: NextRequest) {
  const guard = await requireAdminAuth(request);
  if ('response' in guard) {
    return guard.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section')?.trim() as BlockSection | null;
    const motif = searchParams.get('motif')?.trim() as ConsultationMotif | null;
    const search = searchParams.get('search')?.trim() ?? '';
    const source = searchParams.get('source')?.trim() ?? '';
    const showArchived = searchParams.get('archived') === 'true';

    const supabase = createAdminClient();

    let query = supabase
      .from('blocks')
      .select('*', { count: 'exact' });

    if (!showArchived) {
      query = query.eq('is_archived', false);
    }

    if (section) {
      query = query.eq('section', section);
    }

    if (motif) {
      query = query.contains('motifs', [motif]);
    }

    if (source) {
      query = query.eq('source', source);
    }

    if (search) {
      const sanitized = search.replace(/[%_]/g, '');
      if (sanitized) {
        const term = `%${sanitized}%`;
        query = query.or(`title.ilike.${term},content.ilike.${term}`);
      }
    }

    query = query
      .order('created_at', { ascending: false });

    const { data, count, error } = await query;

    if (error) {
      console.error('Erreur liste blocs admin:', error);
      return NextResponse.json({ error: 'Erreur lors de la récupération des blocs.' }, { status: 500 });
    }

    return NextResponse.json({ blocks: data ?? [], total: count ?? 0 });
  } catch (err) {
    console.error('Exception GET /api/admin/blocks:', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

/**
 * POST /api/admin/blocks
 * Create a new afeia_base block. Admin only.
 */
export async function POST(request: NextRequest) {
  const guard = await requireAdminAuth(request);
  if ('response' in guard) {
    return guard.response;
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;

    const { title, content, section, motifs, tags, ai_keywords } = body as {
      title?: string;
      content?: string;
      section?: BlockSection;
      motifs?: ConsultationMotif[];
      tags?: string[];
      ai_keywords?: string[];
    };

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Le titre est requis.' }, { status: 400 });
    }

    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: 'Le contenu est requis.' }, { status: 400 });
    }

    if (!section) {
      return NextResponse.json({ error: 'La section est requise.' }, { status: 400 });
    }

    if (title.trim().length > 120) {
      return NextResponse.json(
        { error: 'Le titre ne doit pas dépasser 120 caractères.' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('blocks')
      .insert({
        title: title.trim(),
        content: content.trim(),
        section,
        motifs: motifs ?? [],
        tags: tags ?? [],
        ai_keywords: ai_keywords ?? [],
        source: 'afeia_base',
        owner_id: null,
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur création bloc AFEIA:', error);
      return NextResponse.json({ error: 'Erreur lors de la création du bloc.' }, { status: 500 });
    }

    return NextResponse.json({ block: data }, { status: 201 });
  } catch (err) {
    console.error('Exception POST /api/admin/blocks:', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
