import { cn } from '../../lib/cn';

type Variant = 'default' | 'success' | 'warning' | 'urgent' | 'archived' |
  // Legacy aliases for backwards compatibility
  'info' | 'premium' | 'standard' | 'active' | 'new' | 'attention' | 'pending' | 'completed';

export function Badge({
  variant = 'default',
  className,
  children
}: {
  variant?: Variant;
  className?: string;
  children: React.ReactNode;
}) {
  // Map legacy variants to new 5-variant system
  const variantMap: Record<string, string> = {
    // New 5 variants
    default: 'bg-stone/10 text-stone border border-stone/20',
    success: 'bg-sage-light text-sage-dark border border-sage/20',
    warning: 'bg-gold/12 text-gold border border-gold/25',
    urgent: 'bg-rose/12 text-rose border border-rose/25',
    archived: 'bg-mist/15 text-mist border border-mist/25',
    // Legacy mappings
    info: 'bg-stone/10 text-stone border border-stone/20',
    premium: 'bg-terracotta-light text-terracotta-dark border border-terracotta/25',
    standard: 'bg-sage-light text-sage-dark border border-sage/20',
    active: 'bg-sage-light text-sage-dark border border-sage/20',
    new: 'bg-gold/12 text-gold border border-gold/25',
    attention: 'bg-gold/12 text-gold border border-gold/25',
    pending: 'bg-gold/12 text-gold border border-gold/25',
    completed: 'bg-sage-light text-sage-dark border border-sage/20'
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-2xl px-3 py-1 text-xs font-medium',
        variantMap[variant] || variantMap.default,
        className
      )}
    >
      {children}
    </span>
  );
}
