import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, createSupabaseAuthClient } from '@/lib/server/supabaseAdmin';

/**
 * POST /api/blocks/[blockId]/favorite
 * Toggle the favorite status of a block.
 * Works for both afeia_base and personal blocks.
 */
export async function POST(
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

    // Fetch current block
    const { data: block, error: fetchError } = await supabase
      .from('blocks')
      .select('id, is_favorite, source, owner_id')
      .eq('id', blockId)
      .or(`source.eq.afeia_base,owner_id.eq.${practitionerId}`)
      .single();

    if (fetchError || !block) {
      return NextResponse.json({ error: 'Bloc non trouvé.' }, { status: 404 });
    }

    const { data: updated, error: updateError } = await supabase
      .from('blocks')
      .update({ is_favorite: !block.is_favorite })
      .eq('id', blockId)
      .select('id, is_favorite')
      .single();

    if (updateError) {
      console.error('Erreur toggle favori:', updateError);
      return NextResponse.json({ error: 'Erreur lors de la mise à jour.' }, { status: 500 });
    }

    return NextResponse.json({ block: updated });
  } catch (err) {
    console.error('Exception POST /api/blocks/[blockId]/favorite:', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
