import { cn } from '../../lib/cn';

export function EmptyState({
  title,
  description,
  icon,
  action,
  className
}: {
  title: string;
  description?: string;
  icon?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-[20px] bg-white/70 px-5 py-6 text-center text-sm text-marine shadow-sm ring-1 ring-black/5',
        className
      )}
    >
      {icon ? (
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sable text-lg">
          {icon}
        </span>
      ) : null}
      <div>
        <p className="text-sm font-semibold text-charcoal">{title}</p>
        {description ? <p className="mt-1 text-xs text-warmgray">{description}</p> : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}
