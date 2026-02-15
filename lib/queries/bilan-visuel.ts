import { supabase } from '../supabase';
import type {
  JournalEntry,
  WearableSummary,
  ConsultantPlan,
  ResourceAssignment,
  CorrelationConfig,
} from '../types';

// ============================================
// BILAN VISUEL — Data aggregation
// ============================================

export type BilanData = {
  journalEntries: JournalEntry[];
  wearableSummaries: WearableSummary[];
  activePlan: ConsultantPlan | null;
  recentAssignments: ResourceAssignment[];
  consultantName: string;
  firstEntryDate: string | null;
};

export async function getConsultantBilanData(
  consultantId: string,
  periodDays: number = 30
): Promise<BilanData> {
  const since = new Date();
  since.setDate(since.getDate() - periodDays);
  const sinceStr = since.toISOString().split('T')[0];

  const [journalRes, wearableRes, planRes, assignmentsRes, consultantRes] = await Promise.all([
    supabase
      .from('journal_entries')
      .select('*')
      .eq('consultant_id', consultantId)
      .gte('date', sinceStr)
      .order('date', { ascending: true }),
    supabase
      .from('wearable_summaries')
      .select('*')
      .eq('consultant_id', consultantId)
      .gte('date', sinceStr)
      .order('date', { ascending: true }),
    supabase
      .from('consultant_plans')
      .select('*')
      .eq('consultant_id', consultantId)
      .eq('status', 'shared')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('resource_assignments')
      .select(`*, resource:educational_resources(*)`)
      .eq('consultant_id', consultantId)
      .gte('sent_at', since.toISOString())
      .order('sent_at', { ascending: false }),
    supabase
      .from('consultants')
      .select('name')
      .eq('id', consultantId)
      .single(),
  ]);

  // Get first ever entry date
  const { data: firstEntry } = await supabase
    .from('journal_entries')
    .select('date')
    .eq('consultant_id', consultantId)
    .order('date', { ascending: true })
    .limit(1)
    .maybeSingle();

  return {
    journalEntries: journalRes.data ?? [],
    wearableSummaries: wearableRes.data ?? [],
    activePlan: planRes.data ?? null,
    recentAssignments: (assignmentsRes.data ?? []).map((d: any) => ({
      ...d,
      resource: d.resource ?? undefined,
    })),
    consultantName: consultantRes.data?.name ?? 'Consultant',
    firstEntryDate: firstEntry?.date ?? null,
  };
}

// ============================================
// CORRELATION — Simple conditional mean comparison
// ============================================

type CorrelationResult = {
  meanWhenConditionMet: number;
  meanWhenConditionNotMet: number;
  daysConditionMet: number;
  totalDays: number;
};

type DayData = {
  date: string;
  sommeil?: number;
  energie?: number;
  humeur?: number;
  hrv?: number;
  activite?: number;
  observance?: number;
};

function getMoodNumeric(mood: string | undefined): number | undefined {
  if (mood === '🙂') return 8;
  if (mood === '😐') return 5;
  if (mood === '🙁') return 2;
  return undefined;
}

function getEnergyNumeric(energy: string | undefined): number | undefined {
  if (energy === 'Élevé') return 8;
  if (energy === 'Moyen') return 5;
  if (energy === 'Bas') return 2;
  return undefined;
}

export function mergeDayData(
  journalEntries: JournalEntry[],
  wearableSummaries: WearableSummary[]
): DayData[] {
  const byDate = new Map<string, DayData>();

  for (const entry of journalEntries) {
    const d = byDate.get(entry.date) ?? { date: entry.date };
    d.humeur = getMoodNumeric(entry.mood);
    d.energie = getEnergyNumeric(entry.energy);
    const adherenceCount = [
      entry.adherence_hydratation,
      entry.adherence_respiration,
      entry.adherence_mouvement,
      entry.adherence_plantes,
    ].filter(Boolean).length;
    d.observance = (adherenceCount / 4) * 10;
    byDate.set(entry.date, d);
  }

  for (const ws of wearableSummaries) {
    const d = byDate.get(ws.date) ?? { date: ws.date };
    d.sommeil = ws.sleep_duration ?? undefined;
    d.hrv = ws.hrv_avg ?? undefined;
    d.activite = ws.activity_level ?? undefined;
    byDate.set(ws.date, d);
  }

  return Array.from(byDate.values()).sort(
    (a, b) => a.date.localeCompare(b.date)
  );
}

export function calculateCorrelation(
  dayData: DayData[],
  config: CorrelationConfig
): CorrelationResult {
  const { variableA, conditionA, thresholdA, variableB } = config;

  const metDays: number[] = [];
  const notMetDays: number[] = [];

  for (const day of dayData) {
    const valA = day[variableA as keyof DayData] as number | undefined;
    const valB = day[variableB as keyof DayData] as number | undefined;
    if (valA === undefined || valB === undefined) continue;

    let conditionMet = false;
    if (conditionA === 'lt') conditionMet = valA < thresholdA;
    else if (conditionA === 'gt') conditionMet = valA > thresholdA;
    else if (conditionA === 'eq') conditionMet = Math.abs(valA - thresholdA) < 0.5;

    if (conditionMet) {
      metDays.push(valB);
    } else {
      notMetDays.push(valB);
    }
  }

  const mean = (arr: number[]) =>
    arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;

  return {
    meanWhenConditionMet: Math.round(mean(metDays) * 10) / 10,
    meanWhenConditionNotMet: Math.round(mean(notMetDays) * 10) / 10,
    daysConditionMet: metDays.length,
    totalDays: metDays.length + notMetDays.length,
  };
}

export function calculateTrend(
  currentPeriod: number[],
  previousPeriod: number[]
): { direction: 'up' | 'down' | 'stable'; variation: number } {
  const mean = (arr: number[]) =>
    arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;

  const current = mean(currentPeriod);
  const previous = mean(previousPeriod);

  if (previous === 0) {
    return { direction: 'stable', variation: 0 };
  }

  const variation = Math.round(((current - previous) / previous) * 100);

  if (Math.abs(variation) < 5) {
    return { direction: 'stable', variation };
  }
  return {
    direction: variation > 0 ? 'up' : 'down',
    variation,
  };
}
