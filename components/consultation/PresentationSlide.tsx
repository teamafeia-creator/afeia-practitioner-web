'use client';

import { motion } from 'framer-motion';

export function PresentationSlide({
  title,
  subtitle,
  children,
  slideNumber,
  totalSlides,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  slideNumber: number;
  totalSlides: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="min-h-screen bg-cream flex flex-col"
      style={{ backgroundColor: '#FBF7F2' }}
    >
      <div className="flex-1 flex flex-col px-8 py-10 md:px-16 md:py-14 lg:px-24 lg:py-16 max-w-[1200px] mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-semibold font-serif text-charcoal" style={{ color: '#2D3436', letterSpacing: '-0.02em' }}>
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-lg text-warmgray" style={{ color: '#6B7280' }}>
              {subtitle}
            </p>
          )}
        </div>
        <div className="flex-1">{children}</div>
      </div>

      <div className="text-right px-8 pb-4 md:px-16 lg:px-24">
        <span className="text-xs text-warmgray" style={{ color: '#6B7280' }}>
          {slideNumber} / {totalSlides}
        </span>
      </div>
    </motion.div>
  );
}
