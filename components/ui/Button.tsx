'use client';

import { cn } from '../../lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';

export function Button({
  variant = 'primary',
  loading = false,
  className,
  children,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/30 focus-visible:ring-offset-2 focus-visible:ring-offset-sable/40 disabled:opacity-50 disabled:cursor-not-allowed';

  const styles: Record<Variant, string> = {
    primary: 'bg-teal text-white hover:bg-teal-deep shadow-[0_10px_26px_rgba(42,128,128,0.18)]',
    secondary:
      'border border-teal/30 bg-white text-teal hover:border-teal/50 hover:bg-teal/5 shadow-sm',
    ghost: 'text-marine hover:bg-sable/70',
    destructive: 'bg-aubergine text-white hover:brightness-95 shadow-[0_10px_26px_rgba(133,0,79,0.2)]'
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
