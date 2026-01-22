'use client';

import { cn } from '../../lib/cn';

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
};

export function Input({ className, label, hint, id, ...props }: Props) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  const field = (
    <input
      id={inputId}
      className={cn(
        'w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-charcoal placeholder:text-warmgray focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal',
        className
      )}
      {...props}
    />
  );

  if (!label) return field;

  return (
    <label className="block">
      <span className="text-xs font-medium text-warmgray">{label}</span>
      <div className="mt-1">{field}</div>
      {hint ? <div className="mt-1 text-xs text-warmgray">{hint}</div> : null}
    </label>
  );
}
