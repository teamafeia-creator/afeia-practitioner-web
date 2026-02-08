import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createSupabaseAdminClient, createSupabaseAuthClient } from '@/lib/server/supabaseAdmin';
import { AI_CONFIG, CONSEILLANCIER_KEYS } from '@/lib/ai/config';
import { buildSystemPrompt } from '@/lib/ai/system-prompt';
import { buildConsultantContext, formatContextForPrompt } from '@/lib/ai/context-builder';
import { checkInputSafety, checkOutputSafety, sanitizeOutput } from '@/lib/ai/safety';
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
    const body = await request.json();
    const {
      consultantId,
      planId = null,
      generationType = 'full',
    } = body;

    if (!consultantId) {
      return NextResponse.json({ error: 'consultantId requis.' }, { status: 400 });
    }

    // 3. Verify practitioner owns this consultant
    const { data: consultant, error: consultantError } = await supabase
      .from('consultants')
      .select('id, practitioner_id, is_premium, status')
      .eq('id', consultantId)
      .single();

    if (consultantError || !consultant) {
      return NextResponse.json({ error: 'Consultant non trouve.' }, { status: 404 });
    }

    if (consultant.practitioner_id !== practitionerId) {
      return NextResponse.json({ error: 'Acces refuse.' }, { status: 403 });
    }

    // 4. Check AI quota
    let aiProfile: PractitionerAIProfile | null = null;
    const { data: profileData } = await supabase
      .from('practitioner_ai_profiles')
      .select('*')
      .eq('practitioner_id', practitionerId)
      .maybeSingle();

    aiProfile = profileData as PractitionerAIProfile | null;

    // Create profile if it doesn't exist
    if (!aiProfile) {
      const { data: newProfile } = await supabase
        .from('practitioner_ai_profiles')
        .insert({ practitioner_id: practitionerId })
        .select()
        .single();
      aiProfile = newProfile as PractitionerAIProfile | null;
    }

    const generationsThisMonth = aiProfile?.generations_this_month ?? 0;

    // Reset monthly counter if needed
    if (aiProfile?.month_reset_date) {
      const resetDate = new Date(aiProfile.month_reset_date);
      const now = new Date();
      if (now.getMonth() !== resetDate.getMonth() || now.getFullYear() !== resetDate.getFullYear()) {
        await supabase
          .from('practitioner_ai_profiles')
          .update({
            generations_this_month: 0,
            month_reset_date: now.toISOString().slice(0, 10),
          })
          .eq('practitioner_id', practitionerId);
      }
    }

    // Check quota (only 'full' consumes a credit)
    if (generationType === 'full') {
      const plan = consultant.is_premium ? 'premium' : 'standard';
      const quota = AI_CONFIG.quotas[plan as keyof typeof AI_CONFIG.quotas];
      if (quota !== -1 && generationsThisMonth >= quota) {
        return NextResponse.json(
          {
            error: 'Quota IA mensuel atteint.',
            quota_used: generationsThisMonth,
            quota_max: quota,
            plan,
          },
          { status: 429 }
        );
      }
    }

    // 5. Build consultant context
    const context = await buildConsultantContext(supabase, consultantId);
    const contextText = formatContextForPrompt(context);

    // 6. Pre-generation safety check
    const inputSafety = checkInputSafety(contextText);

    // 7. Build prompts
    const systemPrompt = buildSystemPrompt(aiProfile);

    let userPrompt = `Redige un conseillancier complet et personnalise pour ce consultant.\n\n${contextText}`;
    if (inputSafety.hasMedicalAlerts) {
      userPrompt += `\n\nATTENTION : Des signaux d'alerte medicaux ont ete detectes dans le bilan : ${inputSafety.alerts.join(', ')}. Tu DOIS inclure un avertissement de consultation medicale dans les sections concernees.`;
    }

    // 8. Call Anthropic API
    const anthropic = getAnthropicClient();
    const limits = AI_CONFIG.limits[generationType as keyof typeof AI_CONFIG.limits] || AI_CONFIG.limits.full;

    const response = await anthropic.messages.create({
      model: AI_CONFIG.model,
      max_tokens: limits.maxOutputTokens,
      temperature: AI_CONFIG.temperature,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const latencyMs = Date.now() - startTime;

    // 9. Parse response
    const rawText = response.content[0].type === 'text' ? response.content[0].text : '';

    let parsedContent: Record<string, string>;
    try {
      const cleanedText = rawText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      parsedContent = JSON.parse(cleanedText);
    } catch (parseError) {
      // Log the error
      await supabase.from('ai_generation_logs').insert({
        practitioner_id: practitionerId,
        consultant_id: consultantId,
        plan_id: planId,
        generation_type: generationType,
        section_name: null,
        model: AI_CONFIG.model,
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
        cost_usd: calculateCost(response.usage.input_tokens, response.usage.output_tokens),
        latency_ms: latencyMs,
        status: 'error',
        error_message: 'JSON parse error: ' + (parseError as Error).message,
      });

      return NextResponse.json(
        { error: 'Erreur de format dans la reponse IA. Veuillez reessayer.' },
        { status: 500 }
      );
    }

    // 10. Post-generation safety check
    const outputSafety = checkOutputSafety(JSON.stringify(parsedContent));
    const sanitizedContent = sanitizeOutput(parsedContent, outputSafety);

    // 11. Filter to only include known keys
    const filteredContent: Record<string, string> = {};
    for (const key of CONSEILLANCIER_KEYS) {
      if (sanitizedContent[key]) {
        filteredContent[key] = sanitizedContent[key];
      }
    }

    // 12. Save or update the plan
    let savedPlan = null;

    if (planId) {
      // Update existing plan
      const { data: existingPlan } = await supabase
        .from('consultant_plans')
        .select('content')
        .eq('id', planId)
        .eq('practitioner_id', practitionerId)
        .single();

      const mergedContent = {
        ...(existingPlan?.content as Record<string, string> || {}),
        ...filteredContent,
      };

      const { data } = await supabase
        .from('consultant_plans')
        .update({
          content: mergedContent,
          ai_generated: true,
          ai_model: AI_CONFIG.model,
          ai_generation_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', planId)
        .eq('practitioner_id', practitionerId)
        .select()
        .single();

      savedPlan = data;
    } else if (generationType === 'full') {
      // Get next version number
      const { data: existingPlans } = await supabase
        .from('consultant_plans')
        .select('version')
        .eq('consultant_id', consultantId)
        .order('version', { ascending: false })
        .limit(1);

      const nextVersion = existingPlans && existingPlans.length > 0
        ? (existingPlans[0].version || 0) + 1
        : 1;

      // Create new plan
      const { data } = await supabase
        .from('consultant_plans')
        .insert({
          consultant_id: consultantId,
          practitioner_id: practitionerId,
          version: nextVersion,
          status: 'draft',
          content: filteredContent,
          ai_generated: true,
          ai_model: AI_CONFIG.model,
          ai_generation_date: new Date().toISOString(),
        })
        .select()
        .single();

      savedPlan = data;

      // Increment generation counter
      await supabase
        .from('practitioner_ai_profiles')
        .update({
          generations_this_month: (generationsThisMonth || 0) + 1,
          total_generations: (aiProfile?.total_generations || 0) + 1,
        })
        .eq('practitioner_id', practitionerId);
    }

    // 13. Log the generation
    await supabase.from('ai_generation_logs').insert({
      practitioner_id: practitionerId,
      consultant_id: consultantId,
      plan_id: savedPlan?.id || planId,
      generation_type: generationType,
      section_name: null,
      model: AI_CONFIG.model,
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      cost_usd: calculateCost(response.usage.input_tokens, response.usage.output_tokens),
      latency_ms: latencyMs,
      status: 'success',
      error_message: null,
    });

    // 14. Return result
    return NextResponse.json({
      success: true,
      plan: savedPlan,
      content: filteredContent,
      metadata: {
        model: AI_CONFIG.model,
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
        latency_ms: latencyMs,
        medical_alerts: inputSafety.hasMedicalAlerts ? inputSafety.alerts : [],
        safety_warnings: {
          medications_detected: outputSafety.hasMedicationInOutput,
          diagnosis_language_detected: outputSafety.hasDiagnosisLanguage,
        },
      },
    });
  } catch (error: unknown) {
    console.error('AI generation error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: 'Erreur lors de la generation. Veuillez reessayer.',
        details: process.env.NODE_ENV === 'development' ? message : undefined,
      },
      { status: 500 }
    );
  }
}

function calculateCost(inputTokens: number, outputTokens: number): number {
  return (inputTokens * 1) / 1_000_000 + (outputTokens * 5) / 1_000_000;
}
