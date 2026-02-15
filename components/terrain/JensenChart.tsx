'use client';

interface JensenChartProps {
  eye: 'left' | 'right';
  size?: number;
  opacity?: number;
  showLabels?: boolean;
}

// Organ labels by clock position (1-12) for each eye
const RIGHT_EYE_ORGANS: Record<number, string> = {
  12: 'Cerveau',
  1: 'Sinus',
  2: 'Poumon D',
  3: 'Foie',
  4: 'Rein D',
  5: 'Appendice',
  6: 'Ovaire D',
  7: 'Vés. bil.',
  8: 'Pancréas',
  9: 'Estomac',
  10: 'Cœur',
  11: 'Thyroïde',
};

const LEFT_EYE_ORGANS: Record<number, string> = {
  12: 'Cerveau',
  1: 'Thyroïde',
  2: 'Rate',
  3: 'Cœur',
  4: 'Rein G',
  5: 'Sigmoïde',
  6: 'Ovaire G',
  7: 'Estomac',
  8: 'Pancréas',
  9: 'Poumon G',
  10: 'Bronche G',
  11: 'Sinus',
};

const RIGHT_EYE_INNER = 'Côlon asc. / Int. grêle';
const LEFT_EYE_INNER = 'Côlon desc. / Int. grêle';

export function JensenChart({
  eye,
  size = 400,
  opacity = 0.6,
  showLabels = true,
}: JensenChartProps) {
  const organs = eye === 'right' ? RIGHT_EYE_ORGANS : LEFT_EYE_ORGANS;
  const innerLabel = eye === 'right' ? RIGHT_EYE_INNER : LEFT_EYE_INNER;

  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.46; // Iris border
  const collaretteR = size * 0.18; // Collarette (autonomic zone)
  const pupilR = size * 0.09; // Pupil
  const humoralR = size * 0.30; // Humoral zone
  const ciliaryR = size * 0.38; // Ciliary zone

  const lineColor = '#9CA3AF';
  const labelColor = '#6B7280';
  const dashArray = '4 4';

  // Calculate label position for each sector
  function getLabelPos(hour: number, radius: number) {
    // 12 o'clock = -90 degrees, clockwise
    const angleDeg = (hour * 30) - 90;
    const angleRad = (angleDeg * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(angleRad),
      y: cy + radius * Math.sin(angleRad),
      angle: angleDeg,
    };
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ opacity }}
      className="pointer-events-none"
    >
      {/* Background transparent */}

      {/* Outer iris circle */}
      <circle cx={cx} cy={cy} r={outerR} fill="none" stroke={lineColor} strokeWidth={1.5} />

      {/* Ciliary zone */}
      <circle cx={cx} cy={cy} r={ciliaryR} fill="none" stroke={lineColor} strokeWidth={0.5} strokeDasharray={dashArray} />

      {/* Humoral zone */}
      <circle cx={cx} cy={cy} r={humoralR} fill="none" stroke={lineColor} strokeWidth={0.5} strokeDasharray={dashArray} />

      {/* Collarette */}
      <circle cx={cx} cy={cy} r={collaretteR} fill="none" stroke={lineColor} strokeWidth={1} />

      {/* Pupil */}
      <circle cx={cx} cy={cy} r={pupilR} fill="rgba(0,0,0,0.1)" stroke={lineColor} strokeWidth={1} />

      {/* Radial lines (12 sectors) */}
      {Array.from({ length: 12 }, (_, i) => {
        const angleDeg = (i * 30) - 90;
        const angleRad = (angleDeg * Math.PI) / 180;
        const x1 = cx + pupilR * Math.cos(angleRad);
        const y1 = cy + pupilR * Math.sin(angleRad);
        const x2 = cx + outerR * Math.cos(angleRad);
        const y2 = cy + outerR * Math.sin(angleRad);
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={lineColor}
            strokeWidth={0.5}
            opacity={0.6}
          />
        );
      })}

      {/* Organ labels */}
      {showLabels && Object.entries(organs).map(([hourStr, label]) => {
        const hour = Number(hourStr);
        // Position labels between ciliary and outer zone
        const labelR = (ciliaryR + outerR) / 2;
        const pos = getLabelPos(hour, labelR);

        // Rotate text to follow the sector
        const textAngle = pos.angle + 90;

        return (
          <text
            key={hour}
            x={pos.x}
            y={pos.y}
            textAnchor="middle"
            dominantBaseline="central"
            fill={labelColor}
            fontSize={size * 0.025}
            fontWeight={500}
            transform={`rotate(${textAngle}, ${pos.x}, ${pos.y})`}
          >
            {label}
          </text>
        );
      })}

      {/* Inner zone label (intestins) */}
      {showLabels && (
        <text
          x={cx}
          y={cy + collaretteR * 0.55}
          textAnchor="middle"
          dominantBaseline="central"
          fill={labelColor}
          fontSize={size * 0.02}
          fontWeight={400}
        >
          {innerLabel}
        </text>
      )}
    </svg>
  );
}
