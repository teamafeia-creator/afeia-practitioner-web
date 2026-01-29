'use client';

import { cn } from '../../lib/cn';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({
  className,
  variant = 'text',
  width,
  height,
  animation = 'pulse'
}: SkeletonProps) {
  const variants = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-xl'
  };

  const animations = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: ''
  };

  return (
    <div
      className={cn(
        'bg-neutral-200',
        variants[variant],
        animations[animation],
        className
      )}
      style={{
        width: width,
        height: height
      }}
    />
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('bg-white rounded-2xl p-5 shadow-card space-y-4', className)}>
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1 space-y-2">
          <Skeleton width="60%" height={16} />
          <Skeleton width="40%" height={12} />
        </div>
      </div>
      <Skeleton height={60} variant="rounded" />
      <div className="flex gap-2">
        <Skeleton width={80} height={32} variant="rounded" />
        <Skeleton width={80} height={32} variant="rounded" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4 pb-3 border-b border-neutral-100">
        <Skeleton width={40} height={16} />
        <Skeleton width="30%" height={16} />
        <Skeleton width="20%" height={16} />
        <Skeleton width="15%" height={16} />
        <Skeleton width="15%" height={16} />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-3">
          <Skeleton variant="circular" width={32} height={32} />
          <Skeleton width="30%" height={14} />
          <Skeleton width="20%" height={14} />
          <Skeleton width="15%" height={14} />
          <Skeleton width={60} height={24} variant="rounded" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-card">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton width={100} height={12} />
                <Skeleton width={60} height={28} />
              </div>
              <Skeleton variant="circular" width={48} height={48} />
            </div>
          </div>
        ))}
      </div>

      {/* Chart and list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-card">
          <Skeleton width={150} height={20} className="mb-4" />
          <Skeleton height={200} variant="rounded" />
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-card space-y-4">
          <Skeleton width={120} height={20} />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton variant="circular" width={40} height={40} />
              <div className="flex-1 space-y-1">
                <Skeleton width="80%" height={14} />
                <Skeleton width="50%" height={12} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonList({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm"
        >
          <Skeleton variant="circular" width={48} height={48} />
          <div className="flex-1 space-y-2">
            <Skeleton width="60%" height={16} />
            <Skeleton width="40%" height={12} />
          </div>
          <Skeleton width={80} height={32} variant="rounded" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonMessage() {
  return (
    <div className="space-y-4">
      {/* Incoming message */}
      <div className="flex gap-3">
        <Skeleton variant="circular" width={36} height={36} />
        <div className="space-y-1">
          <Skeleton width={200} height={60} variant="rounded" />
          <Skeleton width={60} height={10} />
        </div>
      </div>
      {/* Outgoing message */}
      <div className="flex gap-3 justify-end">
        <div className="space-y-1 text-right">
          <Skeleton width={180} height={40} variant="rounded" className="ml-auto" />
          <Skeleton width={60} height={10} className="ml-auto" />
        </div>
      </div>
      {/* Incoming message */}
      <div className="flex gap-3">
        <Skeleton variant="circular" width={36} height={36} />
        <div className="space-y-1">
          <Skeleton width={250} height={80} variant="rounded" />
          <Skeleton width={60} height={10} />
        </div>
      </div>
    </div>
  );
}
