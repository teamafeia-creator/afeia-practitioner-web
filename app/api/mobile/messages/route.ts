/**
 * GET/POST /api/mobile/messages
 * Get or send messages
 *
 * GET returns messages in chronological order (ascending) and
 * automatically marks unread practitioner messages as read.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { resolveConsultantId } from '@/lib/mobile-auth';

export async function GET(request: NextRequest) {
  try {
    const consultantId = await resolveConsultantId(request);

    if (!consultantId) {
      return NextResponse.json(
        { message: 'Non autorisé' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    const supabase = getSupabaseAdmin();

    // Get messages in chronological order (ascending)
    const { data: messages, error, count } = await supabase
      .from('messages')
      .select('id, sender, text, sent_at, read_at', { count: 'exact' })
      .eq('consultant_id', consultantId)
      .order('sent_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    // Mark unread practitioner messages as read
    const unreadPracticienIds = messages
      ?.filter((m) => m.sender === 'praticien' && !m.read_at)
      .map((m) => m.id) || [];

    if (unreadPracticienIds.length > 0) {
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .in('id', unreadPracticienIds);
    }

    const now = new Date().toISOString();
    const formattedMessages = messages?.map((m) => ({
      id: m.id,
      senderId: consultantId,
      senderType: m.sender === 'praticien' ? 'praticien' : 'consultant',
      content: m.text,
      read: !!m.read_at || unreadPracticienIds.includes(m.id),
      readAt: m.read_at || (unreadPracticienIds.includes(m.id) ? now : null),
      createdAt: m.sent_at,
    })) || [];

    return NextResponse.json({
      data: formattedMessages,
      total: count || 0,
      page,
      limit,
      hasMore: (count || 0) > offset + limit,
    });
  } catch (error) {
    console.error('Error getting messages:', error);
    return NextResponse.json(
      { message: 'Erreur lors de la récupération des messages' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const consultantId = await resolveConsultantId(request);

    if (!consultantId) {
      return NextResponse.json(
        { message: 'Non autorisé' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { content } = body;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { message: 'Le message ne peut pas être vide' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // Create message
    const { data: message, error } = await getSupabaseAdmin()
      .from('messages')
      .insert({
        consultant_id: consultantId,
        sender: 'consultant',
        text: content.trim(),
        sent_at: now,
      })
      .select('id, sender, text, sent_at')
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      message: {
        id: message.id,
        senderId: consultantId,
        senderType: 'consultant',
        content: message.text,
        read: false,
        createdAt: message.sent_at,
      },
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { message: 'Erreur lors de l\'envoi du message' },
      { status: 500 }
    );
  }
}
