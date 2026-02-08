import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, createSupabaseAuthClient } from '@/lib/server/supabaseAdmin';

/**
 * GET /api/blocks/[blockId]
 * Get a single block by ID.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ blockId: string }> }
) {
  try {
    const { blockId } = await params;
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

    const { data: block, error } = await supabase
      .from('blocks')
      .select('*')
      .eq('id', blockId)
      .or(`source.eq.afeia_base,owner_id.eq.${practitionerId}`)
      .single();

    if (error || !block) {
      return NextResponse.json({ error: 'Bloc non trouvé.' }, { status: 404 });
    }

    return NextResponse.json({ block });
  } catch (err) {
    console.error('Exception GET /api/blocks/[blockId]:', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

/**
 * PUT /api/blocks/[blockId]
 * Update a block (only personal blocks, not afeia_base).
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ blockId: string }> }
) {
  try {
    const { blockId } = await params;
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

    // Check ownership and source
    const { data: existing, error: fetchError } = await supabase
      .from('blocks')
      .select('id, owner_id, source')
      .eq('id', blockId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Bloc non trouvé.' }, { status: 404 });
    }

    if (existing.source === 'afeia_base') {
      return NextResponse.json(
        { error: 'Les blocs AFEIA de base ne sont pas modifiables.' },
        { status: 403 }
      );
    }

    if (existing.owner_id !== practitionerId) {
      return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
    }

    const body = await request.json();
    const allowedFields = ['title', 'content', 'section', 'motifs', 'tags', 'ai_keywords'];
    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (updateData.title && typeof updateData.title === 'string' && updateData.title.length > 120) {
      return NextResponse.json(
        { error: 'Le titre ne doit pas dépasser 120 caractères.' },
        { status: 400 }
      );
    }

    const { data: block, error: updateError } = await supabase
      .from('blocks')
      .update(updateData)
      .eq('id', blockId)
      .select()
      .single();

    if (updateError) {
      console.error('Erreur mise à jour bloc:', updateError);
      return NextResponse.json({ error: 'Erreur lors de la mise à jour.' }, { status: 500 });
    }

    return NextResponse.json({ block });
  } catch (err) {
    console.error('Exception PUT /api/blocks/[blockId]:', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

/**
 * DELETE /api/blocks/[blockId]
 * Soft-delete a block (set is_archived = true).
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ blockId: string }> }
) {
  try {
    const { blockId } = await params;
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

    // Check ownership and source
    const { data: existing, error: fetchError } = await supabase
      .from('blocks')
      .select('id, owner_id, source')
      .eq('id', blockId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Bloc non trouvé.' }, { status: 404 });
    }

    if (existing.source === 'afeia_base') {
      return NextResponse.json(
        { error: 'Les blocs AFEIA de base ne peuvent pas être supprimés.' },
        { status: 403 }
      );
    }

    if (existing.owner_id !== practitionerId) {
      return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
    }

    const { error: deleteError } = await supabase
      .from('blocks')
      .update({ is_archived: true })
      .eq('id', blockId);

    if (deleteError) {
      console.error('Erreur suppression bloc:', deleteError);
      return NextResponse.json({ error: 'Erreur lors de la suppression.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Bloc supprimé.' });
  } catch (err) {
    console.error('Exception DELETE /api/blocks/[blockId]:', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
