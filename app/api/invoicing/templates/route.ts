import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/server/supabaseAdmin';
import { verifyApiJwt, getBearerToken } from '@/lib/auth';
import { invoiceTemplateSchema } from '@/lib/invoicing/schemas';
import { DEFAULT_TEMPLATES } from '@/lib/invoicing/templates';

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
    const token = getBearerToken(request.headers.get('authorization'));
    if (!token) {
      return NextResponse.json({ message: 'Non authentifie' }, { status: 401 });
    }

    const payload = await verifyApiJwt(token);
    const userId = payload.sub;

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
    console.error('Erreur creation template:', error);
    return NextResponse.json(
      { message: 'Erreur lors de la creation du template' },
      { status: 500 }
    );
  }
}
