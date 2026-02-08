import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createSupabaseAdminClient, createSupabaseAuthClient } from '@/lib/server/supabaseAdmin';
import { AI_CONFIG } from '@/lib/ai/config';
import { buildSystemPrompt } from '@/lib/ai/system-prompt';
import { buildConsultantContext, formatContextForPrompt } from '@/lib/ai/context-builder';
import { CONSEILLANCIER_SECTIONS } from '@/lib/conseillancier';
import type { PractitionerAIProfile } from '@/lib/types';

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }
  return new Anthropic({ apiKey });
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Authenticate
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

    // 2. Parse request
    const { consultantId, fieldKey } = await request.json();

    if (!consultantId || !fieldKey) {
      return NextResponse.json({ error: 'consultantId et fieldKey requis.' }, { status: 400 });
    }

    // Find the field in CONSEILLANCIER_SECTIONS
    let fieldLabel = fieldKey;
    let sectionTitle = '';
    for (const section of CONSEILLANCIER_SECTIONS) {
      for (const field of section.fields) {
        if (field.key === fieldKey) {
          fieldLabel = field.label;
          sectionTitle = section.title;
          break;
        }
      }
    }

    // 3. Verify access
    const { data: consultant } = await supabase
      .from('consultants')
      .select('id, practitioner_id')
      .eq('id', consultantId)
      .eq('practitioner_id', practitionerId)
      .single();

    if (!consultant) {
      return NextResponse.json({ error: 'Acces refuse.' }, { status: 404 });
    }

    // 4. Get AI profile
    const { data: aiProfile } = await supabase
      .from('practitioner_ai_profiles')
      .select('*')
      .eq('practitioner_id', practitionerId)
      .maybeSingle();

    // 5. Build context
    const context = await buildConsultantContext(supabase, consultantId);
    const contextText = formatContextForPrompt(context);

    // 6. Build prompt for single field
    const systemPrompt = buildSystemPrompt(aiProfile as PractitionerAIProfile | null);
    const userPrompt = `Redige UNIQUEMENT le champ "${fieldLabel}" (section "${sectionTitle}") du conseillancier pour ce consultant. Reponds avec un JSON contenant uniquement la cle "${fieldKey}" et sa valeur texte.\n\n${contextText}`;

    // 7. Call Anthropic API
    const anthropic = getAnthropicClient();

    const response = await anthropic.messages.create({
      model: AI_CONFIG.model,
      max_tokens: AI_CONFIG.limits.section.maxOutputTokens,
      temperature: AI_CONFIG.temperature,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const rawText = response.content[0].type === 'text' ? response.content[0].text : '';
    const latencyMs = Date.now() - startTime;

    let parsedResult: Record<string, string>;
    try {
      const cleanedText = rawText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      parsedResult = JSON.parse(cleanedText);
    } catch {
      return NextResponse.json(
        { error: 'Erreur de format. Reessayez.' },
        { status: 500 }
      );
    }

    const fieldText = parsedResult[fieldKey] || '';

    // 8. Log
    await supabase.from('ai_generation_logs').insert({
      practitioner_id: practitionerId,
      consultant_id: consultantId,
      generation_type: 'section',
      section_name: fieldKey,
      model: AI_CONFIG.model,
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      cost_usd:
        (response.usage.input_tokens * 1) / 1_000_000 +
        (response.usage.output_tokens * 5) / 1_000_000,
      latency_ms: latencyMs,
      status: 'success',
    });

    return NextResponse.json({
      success: true,
      fieldKey,
      text: fieldText,
      metadata: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
        latency_ms: latencyMs,
      },
    });
  } catch (error: unknown) {
    console.error('Section suggestion error:', error);
    return NextResponse.json({ error: 'Erreur de generation.' }, { status: 500 });
  }
}
