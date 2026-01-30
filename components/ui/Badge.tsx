import { cn } from '../../lib/cn';

type Variant = 'info' | 'premium' | 'standard' | 'active' | 'new' | 'success' | 'attention' | 'urgent' | 'pending' | 'completed' | 'archived';

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
    info: 'bg-teal/8 text-teal border border-teal/15',
    premium: 'bg-aubergine/12 text-aubergine border border-aubergine/20',
    standard: 'bg-teal/8 text-teal border border-teal/15',
    active: 'bg-teal/10 text-teal border border-teal/20',
    new: 'bg-gold/15 text-gold border border-gold/30',
    success: 'bg-sage/15 text-sage border border-sage/30',
    attention: 'bg-gold/15 text-gold border border-gold/30',
    urgent: 'bg-gold/15 text-gold border border-gold/30',
    pending: 'bg-gold/15 text-gold border border-gold/30',
    completed: 'bg-sage/15 text-sage border border-sage/30',
    archived: 'bg-warmgray/15 text-warmgray border border-warmgray/25'
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm px-3 py-1 text-[11px] font-semibold uppercase tracking-wide',
        styles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
