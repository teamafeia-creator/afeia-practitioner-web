'use client';

import { useEffect, useState, useCallback } from 'react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { showToast } from '@/components/ui/Toaster';
import { Spinner } from '@/components/ui/Spinner';
import { Pencil, Archive, ArchiveRestore } from 'lucide-react';
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

type BlockFormState = {
  title: string;
  content: string;
  section: BlockSection;
  motifs: ConsultationMotif[];
  tags: string;
};

const EMPTY_FORM: BlockFormState = {
  title: '',
  content: '',
  section: 'objectifs',
  motifs: [],
  tags: '',
};

export default function AdminBlocsPage() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [motifFilter, setMotifFilter] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<Block | null>(null);
  const [form, setForm] = useState<BlockFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const loadBlocks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (sectionFilter) params.set('section', sectionFilter);
      if (motifFilter) params.set('motif', motifFilter);
      if (search.trim()) params.set('search', search.trim());
      if (showArchived) params.set('archived', 'true');

      const res = await fetch(`/api/admin/blocks?${params.toString()}`, {
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        setBlocks(data.blocks ?? []);
        setTotal(data.total ?? 0);
      } else {
        showToast.error('Erreur lors du chargement des blocs.');
      }
    } catch (err) {
      console.error('Erreur chargement blocs admin:', err);
      showToast.error('Erreur réseau.');
    } finally {
      setLoading(false);
    }
  }, [search, sectionFilter, motifFilter, showArchived]);

  useEffect(() => {
    const timeout = setTimeout(loadBlocks, 200);
    return () => clearTimeout(timeout);
  }, [loadBlocks]);

  const openCreate = () => {
    setEditingBlock(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (block: Block) => {
    setEditingBlock(block);
    setForm({
      title: block.title,
      content: block.content,
      section: block.section,
      motifs: block.motifs,
      tags: block.tags.join(', '),
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingBlock(null);
    setForm(EMPTY_FORM);
  };

  const toggleMotif = (motif: ConsultationMotif) => {
    setForm((prev) => ({
      ...prev,
      motifs: prev.motifs.includes(motif)
        ? prev.motifs.filter((m) => m !== motif)
        : [...prev.motifs, motif],
    }));
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      showToast.error('Le titre est requis.');
      return;
    }
    if (!form.content.trim()) {
      showToast.error('Le contenu est requis.');
      return;
    }

    setSaving(true);

    try {
      const body = {
        title: form.title.trim(),
        content: form.content.trim(),
        section: form.section,
        motifs: form.motifs,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      };

      if (editingBlock) {
        // PUT to /api/blocks/[blockId] — admin is now allowed
        const res = await fetch(`/api/blocks/${editingBlock.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const data = await res.json();
          showToast.error(data.error || 'Erreur lors de la mise à jour.');
          return;
        }

        showToast.success('Bloc mis à jour.');
      } else {
        // POST to /api/admin/blocks — create afeia_base block
        const res = await fetch('/api/admin/blocks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const data = await res.json();
          showToast.error(data.error || 'Erreur lors de la création.');
          return;
        }

        showToast.success('Bloc AFEIA créé.');
      }

      closeModal();
      loadBlocks();
    } catch (err) {
      console.error('Erreur sauvegarde bloc admin:', err);
      showToast.error('Erreur inattendue.');
    } finally {
      setSaving(false);
    }
  };

  const toggleArchive = async (block: Block) => {
    try {
      if (block.is_archived) {
        // Unarchive: PUT with is_archived: false (via the block update endpoint)
        const res = await fetch(`/api/blocks/${block.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ is_archived: false }),
        });

        if (!res.ok) {
          showToast.error('Erreur lors de la désarchivation.');
          return;
        }

        showToast.success('Bloc désarchivé.');
      } else {
        // Archive: DELETE (soft-delete)
        const res = await fetch(`/api/blocks/${block.id}`, {
          method: 'DELETE',
          credentials: 'include',
        });

        if (!res.ok) {
          showToast.error('Erreur lors de l\'archivation.');
          return;
        }

        showToast.success('Bloc archivé.');
      }

      loadBlocks();
    } catch (err) {
      console.error('Erreur archive bloc:', err);
      showToast.error('Erreur inattendue.');
    }
  };

  // Count by section
  const sectionCounts = blocks.reduce<Record<string, number>>((acc, block) => {
    acc[block.section] = (acc[block.section] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Blocs AFEIA"
        subtitle={`${total} bloc${total !== 1 ? 's' : ''} au total`}
        actions={
          <Button onClick={openCreate}>Créer un bloc AFEIA</Button>
        }
      />

      {/* Section counts */}
      <div className="flex flex-wrap gap-2">
        {BLOCK_SECTIONS.map((s) => {
          const count = sectionCounts[s] || 0;
          if (count === 0) return null;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setSectionFilter(sectionFilter === s ? '' : s)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                sectionFilter === s
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              {BLOCK_SECTION_LABELS[s]} ({count})
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid gap-4 md:grid-cols-5">
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-slate-500">Recherche</label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Titre ou contenu"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Section</label>
            <Select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
            >
              <option value="">Toutes</option>
              {BLOCK_SECTIONS.map((s) => (
                <option key={s} value={s}>{BLOCK_SECTION_LABELS[s]}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Motif</label>
            <Select
              value={motifFilter}
              onChange={(e) => setMotifFilter(e.target.value)}
            >
              <option value="">Tous</option>
              {ALL_MOTIFS.map((m) => (
                <option key={m} value={m}>{MOTIF_LABELS[m]}</option>
              ))}
            </Select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-500 cursor-pointer">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="rounded border-slate-300"
              />
              Inclure archivés
            </label>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <th className="py-2 px-3">Titre</th>
              <th className="py-2 px-3">Section</th>
              <th className="py-2 px-3">Motifs</th>
              <th className="py-2 px-3">Source</th>
              <th className="py-2 px-3">Utilisations</th>
              <th className="py-2 px-3">Statut</th>
              <th className="py-2 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-8">
                  <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
                    <Spinner size="sm" />
                    Chargement...
                  </div>
                </td>
              </tr>
            ) : blocks.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-sm text-slate-400">
                  Aucun bloc trouvé.
                </td>
              </tr>
            ) : (
              blocks.map((block) => (
                <tr key={block.id} className="text-slate-800 hover:bg-slate-50">
                  <td className="py-2 px-3">
                    <div className="max-w-[250px]">
                      <span className="font-medium text-slate-800 truncate block">
                        {block.title}
                      </span>
                      <span className="text-xs text-slate-400 line-clamp-1">
                        {block.content.slice(0, 80)}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <span className="inline-flex rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700">
                      {BLOCK_SECTION_LABELS[block.section]}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex flex-wrap gap-1 max-w-[180px]">
                      {block.motifs.slice(0, 2).map((m) => (
                        <span key={m} className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                          {MOTIF_LABELS[m]}
                        </span>
                      ))}
                      {block.motifs.length > 2 && (
                        <span className="text-[10px] text-slate-400">+{block.motifs.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <span className={cn(
                      'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                      block.source === 'afeia_base'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-blue-100 text-blue-700'
                    )}>
                      {block.source === 'afeia_base' ? 'AFEIA' : 'Praticien'}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-slate-600">
                    {block.usage_count}
                  </td>
                  <td className="py-2 px-3">
                    {block.is_archived ? (
                      <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        Archivé
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        Actif
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-500 hover:text-slate-800"
                        onClick={() => openEdit(block)}
                        title="Modifier"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={block.is_archived
                          ? 'text-emerald-500 hover:bg-emerald-50 hover:text-emerald-700'
                          : 'text-red-500 hover:bg-red-50 hover:text-red-700'
                        }
                        onClick={() => toggleArchive(block)}
                        title={block.is_archived ? 'Désarchiver' : 'Archiver'}
                      >
                        {block.is_archived ? (
                          <ArchiveRestore className="h-4 w-4" />
                        ) : (
                          <Archive className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingBlock ? 'Modifier le bloc' : 'Créer un bloc AFEIA'}
        description={editingBlock ? undefined : 'Ce bloc sera disponible pour tous les praticiens.'}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-500">Titre</label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Ex : Protocole digestif de base"
              maxLength={120}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500">Contenu</label>
            <Textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Le contenu du bloc..."
              rows={8}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500">Section</label>
            <Select
              value={form.section}
              onChange={(e) => setForm({ ...form, section: e.target.value as BlockSection })}
            >
              {BLOCK_SECTIONS.map((s) => (
                <option key={s} value={s}>{BLOCK_SECTION_LABELS[s]}</option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">Motifs de consultation</label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_MOTIFS.map((motif) => (
                <button
                  key={motif}
                  type="button"
                  onClick={() => toggleMotif(motif)}
                  className={cn(
                    'rounded-full px-3 py-1 text-[11px] font-medium transition-colors',
                    form.motifs.includes(motif)
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  )}
                >
                  {MOTIF_LABELS[motif]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500">Tags (séparés par des virgules)</label>
            <Input
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="Ex : digestion, confort, transit"
            />
          </div>
        </div>

        <ModalFooter>
          <Button variant="ghost" onClick={closeModal} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={handleSave} loading={saving}>
            {editingBlock ? 'Mettre à jour' : 'Créer'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
