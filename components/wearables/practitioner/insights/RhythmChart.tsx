'use client';

// Écran « Rythme » : chaque nuit en barre horizontale sur un axe 20 h → 12 h (Europe/Paris),
// coucher à gauche, lever à droite, bande du coucher habituel (± 30 min autour du médian).
// Inspiré des vues « sommeil et rythme biologique » des apps de bracelets.
import { REGULAR_BEDTIME_MIN, fmtClockFrom20h, fmtDuration, shortDate, type Rhythm } from '@/lib/wearables/insights';

const W = 900;
const X0 = 70; // libellés des jours
const X1 = W - 16;
const ROW = 26;
const AXIS_MIN = 0; // 20 h
const AXIS_MAX = 16 * 60; // 12 h le lendemain
const HOURS = [20, 22, 0, 2, 4, 6, 8, 10, 12];

export function RhythmChart({ r }: { r: Rhythm }) {
  const n = r.nights.length;
  const H = 36 + n * ROW + 24;
  const x = (min: number) => X0 + ((Math.min(Math.max(min, AXIS_MIN), AXIS_MAX) - AXIS_MIN) / (AXIS_MAX - AXIS_MIN)) * (X1 - X0);
  const y = (i: number) => 36 + i * ROW;
  const band = r.medianStart === null ? null : { lo: x(r.medianStart - REGULAR_BEDTIME_MIN), hi: x(r.medianStart + REGULAR_BEDTIME_MIN) };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={r.sentence} className="block overflow-visible" data-testid="rhythm-chart">
      {/* grille des heures */}
      {HOURS.map((h, i) => {
        const min = i * 120;
        return (
          <g key={h}>
            <line x1={x(min)} y1={28} x2={x(min)} y2={H - 20} stroke="#1F2633" strokeWidth={1} />
            <text x={x(min)} y={18} textAnchor="middle" fill="#8B95A5" fontSize={11}>
              {h} h
            </text>
          </g>
        );
      })}
      {/* bande du coucher habituel */}
      {band ? <rect x={band.lo} y={28} width={Math.max(2, band.hi - band.lo)} height={H - 48} fill="rgba(109,212,184,0.10)" /> : null}
      {r.medianStart !== null ? <line x1={x(r.medianStart)} y1={28} x2={x(r.medianStart)} y2={H - 20} stroke="#6DD4B8" strokeDasharray="4 4" strokeWidth={1} /> : null}
      {r.medianEnd !== null ? <line x1={x(r.medianEnd)} y1={28} x2={x(r.medianEnd)} y2={H - 20} stroke="#E8A87C" strokeDasharray="4 4" strokeWidth={1} /> : null}

      {r.nights.map((night, i) => {
        const cy = y(i) + ROW / 2;
        const label = shortDate(night.day);
        if (night.startMin === null || night.endMin === null) {
          return (
            <g key={night.day}>
              <text x={X0 - 8} y={cy + 4} textAnchor="end" fill={night.weekend ? '#B8C1CF' : '#8B95A5'} fontSize={11} fontWeight={night.weekend ? 600 : 400}>
                {label}
              </text>
              <text x={X0 + 6} y={cy + 4} fill="#5C6573" fontSize={11}>
                {night.totalMin !== null ? `${fmtDuration(night.totalMin)} · heures inconnues` : 'non mesurée'}
              </text>
            </g>
          );
        }
        const late = r.medianStart !== null && night.startMin - r.medianStart > REGULAR_BEDTIME_MIN;
        const early = r.medianStart !== null && r.medianStart - night.startMin > REGULAR_BEDTIME_MIN;
        const x1 = x(night.startMin);
        const x2 = x(night.endMin);
        return (
          <g key={night.day}>
            <text x={X0 - 8} y={cy + 4} textAnchor="end" fill={night.weekend ? '#B8C1CF' : '#8B95A5'} fontSize={11} fontWeight={night.weekend ? 600 : 400}>
              {label}
            </text>
            <rect x={x1} y={cy - 7} width={Math.max(4, x2 - x1)} height={14} rx={7} fill={late ? '#E8A87C' : early ? '#7B93DB' : '#6DD4B8'} opacity={0.9}>
              <title>{`${label} · couché ${fmtClockFrom20h(night.startMin)}, levé ${fmtClockFrom20h(night.endMin)}${night.totalMin !== null ? ` · ${fmtDuration(night.totalMin)} de sommeil` : ''}`}</title>
            </rect>
            <text x={x1 - 4} y={cy + 4} textAnchor="end" fill="#B8C1CF" fontSize={10}>
              {fmtClockFrom20h(night.startMin)}
            </text>
            <text x={x2 + 4} y={cy + 4} fill="#B8C1CF" fontSize={10}>
              {fmtClockFrom20h(night.endMin)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function RhythmLegend({ r }: { r: Rhythm }) {
  return (
    <div className="flex flex-wrap gap-x-[18px] gap-y-1.5 text-[13px] text-[#B8C1CF]">
      <span className="inline-flex items-center gap-2">
        <span className="h-3 w-5 rounded-full bg-sage" /> Coucher dans son habituel{r.medianStartLabel ? ` (${r.medianStartLabel} ± ${REGULAR_BEDTIME_MIN} min)` : ''}
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="h-3 w-5 rounded-full bg-[#E8A87C]" /> Couché plus tard
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="h-3 w-5 rounded-full bg-[#7B93DB]" /> Couché plus tôt
      </span>
      {r.medianEndLabel ? (
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-[2px] border-l border-dashed border-[#E8A87C]" /> Lever habituel {r.medianEndLabel}
        </span>
      ) : null}
    </div>
  );
}
