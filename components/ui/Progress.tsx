'use client';

import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';

interface ProgressBarProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  color?: 'teal' | 'emerald' | 'orange' | 'pink' | 'danger';
  showValue?: boolean;
  animated?: boolean;
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  size = 'md',
  color = 'teal',
  showValue = false,
  animated = true,
  className
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const sizes = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4'
  };

  const colors = {
    teal: 'bg-gradient-to-r from-sage to-sage-dark',
    emerald: 'bg-gradient-to-r from-emerald-400 to-emerald-600',
    orange: 'bg-gradient-to-r from-accent-orange to-orange-500',
    pink: 'bg-gradient-to-r from-accent-pink to-pink-600',
    danger: 'bg-gradient-to-r from-accent-danger to-red-600'
  };

  return (
    <div className={cn('w-full', className)}>
      <div
        className={cn(
          'w-full rounded-full bg-neutral-100 overflow-hidden',
          sizes[size]
        )}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{
            duration: animated ? 0.8 : 0,
            ease: 'easeOut'
          }}
          className={cn(
            'h-full rounded-full',
            colors[color],
            animated && 'shadow-sm'
          )}
        />
      </div>
      {showValue && (
        <div className="mt-1 flex justify-between text-xs text-neutral-500">
          <span>{value}</span>
          <span>{max}</span>
        </div>
      )}
    </div>
  );
}

interface ProgressCircleProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  strokeWidth?: number;
  color?: 'teal' | 'emerald' | 'orange' | 'pink' | 'danger';
  showValue?: boolean;
  label?: string;
  animated?: boolean;
  className?: string;
}

export function ProgressCircle({
  value,
  max = 100,
  size = 'md',
  strokeWidth = 8,
  color = 'teal',
  showValue = true,
  label,
  animated = true,
  className
}: ProgressCircleProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const sizes = {
    sm: 48,
    md: 64,
    lg: 80,
    xl: 120
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-lg',
    xl: 'text-2xl'
  };

  const colors = {
    teal: '#5B8C6E',
    emerald: '#10B981',
    orange: '#F59E0B',
    pink: '#EC4899',
    danger: '#EF4444'
  };

  const svgSize = sizes[size];
  const radius = (svgSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={svgSize}
        height={svgSize}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <motion.circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={radius}
          fill="none"
          stroke={colors[color]}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{
            duration: animated ? 1 : 0,
            ease: 'easeOut'
          }}
        />
      </svg>
      {(showValue || label) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {showValue && (
            <span className={cn('font-semibold text-charcoal', textSizes[size])}>
              {Math.round(percentage)}%
            </span>
          )}
          {label && (
            <span className="text-xs text-neutral-500 mt-0.5">{label}</span>
          )}
        </div>
      )}
    </div>
  );
}

interface StepsProgressProps {
  currentStep: number;
  totalSteps: number;
  labels?: string[];
  className?: string;
}

export function StepsProgress({
  currentStep,
  totalSteps,
  labels,
  className
}: StepsProgressProps) {
  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between">
        {Array.from({ length: totalSteps }).map((_, index) => (
          <div key={index} className="flex items-center flex-1">
            {/* Step circle */}
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                index < currentStep
                  ? 'bg-sage text-white'
                  : index === currentStep
                  ? 'bg-sage-light text-sage ring-2 ring-sage'
                  : 'bg-neutral-100 text-neutral-400'
              )}
            >
              {index < currentStep ? (
                <svg className="w-4 h-4\" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                index + 1
              )}
            </motion.div>

            {/* Connector line */}
            {index < totalSteps - 1 && (
              <div className="flex-1 h-0.5 mx-2 bg-neutral-200">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: index < currentStep ? '100%' : '0%' }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="h-full bg-sage"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {labels && (
        <div className="flex justify-between mt-2">
          {labels.map((label, index) => (
            <span
              key={index}
              className={cn(
                'text-xs',
                index <= currentStep ? 'text-charcoal' : 'text-neutral-400'
              )}
            >
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
