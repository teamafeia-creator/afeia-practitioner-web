import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient, createSupabaseAuthClient } from '@/lib/server/supabaseAdmin';
import { billingSettingsSchema } from '@/lib/invoicing/schemas';
import { ZodError } from 'zod';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '').trim();
    if (!token) {
      return NextResponse.json({ message: 'Non authentifie' }, { status: 401 });
    }

    const supabaseAuth = createSupabaseAuthClient();
    const { data: authData, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !authData.user) {
      return NextResponse.json({ message: 'Session invalide' }, { status: 401 });
    }
    const userId = authData.user.id;

    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from('practitioner_billing_settings')
      .select('*')
      .eq('practitioner_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return NextResponse.json({ settings: data || null });
  } catch (error) {
    console.error('Erreur recuperation parametres:', error);
    return NextResponse.json(
      { message: 'Erreur lors de la recuperation des parametres' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '').trim();
    if (!token) {
      return NextResponse.json({ message: 'Non authentifie' }, { status: 401 });
    }

    const supabaseAuth = createSupabaseAuthClient();
    const { data: authData, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !authData.user) {
      return NextResponse.json({ message: 'Session invalide' }, { status: 401 });
    }
    const userId = authData.user.id;

    const body = await request.json();
    const validatedData = billingSettingsSchema.parse(body);

    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from('practitioner_billing_settings')
      .upsert(
        {
          practitioner_id: userId,
          ...validatedData,
        },
        { onConflict: 'practitioner_id' }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ settings: data });
  } catch (error) {
    if (error instanceof ZodError) {
      const messages = error.errors.map((e) => e.message).join(', ');
      return NextResponse.json({ message: messages }, { status: 400 });
    }
    console.error('Erreur sauvegarde parametres:', error);
    return NextResponse.json(
      { message: 'Erreur lors de la sauvegarde des parametres' },
      { status: 500 }
    );
  }
}
