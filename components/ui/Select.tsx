'use client';

import { cn } from '../../lib/cn';

type Props = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  hint?: string;
};

export function Select({ className, label, hint, id, children, ...props }: Props) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  const field = (
    <select
      id={selectId}
      className={cn(
        'w-full rounded-2xl border border-black/10 bg-white/90 px-3 py-2 text-sm text-charcoal shadow-sm transition duration-200 focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/25',
        className
      )}
      {...props}
    >
      {children}
    </select>
  );

  if (!label) return field;

  return (
    <label className="block">
      <span className="text-xs font-medium text-marine/80">{label}</span>
      <div className="mt-1">{field}</div>
      {hint ? <div className="mt-1 text-xs text-warmgray">{hint}</div> : null}
    </label>
  );
}
