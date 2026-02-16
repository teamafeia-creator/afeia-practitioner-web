import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, createSupabaseAuthClient } from '@/lib/server/supabaseAdmin';
import { checkIsAdmin } from '@/lib/admin/auth';

type AuthResult =
  | { authenticated: true; userId: string; email: string | null; isAdmin: boolean }
  | { authenticated: false };

/**
 * Authenticate from bearer token or cookie-based admin session.
 */
async function authenticateRequest(request: Request): Promise<AuthResult> {
  // 1. Try bearer token auth (practitioners + admin with Supabase session)
  const token = request.headers.get('authorization')?.replace('Bearer ', '').trim();
  if (token) {
    const supabaseAuth = createSupabaseAuthClient();
    const { data: authData, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !authData.user) {
      return { authenticated: false };
    }
    const email = authData.user.email ?? null;
    const isAdmin = email ? await checkIsAdmin(email) : false;
    return { authenticated: true, userId: authData.user.id, email, isAdmin };
  }

  // 2. Fall back to cookie-based admin auth
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const match = cookieHeader.match(/afeia_admin_email=([^;]+)/);
    if (match) {
      const cookieEmail = decodeURIComponent(match[1]);
      const isAdmin = await checkIsAdmin(cookieEmail);
      if (isAdmin) {
        return { authenticated: true, userId: '', email: cookieEmail, isAdmin: true };
      }
    }
  }

  return { authenticated: false };
}

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
 * Update a block. Personal blocks for practitioners, afeia_base blocks for admins.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ blockId: string }> }
) {
  try {
    const { blockId } = await params;
    const auth = await authenticateRequest(request);
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
    }

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
      if (!auth.isAdmin) {
        return NextResponse.json(
          { error: 'Les blocs AFEIA de base ne sont pas modifiables.' },
          { status: 403 }
        );
      }
    } else if (existing.owner_id !== auth.userId) {
      return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
    }

    const body = await request.json();
    const allowedFields = ['title', 'content', 'section', 'motifs', 'tags', 'ai_keywords', 'is_archived'];
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
    const auth = await authenticateRequest(request);
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
    }

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
      if (!auth.isAdmin) {
        return NextResponse.json(
          { error: 'Les blocs AFEIA de base ne peuvent pas être supprimés.' },
          { status: 403 }
        );
      }
    } else if (existing.owner_id !== auth.userId) {
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
