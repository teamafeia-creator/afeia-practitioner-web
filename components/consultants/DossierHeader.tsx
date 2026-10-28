'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, Download, MessageSquare, MoreHorizontal, Pencil, Trash2, CalendarPlus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';

const SINCE_FORMATTER = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });

function getInitials(name?: string | null) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
}

export interface DossierHeaderProps {
  name?: string | null;
  age?: number | null;
  city?: string | null;
  /** Date de début du suivi (création ou activation du dossier). */
  followedSince?: string | null;
  isPremium: boolean;
  cycleTracking?: boolean;
  /** Pastille complémentaire (ex. phase du cycle, « Démo »). */
  extraBadges?: ReactNode;
  /** Actions secondaires spécifiques (ex. « Bilan visuel »). */
  extraActions?: ReactNode;
  onMessage?: () => void;
  onPlanSession?: () => void;
  onEdit?: () => void;
  onExport?: () => void;
  exporting?: boolean;
  onDelete?: () => void;
}

export function DossierHeader({
  name,
  age,
  city,
  followedSince,
  isPremium,
  cycleTracking,
  extraBadges,
  extraActions,
  onMessage,
  onPlanSession,
  onEdit,
  onExport,
  exporting,
  onDelete,
}: DossierHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [menuOpen]);

  const meta = [
    age ? `${age} ans` : null,
    city || null,
    followedSince ? `Suivi depuis ${SINCE_FORMATTER.format(new Date(followedSince))}` : null,
  ].filter(Boolean);

  const menuItems = [
    onEdit ? { label: 'Modifier', icon: Pencil, onClick: onEdit, danger: false } : null,
    onExport ? { label: exporting ? 'Export en cours…' : 'Exporter le dossier', icon: Download, onClick: onExport, danger: false } : null,
    onDelete ? { label: 'Supprimer', icon: Trash2, onClick: onDelete, danger: true } : null,
  ].filter(Boolean) as { label: string; icon: typeof Pencil; onClick: () => void; danger: boolean }[];

  return (
    <header className="space-y-4">
      <Link
        href="/consultants"
        className="inline-flex min-h-[44px] items-center gap-1.5 text-sm text-stone transition-colors hover:text-charcoal"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Consultants
      </Link>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div
            className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-full bg-sage-light text-lg font-semibold text-sage"
            aria-hidden="true"
          >
            {getInitials(name)}
          </div>
          <div className="min-w-0">
            <h1 className="truncate font-serif text-[30px] font-medium leading-tight text-charcoal">
              {name || 'Consultant sans nom'}
            </h1>
            {meta.length > 0 ? (
              <p className="mt-1 text-sm text-stone">{meta.join(' · ')}</p>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                  isPremium ? 'bg-terracotta-light text-terracotta' : 'bg-surface-raised text-stone'
                )}
              >
                {isPremium ? 'Premium' : 'Standard'}
              </span>
              {cycleTracking ? (
                <span className="inline-flex items-center rounded-full bg-sky/15 px-2.5 py-0.5 text-xs font-medium text-sky">
                  Cycle suivi
                </span>
              ) : null}
              {extraBadges}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {extraActions}
          {onMessage ? (
            <Button variant="outline" onClick={onMessage} icon={<MessageSquare className="h-4 w-4" aria-hidden="true" />}>
              Message
            </Button>
          ) : null}
          {onPlanSession ? (
            <Button variant="primary" onClick={onPlanSession} icon={<CalendarPlus className="h-4 w-4" aria-hidden="true" />}>
              Planifier une séance
            </Button>
          ) : null}
          {menuItems.length > 0 ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-divider bg-surface text-stone transition-colors hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/30"
                aria-label="Autres actions"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
              </button>
              {menuOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-divider bg-surface-raised py-1 shadow-lg"
                >
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.label}
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMenuOpen(false);
                          item.onClick();
                        }}
                        className={cn(
                          'flex min-h-[44px] w-full items-center gap-2.5 px-4 text-left text-sm transition-colors hover:bg-white/5',
                          item.danger ? 'text-rose' : 'text-charcoal'
                        )}
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
