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
        'w-full rounded-sm border border-teal/20 bg-white/50 px-3.5 py-2.5 text-sm text-charcoal placeholder:text-warmgray/80 transition duration-200 focus:border-teal focus:outline-none focus:ring-[3px] focus:ring-teal/10',
        className
      )}
      {...props}
    />
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
