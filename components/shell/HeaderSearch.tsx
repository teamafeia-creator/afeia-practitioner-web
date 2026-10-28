'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

/** Recherche d'en-tête : Entrée ouvre la liste des consultants filtrée ; ⌘K / Ctrl+K donne le focus. */
export function HeaderSearch() {
  const router = useRouter();
  const ref = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState('');
  const [mac, setMac] = useState(true);

  useEffect(() => {
    setMac(/Mac|iPhone|iPad/.test(navigator.platform));
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const term = q.trim();
        router.push(term ? `/consultants?q=${encodeURIComponent(term)}` : '/consultants');
      }}
      className="hidden h-11 max-w-[420px] flex-[1_1_280px] items-center gap-2.5 rounded-[10px] border border-divider bg-surface px-3.5 text-sm text-stone focus-within:border-sage md:flex"
    >
      <Search className="h-4 w-4 flex-none" aria-hidden="true" />
      <label htmlFor="header-search" className="sr-only">Rechercher</label>
      <input
        id="header-search"
        ref={ref}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Rechercher un consultant, une fiche…"
        className="min-w-0 flex-1 bg-transparent text-charcoal outline-none placeholder:text-stone"
      />
      <kbd className="rounded-md border border-divider px-1.5 py-0.5 font-sans text-xs">{mac ? '⌘K' : 'Ctrl K'}</kbd>
    </form>
  );
}
