'use client';

import { useState } from 'react';

type DataPoint = { date: string; value: number };
type Series = { label: string; data: DataPoint[]; color: string };

export function LineChartFull({
  series,
  width = 600,
  height = 300,
  showAxes = true,
}: {
  series: Series[];
  width?: number;
  height?: number;
  showAxes?: boolean;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const padding = { top: 20, right: 20, bottom: 40, left: 45 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Collect all values for Y range
  const allValues = series.flatMap((s) => s.data.map((d) => d.value));
  const minY = Math.min(...allValues, 0);
  const maxY = Math.max(...allValues, 10);
  const rangeY = maxY - minY || 1;

  // Collect all dates for X range
  const allDates = Array.from(new Set(series.flatMap((s) => s.data.map((d) => d.date)))).sort();
  const dateCount = allDates.length || 1;

  function scaleX(i: number) {
    return padding.left + (i / (dateCount - 1 || 1)) * chartW;
  }
  function scaleY(v: number) {
    return padding.top + (1 - (v - minY) / rangeY) * chartH;
  }

  // Y axis ticks
  const yTicks: number[] = [];
  const yStep = rangeY <= 10 ? 2 : Math.ceil(rangeY / 5);
  for (let v = Math.ceil(minY); v <= maxY; v += yStep) yTicks.push(v);

  // X axis labels (show every nth date)
  const xLabelEvery = Math.max(1, Math.floor(dateCount / 6));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label="Graphique en lignes">
      {/* Y axis */}
      {showAxes && yTicks.map((v) => (
        <g key={v}>
          <line x1={padding.left} x2={width - padding.right} y1={scaleY(v)} y2={scaleY(v)} stroke="#e5e7eb" strokeWidth="0.5" />
          <text x={padding.left - 8} y={scaleY(v) + 4} textAnchor="end" className="fill-warmgray" fontSize="10">{v}</text>
        </g>
      ))}

      {/* X axis labels */}
      {showAxes && allDates.map((date, i) => {
        if (i % xLabelEvery !== 0) return null;
        const label = date.slice(5); // MM-DD
        return (
          <text key={date} x={scaleX(i)} y={height - 8} textAnchor="middle" className="fill-warmgray" fontSize="9">
            {label}
          </text>
        );
      })}

      {/* Series */}
      {series.map((s) => {
        const points = s.data.map((d) => {
          const dateIdx = allDates.indexOf(d.date);
          return { x: scaleX(dateIdx), y: scaleY(d.value), value: d.value, date: d.date };
        });
        const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

        return (
          <g key={s.label}>
            <path d={pathD} fill="none" stroke={s.color} strokeWidth="2" />
            {points.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={hoveredIdx === i ? 5 : 3}
                fill={s.color}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-pointer"
              />
            ))}
          </g>
        );
      })}

      {/* Tooltip */}
      {hoveredIdx !== null && series[0]?.data[hoveredIdx] && (
        <g>
          <rect
            x={scaleX(hoveredIdx) - 45}
            y={padding.top - 18}
            width={90}
            height={series.length * 16 + 18}
            rx={4}
            fill="white"
            stroke="#e5e7eb"
            strokeWidth="0.5"
            opacity={0.95}
          />
          <text x={scaleX(hoveredIdx)} y={padding.top - 4} textAnchor="middle" fontSize="9" className="fill-charcoal font-medium">
            {allDates[hoveredIdx]?.slice(5)}
          </text>
          {series.map((s, si) => {
            const val = s.data[hoveredIdx]?.value;
            if (val === undefined) return null;
            return (
              <text key={si} x={scaleX(hoveredIdx)} y={padding.top + 12 + si * 16} textAnchor="middle" fontSize="10" fill={s.color}>
                {s.label}: {val}
              </text>
            );
          })}
        </g>
      )}

      {/* Legend */}
      {series.map((s, i) => (
        <g key={s.label} transform={`translate(${padding.left + i * 120}, ${height - 2})`}>
          <circle cx={0} cy={-4} r={4} fill={s.color} />
          <text x={8} y={0} fontSize="10" className="fill-charcoal">{s.label}</text>
        </g>
      ))}
    </svg>
  );
}
