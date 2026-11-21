// GET /api/consultant/wearables/overview — « Mes nuits » du consultant (web ou mobile, Bearer).
// Trois thèmes (sommeil, récupération, activité) : la dernière nuit, l'habituel du patient, un écart
// en mots simples, plus le dernier récap validé par le praticien. Jamais de score composite,
// jamais de point « à aborder » automatique : ce qui est destiné au praticien reste chez lui.
import { NextRequest, NextResponse } from 'next/server';
import { resolveConsultantId } from '@/lib/mobile-auth';
import { createSupabaseAdminClient } from '@/lib/server/supabaseAdmin';
import { loadInsightsInput } from '@/lib/wearables/insights/load';
import { computeInsights } from '@/lib/wearables/insights';
import { consultantCanUseWearables } from '@/lib/wearables/consents';
import { patientThemes, type PatientOverview } from '@/lib/wearables/patient-overview';

export const dynamic = 'force-dynamic';
const NO_STORE = { 'Cache-Control': 'no-store' };

export async function GET(request: NextRequest) {
  const consultantId = await resolveConsultantId(request);
  if (!consultantId) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401, headers: NO_STORE });
  if (!(await consultantCanUseWearables(consultantId))) return NextResponse.json({ enabled: false }, { headers: NO_STORE });

  const db = createSupabaseAdminClient();
  try {
    const [input, recap] = await Promise.all([
      loadInsightsInput(db, consultantId),
      db
        .from('wearable_recaps')
        .select('body, sent_at, period_from, period_to')
        .eq('consultant_id', consultantId)
        .eq('status', 'sent')
        .not('body', 'is', null)
        .order('sent_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    const insights = computeInsights(input);
    const r = recap.data as { body: string; sent_at: string; period_from: string; period_to: string } | null;
    const body: PatientOverview = {
      enabled: true,
      themes: patientThemes(insights),
      rhythm: insights.rhythm.medianStartLabel
        ? { bedtime: insights.rhythm.medianStartLabel, wake: insights.rhythm.medianEndLabel, regular: insights.rhythm.regular, known: insights.rhythm.known }
        : null,
      recap: r ? { text: r.body, sentAt: r.sent_at, from: r.period_from, to: r.period_to } : null,
      lastNightDay: insights.lastNight.status === 'ok' ? insights.lastNight.day : null,
    };
    return NextResponse.json(body, { headers: NO_STORE });
  } catch (e) {
    console.error('[consultant/wearables/overview]', { consultantId, message: (e as Error).message });
    return NextResponse.json({ error: 'Données indisponibles.' }, { status: 500, headers: NO_STORE });
  }
}
