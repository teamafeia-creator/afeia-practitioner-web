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
        'rounded-[28px] glass-panel px-5 py-6 md:px-8 md:py-7',
        className
      )}
    >
      {children}
    </section>
  );
}
