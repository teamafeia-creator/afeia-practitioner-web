import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminAuth } from '@/lib/admin/auth';
import { slugify } from '@/lib/queries/resources';

const VALID_CATEGORIES = new Set([
  'alimentation', 'hydratation', 'phytotherapie', 'aromatherapie',
  'respiration', 'activite_physique', 'sommeil', 'gestion_stress',
  'detox', 'digestion', 'immunite', 'peau', 'feminin', 'general',
]);

export async function GET(request: NextRequest) {
  const guard = await requireAdminAuth(request);
  if ('response' in guard) {
    return guard.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category')?.trim() ?? '';
    const search = searchParams.get('search')?.trim() ?? '';

    const supabase = createAdminClient();

    let query = supabase
      .from('educational_resources')
      .select('*', { count: 'exact' })
      .eq('source', 'afeia')
      .order('created_at', { ascending: false });

    if (category && VALID_CATEGORIES.has(category)) {
      query = query.eq('category', category);
    }

    if (search) {
      const sanitized = search.replace(/[%_]/g, '');
      if (sanitized) {
        const term = `%${sanitized}%`;
        query = query.or(`title.ilike.${term},summary.ilike.${term}`);
      }
    }

    const { data, count, error } = await query;

    if (error) {
      console.error('Erreur liste fiches AFEIA:', error);
      return NextResponse.json({ error: 'Erreur lors de la recuperation des fiches.' }, { status: 500 });
    }

    return NextResponse.json({ fiches: data ?? [], total: count ?? 0 });
  } catch (err) {
    console.error('Exception GET fiches:', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const guard = await requireAdminAuth(request);
  if ('response' in guard) {
    return guard.response;
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;

    const { title, summary, content_markdown, category, tags, is_published, read_time_minutes } = body as {
      title?: string;
      summary?: string;
      content_markdown?: string;
      category?: string;
      tags?: string[];
      is_published?: boolean;
      read_time_minutes?: number;
    };

    // Validation
    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Le titre est requis.' }, { status: 400 });
    }

    if (!content_markdown || typeof content_markdown !== 'string' || !content_markdown.trim()) {
      return NextResponse.json({ error: 'Le contenu markdown est requis.' }, { status: 400 });
    }

    if (!category || !VALID_CATEGORIES.has(category)) {
      return NextResponse.json({
        error: `La categorie est invalide. Valeurs autorisees : ${[...VALID_CATEGORIES].join(', ')}`,
      }, { status: 400 });
    }

    const slug = slugify(title);

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('educational_resources')
      .insert({
        practitioner_id: null,
        title: title.trim(),
        slug,
        summary: summary?.trim() ?? null,
        content_type: 'article',
        content_markdown: content_markdown.trim(),
        category,
        tags: tags ?? [],
        source: 'afeia',
        is_published: is_published ?? true,
        read_time_minutes: read_time_minutes ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur creation fiche AFEIA:', error);
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Une fiche avec ce slug existe deja.' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Erreur lors de la creation de la fiche.' }, { status: 500 });
    }

    return NextResponse.json({ fiche: data }, { status: 201 });
  } catch (err) {
    console.error('Exception POST fiches:', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
