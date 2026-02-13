'use client';

import { cn } from '../../lib/cn';

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'w-full min-h-[140px] rounded-sm border border-sage/20 bg-white/50 px-3.5 py-2.5 text-sm text-charcoal placeholder:text-stone/80 transition duration-200 focus:border-sage focus:outline-none focus:ring-[3px] focus:ring-sage/10',
        className
      )}
      {...props}
    />
  );
}
