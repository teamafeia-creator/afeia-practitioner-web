import { cn } from '../../lib/cn';

export function PageShell({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'rounded-[28px] bg-gradient-to-b from-sable/80 via-white/90 to-white px-5 py-6 shadow-soft ring-1 ring-black/5 md:px-8 md:py-7',
        className
      )}
    >
      {children}
    </section>
  );
}
