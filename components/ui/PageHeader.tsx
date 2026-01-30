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
        'flex flex-col gap-4 rounded-lg glass-card px-5 py-4 md:flex-row md:items-center md:justify-between',
        className
      )}
    >
      <div>
        <h1 className="text-xl font-semibold text-charcoal tracking-tight">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-warmgray">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
