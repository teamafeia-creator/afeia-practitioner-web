import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, createSupabaseAuthClient } from '@/lib/server/supabaseAdmin';

/**
 * POST /api/blocks/insert
 * Record a block insertion and increment usage count.
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

    const supabase = createSupabaseAdminClient();
    const body = await request.json();
    const { plan_version_id, source_block_id, section, content_snapshot } = body;

    if (!section || !content_snapshot) {
      return NextResponse.json(
        { error: 'Section et contenu sont obligatoires.' },
        { status: 400 }
      );
    }

    // Record the insertion
    const { error: insertError } = await supabase
      .from('inserted_blocks')
      .insert({
        plan_version_id: plan_version_id ?? null,
        source_block_id: source_block_id ?? null,
        section,
        content_snapshot,
      });

    if (insertError) {
      console.error('Erreur insertion bloc:', insertError);
      return NextResponse.json({ error: 'Erreur lors de l\'enregistrement.' }, { status: 500 });
    }

    // Increment usage count on the source block
    if (source_block_id) {
      const { data: block } = await supabase
        .from('blocks')
        .select('usage_count')
        .eq('id', source_block_id)
        .single();

      if (block) {
        await supabase
          .from('blocks')
          .update({
            usage_count: (block.usage_count ?? 0) + 1,
            last_used_at: new Date().toISOString(),
          })
          .eq('id', source_block_id);
      }
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error('Exception POST /api/blocks/insert:', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
