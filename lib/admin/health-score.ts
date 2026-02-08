export type HealthScoreBreakdown = {
  total: number;
  connectionScore: number;
  consultantsScore: number;
  usageScore: number;
  paymentScore: number;
  tenureScore: number;
  color: 'green' | 'yellow' | 'red';
};

type HealthScoreInput = {
  lastLoginAt: string | null;
  consultantsCount: number;
  featuresUsedThisMonth: number;
  totalFeatures: number;
  paymentStatus: 'ok' | 'late_short' | 'late_long' | 'free';
  createdAt: string;
};

function computeConnectionScore(lastLoginAt: string | null): number {
  if (!lastLoginAt) return 0;
  const daysSince = Math.floor(
    (Date.now() - new Date(lastLoginAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysSince <= 7) return 100;
  if (daysSince <= 14) return 60;
  if (daysSince <= 30) return 30;
  return 0;
}

function computeConsultantsScore(count: number): number {
  if (count >= 5) return 100;
  if (count >= 3) return 70;
  if (count >= 1) return 40;
  return 0;
}

function computeUsageScore(featuresUsed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((featuresUsed / total) * 100);
}

function computePaymentScore(status: string): number {
  switch (status) {
    case 'ok':
    case 'free':
      return 100;
    case 'late_short':
      return 50;
    case 'late_long':
      return 0;
    default:
      return 100;
  }
}

function computeTenureScore(createdAt: string): number {
  const months = Math.floor(
    (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30)
  );
  if (months > 6) return 100;
  if (months >= 3) return 70;
  if (months >= 1) return 50;
  return 30;
}

export function computeHealthScore(input: HealthScoreInput): HealthScoreBreakdown {
  const connectionScore = computeConnectionScore(input.lastLoginAt);
  const consultantsScore = computeConsultantsScore(input.consultantsCount);
  const usageScore = computeUsageScore(input.featuresUsedThisMonth, input.totalFeatures);
  const paymentScore = computePaymentScore(input.paymentStatus);
  const tenureScore = computeTenureScore(input.createdAt);

  const total = Math.round(
    connectionScore * 0.25 +
    consultantsScore * 0.20 +
    usageScore * 0.20 +
    paymentScore * 0.20 +
    tenureScore * 0.15
  );

  let color: 'green' | 'yellow' | 'red' = 'green';
  if (total < 40) color = 'red';
  else if (total < 70) color = 'yellow';

  return {
    total,
    connectionScore,
    consultantsScore,
    usageScore,
    paymentScore,
    tenureScore,
    color,
  };
}
