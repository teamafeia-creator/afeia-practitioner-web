'use client';

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent } from '@/components/ui';
import {
  METRIC_META,
  chartData,
  chartRange,
  formatAxisValue,
  formatDelta,
  formatMetricValue,
  formatShortDay,
  type ChartPoint,
  type WearableMetric,
} from '@/lib/wearables/format';
import type { WearableMetricAverages, WearableSummaryDay } from '@/lib/wearables/summary';

// Une seule couleur neutre pour toutes les courbes : aucune couleur de jugement.
const LINE = '#C4CCD8';
const AXIS = '#5C6573';
const SURFACE = '#151A23';

type Props = {
  metric: WearableMetric;
  days: WearableSummaryDay[];
  averages: { current: WearableMetricAverages; previous: WearableMetricAverages };
  period: 7 | 30;
  /** Jour en cours (journée incomplète) : pour les pas, point en creux relié en pointillé. */
  partialDay?: string | null;
};

type TooltipProps = {
  active?: boolean;
  payload?: { payload?: ChartPoint }[];
  metric: WearableMetric;
  days: WearableSummaryDay[];
};

/** Infobulle (survol ou tap) : date, valeur et unité ; « en cours » pour la journée en cours. */
function PointTooltip({ active, payload, metric, days }: TooltipProps) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  const day = days.find((d) => d.date === point.date);
  const value = day ? day[metric] : null;
  return (
    <div className="rounded-lg border border-divider bg-[#1C2230] px-2.5 py-1.5 text-xs shadow-soft" data-testid="wearable-tooltip">
      <p className="text-stone">
        {formatShortDay(point.date)}
        {point.isPartial ? ' · en cours' : ''}
      </p>
      <p className="text-charcoal">{formatMetricValue(metric, value)}</p>
    </div>
  );
}

/** Petit graphique linéaire d'une métrique. Jour sans donnée = trou (pas de raccord, pas de zéro). */
export function WearableMetricChart({ metric, days, averages, period, partialDay = null }: Props) {
  const meta = METRIC_META[metric];
  const data = chartData(metric, days, partialDay);
  const range = chartRange(data);
  const current = averages.current[metric];
  const delta = formatDelta(metric, current, averages.previous[metric], period);
  const hasPartial = data.some((d) => d.isPartial);
  const dotRadius = period === 7 ? 2.5 : 1.5;

  return (
    <Card data-testid={`wearable-chart-${metric}`}>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-[13px] font-semibold text-charcoal">{meta.title}</h3>
          <span className="text-xs text-stone">{meta.unit}</span>
        </div>

        <div className="h-28" aria-hidden={!range}>
          {range ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <XAxis
                  dataKey="date"
                  tickFormatter={formatShortDay}
                  ticks={[data[0].date, data[data.length - 1].date]}
                  interval="preserveStartEnd"
                  tick={{ fill: AXIS, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={range[0] === range[1] ? [range[0] * 0.9, range[1] * 1.1 || 1] : range}
                  ticks={range[0] === range[1] ? [range[0]] : range}
                  tickFormatter={(v: number) => formatAxisValue(metric, v)}
                  tick={{ fill: AXIS, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={metric === 'steps' ? 62 : 48}
                  allowDataOverflow={false}
                />
                <Tooltip
                  cursor={{ stroke: '#2A3140' }}
                  content={<PointTooltip metric={metric} days={days} />}
                  trigger="hover"
                />
                <Line
                  type="linear"
                  dataKey="value"
                  stroke={LINE}
                  strokeWidth={1.75}
                  connectNulls={false}
                  dot={{ r: dotRadius, fill: LINE, strokeWidth: 0 }}
                  activeDot={{ r: 3.5 }}
                  isAnimationActive={false}
                />
                {hasPartial ? (
                  <Line
                    type="linear"
                    dataKey="partial"
                    stroke={LINE}
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                    connectNulls={false}
                    // Point en creux pour la journée en cours seulement (la veille est déjà tracée).
                    dot={(props: { cx?: number; cy?: number; payload?: ChartPoint; index?: number }) =>
                      props.payload?.isPartial && props.cx != null && props.cy != null ? (
                        <circle
                          key={`partial-${props.index}`}
                          cx={props.cx}
                          cy={props.cy}
                          r={3}
                          fill={SURFACE}
                          stroke={LINE}
                          strokeWidth={1.5}
                          data-testid="wearable-partial-dot"
                        />
                      ) : (
                        <g key={`none-${props.index}`} />
                      )
                    }
                    activeDot={{ r: 3.5, fill: SURFACE, stroke: LINE }}
                    isAnimationActive={false}
                  />
                ) : null}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-mist">Aucune donnée sur la période</div>
          )}
        </div>

        <div className="space-y-0.5">
          <p className="text-sm text-charcoal">
            <span className="text-stone">Moyenne : </span>
            <span data-testid={`wearable-average-${metric}`}>{formatMetricValue(metric, current)}</span>
            {hasPartial ? <span className="text-xs text-mist"> (hors journée en cours)</span> : null}
          </p>
          {delta ? (
            <p className="text-xs text-stone" data-testid={`wearable-delta-${metric}`}>
              {delta}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
