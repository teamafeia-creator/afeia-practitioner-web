'use client';

import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';
import {
  BLOCK_SECTIONS,
  BLOCK_SECTION_LABELS,
  ALL_MOTIFS,
  MOTIF_LABELS,
  type Block,
  type BlockSection,
  type ConsultationMotif,
} from '../../lib/blocks-types';
import { cn } from '../../lib/cn';

interface BlockFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (block: Block) => void;
  editBlock?: Block | null;
  defaultSection?: BlockSection;
  defaultContent?: string;
}

export function BlockForm({
  isOpen,
  onClose,
  onSaved,
  editBlock,
  defaultSection,
  defaultContent,
}: BlockFormProps) {
  const [title, setTitle] = useState(editBlock?.title ?? '');
  const [content, setContent] = useState(editBlock?.content ?? defaultContent ?? '');
  const [section, setSection] = useState<BlockSection>(editBlock?.section ?? defaultSection ?? 'objectifs');
  const [selectedMotifs, setSelectedMotifs] = useState<ConsultationMotif[]>(editBlock?.motifs ?? []);
  const [tags, setTags] = useState(editBlock?.tags?.join(', ') ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isEditing = !!editBlock;

  const toggleMotif = (motif: ConsultationMotif) => {
    setSelectedMotifs((prev) =>
      prev.includes(motif) ? prev.filter((m) => m !== motif) : [...prev, motif]
    );
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Le titre est obligatoire.');
      return;
    }
    if (!content.trim()) {
      setError('Le contenu est obligatoire.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) {
        setError('Session expirée. Veuillez vous reconnecter.');
        return;
      }

      const body = {
        title: title.trim(),
        content: content.trim(),
        section,
        motifs: selectedMotifs,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      };

      const url = isEditing ? `/api/blocks/${editBlock.id}` : '/api/blocks';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Erreur lors de la sauvegarde.');
        return;
      }

      const data = await res.json();
      onSaved(data.block);
      onClose();
    } catch (err) {
      console.error('Erreur sauvegarde bloc:', err);
      setError('Erreur inattendue.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Modifier le bloc' : 'Créer un bloc'}
      size="lg"
    >
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg bg-accent-danger/10 px-3 py-2 text-sm text-accent-danger">
            {error}
          </div>
        )}

        <Input
          label="Titre"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex : Protocole digestif de base"
          maxLength={120}
        />

        <div>
          <label className="block text-[13px] font-medium text-warmgray mb-1">Contenu</label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Le contenu du bloc (texte brut, pas de markdown)..."
            rows={8}
          />
        </div>

        <div>
          <label className="block text-[13px] font-medium text-warmgray mb-1">Section</label>
          <select
            value={section}
            onChange={(e) => setSection(e.target.value as BlockSection)}
            className="w-full rounded-sm border border-teal/20 bg-white/50 px-3.5 py-2.5 text-sm text-charcoal focus:border-teal focus:outline-none focus:ring-[3px] focus:ring-teal/10"
          >
            {BLOCK_SECTIONS.map((s) => (
              <option key={s} value={s}>
                {BLOCK_SECTION_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[13px] font-medium text-warmgray mb-2">Motifs de consultation</label>
          <div className="flex flex-wrap gap-1.5">
            {ALL_MOTIFS.map((motif) => (
              <button
                key={motif}
                type="button"
                onClick={() => toggleMotif(motif)}
                className={cn(
                  'rounded-full px-3 py-1 text-[11px] font-medium transition-colors',
                  selectedMotifs.includes(motif)
                    ? 'bg-teal text-white'
                    : 'bg-teal/5 text-teal hover:bg-teal/10 border border-teal/15'
                )}
              >
                {MOTIF_LABELS[motif]}
              </button>
            ))}
          </div>
        </div>

        <Input
          label="Tags (séparés par des virgules)"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="Ex : digestion, confort, transit"
        />

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button variant="primary" onClick={handleSave} loading={saving}>
            {isEditing ? 'Modifier' : 'Sauvegarder'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
