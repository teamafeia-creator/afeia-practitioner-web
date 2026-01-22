'use client';

import { cn } from '../../lib/cn';

type Variant = 'primary' | 'secondary' | 'cta' | 'ghost' | 'danger';

export function Button({
  variant = 'primary',
  loading = false,
  className,
  children,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/40 disabled:opacity-50 disabled:cursor-not-allowed';

  const styles: Record<Variant, string> = {
    primary: 'bg-teal text-white hover:bg-teal-deep shadow-soft',
    secondary: 'border border-teal text-teal hover:bg-teal/5',
    cta: 'bg-gold text-white hover:brightness-95 shadow-soft',
    ghost: 'text-marine hover:bg-sable',
    danger: 'bg-aubergine text-white hover:brightness-95 shadow-soft'
  };

  return (
    <button
      className={cn(base, styles[variant], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent"
        />
      ) : null}
      {children}
    </button>
  );
}
