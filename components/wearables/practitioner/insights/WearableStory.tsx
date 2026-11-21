'use client';

// Lecture guidée de l'objet connecté : une idée par écran, dans l'ordre où un praticien lit une fiche
// (la nuit dernière → la semaine → le rythme → depuis la séance → le ressenti → ce qui aide).
// Même navigation que le Bilan visuel : pastilles numérotées, précédent / suivant, flèches du clavier.
// « Tout afficher » empile les écrans pour une lecture continue ou une impression.
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export type StoryScreen = {
  key: string;
  /** Libellé court dans la navigation. */
  label: string;
  title: string;
  subtitle?: string;
  /** L'essentiel : une phrase, affichée en tête de l'écran. */
  essential: string | null;
  /** Ton de l'essentiel : repère visuel seulement, jamais un jugement. */
  tone?: 'good' | 'watch' | 'flat';
  content: ReactNode;
};

const TONE_BORDER = { good: 'border-sage', watch: 'border-[#E8A87C]', flat: 'border-divider' } as const;

export function WearableStory({ screens, storageKey = 'afeia:objet-connecte:tout-afficher' }: { screens: StoryScreen[]; storageKey?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fromUrl = searchParams.get('ecran');
  const initial = Math.max(0, screens.findIndex((s) => s.key === fromUrl));
  const [index, setIndex] = useState(initial);
  const [all, setAll] = useState(false);

  useEffect(() => {
    try {
      setAll(window.localStorage.getItem(storageKey) === '1');
    } catch {
      /* stockage indisponible */
    }
  }, [storageKey]);

  const go = useCallback(
    (i: number) => {
      const next = Math.min(Math.max(i, 0), screens.length - 1);
      setIndex(next);
      const params = new URLSearchParams(searchParams.toString());
      params.set('ecran', screens[next].key);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, screens, searchParams]
  );

  const toggleAll = () => {
    const next = !all;
    setAll(next);
    try {
      window.localStorage.setItem(storageKey, next ? '1' : '0');
    } catch {
      /* ignoré */
    }
  };

  const onKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (all) return;
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (e.key === 'ArrowLeft') go(index - 1);
      else if (e.key === 'ArrowRight') go(index + 1);
    },
    [all, go, index]
  );

  const current = useMemo(() => screens[Math.min(index, screens.length - 1)], [index, screens]);

  return (
    <div className="flex flex-col gap-5 outline-none" tabIndex={0} onKeyDown={onKey} data-testid="wearable-story" data-screen={current?.key}>
      {/* Navigation */}
      <nav aria-label="Écrans de l’objet connecté" className="flex flex-wrap items-center gap-2">
        {screens.map((s, i) => {
          const on = !all && i === index;
          return (
            <button
              key={s.key}
              type="button"
              aria-current={on ? 'step' : undefined}
              onClick={() => {
                if (all) {
                  document.getElementById(`story-${s.key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } else go(i);
              }}
              className={`inline-flex h-9 items-center gap-2 rounded-full border px-3 text-[13px] transition ${on ? 'border-sage bg-[#1A2B2A] font-semibold text-charcoal' : 'border-divider bg-surface text-stone hover:text-charcoal'}`}
            >
              <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold ${on ? 'bg-sage text-ink' : 'bg-[#1F2633] text-[#B8C1CF]'}`}>{i + 1}</span>
              {s.label}
            </button>
          );
        })}
        <span className="flex-1" />
        <button type="button" onClick={toggleAll} aria-pressed={all} className="text-[13px] text-stone hover:text-charcoal">
          {all ? 'Un écran à la fois' : 'Tout afficher'}
        </button>
      </nav>

      {all ? (
        <div className="flex flex-col gap-10">
          {screens.map((s, i) => (
            <Screen key={s.key} s={s} i={i} total={screens.length} />
          ))}
        </div>
      ) : (
        <>
          <Screen s={current} i={index} total={screens.length} />
          <div className="flex items-center justify-between border-t border-divider pt-4">
            <button
              type="button"
              onClick={() => go(index - 1)}
              disabled={index === 0}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-charcoal disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden /> Précédent
            </button>
            <span className="text-xs text-stone">
              {index + 1} / {screens.length}
            </span>
            <button
              type="button"
              onClick={() => go(index + 1)}
              disabled={index === screens.length - 1}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-charcoal disabled:opacity-30"
            >
              Suivant <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Screen({ s, i, total }: { s: StoryScreen; i: number; total: number }) {
  return (
    <section id={`story-${s.key}`} aria-labelledby={`story-${s.key}-t`} className="flex flex-col gap-4 scroll-mt-24" data-testid={`story-${s.key}`}>
      <header className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-[0.04em] text-stone">
          {i + 1} / {total}
        </span>
        <h2 id={`story-${s.key}-t`} className="font-serif text-[26px] font-medium leading-tight text-charcoal">
          {s.title}
        </h2>
        {s.subtitle ? <p className="text-sm text-stone">{s.subtitle}</p> : null}
      </header>
      {s.essential ? (
        <p className={`rounded-r-xl border-l-[3px] bg-surface px-4 py-3 text-[15px] leading-snug text-charcoal ${TONE_BORDER[s.tone ?? 'flat']}`} data-testid="story-essential">
          {s.essential}
        </p>
      ) : null}
      <div className="flex flex-col gap-5">{s.content}</div>
    </section>
  );
}
