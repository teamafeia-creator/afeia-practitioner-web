'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { showToast } from '@/components/ui/Toaster';
import { Spinner } from '@/components/ui/Spinner';
import { ArrowLeft, Eye, Edit3, X } from 'lucide-react';

const CATEGORIES = [
  { value: 'alimentation', label: 'Alimentation' },
  { value: 'hydratation', label: 'Hydratation' },
  { value: 'phytotherapie', label: 'Phytoth\u00e9rapie' },
  { value: 'aromatherapie', label: 'Aromath\u00e9rapie' },
  { value: 'respiration', label: 'Respiration' },
  { value: 'activite_physique', label: 'Activit\u00e9 physique' },
  { value: 'sommeil', label: 'Sommeil' },
  { value: 'gestion_stress', label: 'Gestion du stress' },
  { value: 'detox', label: 'D\u00e9tox' },
  { value: 'digestion', label: 'Digestion' },
  { value: 'immunite', label: 'Immunit\u00e9' },
  { value: 'peau', label: 'Peau' },
  { value: 'feminin', label: 'F\u00e9minin' },
  { value: 'general', label: 'G\u00e9n\u00e9ral' },
];

type FormData = {
  title: string;
  summary: string;
  content_markdown: string;
  category: string;
  tags: string[];
  read_time_minutes: string;
  is_published: boolean;
};

const emptyForm: FormData = {
  title: '',
  summary: '',
  content_markdown: '',
  category: 'general',
  tags: [],
  read_time_minutes: '',
  is_published: true,
};

export default function AdminFicheEditorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const isEditMode = Boolean(editId);

  const [form, setForm] = useState<FormData>(emptyForm);
  const [tagInput, setTagInput] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [loadingFiche, setLoadingFiche] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load existing fiche for edit mode
  useEffect(() => {
    if (!editId) return;
    let isMounted = true;

    async function loadFiche() {
      setLoadingFiche(true);
      try {
        const response = await fetch(`/api/admin/fiches/${editId}`, {
          credentials: 'include',
        });

        if (!isMounted) return;

        if (!response.ok) {
          showToast.error('Fiche introuvable.');
          router.push('/admin/fiches');
          return;
        }

        const data = await response.json();
        const fiche = data.fiche;
        setForm({
          title: fiche.title ?? '',
          summary: fiche.summary ?? '',
          content_markdown: fiche.content_markdown ?? '',
          category: fiche.category ?? 'general',
          tags: fiche.tags ?? [],
          read_time_minutes: fiche.read_time_minutes?.toString() ?? '',
          is_published: fiche.is_published ?? true,
        });
      } catch {
        if (!isMounted) return;
        showToast.error('Erreur lors du chargement de la fiche.');
        router.push('/admin/fiches');
      } finally {
        if (isMounted) setLoadingFiche(false);
      }
    }

    loadFiche();
    return () => {
      isMounted = false;
    };
  }, [editId, router]);

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addTag() {
    const tag = tagInput.trim();
    if (tag && !form.tags.includes(tag)) {
      update('tags', [...form.tags, tag]);
    }
    setTagInput('');
  }

  function removeTag(tag: string) {
    update(
      'tags',
      form.tags.filter((t) => t !== tag)
    );
  }

  function handleTagKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  }

  async function handleSubmit() {
    // Validation
    if (!form.title.trim()) {
      showToast.error('Le titre est requis.');
      return;
    }
    if (!form.content_markdown.trim()) {
      showToast.error('Le contenu markdown est requis.');
      return;
    }
    if (!form.category) {
      showToast.error('La categorie est requise.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        summary: form.summary.trim() || null,
        content_markdown: form.content_markdown.trim(),
        category: form.category,
        tags: form.tags,
        read_time_minutes: form.read_time_minutes ? Number(form.read_time_minutes) : null,
        is_published: form.is_published,
      };

      const url = isEditMode
        ? `/api/admin/fiches/${editId}`
        : '/api/admin/fiches';

      const response = await fetch(url, {
        method: isEditMode ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => null);
        showToast.error(err?.error ?? 'Erreur lors de la sauvegarde.');
        return;
      }

      showToast.success(isEditMode ? 'Fiche mise a jour.' : 'Fiche creee.');
      router.push('/admin/fiches');
    } catch {
      showToast.error('Erreur reseau.');
    } finally {
      setSaving(false);
    }
  }

  if (loadingFiche) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        title={isEditMode ? 'Modifier la fiche' : 'Nouvelle fiche AFEIA'}
        subtitle={isEditMode ? form.title : 'Creez une nouvelle fiche educative AFEIA.'}
        actions={
          <Button
            variant="ghost"
            onClick={() => router.push('/admin/fiches')}
            icon={<ArrowLeft className="h-4 w-4" />}
          >
            Retour
          </Button>
        }
      />

      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-6">
        {/* Title + Category */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Titre"
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            placeholder="Ex: Les bases de l'alimentation anti-inflammatoire"
          />
          <Select
            label="Categorie"
            value={form.category}
            onChange={(e) => update('category', e.target.value)}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </Select>
        </div>

        {/* Summary */}
        <Textarea
          label="Resume (1-2 phrases)"
          value={form.summary}
          onChange={(e) => update('summary', e.target.value)}
          placeholder="Decrivez brievement le contenu de cette fiche..."
          rows={2}
          className="min-h-[80px]"
        />

        {/* Tags + Read time + Published */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium text-stone">Tags</label>
            <div className="mt-1 flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Ajouter un tag..."
                className="flex-1"
              />
              <Button variant="outline" size="sm" onClick={addTag}>
                +
              </Button>
            </div>
            {form.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {form.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div>
            <Input
              label="Temps de lecture (min)"
              type="number"
              value={form.read_time_minutes}
              onChange={(e) => update('read_time_minutes', e.target.value)}
              placeholder="5"
              min={1}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-stone">Statut</label>
            <div className="mt-2">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={(e) => update('is_published', e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-sage focus:ring-sage/30"
                />
                <span className="text-sm text-charcoal">
                  {form.is_published ? 'Publie' : 'Brouillon'}
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Markdown content with preview toggle */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-stone">Contenu Markdown</label>
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className="flex items-center gap-1 text-xs text-sage hover:text-sage/80 transition-colors"
            >
              {previewMode ? (
                <Edit3 className="h-3 w-3" />
              ) : (
                <Eye className="h-3 w-3" />
              )}
              {previewMode ? 'Editer' : 'Apercu'}
            </button>
          </div>
          {previewMode ? (
            <div className="rounded-lg border border-divider bg-white p-4 min-h-[300px]">
              <MarkdownRenderer content={form.content_markdown} />
            </div>
          ) : (
            <textarea
              value={form.content_markdown}
              onChange={(e) => update('content_markdown', e.target.value)}
              placeholder="## Introduction&#10;&#10;Ecrivez votre contenu en Markdown..."
              rows={16}
              className="w-full rounded-lg border border-divider bg-white px-3 py-2 text-sm text-charcoal font-mono placeholder:text-stone focus:border-sage focus:outline-none focus:ring-1 focus:ring-sage"
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button variant="ghost" onClick={() => router.push('/admin/fiches')}>
            Annuler
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={saving}
            disabled={!form.title.trim() || !form.content_markdown.trim() || !form.category}
          >
            {isEditMode ? 'Enregistrer' : 'Creer la fiche'}
          </Button>
        </div>
      </div>
    </div>
  );
}
