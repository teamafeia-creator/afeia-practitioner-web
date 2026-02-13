'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { X, Search } from 'lucide-react';
import { cn } from '../../lib/cn';
import { supabase } from '../../lib/supabase';
import { BlockCard } from './BlockCard';
import type { Block, BlockSection, ConsultationMotif } from '../../lib/blocks-types';
import { ALL_MOTIFS, MOTIF_LABELS } from '../../lib/blocks-types';

interface BlockLibrarySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  section: BlockSection;
  sectionLabel: string;
  consultationMotif?: ConsultationMotif;
  onInsert: (content: string) => void;
}

export function BlockLibrarySidebar({
  isOpen,
  onClose,
  section,
  sectionLabel,
  consultationMotif,
  onInsert,
}: BlockLibrarySidebarProps) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [activeMotif, setActiveMotif] = useState<ConsultationMotif | null>(consultationMotif ?? null);
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  const fetchBlocks = useCallback(async (searchTerm: string, motif: ConsultationMotif | null) => {
    setLoading(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return;

      const params = new URLSearchParams({ section });
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      if (motif) params.set('motif', motif);

      const res = await fetch(`/api/blocks?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBlocks(data.blocks ?? []);
      }
    } catch (err) {
      console.error('Erreur chargement blocs:', err);
    } finally {
      setLoading(false);
    }
  }, [section]);

  useEffect(() => {
    if (isOpen) {
      fetchBlocks(search, activeMotif);
      setSelectedBlock(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleSearch = (value: string) => {
    setSearch(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      fetchBlocks(value, activeMotif);
    }, 200);
  };

  const handleMotifChange = (motif: ConsultationMotif | null) => {
    setActiveMotif(motif);
    fetchBlocks(search, motif);
  };

  const handleToggleFavorite = async (blockId: string) => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return;

      const res = await fetch(`/api/blocks/${blockId}/favorite`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setBlocks((prev) =>
          prev.map((b) =>
            b.id === blockId ? { ...b, is_favorite: !b.is_favorite } : b
          )
        );
      }
    } catch (err) {
      console.error('Erreur toggle favori:', err);
    }
  };

  // Lock body scroll when sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          'relative flex h-full w-full max-w-[420px] flex-col bg-white shadow-2xl',
          'animate-slide-in-right'
        )}
        style={{
          animation: 'slideInRight 0.25s ease-out',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-charcoal">Insérer un bloc</h3>
            <p className="text-xs text-stone">{sectionLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone hover:bg-neutral-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-neutral-100 px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Rechercher un bloc..."
              className="w-full rounded-lg border border-divider bg-cream py-2 pl-9 pr-3 text-sm text-charcoal placeholder:text-stone/60 focus:border-sage/30 focus:outline-none focus:ring-2 focus:ring-sage/10"
            />
          </div>
        </div>

        {/* Motif filters */}
        <div className="border-b border-neutral-100 px-4 py-2">
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            <button
              type="button"
              onClick={() => handleMotifChange(null)}
              className={cn(
                'shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition-colors',
                activeMotif === null
                  ? 'bg-sage text-white'
                  : 'bg-sage-light/50 text-sage hover:bg-sage-light'
              )}
            >
              Tous
            </button>
            {ALL_MOTIFS.map((motif) => (
              <button
                key={motif}
                type="button"
                onClick={() => handleMotifChange(motif)}
                className={cn(
                  'shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition-colors whitespace-nowrap',
                  activeMotif === motif
                    ? 'bg-sage text-white'
                    : 'bg-sage-light/50 text-sage hover:bg-sage-light'
                )}
              >
                {MOTIF_LABELS[motif]}
              </button>
            ))}
          </div>
        </div>

        {/* Blocks list */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-sage border-t-transparent" />
            </div>
          ) : blocks.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-stone">Aucun bloc trouvé pour cette section.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {blocks.map((block) => (
                <BlockCard
                  key={block.id}
                  block={block}
                  selected={selectedBlock?.id === block.id}
                  onSelect={setSelectedBlock}
                  onInsert={onInsert}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>
          )}
        </div>

        {/* Preview panel */}
        {selectedBlock && (
          <div className="border-t border-neutral-100 bg-cream px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-charcoal">{selectedBlock.title}</h4>
              <button
                type="button"
                onClick={() => onInsert(selectedBlock.content)}
                className="rounded-md bg-sage px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-sage-deep"
              >
                Insérer
              </button>
            </div>
            <div className="max-h-32 overflow-y-auto rounded-md bg-white p-2 text-xs text-charcoal whitespace-pre-line border border-divider">
              {selectedBlock.content}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
