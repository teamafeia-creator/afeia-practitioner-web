'use client';

import { motion, HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';
import { forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'success' | 'outline';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'ref'> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      iconPosition = 'left',
      className,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const variants: Record<Variant, string> = {
      primary:
        'bg-gradient-to-r from-teal to-teal-deep text-white hover:from-teal-deep hover:to-teal shadow-lg shadow-teal/30 focus-visible:ring-teal/50',
      secondary:
        'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/30 focus-visible:ring-emerald-500/50',
      ghost:
        'bg-transparent text-marine hover:bg-sable/70 focus-visible:ring-teal/30',
      destructive:
        'bg-gradient-to-r from-accent-danger to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/30 focus-visible:ring-red-500/50',
      success:
        'bg-gradient-to-r from-accent-success to-green-600 text-white hover:from-green-600 hover:to-green-700 shadow-lg shadow-green-500/30 focus-visible:ring-green-500/50',
      outline:
        'border-2 border-teal/30 bg-white text-teal hover:border-teal/50 hover:bg-teal/5 focus-visible:ring-teal/30'
    };

    const sizes: Record<Size, string> = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2.5 text-sm',
      lg: 'px-6 py-3 text-base'
    };

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
        whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        className={cn(baseClasses, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            {icon && iconPosition === 'left' && icon}
            {children}
            {icon && iconPosition === 'right' && icon}
          </>
        )}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
export type { ButtonProps };
