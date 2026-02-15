'use client';

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Eye, Edit3 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { MarkdownRenderer } from '../ui/MarkdownRenderer';
import { CATEGORY_LABELS } from './ResourceCard';
import type { EducationalResource, ResourceCategory, ResourceContentType } from '../../lib/types';

type ResourceFormData = {
  title: string;
  summary: string;
  content_type: ResourceContentType;
  content_markdown: string;
  video_url: string;
  category: ResourceCategory;
  tags: string;
  read_time_minutes: string;
};

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export function ResourceEditor({
  initialData,
  onSubmit,
  loading,
}: {
  initialData?: Partial<EducationalResource>;
  onSubmit: (data: ResourceFormData, file: File | null) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<ResourceFormData>({
    title: initialData?.title ?? '',
    summary: initialData?.summary ?? '',
    content_type: initialData?.content_type ?? 'article',
    content_markdown: initialData?.content_markdown ?? '',
    video_url: initialData?.video_url ?? '',
    category: initialData?.category ?? 'general',
    tags: initialData?.tags?.join(', ') ?? '',
    read_time_minutes: initialData?.read_time_minutes?.toString() ?? '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (accepted) => {
      if (accepted.length > 0) setFile(accepted[0]);
    },
    accept: form.content_type === 'pdf'
      ? { 'application/pdf': ['.pdf'] }
      : { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  function update(key: keyof ResourceFormData, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Titre"
          value={form.title}
          onChange={(e) => update('title', e.target.value)}
          placeholder="Ex: Les bases de l'alimentation anti-inflammatoire"
        />
        <Select
          label="Catégorie"
          value={form.category}
          onChange={(e) => update('category', e.target.value)}
        >
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </Select>
      </div>

      <Textarea
        label="Résumé (1-2 phrases)"
        value={form.summary}
        onChange={(e) => update('summary', e.target.value)}
        placeholder="Décrivez brièvement le contenu de cette fiche..."
        rows={2}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Tags (séparés par des virgules)"
          value={form.tags}
          onChange={(e) => update('tags', e.target.value)}
          placeholder="ex: foie, détox, drainage"
        />
        <Input
          label="Temps de lecture (minutes)"
          type="number"
          value={form.read_time_minutes}
          onChange={(e) => update('read_time_minutes', e.target.value)}
          placeholder="3"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-charcoal mb-2 block">Type de contenu</label>
        <div className="flex flex-wrap gap-2">
          {(['article', 'pdf', 'image', 'video_link'] as const).map((type) => (
            <button
              key={type}
              onClick={() => update('content_type', type)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                form.content_type === type
                  ? 'bg-sage text-white'
                  : 'bg-cream text-stone hover:bg-sage-light'
              }`}
            >
              {type === 'article' ? 'Article' : type === 'pdf' ? 'PDF' : type === 'image' ? 'Image' : 'Vidéo'}
            </button>
          ))}
        </div>
      </div>

      {form.content_type === 'article' && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-charcoal">Contenu Markdown</label>
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className="flex items-center gap-1 text-xs text-sage hover:text-sage/80 transition-colors"
            >
              {previewMode ? <Edit3 className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              {previewMode ? 'Éditer' : 'Aperçu'}
            </button>
          </div>
          {previewMode ? (
            <div className="rounded-lg border border-divider bg-white p-4 min-h-[200px]">
              <MarkdownRenderer content={form.content_markdown} />
            </div>
          ) : (
            <textarea
              value={form.content_markdown}
              onChange={(e) => update('content_markdown', e.target.value)}
              placeholder="## Introduction&#10;&#10;Écrivez votre contenu en Markdown..."
              rows={12}
              className="w-full rounded-lg border border-divider bg-white px-3 py-2 text-sm text-charcoal font-mono placeholder:text-stone focus:border-sage focus:outline-none focus:ring-1 focus:ring-sage"
            />
          )}
        </div>
      )}

      {(form.content_type === 'pdf' || form.content_type === 'image') && (
        <div
          {...getRootProps()}
          className={`rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-sage bg-sage-light/50' : 'border-divider hover:border-sage/50'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="h-8 w-8 text-stone mx-auto mb-2" />
          {file ? (
            <p className="text-sm text-charcoal font-medium">{file.name}</p>
          ) : (
            <p className="text-sm text-stone">
              Glissez votre fichier ici ou cliquez pour sélectionner
            </p>
          )}
          <p className="text-xs text-stone mt-1">
            {form.content_type === 'pdf' ? 'PDF uniquement, max 10 Mo' : 'PNG, JPG, WebP, max 10 Mo'}
          </p>
        </div>
      )}

      {form.content_type === 'video_link' && (
        <Input
          label="URL de la vidéo"
          value={form.video_url}
          onChange={(e) => update('video_url', e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
        />
      )}

      <div className="flex justify-end gap-3">
        <Button
          variant="primary"
          onClick={() => onSubmit(form, file)}
          loading={loading}
          disabled={!form.title.trim() || !form.category}
        >
          {initialData ? 'Enregistrer' : 'Créer la fiche'}
        </Button>
      </div>
    </div>
  );
}
