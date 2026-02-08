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
      'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/30 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const variants: Record<Variant, string> = {
      primary:
        'bg-sage text-white hover:bg-sage-dark',
      secondary:
        'bg-transparent border border-sage text-sage hover:bg-sage-light',
      ghost:
        'bg-transparent text-charcoal hover:bg-cream',
      destructive:
        'bg-rose text-white hover:bg-rose/90',
      success:
        'bg-success text-white hover:bg-success/90',
      outline:
        'border border-divider bg-white text-charcoal hover:border-sage hover:text-sage'
    };

    const sizes: Record<Size, string> = {
      sm: 'px-3 py-1.5 text-[13px]',
      md: 'px-4 py-2.5 text-[13px]',
      lg: 'px-6 py-3 text-sm'
    };

    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: disabled || loading ? 1 : 0.97 }}
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
