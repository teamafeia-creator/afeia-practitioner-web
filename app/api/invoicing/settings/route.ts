import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/server/supabaseAdmin';
import { verifyApiJwt, getBearerToken } from '@/lib/auth';
import { billingSettingsSchema } from '@/lib/invoicing/schemas';

export async function GET(request: NextRequest) {
  try {
    const token = getBearerToken(request.headers.get('authorization'));
    if (!token) {
      return NextResponse.json({ message: 'Non authentifie' }, { status: 401 });
    }

    const payload = await verifyApiJwt(token);
    const userId = payload.sub;

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
    const token = getBearerToken(request.headers.get('authorization'));
    if (!token) {
      return NextResponse.json({ message: 'Non authentifie' }, { status: 401 });
    }

    const payload = await verifyApiJwt(token);
    const userId = payload.sub;

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
    console.error('Erreur sauvegarde parametres:', error);
    return NextResponse.json(
      { message: 'Erreur lors de la sauvegarde des parametres' },
      { status: 500 }
    );
  }
}
