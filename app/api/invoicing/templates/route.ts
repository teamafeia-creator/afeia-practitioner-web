import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient, createSupabaseAuthClient } from '@/lib/server/supabaseAdmin';
import { invoiceTemplateSchema } from '@/lib/invoicing/schemas';
import { DEFAULT_TEMPLATES } from '@/lib/invoicing/templates';
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
      .from('invoice_templates')
      .select('*')
      .eq('practitioner_id', userId)
      .order('ordre', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ templates: data || [] });
  } catch (error) {
    console.error('Erreur liste templates:', error);
    return NextResponse.json(
      { message: 'Erreur lors de la recuperation des templates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const supabase = createSupabaseAdminClient();

    // Si c'est une demande d'initialisation des templates par defaut
    if (body.init_defaults) {
      const templates = DEFAULT_TEMPLATES.map((template) => ({
        ...template,
        practitioner_id: userId,
      }));

      const { error } = await supabase
        .from('invoice_templates')
        .upsert(templates, { onConflict: 'practitioner_id,id' });

      if (error) throw error;

      const { data } = await supabase
        .from('invoice_templates')
        .select('*')
        .eq('practitioner_id', userId)
        .order('ordre', { ascending: true });

      return NextResponse.json({ templates: data || [] }, { status: 201 });
    }

    const validatedData = invoiceTemplateSchema.parse(body);

    const { data: template, error } = await supabase
      .from('invoice_templates')
      .insert({
        ...validatedData,
        practitioner_id: userId,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      const messages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      console.error('Validation template:', messages);
      return NextResponse.json({ message: messages }, { status: 400 });
    }
    console.error('Erreur creation template:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { message: 'Erreur lors de la creation du template' },
      { status: 500 }
    );
  }
}
