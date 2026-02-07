import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, createSupabaseAuthClient } from '@/lib/server/supabaseAdmin';

/**
 * API Route pour gerer les plans de soins d'un consultant
 *
 * POST /api/consultants/[consultantId]/plans - Creer un nouveau plan
 * GET /api/consultants/[consultantId]/plans - Lister les plans du consultant
 */

export async function POST(
  request: Request,
  { params }: { params: Promise<{ consultantId: string }> }
) {
  try {
    const { consultantId } = await params;

    // 1. Verifier l'authentification
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

    // 2. Verifier que le consultant appartient a ce praticien
    const { data: consultant, error: consultantError } = await supabase
      .from('consultants')
      .select('id, practitioner_id')
      .eq('id', consultantId)
      .single();

    if (consultantError || !consultant) {
      return NextResponse.json({ error: 'Consultant non trouve.' }, { status: 404 });
    }

    if (consultant.practitioner_id !== practitionerId) {
      return NextResponse.json({ error: 'Acces refuse.' }, { status: 403 });
    }

    // 3. Parser le body
    const body = await request.json();
    const { title, description, sections } = body;

    if (!title) {
      return NextResponse.json({ error: 'Le titre est requis.' }, { status: 400 });
    }

    // 4. Creer le plan dans consultant_plans
    const { data: plan, error: createError } = await supabase
      .from('consultant_plans')
      .insert({
        consultant_id: consultantId,
        practitioner_id: practitionerId,
        title,
        description: description || null,
        sections: sections || [],
        status: 'active',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error('Erreur creation plan:', createError);
      return NextResponse.json({ error: 'Erreur lors de la creation du plan.' }, { status: 500 });
    }

    return NextResponse.json(plan, { status: 201 });
  } catch (err) {
    console.error('Exception plans POST:', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ consultantId: string }> }
) {
  try {
    const { consultantId } = await params;

    // 1. Verifier l'authentification
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

    // 2. Verifier que le consultant appartient a ce praticien
    const { data: consultant, error: consultantError } = await supabase
      .from('consultants')
      .select('id, practitioner_id')
      .eq('id', consultantId)
      .single();

    if (consultantError || !consultant) {
      return NextResponse.json({ error: 'Consultant non trouve.' }, { status: 404 });
    }

    if (consultant.practitioner_id !== practitionerId) {
      return NextResponse.json({ error: 'Acces refuse.' }, { status: 403 });
    }

    // 3. Recuperer les plans du consultant
    const { data: plans, error: plansError } = await supabase
      .from('consultant_plans')
      .select('*')
      .eq('consultant_id', consultantId)
      .order('created_at', { ascending: false });

    if (plansError) {
      console.error('Erreur recuperation plans:', plansError);
      return NextResponse.json({ error: 'Erreur lors de la recuperation des plans.' }, { status: 500 });
    }

    return NextResponse.json({ plans: plans || [] });
  } catch (err) {
    console.error('Exception plans GET:', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
