'use client';

import { useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export function PresentationNav({
  currentSlide,
  totalSlides,
  slideLabels,
  onNavigate,
  onExit,
}: {
  currentSlide: number;
  totalSlides: number;
  slideLabels: string[];
  onNavigate: (index: number) => void;
  onExit: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' && currentSlide > 0) {
        onNavigate(currentSlide - 1);
      } else if (e.key === 'ArrowRight' && currentSlide < totalSlides - 1) {
        onNavigate(currentSlide + 1);
      } else if (e.key === 'Escape') {
        onExit();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide, totalSlides, onNavigate, onExit]);

  return (
    <>
      {/* Exit button */}
      <button
        onClick={onExit}
        className="fixed top-4 left-4 z-50 flex items-center gap-1 rounded-lg bg-white/80 backdrop-blur px-3 py-2 text-sm text-charcoal shadow-sm hover:bg-white transition-colors"
        style={{ color: '#2D3436' }}
      >
        <X className="h-4 w-4" />
        Quitter
      </button>

      {/* Bottom nav bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur border-t border-divider">
        <div className="flex items-center justify-between px-6 py-3 max-w-[1200px] mx-auto">
          <button
            onClick={() => onNavigate(currentSlide - 1)}
            disabled={currentSlide === 0}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-charcoal disabled:opacity-30 hover:bg-cream transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Précédent
          </button>

          <div className="flex items-center gap-1.5">
            {slideLabels.map((label, i) => (
              <button
                key={i}
                onClick={() => onNavigate(i)}
                title={label}
                className={`h-8 w-8 rounded-full text-xs font-medium transition-colors ${
                  i === currentSlide
                    ? 'text-white'
                    : 'bg-gray-100 text-warmgray hover:bg-gray-200'
                }`}
                style={i === currentSlide ? { backgroundColor: '#5B8C6E' } : undefined}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <button
            onClick={() => onNavigate(currentSlide + 1)}
            disabled={currentSlide === totalSlides - 1}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-charcoal disabled:opacity-30 hover:bg-cream transition-colors"
          >
            Suivant
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );
}
