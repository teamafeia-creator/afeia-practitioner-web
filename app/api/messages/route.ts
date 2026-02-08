import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, createSupabaseAuthClient } from '@/lib/server/supabaseAdmin';

/**
 * GET /api/messages
 * Retourne la liste des conversations du praticien connecte.
 * Pour chaque consultant ayant au moins 1 message : dernier message + nombre de non lus.
 */
export async function GET(request: Request) {
  try {
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

    // 2. Recuperer tous les consultants du praticien
    const { data: consultants, error: consultantsError } = await supabase
      .from('consultants')
      .select('id, name, email, phone')
      .eq('practitioner_id', practitionerId)
      .is('deleted_at', null)
      .order('name', { ascending: true });

    if (consultantsError) {
      console.error('Erreur recuperation consultants:', consultantsError);
      return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
    }

    if (!consultants || consultants.length === 0) {
      return NextResponse.json({ conversations: [] });
    }

    // 3. Pour chaque consultant, recuperer le dernier message et compter les non lus
    const conversations = [];

    for (const consultant of consultants) {
      const [lastMessageResult, unreadCountResult] = await Promise.all([
        supabase
          .from('messages')
          .select('id, text, sender, sent_at, read_at')
          .eq('consultant_id', consultant.id)
          .order('sent_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('consultant_id', consultant.id)
          .eq('sender', 'consultant')
          .is('read_at', null),
      ]);

      const lastMessage = lastMessageResult.data;
      const unreadCount = unreadCountResult.count ?? 0;

      // N'inclure que les consultants qui ont au moins 1 message
      if (lastMessage) {
        conversations.push({
          consultant_id: consultant.id,
          consultant_name: consultant.name,
          consultant_email: consultant.email || null,
          last_message: lastMessage,
          unread_count: unreadCount,
        });
      }
    }

    // 4. Trier par date du dernier message (plus recent en premier)
    conversations.sort((a, b) =>
      new Date(b.last_message.sent_at).getTime() - new Date(a.last_message.sent_at).getTime()
    );

    return NextResponse.json({ conversations });
  } catch (err) {
    console.error('Exception messages inbox GET:', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
