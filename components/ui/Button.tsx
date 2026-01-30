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
      'inline-flex items-center justify-center gap-2 rounded-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const variants: Record<Variant, string> = {
      primary:
        'bg-gradient-to-br from-teal to-teal-deep text-white hover:shadow-teal-glow focus-visible:ring-teal/50',
      secondary:
        'bg-transparent border border-teal text-teal hover:bg-teal hover:text-white focus-visible:ring-teal/30',
      ghost:
        'bg-transparent text-charcoal hover:bg-sable/70 focus-visible:ring-teal/30',
      destructive:
        'bg-gradient-to-br from-accent-danger to-red-600 text-white hover:shadow-lg hover:shadow-red-500/30 focus-visible:ring-red-500/50',
      success:
        'bg-gradient-to-br from-sage to-green-600 text-white hover:shadow-lg hover:shadow-green-500/30 focus-visible:ring-green-500/50',
      outline:
        'border border-teal/30 bg-white text-teal hover:border-teal hover:bg-teal/5 focus-visible:ring-teal/30'
    };

    const sizes: Record<Size, string> = {
      sm: 'px-3 py-1.5 text-[13px]',
      md: 'px-4 py-2.5 text-[13px]',
      lg: 'px-6 py-3 text-sm'
    };

    return (
      <motion.button
        ref={ref}
        whileHover={{ y: disabled || loading ? 0 : -1 }}
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
