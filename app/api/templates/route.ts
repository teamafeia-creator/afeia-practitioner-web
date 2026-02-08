import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, createSupabaseAuthClient } from '@/lib/server/supabaseAdmin';

/**
 * GET /api/templates
 * List templates (personal + afeia_base).
 * Query params: motif
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
    const motif = url.searchParams.get('motif');

    let query = supabase
      .from('templates')
      .select('*')
      .eq('is_archived', false)
      .or(`source.eq.afeia_base,owner_id.eq.${practitionerId}`)
      .order('usage_count', { ascending: false })
      .order('created_at', { ascending: false });

    if (motif) {
      query = query.eq('primary_motif', motif);
    }

    const { data: templates, error } = await query;

    if (error) {
      console.error('Erreur liste modèles:', error);
      return NextResponse.json({ error: 'Erreur lors du chargement des modèles.' }, { status: 500 });
    }

    return NextResponse.json({ templates: templates ?? [] });
  } catch (err) {
    console.error('Exception GET /api/templates:', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

/**
 * POST /api/templates
 * Create a new template.
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
    const { title, description, primary_motif, secondary_motifs, blocks_mapping } = body;

    if (!title || !primary_motif) {
      return NextResponse.json(
        { error: 'Titre et motif principal sont obligatoires.' },
        { status: 400 }
      );
    }

    if (title.length > 150) {
      return NextResponse.json(
        { error: 'Le titre ne doit pas dépasser 150 caractères.' },
        { status: 400 }
      );
    }

    const { data: template, error } = await supabase
      .from('templates')
      .insert({
        title,
        description: description ?? null,
        primary_motif,
        secondary_motifs: secondary_motifs ?? [],
        blocks_mapping: blocks_mapping ?? {},
        source: 'praticien',
        owner_id: practitionerId,
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur création modèle:', error);
      return NextResponse.json({ error: 'Erreur lors de la création du modèle.' }, { status: 500 });
    }

    return NextResponse.json({ template }, { status: 201 });
  } catch (err) {
    console.error('Exception POST /api/templates:', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
