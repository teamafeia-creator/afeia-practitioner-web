'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PresentationSlide } from '@/components/consultation/PresentationSlide';
import { PresentationNav } from '@/components/consultation/PresentationNav';
import { LineChartFull } from '@/components/charts/LineChartFull';
import { BarChartFull } from '@/components/charts/BarChartFull';
import { CorrelationChart } from '@/components/charts/CorrelationChart';
import {
  getConsultantBilanData,
  mergeDayData,
  calculateCorrelation,
  calculateTrend,
  type BilanData,
} from '@/lib/queries/bilan-visuel';
import type { CorrelationConfig, CorrelationVariable } from '@/lib/types';
import { TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight } from 'lucide-react';

// ============================================
// Utility functions
// ============================================

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

function TrendIcon({ direction }: { direction: 'up' | 'down' | 'stable' }) {
  if (direction === 'up') return <ArrowUpRight className="h-4 w-4 text-green-600" />;
  if (direction === 'down') return <ArrowDownRight className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-warmgray" />;
}

function SummaryCard({
  label,
  value,
  unit,
  emoji,
  trend,
}: {
  label: string;
  value: string;
  unit?: string;
  emoji?: string;
  trend?: { direction: 'up' | 'down' | 'stable'; variation: number };
}) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm border border-divider flex-1 min-w-[140px]">
      {emoji && <div className="text-2xl mb-1">{emoji}</div>}
      <p className="text-xs text-warmgray font-medium uppercase tracking-wider">{label}</p>
      <div className="flex items-end gap-2 mt-1">
        <span className="text-2xl font-semibold text-charcoal">{value}</span>
        {unit && <span className="text-sm text-warmgray mb-0.5">{unit}</span>}
      </div>
      {trend && (
        <div className="flex items-center gap-1 mt-1">
          <TrendIcon direction={trend.direction} />
          <span className={`text-xs ${
            trend.direction === 'up' ? 'text-green-600' : trend.direction === 'down' ? 'text-red-500' : 'text-warmgray'
          }`}>
            {trend.variation > 0 ? '+' : ''}{trend.variation}%
          </span>
        </div>
      )}
    </div>
  );
}

const VARIABLE_LABELS: Record<CorrelationVariable, string> = {
  sommeil: 'Sommeil (h)',
  energie: 'Énergie',
  humeur: 'Humeur',
  hrv: 'HRV',
  activite: 'Activité',
  bristol: 'Transit',
  observance: 'Observance',
};

// ============================================
// Main page
// ============================================

