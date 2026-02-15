'use client';

import { useState } from 'react';
import type { EmunctoryStatus, EmunctoryStatusPeau, EmunctoryStatusPoumons } from '../../lib/types';
import { getEmunctoryHexColor, EMUNCTORY_STATUSES, EMUNCTORY_STATUSES_PEAU, EMUNCTORY_STATUSES_POUMONS } from '../../lib/terrain-constants';

interface EmunctoryStatuses {
  foie: EmunctoryStatus | null;
  intestins: EmunctoryStatus | null;
  reins: EmunctoryStatus | null;
  peau: EmunctoryStatusPeau | null;
  poumons: EmunctoryStatusPoumons | null;
}

interface EmunctoryDiagramProps {
  statuses: EmunctoryStatuses;
  editing?: boolean;
  onStatusChange?: (organ: string, newStatus: string) => void;
}

const STATUS_CYCLES: Record<string, string[]> = {
  foie: ['fonctionnel', 'ralenti', 'surcharge', 'bloque'],
  intestins: ['fonctionnel', 'ralenti', 'surcharge', 'bloque'],
  reins: ['fonctionnel', 'ralenti', 'surcharge', 'bloque'],
  peau: ['fonctionnel', 'reactif', 'surcharge', 'bloque'],
  poumons: ['fonctionnel', 'sous_exploite', 'surcharge', 'bloque'],
};

function getStatusLabel(organ: string, status: string | null): string {
  if (!status) return 'Non évalué';
  if (organ === 'peau') {
    return EMUNCTORY_STATUSES_PEAU.find((s) => s.value === status)?.label ?? status;
  }
  if (organ === 'poumons') {
    return EMUNCTORY_STATUSES_POUMONS.find((s) => s.value === status)?.label ?? status;
  }
  return EMUNCTORY_STATUSES.find((s) => s.value === status)?.label ?? status;
}

function cycleStatus(organ: string, current: string | null): string {
  const cycle = STATUS_CYCLES[organ] ?? STATUS_CYCLES.foie;
  if (!current) return cycle[0];
  const idx = cycle.indexOf(current);
  return cycle[(idx + 1) % cycle.length];
}

