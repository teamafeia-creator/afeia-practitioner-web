'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Layers, Star, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { BlockForm } from '@/components/blocks/BlockForm';
import {
  BLOCK_SECTIONS,
  BLOCK_SECTION_LABELS,
  ALL_MOTIFS,
  MOTIF_LABELS,
  type Block,
  type BlockSection,
  type ConsultationMotif,
} from '@/lib/blocks-types';
import { cn } from '@/lib/cn';
import { showToast } from '@/components/ui/Toaster';

export default function BlocsConseillancierPage() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sectionFilter, setSectionFilter] = useState<BlockSection | ''>('');
  const [motifFilter, setMotifFilter] = useState<ConsultationMotif | ''>('');
  const [sourceFilter, setSourceFilter] = useState<'' | 'afeia_base' | 'praticien'>('');
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editBlock, setEditBlock] = useState<Block | null>(null);

  const loadBlocks = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const params = new URLSearchParams();
      if (sectionFilter) params.set('section', sectionFilter);
      if (motifFilter) params.set('motif', motifFilter);
      if (sourceFilter) params.set('source', sourceFilter);
      if (favoriteOnly) params.set('favorite', 'true');
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/blocks?${params.toString()}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
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
  }, [search, sectionFilter, motifFilter, sourceFilter, favoriteOnly]);

  useEffect(() => {
    const timeout = setTimeout(loadBlocks, 200);
    return () => clearTimeout(timeout);
  }, [loadBlocks]);

  const toggleFavorite = async (blockId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch(`/api/blocks/${blockId}/favorite`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.ok) {
        setBlocks((prev) =>
          prev.map((b) => (b.id === blockId ? { ...b, is_favorite: !b.is_favorite } : b))
        );
      }
    } catch (err) {
      console.error('Erreur favori:', err);
    }
  };

  const deleteBlock = async (block: Block) => {
    if (block.source === 'afeia_base') return;
    if (!confirm('Supprimer ce bloc ?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch(`/api/blocks/${block.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.ok) {
        setBlocks((prev) => prev.filter((b) => b.id !== block.id));
        showToast.success('Bloc supprimé.');
      } else {
        const data = await res.json();
        showToast.error(data.error || 'Erreur lors de la suppression.');
      }
    } catch (err) {
      console.error('Erreur suppression:', err);
      showToast.error('Erreur inattendue.');
    }
  };

  const handleSaved = (block: Block) => {
    if (editBlock) {
      setBlocks((prev) => prev.map((b) => (b.id === block.id ? block : b)));
    } else {
      setBlocks((prev) => [block, ...prev]);
    }
    setEditBlock(null);
    setFormOpen(false);
  };

  const openEdit = (block: Block) => {
    if (block.source === 'afeia_base') return;
    setEditBlock(block);
    setFormOpen(true);
  };

  const openCreate = () => {
    setEditBlock(null);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sage-light">
            <Layers className="h-5 w-5 text-sage" />
          </div>
          <div>
            <h1 className="text-[28px] font-semibold font-serif text-charcoal" style={{ letterSpacing: '-0.02em' }}>
              Blocs du conseillancier
            </h1>
            <p className="text-sm text-stone">
              Créez et gérez vos blocs réutilisables pour rédiger vos conseillanciers.
            </p>
          </div>
        </div>
        <Button variant="primary" onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" />
          Créer un bloc
        </Button>
      </div>

      {/* Search + filters */}
      <Card>
        <CardContent className="space-y-3 pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un bloc (titre, contenu)..."
              className="w-full rounded-lg border border-divider bg-cream py-2.5 pl-10 pr-3 text-sm text-charcoal placeholder:text-stone/60 focus:border-sage/30 focus:outline-none focus:ring-2 focus:ring-sage/10"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value as BlockSection | '')}
              className="rounded-lg border border-divider bg-white px-3 py-1.5 text-xs text-charcoal focus:border-sage focus:outline-none focus:ring-1 focus:ring-sage"
            >
              <option value="">Toutes les sections</option>
              {BLOCK_SECTIONS.map((s) => (
                <option key={s} value={s}>{BLOCK_SECTION_LABELS[s]}</option>
              ))}
            </select>

            <select
              value={motifFilter}
              onChange={(e) => setMotifFilter(e.target.value as ConsultationMotif | '')}
              className="rounded-lg border border-divider bg-white px-3 py-1.5 text-xs text-charcoal focus:border-sage focus:outline-none focus:ring-1 focus:ring-sage"
            >
              <option value="">Tous les motifs</option>
              {ALL_MOTIFS.map((m) => (
                <option key={m} value={m}>{MOTIF_LABELS[m]}</option>
              ))}
            </select>

            <div className="flex rounded-lg border border-divider overflow-hidden">
              {([
                { value: '', label: 'Tous' },
                { value: 'afeia_base', label: 'AFEIA' },
                { value: 'praticien', label: 'Mes blocs' },
              ] as const).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSourceFilter(option.value as '' | 'afeia_base' | 'praticien')}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    sourceFilter === option.value
                      ? 'bg-sage text-white'
                      : 'bg-white text-sage hover:bg-sage-light/50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setFavoriteOnly(!favoriteOnly)}
              className={cn(
                'flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                favoriteOnly
                  ? 'border-gold bg-gold/10 text-gold'
                  : 'border-divider bg-white text-stone hover:bg-cream'
              )}
            >
              <Star className="h-3 w-3" fill={favoriteOnly ? 'currentColor' : 'none'} />
              Favoris
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Counter */}
      {!loading && (
        <p className="text-xs text-stone">
          {blocks.length} bloc{blocks.length !== 1 ? 's' : ''} trouvé{blocks.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-sage border-t-transparent" />
        </div>
      ) : blocks.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <EmptyState
              icon="documents"
              title="Aucun bloc trouvé"
              description="Créez votre premier bloc réutilisable ou modifiez vos filtres de recherche."
              action={
                <Button variant="primary" onClick={openCreate}>
                  <Plus className="mr-1 h-4 w-4" />
                  Créer un bloc
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {blocks.map((block) => {
            const excerpt = block.content.length > 120
              ? block.content.slice(0, 120).trimEnd() + '...'
              : block.content;
            const isOwn = block.source === 'praticien';

            return (
              <Card key={block.id} className="group relative transition-shadow hover:shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h3 className="truncate text-sm font-medium text-charcoal">
                          {block.title}
                        </h3>
                        {block.source === 'afeia_base' && (
                          <span className="shrink-0 rounded-full bg-sage/10 px-1.5 py-0.5 text-[9px] font-semibold text-sage">
                            AFEIA
                          </span>
                        )}
                      </div>
                      <span className="mt-0.5 inline-block rounded-full bg-sage-light/50 px-2 py-0.5 text-[10px] text-sage">
                        {BLOCK_SECTION_LABELS[block.section]}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleFavorite(block.id)}
                      className={cn(
                        'shrink-0 p-1 rounded transition-colors',
                        block.is_favorite ? 'text-gold' : 'text-stone/40 hover:text-gold/70'
                      )}
                    >
                      <Star className="h-3.5 w-3.5" fill={block.is_favorite ? 'currentColor' : 'none'} />
                    </button>
                  </div>

                  <p className="mt-2 text-xs text-stone line-clamp-3">{excerpt}</p>

                  {block.motifs.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {block.motifs.slice(0, 3).map((m) => (
                        <span key={m} className="rounded-full bg-cream px-2 py-0.5 text-[10px] text-stone">
                          {MOTIF_LABELS[m]}
                        </span>
                      ))}
                      {block.motifs.length > 3 && (
                        <span className="text-[10px] text-stone/60">+{block.motifs.length - 3}</span>
                      )}
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[10px] text-stone/60">
                      {block.usage_count > 0
                        ? `${block.usage_count} utilisation${block.usage_count > 1 ? 's' : ''}`
                        : 'Jamais utilisé'}
                    </span>
                    {isOwn && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => openEdit(block)}
                          className="rounded p-1 text-stone/60 hover:bg-cream hover:text-charcoal transition-colors"
                          title="Modifier"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteBlock(block)}
                          className="rounded p-1 text-stone/60 hover:bg-red-50 hover:text-red-600 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* BlockForm Modal */}
      <BlockForm
        isOpen={formOpen}
        onClose={() => { setFormOpen(false); setEditBlock(null); }}
        onSaved={handleSaved}
        editBlock={editBlock}
      />
    </div>
  );
}
