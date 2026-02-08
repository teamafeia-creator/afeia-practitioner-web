import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient, createSupabaseAuthClient } from '@/lib/server/supabaseAdmin';
import { reminderSettingsSchema } from '@/lib/invoicing/schemas';
import { ZodError } from 'zod';

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
    const validatedData = reminderSettingsSchema.parse(body);

    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from('practitioner_billing_settings')
      .update(validatedData)
      .eq('practitioner_id', userId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ settings: data });
  } catch (error) {
    if (error instanceof ZodError) {
      const messages = error.errors.map((e) => e.message).join(', ');
      return NextResponse.json({ message: messages }, { status: 400 });
    }
    console.error('Erreur sauvegarde parametres relances:', error);
    return NextResponse.json(
      { message: 'Erreur lors de la sauvegarde des parametres de relance' },
      { status: 500 }
    );
  }
}
