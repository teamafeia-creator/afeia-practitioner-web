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
        'w-full rounded-[10px] border border-divider bg-white px-3.5 py-2.5 text-sm text-charcoal placeholder:text-mist transition duration-150 focus:border-sage focus:outline-none focus:ring-2 focus:ring-sage/20',
        className
      )}
      {...props}
    />
  );

  if (!label) return field;

  return (
    <label className="block">
      <span className="text-xs font-medium text-stone">{label}</span>
      <div className="mt-1">{field}</div>
      {hint ? <div className="mt-1 text-xs text-stone">{hint}</div> : null}
    </label>
  );
}
