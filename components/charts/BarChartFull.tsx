'use client';

type BarData = { label: string; value: number; color?: string };
type Thresholds = { green: number; orange: number };

function getBarColor(value: number, thresholds?: Thresholds): string {
  if (!thresholds) return '#5B8C6E';
  if (value >= thresholds.green) return '#5B8C6E';
  if (value >= thresholds.orange) return '#D4A060';
  return '#C4856C';
}

export function BarChartFull({
  data,
  thresholds,
  width = 600,
  height = 300,
  referenceZone,
}: {
  data: BarData[];
  thresholds?: Thresholds;
  width?: number;
  height?: number;
  referenceZone?: { min: number; max: number; label: string };
}) {
  const padding = { top: 20, right: 20, bottom: 40, left: 45 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxValue = Math.max(...data.map((d) => d.value), referenceZone?.max ?? 0, 10);
  const barCount = data.length || 1;
  const barGap = 8;
  const barWidth = Math.min(40, (chartW - barGap * (barCount - 1)) / barCount);
  const totalBarsW = barCount * barWidth + (barCount - 1) * barGap;
  const startX = padding.left + (chartW - totalBarsW) / 2;

  function scaleY(v: number) {
    return padding.top + (1 - v / maxValue) * chartH;
  }

  // Y ticks
  const yTicks: number[] = [];
  const yStep = maxValue <= 10 ? 2 : Math.ceil(maxValue / 5);
  for (let v = 0; v <= maxValue; v += yStep) yTicks.push(v);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label="Graphique en barres">
      {/* Y grid + labels */}
      {yTicks.map((v) => (
        <g key={v}>
          <line x1={padding.left} x2={width - padding.right} y1={scaleY(v)} y2={scaleY(v)} stroke="#e5e7eb" strokeWidth="0.5" />
          <text x={padding.left - 8} y={scaleY(v) + 4} textAnchor="end" className="fill-warmgray" fontSize="10">{v}</text>
        </g>
      ))}

      {/* Reference zone */}
      {referenceZone && (
        <g>
          <rect
            x={padding.left}
            y={scaleY(referenceZone.max)}
            width={chartW}
            height={scaleY(referenceZone.min) - scaleY(referenceZone.max)}
            fill="#5B8C6E"
            opacity={0.08}
          />
          <text
            x={width - padding.right - 4}
            y={scaleY(referenceZone.max) + 12}
            textAnchor="end"
            fontSize="9"
            className="fill-sage"
          >
            {referenceZone.label}
          </text>
        </g>
      )}

      {/* Bars */}
      {data.map((d, i) => {
        const x = startX + i * (barWidth + barGap);
        const barH = (d.value / maxValue) * chartH;
        const y = padding.top + chartH - barH;
        const color = d.color ?? getBarColor(d.value, thresholds);

        return (
          <g key={i}>
            <rect x={x} y={y} width={barWidth} height={barH} rx={3} fill={color} />
            <text x={x + barWidth / 2} y={y - 4} textAnchor="middle" fontSize="10" className="fill-charcoal font-medium">
              {Math.round(d.value * 10) / 10}
            </text>
            <text x={x + barWidth / 2} y={height - 10} textAnchor="middle" fontSize="9" className="fill-warmgray">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
