'use client';

import { cn } from '../../lib/cn';

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'w-full min-h-[140px] rounded-sm border border-teal/20 bg-white/50 px-3.5 py-2.5 text-sm text-charcoal placeholder:text-warmgray/80 transition duration-200 focus:border-teal focus:outline-none focus:ring-[3px] focus:ring-teal/10',
        className
      )}
      {...props}
    />
  );
}
