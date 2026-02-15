'use client';

import { cn } from '../../lib/cn';

type Props = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  hint?: string;
};

export function Textarea({ className, label, hint, id, ...props }: Props) {
  const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  const field = (
    <textarea
      id={textareaId}
      className={cn(
        'w-full min-h-[140px] rounded-sm border border-sage/20 bg-white/50 px-3.5 py-2.5 text-sm text-charcoal placeholder:text-stone/80 transition duration-200 focus:border-sage focus:outline-none focus:ring-[3px] focus:ring-sage/10',
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
