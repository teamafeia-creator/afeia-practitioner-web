import { cn } from '../../lib/cn';

export function TabsPills<T extends string>({
  tabs,
  active,
  onChange,
  className
}: {
  tabs: readonly T[];
  active: T;
  onChange: (tab: T) => void;
  className?: string;
}) {
  return (
    <div className={cn('relative', className)}>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => onChange(tab)}
            className={cn(
              'whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition duration-200',
              active === tab
                ? 'bg-teal/10 text-teal shadow-sm ring-1 ring-teal/20'
                : 'text-warmgray hover:bg-sable/60 hover:text-marine'
            )}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="pointer-events-none absolute left-0 top-0 h-full w-8 bg-gradient-to-r from-sable/70 to-transparent sm:hidden" />
      <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-sable/70 to-transparent sm:hidden" />
    </div>
  );
}
