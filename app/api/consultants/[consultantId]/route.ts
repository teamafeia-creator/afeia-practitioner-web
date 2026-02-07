import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, createSupabaseAuthClient } from '@/lib/server/supabaseAdmin';

/**
 * GET /api/consultants/[consultantId]
 * Récupérer les détails d'un consultant
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ consultantId: string }> }
) {
  try {
    const { consultantId } = await params;

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

    // 2. Récupérer le consultant
    const { data: consultant, error: consultantError } = await supabase
      .from('consultants')
      .select('*')
      .eq('id', consultantId)
      .eq('practitioner_id', practitionerId)
      .is('deleted_at', null)
      .single();

    if (consultantError || !consultant) {
      return NextResponse.json({ error: 'Consultant non trouvé.' }, { status: 404 });
    }

    return NextResponse.json({ consultant });
  } catch (err) {
    console.error('Exception GET consultant:', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

/**
 * DELETE /api/consultants/[consultantId]
 * Supprimer un consultant (soft delete)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ consultantId: string }> }
) {
  try {
    const { consultantId } = await params;

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

    // 2. Vérifier que le consultant appartient à ce praticien
    const { data: consultant, error: consultantError } = await supabase
      .from('consultants')
      .select('id, practitioner_id, name')
      .eq('id', consultantId)
      .single();

    if (consultantError || !consultant) {
      return NextResponse.json({ error: 'Consultant non trouvé.' }, { status: 404 });
    }

    if (consultant.practitioner_id !== practitionerId) {
      return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
    }

    // 3. Soft delete (marquer comme supprimé)
    const now = new Date().toISOString();
    const { error: deleteError } = await supabase
      .from('consultants')
      .update({ deleted_at: now })
      .eq('id', consultantId);

    if (deleteError) {
      console.error('Erreur suppression consultant:', deleteError);
      return NextResponse.json({ error: 'Erreur lors de la suppression.' }, { status: 500 });
    }

    console.log(`✅ Consultant ${consultant.name} (${consultantId}) supprimé par praticien ${practitionerId}`);

    return NextResponse.json({
      success: true,
      message: 'Consultant supprimé avec succès.',
      consultantId
    });
  } catch (err) {
    console.error('Exception DELETE consultant:', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

/**
 * PUT /api/consultants/[consultantId]
 * Modifier un consultant
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ consultantId: string }> }
) {
  try {
    const { consultantId } = await params;

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

    // 2. Vérifier le consultant
    const { data: consultant, error: consultantError } = await supabase
      .from('consultants')
      .select('id, practitioner_id')
      .eq('id', consultantId)
      .single();

    if (consultantError || !consultant || consultant.practitioner_id !== practitionerId) {
      return NextResponse.json({ error: 'Consultant non trouvé.' }, { status: 404 });
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
      .from('consultants')
      .update(updateData)
      .eq('id', consultantId);

    if (updateError) {
      console.error('Erreur mise à jour consultant:', updateError);
      return NextResponse.json({ error: 'Erreur lors de la mise à jour.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Consultant mis à jour.' });
  } catch (err) {
    console.error('Exception PUT consultant:', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
