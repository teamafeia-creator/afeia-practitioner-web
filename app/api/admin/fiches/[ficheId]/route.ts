import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminAuth } from '@/lib/admin/auth';
import { slugify } from '@/lib/queries/resources';

const VALID_CATEGORIES = new Set([
  'alimentation', 'hydratation', 'phytotherapie', 'aromatherapie',
  'respiration', 'activite_physique', 'sommeil', 'gestion_stress',
  'detox', 'digestion', 'immunite', 'peau', 'feminin', 'general',
]);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ficheId: string }> }
) {
  const guard = await requireAdminAuth(request);
  if ('response' in guard) {
    return guard.response;
  }

  try {
    const { ficheId } = await params;
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('educational_resources')
      .select('*')
      .eq('id', ficheId)
      .eq('source', 'afeia')
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Fiche non trouvee.' }, { status: 404 });
    }

    return NextResponse.json({ fiche: data });
  } catch (err) {
    console.error('Exception GET fiche:', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ ficheId: string }> }
) {
  const guard = await requireAdminAuth(request);
  if ('response' in guard) {
    return guard.response;
  }

  try {
    const { ficheId } = await params;
    const body = (await request.json()) as Record<string, unknown>;

    const updateData: Record<string, unknown> = {};

    if (body.title !== undefined) {
      if (typeof body.title !== 'string' || !body.title.trim()) {
        return NextResponse.json({ error: 'Le titre ne peut pas etre vide.' }, { status: 400 });
      }
      updateData.title = (body.title as string).trim();
      updateData.slug = slugify(body.title as string);
    }

    if (body.summary !== undefined) {
      updateData.summary = body.summary;
    }

    if (body.content_markdown !== undefined) {
      if (typeof body.content_markdown !== 'string' || !body.content_markdown.trim()) {
        return NextResponse.json({ error: 'Le contenu markdown ne peut pas etre vide.' }, { status: 400 });
      }
      updateData.content_markdown = (body.content_markdown as string).trim();
    }

    if (body.category !== undefined) {
      if (!VALID_CATEGORIES.has(body.category as string)) {
        return NextResponse.json({
          error: `La categorie est invalide. Valeurs autorisees : ${[...VALID_CATEGORIES].join(', ')}`,
        }, { status: 400 });
      }
      updateData.category = body.category;
    }

    if (body.tags !== undefined) {
      updateData.tags = body.tags;
    }

    if (body.is_published !== undefined) {
      updateData.is_published = body.is_published;
    }

    if (body.read_time_minutes !== undefined) {
      updateData.read_time_minutes = body.read_time_minutes;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Aucun champ a mettre a jour.' }, { status: 400 });
    }

    updateData.updated_at = new Date().toISOString();

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('educational_resources')
      .update(updateData)
      .eq('id', ficheId)
      .eq('source', 'afeia')
      .select()
      .single();

    if (error) {
      console.error('Erreur update fiche AFEIA:', error);
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Une fiche avec ce slug existe deja.' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Erreur lors de la mise a jour.' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Fiche non trouvee.' }, { status: 404 });
    }

    return NextResponse.json({ fiche: data });
  } catch (err) {
    console.error('Exception PATCH fiche:', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ ficheId: string }> }
) {
  const guard = await requireAdminAuth(request);
  if ('response' in guard) {
    return guard.response;
  }

  try {
    const { ficheId } = await params;
    const supabase = createAdminClient();

    // Verify the fiche exists and is an AFEIA resource
    const { data: existing, error: fetchError } = await supabase
      .from('educational_resources')
      .select('id')
      .eq('id', ficheId)
      .eq('source', 'afeia')
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Fiche non trouvee.' }, { status: 404 });
    }

    const { error } = await supabase
      .from('educational_resources')
      .delete()
      .eq('id', ficheId)
      .eq('source', 'afeia');

    if (error) {
      console.error('Erreur suppression fiche AFEIA:', error);
      return NextResponse.json({ error: 'Erreur lors de la suppression.' }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error('Exception DELETE fiche:', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
