import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, createSupabaseAuthClient } from '@/lib/server/supabaseAdmin';

/**
 * API Route pour gerer les plans de soins d'un patient
 *
 * POST /api/patients/[patientId]/plans - Creer un nouveau plan
 * GET /api/patients/[patientId]/plans - Lister les plans du patient
 */

export async function POST(
  request: Request,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params;

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

    // 2. Verifier que le patient appartient a ce praticien
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id, practitioner_id')
      .eq('id', patientId)
      .single();

    if (patientError || !patient) {
      return NextResponse.json({ error: 'Patient non trouve.' }, { status: 404 });
    }

    if (patient.practitioner_id !== practitionerId) {
      return NextResponse.json({ error: 'Acces refuse.' }, { status: 403 });
    }

    // 3. Parser le body
    const body = await request.json();
    const { title, description, sections } = body;

    if (!title) {
      return NextResponse.json({ error: 'Le titre est requis.' }, { status: 400 });
    }

    // 4. Creer le plan dans patient_plans
    const { data: plan, error: createError } = await supabase
      .from('patient_plans')
      .insert({
        patient_id: patientId,
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
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params;

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

    // 2. Verifier que le patient appartient a ce praticien
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id, practitioner_id')
      .eq('id', patientId)
      .single();

    if (patientError || !patient) {
      return NextResponse.json({ error: 'Patient non trouve.' }, { status: 404 });
    }

    if (patient.practitioner_id !== practitionerId) {
      return NextResponse.json({ error: 'Acces refuse.' }, { status: 403 });
    }

    // 3. Recuperer les plans du patient
    const { data: plans, error: plansError } = await supabase
      .from('patient_plans')
      .select('*')
      .eq('patient_id', patientId)
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
