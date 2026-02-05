import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, createSupabaseAuthClient } from '@/lib/server/supabaseAdmin';

/**
 * GET /api/patients/[patientId]
 * Récupérer les détails d'un patient
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params;

    // 1. Authentification
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

    // 2. Récupérer le patient
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .eq('practitioner_id', practitionerId)
      .is('deleted_at', null)
      .single();

    if (patientError || !patient) {
      return NextResponse.json({ error: 'Patient non trouvé.' }, { status: 404 });
    }

    return NextResponse.json({ patient });
  } catch (err) {
    console.error('Exception GET patient:', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

/**
 * DELETE /api/patients/[patientId]
 * Supprimer un patient (soft delete)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params;

    // 1. Authentification
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

    // 2. Vérifier que le patient appartient à ce praticien
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id, practitioner_id, name')
      .eq('id', patientId)
      .single();

    if (patientError || !patient) {
      return NextResponse.json({ error: 'Patient non trouvé.' }, { status: 404 });
    }

    if (patient.practitioner_id !== practitionerId) {
      return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
    }

    // 3. Soft delete (marquer comme supprimé)
    const now = new Date().toISOString();
    const { error: deleteError } = await supabase
      .from('patients')
      .update({ deleted_at: now })
      .eq('id', patientId);

    if (deleteError) {
      console.error('Erreur suppression patient:', deleteError);
      return NextResponse.json({ error: 'Erreur lors de la suppression.' }, { status: 500 });
    }

    console.log(`✅ Patient ${patient.name} (${patientId}) supprimé par praticien ${practitionerId}`);

    return NextResponse.json({
      success: true,
      message: 'Patient supprimé avec succès.',
      patientId
    });
  } catch (err) {
    console.error('Exception DELETE patient:', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

/**
 * PUT /api/patients/[patientId]
 * Modifier un patient
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params;

    // 1. Authentification
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

    // 2. Vérifier le patient
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id, practitioner_id')
      .eq('id', patientId)
      .single();

    if (patientError || !patient || patient.practitioner_id !== practitionerId) {
      return NextResponse.json({ error: 'Patient non trouvé.' }, { status: 404 });
    }

    // 3. Mettre à jour
    const body = await request.json();

    // Filtrer les champs autorisés pour éviter les injections
    const allowedFields = ['name', 'email', 'phone', 'age', 'city', 'consultation_reason', 'status', 'is_premium'];
    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }
    updateData.updated_at = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('patients')
      .update(updateData)
      .eq('id', patientId);

    if (updateError) {
      console.error('Erreur mise à jour patient:', updateError);
      return NextResponse.json({ error: 'Erreur lors de la mise à jour.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Patient mis à jour.' });
  } catch (err) {
    console.error('Exception PUT patient:', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
