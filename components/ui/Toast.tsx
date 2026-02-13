'use client';

import { useEffect } from 'react';
import { cn } from '../../lib/cn';

type ToastVariant = 'success' | 'error' | 'info';

type ToastProps = {
  title: string;
  description?: string | null;
  variant?: ToastVariant;
  onClose: () => void;
  autoCloseMs?: number;
};

export function Toast({
  title,
  description,
  variant = 'info',
  onClose,
  autoCloseMs = 4500
}: ToastProps) {
  useEffect(() => {
    if (!autoCloseMs) return;
    const timer = setTimeout(onClose, autoCloseMs);
    return () => clearTimeout(timer);
  }, [autoCloseMs, onClose]);

  const variantStyles: Record<ToastVariant, string> = {
    success: 'border-sage/30 bg-sage text-white',
    error: 'border-aubergine/30 bg-terracotta text-white',
    info: 'border-marine/30 bg-marine text-white'
  };

  return (
    <div className="fixed right-4 top-4 z-50 w-[min(90vw,380px)]">
      <div
        className={cn(
          'rounded-2xl border px-4 py-3 shadow-soft',
          variantStyles[variant]
        )}
        role="status"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">{title}</p>
            {description ? <p className="mt-1 text-xs opacity-90">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs uppercase tracking-wide opacity-80 hover:opacity-100"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
