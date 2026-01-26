/**
 * GET/POST /api/mobile/messages
 * Get or send messages
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getBearerToken } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

async function getPatientFromToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = getBearerToken(authHeader);

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_SECRET)
    );
    return payload.patientId as string;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const patientId = await getPatientFromToken(request);

    if (!patientId) {
      return NextResponse.json(
        { message: 'Non autorisé' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Get messages
    const { data: messages, error, count } = await getSupabaseAdmin()
      .from('messages')
      .select('id, sender, text, sent_at, read_at', { count: 'exact' })
      .eq('patient_id', patientId)
      .order('sent_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    const formattedMessages = messages?.map((m) => ({
      id: m.id,
      senderId: patientId, // Simplified
      senderType: m.sender === 'praticien' ? 'praticien' : 'patient',
      content: m.text,
      read: !!m.read_at,
      readAt: m.read_at,
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
    const patientId = await getPatientFromToken(request);

    if (!patientId) {
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

    // Get case file to find recipient (practitioner)
    const { data: caseFile } = await getSupabaseAdmin()
      .from('case_files')
      .select('practitioner_id')
      .eq('patient_id', patientId)
      .maybeSingle();

    const now = new Date().toISOString();

    // Create message
    const { data: message, error } = await getSupabaseAdmin()
      .from('messages')
      .insert({
        patient_id: patientId,
        sender: 'patient',
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
        senderId: patientId,
        senderType: 'patient',
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
