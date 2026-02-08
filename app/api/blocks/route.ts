import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, createSupabaseAuthClient } from '@/lib/server/supabaseAdmin';

/**
 * GET /api/blocks
 * List blocks with search and filters.
 * Query params: section, motif, search, favorite, source
 */
export async function GET(request: Request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '').trim();
    if (!token) {
      return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
    }

    const supabaseAuth = createSupabaseAuthClient();
    const { data: authData, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Session invalide.' }, { status: 401 });
    }

    const practitionerId = authData.user.id;
    const supabase = createSupabaseAdminClient();

    const url = new URL(request.url);
    const section = url.searchParams.get('section');
    const motif = url.searchParams.get('motif');
    const search = url.searchParams.get('search');
    const favorite = url.searchParams.get('favorite');
    const source = url.searchParams.get('source');

    let query = supabase
      .from('blocks')
      .select('*')
      .eq('is_archived', false)
      .or(`source.eq.afeia_base,owner_id.eq.${practitionerId}`);

    if (section) {
      query = query.eq('section', section);
    }

    if (motif) {
      query = query.contains('motifs', [motif]);
    }

    if (source) {
      query = query.eq('source', source);
    }

    if (favorite === 'true') {
      query = query.eq('is_favorite', true);
    }

    if (search && search.trim()) {
      query = query.textSearch('title_content_search', search.trim(), {
        type: 'websearch',
        config: 'french',
      });
    }

    query = query
      .order('is_favorite', { ascending: false })
      .order('usage_count', { ascending: false })
      .order('created_at', { ascending: false });

    const { data: blocks, error } = await query;

    if (error) {
      // Fallback: if full-text search fails, try ilike on title
      if (search && search.trim()) {
        const fallbackQuery = supabase
          .from('blocks')
          .select('*')
          .eq('is_archived', false)
          .or(`source.eq.afeia_base,owner_id.eq.${practitionerId}`)
          .or(`title.ilike.%${search.trim()}%,content.ilike.%${search.trim()}%`);

        if (section) fallbackQuery.eq('section', section);
        if (motif) fallbackQuery.contains('motifs', [motif]);
        if (source) fallbackQuery.eq('source', source);
        if (favorite === 'true') fallbackQuery.eq('is_favorite', true);

        const { data: fallbackBlocks, error: fallbackError } = await fallbackQuery
          .order('is_favorite', { ascending: false })
          .order('usage_count', { ascending: false })
          .order('created_at', { ascending: false });

        if (fallbackError) {
          console.error('Erreur recherche blocs:', fallbackError);
          return NextResponse.json({ error: 'Erreur lors de la recherche.' }, { status: 500 });
        }
        return NextResponse.json({ blocks: fallbackBlocks ?? [] });
      }

      console.error('Erreur liste blocs:', error);
      return NextResponse.json({ error: 'Erreur lors du chargement des blocs.' }, { status: 500 });
    }

    return NextResponse.json({ blocks: blocks ?? [] });
  } catch (err) {
    console.error('Exception GET /api/blocks:', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

/**
 * POST /api/blocks
 * Create a new personal block.
 */
export async function POST(request: Request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '').trim();
    if (!token) {
      return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
    }

    const supabaseAuth = createSupabaseAuthClient();
    const { data: authData, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Session invalide.' }, { status: 401 });
    }

    const practitionerId = authData.user.id;
    const supabase = createSupabaseAdminClient();

    const body = await request.json();
    const { title, content, section, motifs, tags, ai_keywords } = body;

    if (!title || !content || !section) {
      return NextResponse.json(
        { error: 'Titre, contenu et section sont obligatoires.' },
        { status: 400 }
      );
    }

    if (title.length > 120) {
      return NextResponse.json(
        { error: 'Le titre ne doit pas dépasser 120 caractères.' },
        { status: 400 }
      );
    }

    const { data: block, error } = await supabase
      .from('blocks')
      .insert({
        title,
        content,
        section,
        motifs: motifs ?? [],
        tags: tags ?? [],
        ai_keywords: ai_keywords ?? [],
        source: 'praticien',
        owner_id: practitionerId,
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur création bloc:', error);
      return NextResponse.json({ error: 'Erreur lors de la création du bloc.' }, { status: 500 });
    }

    return NextResponse.json({ block }, { status: 201 });
  } catch (err) {
    console.error('Exception POST /api/blocks:', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