export function EmunctoryDiagram({ statuses, editing, onStatusChange }: EmunctoryDiagramProps) {
  const [hoveredOrgan, setHoveredOrgan] = useState<string | null>(null);

  function handleClick(organ: string) {
    if (!editing || !onStatusChange) return;
    const current = (statuses as unknown as Record<string, string | null>)[organ] ?? null;
    onStatusChange(organ, cycleStatus(organ, current));
  }

  const skinColor = getEmunctoryHexColor(statuses.peau);
  const lungColor = getEmunctoryHexColor(statuses.poumons);
  const liverColor = getEmunctoryHexColor(statuses.foie);
  const intestinColor = getEmunctoryHexColor(statuses.intestins);
  const kidneyColor = getEmunctoryHexColor(statuses.reins);

  return (
    <div className="flex flex-col items-center gap-3">
      <svg
        viewBox="0 0 300 400"
        className="w-full max-w-[300px] h-auto"
        role="img"
        aria-label="Schéma des émonctoires"
      >
        {/* Torso silhouette */}
        <path
          d="M150 30 C120 30 80 50 60 90 L50 140 L45 200 L50 280 L60 340 L90 380 L120 390 L150 395 L180 390 L210 380 L240 340 L250 280 L255 200 L250 140 L240 90 C220 50 180 30 150 30Z"
          fill="none"
          stroke={skinColor}
          strokeWidth={editing ? 4 : 3}
          opacity={0.8}
          className={editing ? 'cursor-pointer' : ''}
          onClick={() => handleClick('peau')}
          onMouseEnter={() => setHoveredOrgan('peau')}
          onMouseLeave={() => setHoveredOrgan(null)}
        />

        {/* Left lung */}
        <ellipse
          cx={115}
          cy={140}
          rx={35}
          ry={55}
          fill={lungColor}
          opacity={0.3}
          stroke={lungColor}
          strokeWidth={1.5}
          className={editing ? 'cursor-pointer' : ''}
          onClick={() => handleClick('poumons')}
          onMouseEnter={() => setHoveredOrgan('poumons')}
          onMouseLeave={() => setHoveredOrgan(null)}
        />
        {/* Right lung */}
        <ellipse
          cx={185}
          cy={140}
          rx={35}
          ry={55}
          fill={lungColor}
          opacity={0.3}
          stroke={lungColor}
          strokeWidth={1.5}
          className={editing ? 'cursor-pointer' : ''}
          onClick={() => handleClick('poumons')}
          onMouseEnter={() => setHoveredOrgan('poumons')}
          onMouseLeave={() => setHoveredOrgan(null)}
        />

        {/* Liver (right side of body = left on diagram) */}
        <ellipse
          cx={195}
          cy={215}
          rx={40}
          ry={25}
          fill={liverColor}
          opacity={0.35}
          stroke={liverColor}
          strokeWidth={1.5}
          className={editing ? 'cursor-pointer' : ''}
          onClick={() => handleClick('foie')}
          onMouseEnter={() => setHoveredOrgan('foie')}
          onMouseLeave={() => setHoveredOrgan(null)}
        />

        {/* Intestins */}
        <ellipse
          cx={150}
          cy={300}
          rx={50}
          ry={35}
          fill={intestinColor}
          opacity={0.3}
          stroke={intestinColor}
          strokeWidth={1.5}
          className={editing ? 'cursor-pointer' : ''}
          onClick={() => handleClick('intestins')}
          onMouseEnter={() => setHoveredOrgan('intestins')}
          onMouseLeave={() => setHoveredOrgan(null)}
        />

        {/* Left kidney */}
        <ellipse
          cx={110}
          cy={240}
          rx={15}
          ry={22}
          fill={kidneyColor}
          opacity={0.35}
          stroke={kidneyColor}
          strokeWidth={1.5}
          className={editing ? 'cursor-pointer' : ''}
          onClick={() => handleClick('reins')}
          onMouseEnter={() => setHoveredOrgan('reins')}
          onMouseLeave={() => setHoveredOrgan(null)}
        />
        {/* Right kidney */}
        <ellipse
          cx={190}
          cy={240}
          rx={15}
          ry={22}
          fill={kidneyColor}
          opacity={0.35}
          stroke={kidneyColor}
          strokeWidth={1.5}
          className={editing ? 'cursor-pointer' : ''}
          onClick={() => handleClick('reins')}
          onMouseEnter={() => setHoveredOrgan('reins')}
          onMouseLeave={() => setHoveredOrgan(null)}
        />

        {/* Labels */}
        <text x={150} y={135} textAnchor="middle" fill="#6B7280" fontSize={11} fontWeight={500}>Poumons</text>
        <text x={195} y={220} textAnchor="middle" fill="#6B7280" fontSize={11} fontWeight={500}>Foie</text>
        <text x={150} y={305} textAnchor="middle" fill="#6B7280" fontSize={11} fontWeight={500}>Intestins</text>
        <text x={110} y={275} textAnchor="middle" fill="#6B7280" fontSize={10}>Rein G</text>
        <text x={190} y={275} textAnchor="middle" fill="#6B7280" fontSize={10}>Rein D</text>

        {/* Tooltip */}
        {hoveredOrgan && (
          <g>
            <rect x={70} y={5} width={160} height={24} rx={6} fill="white" stroke="#E5E1DB" strokeWidth={1} />
            <text x={150} y={21} textAnchor="middle" fill="#2D3436" fontSize={11} fontWeight={600}>
              {hoveredOrgan === 'peau' ? 'Peau' : hoveredOrgan === 'poumons' ? 'Poumons' : hoveredOrgan === 'foie' ? 'Foie' : hoveredOrgan === 'intestins' ? 'Intestins' : 'Reins'}
              {' — '}
              {getStatusLabel(hoveredOrgan, (statuses as unknown as Record<string, string | null>)[hoveredOrgan])}
            </text>
          </g>
        )}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
        {[
          { color: '#5B8C6E', label: 'Fonctionnel' },
          { color: '#D4A060', label: 'Ralenti / Réactif' },
          { color: '#C4856C', label: 'Surchargé' },
          { color: '#D4738B', label: 'Bloqué' },
          { color: '#6B7280', label: 'Non évalué' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-stone">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
