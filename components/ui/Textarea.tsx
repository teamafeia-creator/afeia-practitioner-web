'use client';

import { cn } from '../../lib/cn';

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'w-full min-h-[140px] rounded-2xl border border-black/10 bg-white/90 px-3 py-2 text-sm text-charcoal placeholder:text-warmgray/80 shadow-sm transition duration-200 focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/25',
        className
      )}
      {...props}
    />
  );
}
