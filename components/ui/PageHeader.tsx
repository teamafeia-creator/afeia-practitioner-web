import { cn } from '../../lib/cn';

export function PageHeader({
  title,
  subtitle,
  actions,
  className
}: {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 md:flex-row md:items-center md:justify-between',
        className
      )}
    >
      <div>
        <h1 className="text-[28px] font-semibold font-serif text-charcoal" style={{ letterSpacing: '-0.02em' }}>{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-stone">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
