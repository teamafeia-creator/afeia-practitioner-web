import { cn } from '../../lib/cn';

type Variant = 'info' | 'premium' | 'standard' | 'active' | 'new' | 'success' | 'attention';

export function Badge({
  variant = 'info',
  className,
  children
}: {
  variant?: Variant;
  className?: string;
  children: React.ReactNode;
}) {
  const styles: Record<Variant, string> = {
    info: 'bg-teal/5 text-teal ring-1 ring-teal/20',
    premium: 'bg-aubergine/10 text-aubergine ring-1 ring-aubergine/20',
    standard: 'bg-sage/15 text-marine ring-1 ring-sage/25',
    active: 'bg-teal/10 text-teal ring-1 ring-teal/30',
    new: 'bg-gold/15 text-marine ring-1 ring-gold/25',
    success: 'bg-sage/15 text-marine ring-1 ring-sage/25',
    attention: 'bg-gold/15 text-marine ring-1 ring-gold/25'
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
        styles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
