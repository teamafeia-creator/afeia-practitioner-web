'use client';

type DataPoint = { x: number; y: number; date: string };
type ConditionResult = {
  meanWhenMet: number;
  meanOtherwise: number;
  daysMet: number;
  totalDays: number;
};

export function CorrelationChart({
  dataPoints,
  xLabel,
  yLabel,
  conditionResult,
  threshold,
  conditionType,
  width = 500,
  height = 350,
}: {
  dataPoints: DataPoint[];
  xLabel: string;
  yLabel: string;
  conditionResult: ConditionResult;
  threshold: number;
  conditionType: 'lt' | 'gt' | 'eq';
  width?: number;
  height?: number;
}) {
  const padding = { top: 20, right: 20, bottom: 50, left: 50 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const xValues = dataPoints.map((d) => d.x);
  const yValues = dataPoints.map((d) => d.y);
  const minX = Math.min(...xValues, 0);
  const maxX = Math.max(...xValues, 10);
  const minY = Math.min(...yValues, 0);
  const maxY = Math.max(...yValues, 10);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  function scaleX(v: number) {
    return padding.left + ((v - minX) / rangeX) * chartW;
  }
  function scaleY(v: number) {
    return padding.top + (1 - (v - minY) / rangeY) * chartH;
  }

  function meetsCondition(x: number): boolean {
    if (conditionType === 'lt') return x < threshold;
    if (conditionType === 'gt') return x > threshold;
    return Math.abs(x - threshold) < 0.5;
  }

  const conditionLabel = conditionType === 'lt' ? '<' : conditionType === 'gt' ? '>' : '=';

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label="Graphique de corrélation">
      {/* Axis lines */}
      <line x1={padding.left} x2={padding.left} y1={padding.top} y2={padding.top + chartH} stroke="#e5e7eb" strokeWidth="1" />
      <line x1={padding.left} x2={padding.left + chartW} y1={padding.top + chartH} y2={padding.top + chartH} stroke="#e5e7eb" strokeWidth="1" />

      {/* X axis label */}
      <text x={padding.left + chartW / 2} y={height - 5} textAnchor="middle" fontSize="11" className="fill-charcoal">{xLabel}</text>

      {/* Y axis label */}
      <text x={12} y={padding.top + chartH / 2} textAnchor="middle" fontSize="11" className="fill-charcoal" transform={`rotate(-90, 12, ${padding.top + chartH / 2})`}>{yLabel}</text>

      {/* Mean lines (dashed) */}
      <line
        x1={padding.left}
        x2={padding.left + chartW}
        y1={scaleY(conditionResult.meanWhenMet)}
        y2={scaleY(conditionResult.meanWhenMet)}
        stroke="#C4856C"
        strokeWidth="1.5"
        strokeDasharray="6 3"
      />
      <text x={padding.left + chartW + 4} y={scaleY(conditionResult.meanWhenMet) + 4} fontSize="9" className="fill-terracotta">
        {conditionResult.meanWhenMet}
      </text>

      <line
        x1={padding.left}
        x2={padding.left + chartW}
        y1={scaleY(conditionResult.meanOtherwise)}
        y2={scaleY(conditionResult.meanOtherwise)}
        stroke="#5B8C6E"
        strokeWidth="1.5"
        strokeDasharray="6 3"
      />
      <text x={padding.left + chartW + 4} y={scaleY(conditionResult.meanOtherwise) + 4} fontSize="9" className="fill-sage">
        {conditionResult.meanOtherwise}
      </text>

      {/* Threshold vertical line */}
      <line
        x1={scaleX(threshold)}
        x2={scaleX(threshold)}
        y1={padding.top}
        y2={padding.top + chartH}
        stroke="#6B7280"
        strokeWidth="1"
        strokeDasharray="4 2"
      />

      {/* Data points */}
      {dataPoints.map((d, i) => {
        const met = meetsCondition(d.x);
        return (
          <circle
            key={i}
            cx={scaleX(d.x)}
            cy={scaleY(d.y)}
            r={4}
            fill={met ? '#C4856C' : '#5B8C6E'}
            opacity={0.7}
          />
        );
      })}

      {/* Summary box */}
      <rect x={padding.left + 8} y={padding.top + 4} width={chartW - 16} height={36} rx={6} fill="white" stroke="#e5e7eb" opacity={0.92} />
      <text x={padding.left + 16} y={padding.top + 18} fontSize="10" className="fill-charcoal">
        Quand {xLabel} {conditionLabel} {threshold} : {yLabel} moy. = {conditionResult.meanWhenMet}
      </text>
      <text x={padding.left + 16} y={padding.top + 32} fontSize="10" className="fill-stone">
        Sinon : {yLabel} moy. = {conditionResult.meanOtherwise} ({conditionResult.daysMet}/{conditionResult.totalDays} jours)
      </text>
    </svg>
  );
}
