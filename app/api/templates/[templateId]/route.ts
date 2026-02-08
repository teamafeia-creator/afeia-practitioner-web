import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, createSupabaseAuthClient } from '@/lib/server/supabaseAdmin';

/**
 * GET /api/templates/[templateId]
 * Get a single template with its blocks resolved.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const { templateId } = await params;
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

    const { data: template, error } = await supabase
      .from('templates')
      .select('*')
      .eq('id', templateId)
      .or(`source.eq.afeia_base,owner_id.eq.${practitionerId}`)
      .single();

    if (error || !template) {
      return NextResponse.json({ error: 'Modèle non trouvé.' }, { status: 404 });
    }

    // Resolve blocks_mapping to actual block content
    const blockIds = Object.values(template.blocks_mapping as Record<string, string>).filter(Boolean);
    let resolvedBlocks: Record<string, unknown> = {};

    if (blockIds.length > 0) {
      const { data: blocks } = await supabase
        .from('blocks')
        .select('id, title, content, section')
        .in('id', blockIds);

      if (blocks) {
        const blockMap = new Map(blocks.map((b: { id: string; title: string; content: string; section: string }) => [b.id, b]));
        for (const [sectionKey, blockId] of Object.entries(template.blocks_mapping as Record<string, string>)) {
          const block = blockMap.get(blockId);
          if (block) {
            resolvedBlocks[sectionKey] = block;
          }
        }
      }
    }

    return NextResponse.json({ template, resolvedBlocks });
  } catch (err) {
    console.error('Exception GET /api/templates/[templateId]:', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

/**
 * PUT /api/templates/[templateId]
 * Update a template (only personal templates).
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const { templateId } = await params;
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

    const { data: existing, error: fetchError } = await supabase
      .from('templates')
      .select('id, owner_id, source')
      .eq('id', templateId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Modèle non trouvé.' }, { status: 404 });
    }

    if (existing.source === 'afeia_base') {
      return NextResponse.json(
        { error: 'Les modèles AFEIA de base ne sont pas modifiables.' },
        { status: 403 }
      );
    }

    if (existing.owner_id !== practitionerId) {
      return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
    }

    const body = await request.json();
    const allowedFields = ['title', 'description', 'primary_motif', 'secondary_motifs', 'blocks_mapping'];
    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const { data: template, error: updateError } = await supabase
      .from('templates')
      .update(updateData)
      .eq('id', templateId)
      .select()
      .single();

    if (updateError) {
      console.error('Erreur mise à jour modèle:', updateError);
      return NextResponse.json({ error: 'Erreur lors de la mise à jour.' }, { status: 500 });
    }

    return NextResponse.json({ template });
  } catch (err) {
    console.error('Exception PUT /api/templates/[templateId]:', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

/**
 * DELETE /api/templates/[templateId]
 * Soft-delete a template.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const { templateId } = await params;
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

    const { data: existing, error: fetchError } = await supabase
      .from('templates')
      .select('id, owner_id, source')
      .eq('id', templateId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Modèle non trouvé.' }, { status: 404 });
    }

    if (existing.source === 'afeia_base') {
      return NextResponse.json(
        { error: 'Les modèles AFEIA de base ne peuvent pas être supprimés.' },
        { status: 403 }
      );
    }

    if (existing.owner_id !== practitionerId) {
      return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
    }

    const { error: deleteError } = await supabase
      .from('templates')
      .update({ is_archived: true })
      .eq('id', templateId);

    if (deleteError) {
      console.error('Erreur suppression modèle:', deleteError);
      return NextResponse.json({ error: 'Erreur lors de la suppression.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Modèle supprimé.' });
  } catch (err) {
    console.error('Exception DELETE /api/templates/[templateId]:', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
