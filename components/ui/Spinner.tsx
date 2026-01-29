'use client';

import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'teal' | 'white' | 'neutral';
  className?: string;
}

export function Spinner({ size = 'md', color = 'teal', className }: SpinnerProps) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  };

  const colors = {
    teal: 'border-teal',
    white: 'border-white',
    neutral: 'border-neutral-400'
  };

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-t-transparent',
        sizes[size],
        colors[color],
        className
      )}
    />
  );
}

interface LoadingOverlayProps {
  message?: string;
  fullScreen?: boolean;
}

export function LoadingOverlay({ message, fullScreen = false }: LoadingOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        'flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-50',
        fullScreen ? 'fixed inset-0' : 'absolute inset-0 rounded-2xl'
      )}
    >
      <Spinner size="xl" />
      {message && (
        <p className="mt-4 text-sm text-neutral-600 animate-pulse">{message}</p>
      )}
    </motion.div>
  );
}

interface PulseDotsProps {
  color?: 'teal' | 'white' | 'neutral';
  className?: string;
}

export function PulseDots({ color = 'teal', className }: PulseDotsProps) {
  const colors = {
    teal: 'bg-teal',
    white: 'bg-white',
    neutral: 'bg-neutral-400'
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={cn('w-2 h-2 rounded-full', colors[color])}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.15
          }}
        />
      ))}
    </div>
  );
}

export function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sable via-white to-teal/5 flex flex-col items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        {/* Logo placeholder - animated */}
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-teal to-teal-deep flex items-center justify-center shadow-glow"
        >
          <span className="text-3xl font-bold text-white">A</span>
        </motion.div>

        <h2 className="text-xl font-semibold text-charcoal mb-2">AFEIA</h2>
        <p className="text-sm text-neutral-500 mb-6">Chargement en cours...</p>

        <PulseDots />
      </motion.div>
    </div>
  );
}
