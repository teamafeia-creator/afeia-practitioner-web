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
        'w-full rounded-sm border border-teal/20 bg-white/50 px-3.5 py-2.5 text-sm text-charcoal transition duration-200 focus:border-teal focus:outline-none focus:ring-[3px] focus:ring-teal/10',
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
      <span className="text-[13px] font-medium text-warmgray">{label}</span>
      <div className="mt-1">{field}</div>
      {hint ? <div className="mt-1 text-xs text-warmgray">{hint}</div> : null}
    </label>
  );
}
