import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, createSupabaseAuthClient } from '@/lib/server/supabaseAdmin';

/**
 * GET /api/patients/[patientId]/messages
 * Récupérer tous les messages d'une conversation praticien-patient
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

    // 2. Vérifier que le patient appartient à ce praticien
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id, practitioner_id')
      .eq('id', patientId)
      .single();

    if (patientError || !patient) {
      return NextResponse.json({ error: 'Patient non trouvé.' }, { status: 404 });
    }

    if (patient.practitioner_id !== practitionerId) {
      return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
    }

    // 3. Récupérer tous les messages de cette conversation
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('patient_id', patientId)
      .order('sent_at', { ascending: true });

    if (messagesError) {
      console.error('Erreur récupération messages:', messagesError);
      return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
    }

    // 4. Marquer les messages du patient comme lus
    await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('patient_id', patientId)
      .eq('sender', 'patient')
      .is('read_at', null);

    return NextResponse.json({ messages: messages || [] });
  } catch (err) {
    console.error('Exception messages GET:', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

/**
 * POST /api/patients/[patientId]/messages
 * Envoyer un message au patient
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
      .select('id, practitioner_id, name')
      .eq('id', patientId)
      .single();

    if (patientError || !patient) {
      return NextResponse.json({ error: 'Patient non trouvé.' }, { status: 404 });
    }

    if (patient.practitioner_id !== practitionerId) {
      return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
    }

    // 3. Parser le message
    const body = await request.json();
    const { text } = body;

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Le message ne peut pas être vide.' }, { status: 400 });
    }

    const now = new Date().toISOString();

    // 4. Créer le message
    const { data: message, error: createError } = await supabase
      .from('messages')
      .insert({
        patient_id: patientId,
        sender: 'praticien',
        sender_role: 'practitioner',
        text: text.trim(),
        body: text.trim(),
        sent_at: now,
        created_at: now,
        read_at: null
      })
      .select()
      .single();

    if (createError) {
      console.error('Erreur création message:', createError);
      return NextResponse.json({ error: "Erreur lors de l'envoi du message." }, { status: 500 });
    }

    // 5. Créer une notification pour le patient
    try {
      await supabase.from('notifications').insert({
        practitioner_id: practitionerId,
        patient_id: patientId,
        type: 'message',
        title: 'Nouveau message',
        description: 'Vous avez reçu un nouveau message de votre praticien.',
        level: 'info',
        read: false
      });
    } catch (notifError) {
      // Non bloquant si la notification échoue
      console.warn('Erreur création notification:', notifError);
    }

    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    console.error('Exception messages POST:', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
