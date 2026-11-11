'use client';

import { fmtInt, type ChartData, type Metric } from '@/lib/wearables/insights';

const X0 = 44;
const W = 856;
const BASE = 204;
const PH = 180;

function axisLabel(metric: Metric, v: number) {
  if (metric === 'sleep') return `${Math.round(v / 60)} h`;
  if (metric === 'steps') return fmtInt(v);
  return String(Math.round(v));
}

/** Graphique en barres d'une mesure (CHART de la maquette) : bande de l'habituel, nuits non portées, partage du conseillancier. */
export function BarChart({ metric, data }: { metric: Metric; data: ChartData }) {
  const n = data.bars.length;
  const step = W / n;
  const bw = Math.min(22, step * 0.62);
  const cx = (i: number) => X0 + (i + 0.5) * step;
  const win = data.bars.map((b) => b.value).filter((v): v is number => v !== null);
  const top = Math.max(...win, data.band?.hi ?? 0, 1) * 1.08;
  const raw = top / 4;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const stp = [1, 2, 3, 5, 10].map((f) => f * pow).find((f) => f >= raw) ?? raw;
  const y = (v: number) => BASE - (v / top) * PH;
  const grid = [1, 2, 3, 4].map((q) => q * stp).filter((v) => v <= top);
  const ticks = Array.from({ length: Math.ceil(n / 7) }, (_, w) => w * 7).concat([n - 1]).filter((v, i, a) => a.indexOf(v) === i);
  const markIdx = data.mark ? data.bars.findIndex((b) => b.day === data.mark!.day) : -1;
  const short = (day: string) => {
    const [, m, d] = day.split('-').map(Number);
    return `${d} ${['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'][m - 1]}`;
  };

  return (
    <svg viewBox="0 0 920 236" width="100%" role="img" aria-label={data.aria} className="block overflow-visible">
      {data.band ? <rect x={X0} y={y(data.band.hi)} width={W} height={Math.max(0, y(data.band.lo) - y(data.band.hi))} fill="rgba(232,237,244,0.08)" /> : null}
      {grid.map((v) => (
        <g key={v}>
          <line x1={X0} y1={y(v)} x2={900} y2={y(v)} stroke="#1F2633" strokeWidth={1} />
          <text x={38} y={y(v) + 4} textAnchor="end" fill="#8B95A5" fontSize={11}>
            {axisLabel(metric, v)}
          </text>
        </g>
      ))}
      {data.bars.map((b, i) =>
        b.value === null ? (
          <line key={b.day} x1={cx(i) - 6} y1={198} x2={cx(i) + 6} y2={198} stroke="#5C6573" strokeWidth={2} strokeLinecap="round">
            <title>{b.title}</title>
          </line>
        ) : (
          <g key={b.day}>
            <rect x={cx(i) - bw / 2} y={y(b.value)} width={bw} height={BASE - y(b.value)} rx={4} fill={b.tone === 'bad' ? '#E8A87C' : '#6DD4B8'} />
            <rect x={cx(i) - step / 2} y={14} width={step} height={190} fill="transparent" className="hover:fill-white/5">
              <title>{b.title}</title>
            </rect>
          </g>
        )
      )}
      <line x1={X0} y1={BASE} x2={900} y2={BASE} stroke="#2A3140" strokeWidth={1} />
      {markIdx >= 0 ? (
        <g>
          <line x1={cx(markIdx) + step / 2} y1={4} x2={cx(markIdx) + step / 2} y2={BASE} stroke="#B89FD9" strokeWidth={1.5} strokeDasharray="3 3" />
          <text x={cx(markIdx) + step / 2 + 7} y={12} fill="#D9C9F0" fontSize={11} fontWeight={600}>
            {data.mark!.label}
          </text>
        </g>
      ) : null}
      {ticks.map((i) => (
        <text key={i} x={cx(i)} y={224} textAnchor="middle" fill="#8B95A5" fontSize={11}>
          {short(data.bars[i].day)}
        </text>
      ))}
    </svg>
  );
}

/** Légende du graphique (LEGEND de la maquette). */
export function ChartLegend({ data }: { data: ChartData }) {
  return (
    <div className="flex flex-wrap gap-x-[18px] gap-y-1.5 text-xs text-stone">
      {data.band ? (
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-[22px] rounded-sm bg-[rgba(232,237,244,0.14)]" />
          Son habituel ({data.band.label})
        </span>
      ) : null}
      <span className="inline-flex items-center gap-2">
        <span className="h-3.5 w-2.5 rounded-[3px] bg-[#E8A87C]" />
        {data.badLabel}
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="h-0.5 w-3 rounded-sm bg-[#5C6573]" />
        Non porté
      </span>
    </div>
  );
}
