import { cn } from '../../lib/cn';

export function SmallLineChart({
  values,
  className
}: {
  values: number[];
  className?: string;
}) {
  const w = 160;
  const h = 48;
  const padding = 6;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const pts = values.map((v, i) => {
    const x = padding + (i * (w - padding * 2)) / (values.length - 1 || 1);
    const y = padding + (1 - (v - min) / range) * (h - padding * 2);
    return { x, y };
  });

  const d = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(' ');

  return (
    <svg
      className={cn('h-12 w-40', className)}
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label="Graphique"
    >
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2" fill="currentColor" />
      ))}
    </svg>
  );
}