export default function BilanVisuelPage() {
  const params = useParams();
  const router = useRouter();
  const consultantId = params.consultantId as string;

  const [data, setData] = useState<BilanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Correlation slide state
  const [corrVarA, setCorrVarA] = useState<CorrelationVariable>('sommeil');
  const [corrVarB, setCorrVarB] = useState<CorrelationVariable>('energie');
  const [corrThreshold, setCorrThreshold] = useState(6);
  const [corrCondition, setCorrCondition] = useState<'lt' | 'gt'>('lt');

  useEffect(() => {
    getConsultantBilanData(consultantId, 30).then((d) => {
      setData(d);
      setLoading(false);
    });
  }, [consultantId]);

  const dayData = useMemo(
    () => data ? mergeDayData(data.journalEntries, data.wearableSummaries) : [],
    [data]
  );

  const hasWearableData = (data?.wearableSummaries?.length ?? 0) > 0;

  // Build slides list (skip unavailable ones)
  const slides = useMemo(() => {
    const all = [
      { key: 'synthese', label: 'Synthèse' },
      { key: 'energie_humeur', label: 'Énergie & Humeur' },
      ...(hasWearableData ? [{ key: 'sommeil_hrv', label: 'Sommeil & HRV' }] : []),
      { key: 'observance', label: 'Observance' },
      { key: 'correlations', label: 'Corrélations' },
      { key: 'recommandations', label: 'Recommandations' },
    ];
    return all;
  }, [hasWearableData]);

  const handleNavigate = useCallback((idx: number) => {
    if (idx >= 0 && idx < slides.length) setCurrentSlide(idx);
  }, [slides.length]);

  const handleExit = useCallback(() => {
    window.close();
    // Fallback if window.close doesn't work
    router.push(`/consultants/${consultantId}`);
  }, [router, consultantId]);

  if (loading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FBF7F2' }}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-sage border-t-transparent" />
      </div>
    );
  }

  const slideKey = slides[currentSlide]?.key;
  const totalSlides = slides.length;

  // ---- Precompute data for slides ----

  // Mood/Energy series
  const moodSeries = data.journalEntries
    .filter((e) => getMoodNumeric(e.mood) !== undefined)
    .map((e) => ({ date: e.date, value: getMoodNumeric(e.mood)! }));

  const energySeries = data.journalEntries
    .filter((e) => getEnergyNumeric(e.energy) !== undefined)
    .map((e) => ({ date: e.date, value: getEnergyNumeric(e.energy)! }));

  // Averages
  const avgMood = moodSeries.length > 0
    ? Math.round((moodSeries.reduce((a, b) => a + b.value, 0) / moodSeries.length) * 10) / 10
    : 0;
  const avgEnergy = energySeries.length > 0
    ? Math.round((energySeries.reduce((a, b) => a + b.value, 0) / energySeries.length) * 10) / 10
    : 0;

  // Sleep average
  const sleepEntries = data.wearableSummaries.filter((w) => w.sleep_duration != null);
  const avgSleep = sleepEntries.length > 0
    ? Math.round((sleepEntries.reduce((a, b) => a + (b.sleep_duration ?? 0), 0) / sleepEntries.length) * 10) / 10
    : 0;

  // Observance
  const obsEntries = data.journalEntries;
  const obsHydratation = obsEntries.length > 0 ? Math.round(obsEntries.filter((e) => e.adherence_hydratation).length / obsEntries.length * 100) : 0;
  const obsRespiration = obsEntries.length > 0 ? Math.round(obsEntries.filter((e) => e.adherence_respiration).length / obsEntries.length * 100) : 0;
  const obsMouvement = obsEntries.length > 0 ? Math.round(obsEntries.filter((e) => e.adherence_mouvement).length / obsEntries.length * 100) : 0;
  const obsPlantes = obsEntries.length > 0 ? Math.round(obsEntries.filter((e) => e.adherence_plantes).length / obsEntries.length * 100) : 0;
  const avgObservance = Math.round((obsHydratation + obsRespiration + obsMouvement + obsPlantes) / 4);

  // Trends (split into two halves)
  const halfIdx = Math.floor(moodSeries.length / 2);
  const moodTrend = calculateTrend(
    moodSeries.slice(halfIdx).map((d) => d.value),
    moodSeries.slice(0, halfIdx).map((d) => d.value)
  );
  const energyTrend = calculateTrend(
    energySeries.slice(halfIdx).map((d) => d.value),
    energySeries.slice(0, halfIdx).map((d) => d.value)
  );
  const sleepHalf = Math.floor(sleepEntries.length / 2);
  const sleepTrend = calculateTrend(
    sleepEntries.slice(sleepHalf).map((d) => d.sleep_duration ?? 0),
    sleepEntries.slice(0, sleepHalf).map((d) => d.sleep_duration ?? 0)
  );

  // Correlation calculation
  const corrConfig: CorrelationConfig = {
    variableA: corrVarA,
    conditionA: corrCondition,
    thresholdA: corrThreshold,
    variableB: corrVarB,
  };
  const corrResult = calculateCorrelation(dayData, corrConfig);

  const corrDataPoints = dayData
    .filter((d) => d[corrVarA as keyof typeof d] !== undefined && d[corrVarB as keyof typeof d] !== undefined)
    .map((d) => ({
      x: d[corrVarA as keyof typeof d] as number,
      y: d[corrVarB as keyof typeof d] as number,
      date: d.date,
    }));

  // Duration since first entry
  const daysSinceFirst = data.firstEntryDate
    ? Math.floor((Date.now() - new Date(data.firstEntryDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="relative">
      {/* Current slide */}
      {slideKey === 'synthese' && (
        <PresentationSlide
          title="Synthèse globale"
          subtitle={`${data.consultantName} — Bilan du ${new Date().toLocaleDateString('fr-FR')}${daysSinceFirst > 0 ? ` (${daysSinceFirst} jours de suivi)` : ''}`}
          slideNumber={currentSlide + 1}
          totalSlides={totalSlides}
        >
          <div className="flex flex-wrap gap-4 mt-4">
            <SummaryCard
              label="Humeur moyenne"
              value={avgMood.toString()}
              unit="/10"
              emoji={avgMood > 7 ? '😊' : avgMood >= 4 ? '😐' : '😟'}
              trend={moodTrend}
            />
            <SummaryCard
              label="Énergie moyenne"
              value={avgEnergy.toString()}
              unit="/10"
              trend={energyTrend}
            />
            <SummaryCard
              label="Sommeil moyen"
              value={avgSleep.toString()}
              unit="h"
              trend={sleepTrend}
            />
            <SummaryCard
              label="Observance globale"
              value={avgObservance.toString()}
              unit="%"
            />
          </div>
          <div className="mt-8 text-sm text-warmgray">
            <p>
              Données basées sur {data.journalEntries.length} entrées de journal
              {data.wearableSummaries.length > 0 && ` et ${data.wearableSummaries.length} jours de données wearable`}
              {' '}sur les 30 derniers jours.
            </p>
          </div>
        </PresentationSlide>
      )}

      {slideKey === 'energie_humeur' && (
        <PresentationSlide
          title="Énergie et humeur"
          subtitle="Évolution sur les 30 derniers jours"
          slideNumber={currentSlide + 1}
          totalSlides={totalSlides}
        >
          {moodSeries.length > 1 || energySeries.length > 1 ? (
            <>
              <LineChartFull
                series={[
                  { label: 'Énergie', data: energySeries, color: '#5B8C6E' },
                  { label: 'Humeur', data: moodSeries, color: '#C4856C' },
                ]}
                height={320}
              />
              {moodTrend.direction === energyTrend.direction && moodTrend.direction !== 'stable' && (
                <p className="mt-4 text-sm text-warmgray italic">
                  L&apos;énergie et l&apos;humeur suivent des tendances similaires sur cette période.
                </p>
              )}
            </>
          ) : (
            <p className="text-stone text-sm py-8">Pas assez de données pour afficher le graphique.</p>
          )}
        </PresentationSlide>
      )}

      {slideKey === 'sommeil_hrv' && (
        <PresentationSlide
          title="Sommeil et HRV"
          subtitle="Données de la bague connectée"
          slideNumber={currentSlide + 1}
          totalSlides={totalSlides}
        >
          {sleepEntries.length > 0 ? (
            <div className="space-y-6">
              <BarChartFull
                data={sleepEntries.map((w) => ({
                  label: w.date.slice(5),
                  value: w.sleep_duration ?? 0,
                }))}
                referenceZone={{ min: 7, max: 9, label: 'Zone optimale (7-9h)' }}
                height={280}
              />
              {data.wearableSummaries.some((w) => w.hrv_avg != null) && (
                <LineChartFull
                  series={[{
                    label: 'HRV moyenne',
                    data: data.wearableSummaries
                      .filter((w) => w.hrv_avg != null)
                      .map((w) => ({ date: w.date, value: w.hrv_avg! })),
                    color: '#D4A060',
                  }]}
                  height={200}
                />
              )}
            </div>
          ) : (
            <p className="text-stone text-sm py-8">Aucune donnée de sommeil disponible.</p>
          )}
        </PresentationSlide>
      )}

      {slideKey === 'observance' && (
        <PresentationSlide
          title="Observance du programme"
          subtitle="Taux de respect des recommandations sur 30 jours"
          slideNumber={currentSlide + 1}
          totalSlides={totalSlides}
        >
          {obsEntries.length > 0 ? (
            <BarChartFull
              data={[
                { label: 'Hydratation', value: obsHydratation },
                { label: 'Respiration', value: obsRespiration },
                { label: 'Mouvement', value: obsMouvement },
                { label: 'Plantes', value: obsPlantes },
              ]}
              thresholds={{ green: 70, orange: 40 }}
              height={320}
            />
          ) : (
            <p className="text-stone text-sm py-8">Aucune donnée d&apos;observance disponible.</p>
          )}
        </PresentationSlide>
      )}

      {slideKey === 'correlations' && (
        <PresentationSlide
          title="Corrélations"
          subtitle="Explorez les liens entre vos données"
          slideNumber={currentSlide + 1}
          totalSlides={totalSlides}
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-3 bg-white rounded-lg p-4 border border-divider">
              <div>
                <label className="text-xs text-warmgray block mb-1">Variable</label>
                <select
                  value={corrVarA}
                  onChange={(e) => setCorrVarA(e.target.value as CorrelationVariable)}
                  className="rounded border border-divider px-2 py-1.5 text-sm"
                >
                  {Object.entries(VARIABLE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-warmgray block mb-1">Condition</label>
                <select
                  value={corrCondition}
                  onChange={(e) => setCorrCondition(e.target.value as 'lt' | 'gt')}
                  className="rounded border border-divider px-2 py-1.5 text-sm"
                >
                  <option value="lt">inférieur à</option>
                  <option value="gt">supérieur à</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-warmgray block mb-1">Seuil</label>
                <input
                  type="number"
                  value={corrThreshold}
                  onChange={(e) => setCorrThreshold(Number(e.target.value))}
                  className="w-20 rounded border border-divider px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-warmgray block mb-1">Observer</label>
                <select
                  value={corrVarB}
                  onChange={(e) => setCorrVarB(e.target.value as CorrelationVariable)}
                  className="rounded border border-divider px-2 py-1.5 text-sm"
                >
                  {Object.entries(VARIABLE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>

            {corrDataPoints.length > 2 ? (
              <>
                <CorrelationChart
                  dataPoints={corrDataPoints}
                  xLabel={VARIABLE_LABELS[corrVarA]}
                  yLabel={VARIABLE_LABELS[corrVarB]}
                  conditionResult={{
                    meanWhenMet: corrResult.meanWhenConditionMet,
                    meanOtherwise: corrResult.meanWhenConditionNotMet,
                    daysMet: corrResult.daysConditionMet,
                    totalDays: corrResult.totalDays,
                  }}
                  threshold={corrThreshold}
                  conditionType={corrCondition}
                  height={300}
                />
                <div className="bg-white rounded-lg p-4 border border-divider text-center">
                  <p className="text-base text-charcoal font-medium">
                    Quand {VARIABLE_LABELS[corrVarA].toLowerCase()} est {corrCondition === 'lt' ? 'inférieur' : 'supérieur'} à {corrThreshold},{' '}
                    {VARIABLE_LABELS[corrVarB].toLowerCase()} moyen = <strong>{corrResult.meanWhenConditionMet}</strong> au lieu de{' '}
                    <strong>{corrResult.meanWhenConditionNotMet}</strong>
                  </p>
                  <p className="text-sm text-warmgray mt-1">
                    ({corrResult.daysConditionMet} jours sur {corrResult.totalDays})
                  </p>
                </div>
              </>
            ) : (
              <p className="text-stone text-sm py-8">Pas assez de données pour calculer les corrélations.</p>
            )}
          </div>
        </PresentationSlide>
      )}

      {slideKey === 'recommandations' && (
        <PresentationSlide
          title="Recommandations et plan"
          subtitle="Plan actif et fiches partagées"
          slideNumber={currentSlide + 1}
          totalSlides={totalSlides}
        >
          <div className="space-y-6">
            {data.activePlan ? (
              <div className="rounded-xl bg-white p-6 border border-divider">
                <h3 className="text-sm font-semibold text-charcoal mb-3">Plan actif (v{data.activePlan.version})</h3>
                {data.activePlan.content && (
                  <div className="space-y-2">
                    {Object.entries(data.activePlan.content)
                      .filter(([, v]) => typeof v === 'string' && v.trim())
                      .slice(0, 6)
                      .map(([key, value]) => (
                        <div key={key} className="text-sm">
                          <span className="text-warmgray capitalize">{key.replace(/_/g, ' ')}:</span>{' '}
                          <span className="text-charcoal">{String(value).slice(0, 120)}{String(value).length > 120 ? '...' : ''}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl bg-white p-6 border border-divider">
                <p className="text-sm text-stone">Aucun plan actif partagé.</p>
              </div>
            )}

            {data.recentAssignments.length > 0 && (
              <div className="rounded-xl bg-white p-6 border border-divider">
                <h3 className="text-sm font-semibold text-charcoal mb-3">Fiches éducatives récentes</h3>
                <div className="space-y-2">
                  {data.recentAssignments.map((a) => (
                    <div key={a.id} className="flex items-center justify-between text-sm">
                      <span className="text-charcoal">{a.resource?.title ?? 'Fiche'}</span>
                      <span className={`text-xs ${a.read_at ? 'text-sage' : 'text-warmgray'}`}>
                        {a.read_at ? 'Lu' : 'Non lu'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Encouragement */}
            {(moodTrend.direction === 'up' || energyTrend.direction === 'up') && (
              <div className="rounded-xl bg-sage/5 p-5 border border-sage/20">
                <p className="text-sm text-sage font-medium">
                  Les tendances sont positives ! Les efforts portent leurs fruits.
                </p>
              </div>
            )}
          </div>
        </PresentationSlide>
      )}

      <PresentationNav
        currentSlide={currentSlide}
        totalSlides={totalSlides}
        slideLabels={slides.map((s) => s.label)}
        onNavigate={handleNavigate}
        onExit={handleExit}
      />
    </div>
  );
}
