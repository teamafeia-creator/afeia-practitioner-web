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
        'w-full rounded-sm border border-sage/20 bg-white/50 px-3.5 py-2.5 text-sm text-charcoal transition duration-200 focus:border-sage focus:outline-none focus:ring-[3px] focus:ring-sage/10',
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
      <span className="text-[13px] font-medium text-stone">{label}</span>
      <div className="mt-1">{field}</div>
      {hint ? <div className="mt-1 text-xs text-stone">{hint}</div> : null}
    </label>
  );
}
