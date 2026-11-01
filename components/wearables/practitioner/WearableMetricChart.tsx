'use client';

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent } from '@/components/ui';
import {
  METRIC_META,
  chartData,
  formatDelta,
  formatMetricValue,
  formatShortDay,
  type WearableMetric,
} from '@/lib/wearables/format';
import type { WearableMetricAverages, WearableSummaryDay } from '@/lib/wearables/summary';

// Une seule couleur neutre pour toutes les courbes : aucune couleur de jugement.
const LINE = '#C4CCD8';
const AXIS = '#5C6573';

type Props = {
  metric: WearableMetric;
  days: WearableSummaryDay[];
  averages: { current: WearableMetricAverages; previous: WearableMetricAverages };
  period: 7 | 30;
};

/** Petit graphique linéaire d'une métrique. Jour sans donnée = trou (pas de raccord, pas de zéro). */
export function WearableMetricChart({ metric, days, averages, period }: Props) {
  const meta = METRIC_META[metric];
  const data = chartData(metric, days);
  const current = averages.current[metric];
  const delta = formatDelta(metric, current, averages.previous[metric], period);
  const hasData = data.some((d) => d.value !== null);

  return (
    <Card data-testid={`wearable-chart-${metric}`}>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-[13px] font-semibold text-charcoal">{meta.title}</h3>
          <span className="text-xs text-stone">{meta.unit}</span>
        </div>

        <div className="h-24" aria-hidden={!hasData}>
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
                <XAxis
                  dataKey="date"
                  tickFormatter={formatShortDay}
                  ticks={[data[0].date, data[data.length - 1].date]}
                  interval="preserveStartEnd"
                  tick={{ fill: AXIS, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide domain={['auto', 'auto']} />
                <Tooltip
                  cursor={{ stroke: '#2A3140' }}
                  contentStyle={{ background: '#1C2230', border: '1px solid #2A3140', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#8B95A5' }}
                  itemStyle={{ color: '#E8EDF4' }}
                  labelFormatter={(d: string) => formatShortDay(d)}
                  formatter={(_v: number, _n: string, item: { payload?: { date: string } }) => {
                    const day = days.find((x) => x.date === item.payload?.date);
                    return [formatMetricValue(metric, day ? day[metric] : null), meta.title];
                  }}
                />
                <Line
                  type="linear"
                  dataKey="value"
                  stroke={LINE}
                  strokeWidth={1.75}
                  connectNulls={false}
                  dot={{ r: period === 7 ? 2.5 : 1.5, fill: LINE, strokeWidth: 0 }}
                  activeDot={{ r: 3.5 }}
                  isAnimationActive={false}
                />
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
