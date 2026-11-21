// Question du matin : « Comment avez-vous dormi ? » (+ cause probable si mauvaise nuit).
// GET  → réponse du jour (ou null). POST { feeling, causes?: string[], date? } → fusionne dans
// l'entrée de journal du jour sans écraser les autres champs (humeur, énergie, notes…).
// Authentification : Bearer (web consultant ou mobile).
import { NextRequest, NextResponse } from 'next/server';
import { resolveConsultantId } from '@/lib/mobile-auth';
import { createSupabaseAdminClient } from '@/lib/server/supabaseAdmin';
import { parisDay } from '@/lib/wearables/insights/series';
import { feelingToQuality, isSleepCause, isSleepFeeling, qualityToFeeling, type SleepCause } from '@/lib/journal/sleep-feeling';

export const dynamic = 'force-dynamic';
const NO_STORE = { 'Cache-Control': 'no-store' };

type Row = { id: string; sleep_quality: number | null; custom_indicators: unknown };

function readCauses(ci: unknown): SleepCause[] {
  const raw = ci && typeof ci === 'object' && !Array.isArray(ci) ? (ci as Record<string, unknown>).sleep_causes : null;
  return Array.isArray(raw) ? raw.filter(isSleepCause) : [];
}

export async function GET(request: NextRequest) {
  const consultantId = await resolveConsultantId(request);
  if (!consultantId) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401, headers: NO_STORE });
  const date = request.nextUrl.searchParams.get('date') ?? parisDay(new Date());
  const { data, error } = await createSupabaseAdminClient()
    .from('journal_entries')
    .select('id, sleep_quality, custom_indicators')
    .eq('consultant_id', consultantId)
    .eq('date', date)
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'Lecture impossible.' }, { status: 500, headers: NO_STORE });
  const row = data as Row | null;
  return NextResponse.json(
    { date, feeling: qualityToFeeling(row?.sleep_quality), causes: readCauses(row?.custom_indicators), answered: row?.sleep_quality != null },
    { headers: NO_STORE }
  );
}

export async function POST(request: NextRequest) {
  const consultantId = await resolveConsultantId(request);
  if (!consultantId) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401, headers: NO_STORE });

  let body: { feeling?: unknown; causes?: unknown; date?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    /* corps vide */
  }
  if (!isSleepFeeling(body.feeling)) return NextResponse.json({ error: 'Réponse invalide.' }, { status: 400, headers: NO_STORE });
  const causes = Array.isArray(body.causes) ? body.causes.filter(isSleepCause).slice(0, 5) : [];
  const date = typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : parisDay(new Date());

  const db = createSupabaseAdminClient();
  const { data: existing } = await db
    .from('journal_entries')
    .select('id, sleep_quality, custom_indicators')
    .eq('consultant_id', consultantId)
    .eq('date', date)
    .maybeSingle();

  const prev = (existing as Row | null)?.custom_indicators;
  const prevObj = prev && typeof prev === 'object' && !Array.isArray(prev) ? (prev as Record<string, unknown>) : {};
  const customIndicators = { ...prevObj, sleep_causes: causes, sleep_feeling_at: new Date().toISOString() };

  const { data: consultant } = await db.from('consultants').select('practitioner_id').eq('id', consultantId).maybeSingle();

  const { error } = await db.from('journal_entries').upsert(
    {
      consultant_id: consultantId,
      practitioner_id: (consultant as { practitioner_id?: string } | null)?.practitioner_id ?? null,
      date,
      sleep_quality: feelingToQuality(body.feeling),
      custom_indicators: customIndicators,
      source: existing ? undefined : 'consultant',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'consultant_id,date' }
  );
  if (error) {
    console.error('[journal/sleep-feeling] écriture impossible', { consultantId, code: error.code });
    return NextResponse.json({ error: 'Enregistrement impossible.' }, { status: 500, headers: NO_STORE });
  }
  return NextResponse.json({ ok: true, date, feeling: body.feeling, causes }, { headers: NO_STORE });
}
