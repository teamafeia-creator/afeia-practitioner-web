import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, createSupabaseAuthClient } from '@/lib/server/supabaseAdmin';

/**
 * POST /api/patients/[patientId]/messages/mark-read
 * Marquer tous les messages non lus du patient comme lus
 */
export async function POST(
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
      .select('id, practitioner_id')
      .eq('id', patientId)
      .single();

    if (patientError || !patient || patient.practitioner_id !== practitionerId) {
      return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
    }

    // 3. Marquer comme lus
    const { error: updateError } = await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('patient_id', patientId)
      .eq('sender', 'patient')
      .is('read_at', null);

    if (updateError) {
      console.error('Erreur marquage messages lus:', updateError);
      return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Exception mark-read:', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
