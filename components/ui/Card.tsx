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
      default: 'bg-white border border-divider shadow-card',
      hover: 'bg-white border border-divider shadow-card hover:shadow-card-hover',
      selected: 'bg-white border-2 border-sage shadow-card',
      gradient: 'bg-white border border-divider shadow-card'
    };

    if (interactive) {
      return (
        <motion.div
          ref={ref}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          className={cn(
            'rounded-xl p-5 transition-shadow duration-200 cursor-pointer',
            variants[variant],
            'hover:shadow-card-hover',
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
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={cn(
          'rounded-xl transition-shadow duration-200',
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
        gradient && 'bg-sage-light/50 rounded-t-xl p-5',
        className
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn('text-base font-semibold text-charcoal tracking-tight', className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-[13px] text-stone mt-1', className)}
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
