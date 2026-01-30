'use client';

import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '../../lib/cn';
import { forwardRef } from 'react';

interface CardProps extends Omit<HTMLMotionProps<'div'>, 'ref'> {
  variant?: 'default' | 'hover' | 'selected' | 'gradient';
  interactive?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', interactive = false, children, ...props }, ref) => {
    const variants = {
      default: 'glass-card',
      hover: 'glass-card hover:shadow-teal-hover hover:border-teal/20',
      selected: 'glass-card ring-2 ring-teal',
      gradient: 'bg-gradient-to-br from-white/70 to-sable/40 backdrop-blur-md shadow-md ring-1 ring-white/50'
    };

    if (interactive) {
      return (
        <motion.div
          ref={ref}
          whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(26, 108, 108, 0.12)' }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          className={cn(
            'rounded-lg p-5 transition-all duration-200 cursor-pointer',
            variants[variant],
            className
          )}
          {...props}
        >
          {children}
        </motion.div>
      );
    }

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={cn(
          'rounded-lg transition-all duration-200',
          variants[variant],
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

Card.displayName = 'Card';

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  gradient?: boolean;
}

function CardHeader({ className, gradient, ...props }: CardHeaderProps) {
  return (
    <div
      className={cn(
        'p-5 pb-0',
        gradient && 'bg-gradient-to-r from-teal/5 to-teal-light rounded-t-lg p-5',
        className
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn('text-lg font-semibold text-charcoal tracking-tight', className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-sm text-warmgray mt-1', className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5', className)} {...props} />;
}

function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('p-5 pt-0 flex items-center gap-3', className)}
      {...props}
    />
  );
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
export type { CardProps };
