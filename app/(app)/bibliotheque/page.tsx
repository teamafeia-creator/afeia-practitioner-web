'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Search, Star, Grid3X3, List } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { BlockForm } from '@/components/blocks/BlockForm';
import { ConfirmModal } from '@/components/ui/Modal';
import {
  BLOCK_SECTIONS,
  BLOCK_SECTION_LABELS,
  ALL_MOTIFS,
  MOTIF_LABELS,
  type Block,
  type BlockSection,
  type ConsultationMotif,
} from '@/lib/blocks-types';

type ViewMode = 'section' | 'motif';

export default function BibliotequePage() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('section');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<Block | null>(null);
  const [deleteBlock, setDeleteBlock] = useState<Block | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchBlocks = useCallback(async () => {
    setLoading(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return;

      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (showFavorites) params.set('favorite', 'true');
      if (activeFilter) {
        if (viewMode === 'section') params.set('section', activeFilter);
        else params.set('motif', activeFilter);
      }

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
  }, [search, showFavorites, activeFilter, viewMode]);

  useEffect(() => {
    const timeout = setTimeout(fetchBlocks, 200);
    return () => clearTimeout(timeout);
  }, [fetchBlocks]);

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

  const handleDelete = async () => {
    if (!deleteBlock) return;
    setDeleting(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return;

      const res = await fetch(`/api/blocks/${deleteBlock.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setBlocks((prev) => prev.filter((b) => b.id !== deleteBlock.id));
      }
    } catch (err) {
      console.error('Erreur suppression bloc:', err);
    } finally {
      setDeleting(false);
      setDeleteBlock(null);
    }
  };

  const filters = viewMode === 'section'
    ? BLOCK_SECTIONS.map((s) => ({ key: s, label: BLOCK_SECTION_LABELS[s] }))
    : ALL_MOTIFS.map((m) => ({ key: m, label: MOTIF_LABELS[m] }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold font-serif text-charcoal" style={{ letterSpacing: '-0.02em' }}>Ma bibliotheque</h1>
          <p className="text-sm text-stone">
            {blocks.length} bloc{blocks.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button variant="primary" onClick={() => { setEditingBlock(null); setFormOpen(true); }}>
          <Plus className="mr-1 h-4 w-4" />
          Créer un bloc
        </Button>
      </div>

      {/* Search + controls */}
      <Card>
        <CardContent className="space-y-3 pt-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher dans vos blocs..."
              className="w-full rounded-lg border border-divider bg-cream py-2.5 pl-10 pr-3 text-sm text-charcoal placeholder:text-stone/60 focus:border-sage/30 focus:outline-none focus:ring-2 focus:ring-sage/10"
            />
          </div>

          {/* View toggle + favorites */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-divider overflow-hidden">
              <button
                type="button"
                onClick={() => { setViewMode('section'); setActiveFilter(null); }}
                className={cn(
                  'flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors',
                  viewMode === 'section'
                    ? 'bg-sage text-white'
                    : 'bg-white text-sage hover:bg-sage-light/50'
                )}
              >
                <Grid3X3 className="h-3 w-3" />
                Par section
              </button>
              <button
                type="button"
                onClick={() => { setViewMode('motif'); setActiveFilter(null); }}
                className={cn(
                  'flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors',
                  viewMode === 'motif'
                    ? 'bg-sage text-white'
                    : 'bg-white text-sage hover:bg-sage-light/50'
                )}
              >
                <List className="h-3 w-3" />
                Par motif
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowFavorites(!showFavorites)}
              className={cn(
                'flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors border',
                showFavorites
                  ? 'bg-gold/10 text-gold border-gold/30'
                  : 'bg-white text-stone border-divider hover:border-sage/30'
              )}
            >
              <Star className="h-3 w-3" fill={showFavorites ? 'currentColor' : 'none'} />
              Favoris
            </button>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setActiveFilter(null)}
              className={cn(
                'shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition-colors',
                activeFilter === null
                  ? 'bg-sage text-white'
                  : 'bg-sage-light/50 text-sage hover:bg-sage-light'
              )}
            >
              Tous
            </button>
            {filters.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setActiveFilter(f.key)}
                className={cn(
                  'shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition-colors whitespace-nowrap',
                  activeFilter === f.key
                    ? 'bg-sage text-white'
                    : 'bg-sage-light/50 text-sage hover:bg-sage-light'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Blocks grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-sage border-t-transparent" />
        </div>
      ) : blocks.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-sm text-stone">Aucun bloc trouvé.</p>
            <p className="mt-1 text-xs text-stone">
              Créez votre premier bloc ou modifiez vos filtres.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {blocks.map((block) => (
            <LibraryBlockCard
              key={block.id}
              block={block}
              onEdit={(b) => { setEditingBlock(b); setFormOpen(true); }}
              onDelete={setDeleteBlock}
              onToggleFavorite={handleToggleFavorite}
            />
          ))}
        </div>
      )}

      {/* Create/Edit form */}
      <BlockForm
        isOpen={formOpen}
        onClose={() => { setFormOpen(false); setEditingBlock(null); }}
        onSaved={(block) => {
          if (editingBlock) {
            setBlocks((prev) => prev.map((b) => (b.id === block.id ? block : b)));
          } else {
            setBlocks((prev) => [block, ...prev]);
          }
          setFormOpen(false);
          setEditingBlock(null);
        }}
        editBlock={editingBlock}
      />

      {/* Delete confirm */}
      <ConfirmModal
        isOpen={!!deleteBlock}
        onClose={() => setDeleteBlock(null)}
        onConfirm={handleDelete}
        title="Supprimer le bloc"
        message={`Voulez-vous supprimer le bloc "${deleteBlock?.title}" ? Cette action est irréversible.`}
        confirmText="Supprimer"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}

function LibraryBlockCard({
  block,
  onEdit,
  onDelete,
  onToggleFavorite,
}: {
  block: Block;
  onEdit: (block: Block) => void;
  onDelete: (block: Block) => void;
  onToggleFavorite: (blockId: string) => void;
}) {
  const excerpt = block.content.length > 150
    ? block.content.slice(0, 150).trimEnd() + '...'
    : block.content;

  const isAfeia = block.source === 'afeia_base';

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate text-sm font-semibold text-charcoal">
                {block.title}
              </h3>
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              {isAfeia ? (
                <Badge variant="info" className="text-[9px] px-1.5 py-0.5">AFEIA</Badge>
              ) : (
                <Badge variant="standard" className="text-[9px] px-1.5 py-0.5">Personnel</Badge>
              )}
              <span className="text-[10px] text-stone">
                {BLOCK_SECTION_LABELS[block.section as BlockSection]}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onToggleFavorite(block.id)}
            className={cn(
              'shrink-0 p-1 rounded transition-colors',
              block.is_favorite
                ? 'text-gold'
                : 'text-stone/40 hover:text-gold/70'
            )}
          >
            <Star className="h-4 w-4" fill={block.is_favorite ? 'currentColor' : 'none'} />
          </button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-stone line-clamp-3 whitespace-pre-line">{excerpt}</p>

        {/* Motifs pills */}
        {block.motifs.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {block.motifs.slice(0, 4).map((motif) => (
              <span
                key={motif}
                className="rounded-full bg-sage-light/50 px-2 py-0.5 text-[10px] font-medium text-sage"
              >
                {MOTIF_LABELS[motif as ConsultationMotif] ?? motif}
              </span>
            ))}
            {block.motifs.length > 4 && (
              <span className="text-[10px] text-stone">+{block.motifs.length - 4}</span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[10px] text-stone">
            {block.usage_count > 0 && `${block.usage_count} utilisation${block.usage_count > 1 ? 's' : ''}`}
          </span>
          {!isAfeia && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onEdit(block)}
                className="rounded px-2 py-1 text-[11px] font-medium text-sage hover:bg-sage-light/50 transition-colors"
              >
                Modifier
              </button>
              <button
                type="button"
                onClick={() => onDelete(block)}
                className="rounded px-2 py-1 text-[11px] font-medium text-accent-danger hover:bg-accent-danger/5 transition-colors"
              >
                Supprimer
              </button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
