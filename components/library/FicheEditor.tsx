'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Spinner } from '@/components/ui/Spinner';
import { showToast } from '@/components/ui/Toaster';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { supabase } from '@/lib/supabase';
import { createResource, slugify, updateResource } from '@/lib/queries/resources';
import { CATEGORY_LABELS, CATEGORY_ORDER, FORMAT_LABELS, colorOfTheme, ficheTheme, previewLines, readTime } from '@/lib/library';
import type { EducationalResource, ResourceCategory, ResourceContentType } from '@/lib/types';

type Fiche = EducationalResource & { theme_label?: string | null };
const MAX = 10 * 1024 * 1024;
const field = 'rounded-[10px] border border-divider bg-cream text-charcoal outline-none placeholder:text-mist focus:border-sage';

/** Créer ou modifier une fiche éducative (article, PDF, image, vidéo) avec aperçu téléphone. */
export function FicheEditor({ practitionerId, fiche, customThemes }: { practitionerId: string; fiche: Fiche | null; customThemes: string[] }) {
  const [title, setTitle] = useState(fiche?.title ?? '');
  const [theme, setTheme] = useState(fiche ? ficheTheme(fiche) : 'Sommeil');
  const [extraThemes, setExtraThemes] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [newTheme, setNewTheme] = useState('');
  const [summary, setSummary] = useState(fiche?.summary ?? '');
  const [type, setType] = useState<ResourceContentType>(fiche?.content_type ?? 'article');
  const [body, setBody] = useState(fiche?.content_markdown ?? '');
  const [video, setVideo] = useState(fiche?.video_url ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [tags, setTags] = useState((fiche?.tags ?? []).join(', '));
  const [preview, setPreview] = useState(false);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const enumLabels = CATEGORY_ORDER.map((c) => CATEGORY_LABELS[c]);
  const themes = Array.from(new Set([...enumLabels, ...customThemes, ...extraThemes]));
  const est = readTime(body);
  const lines = useMemo(() => previewLines(body), [body]);
  const existingFile = fiche?.file_name && fiche.content_type === type ? fiche.file_name : null;

  const errors: string[] = [];
  if (!title.trim()) errors.push('Donnez un titre à la fiche.');
  if (type === 'article' && !body.trim()) errors.push('Écrivez le contenu de l’article.');
  if ((type === 'pdf' || type === 'image') && !file && !existingFile) errors.push(type === 'pdf' ? 'Ajoutez le PDF.' : 'Ajoutez l’image.');
  if (type === 'video_link' && !/^https?:\/\/\S+\.\S+/.test(video.trim())) errors.push('Indiquez le lien complet de la vidéo (https://…).');

  function insert(snippet: string) {
    const el = textRef.current;
    if (!el) {
      setBody((b) => b + snippet);
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const next = body.slice(0, start) + snippet + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + snippet.length;
    });
  }

  function addTheme() {
    const v = newTheme.trim();
    if (!v) return;
    const exists = themes.find((t) => t.toLowerCase() === v.toLowerCase());
    if (!exists) setExtraThemes((x) => [...x, v]);
    setTheme(exists ?? v);
    setAdding(false);
    setNewTheme('');
    showToast.success(exists ? 'Ce thème existe déjà : il est sélectionné.' : `Thème « ${v} » ajouté à votre bibliothèque.`);
  }

  async function save() {
    if (errors.length) {
      setTried(true);
      return;
    }
    setBusy(true);
    try {
      const enumKey = CATEGORY_ORDER.find((c) => CATEGORY_LABELS[c] === theme);
      const category: ResourceCategory = enumKey ?? 'general';
      const theme_label = enumKey ? null : theme;

      let file_path = fiche?.content_type === type ? fiche?.file_path ?? undefined : undefined;
      let file_name = fiche?.content_type === type ? fiche?.file_name ?? undefined : undefined;
      if (file && (type === 'pdf' || type === 'image')) {
        const safe = file.name.normalize('NFD').replace(/[^\w.-]+/g, '-');
        const path = `${practitionerId}/resources/${Date.now()}-${safe}`;
        const { error } = await supabase.storage.from('educational-resources').upload(path, file);
        if (error) throw new Error('Le fichier n’a pas pu être envoyé.');
        file_path = path;
        file_name = file.name;
      }

      const data = {
        title: title.trim(),
        summary: summary.trim(),
        content_type: type,
        content_markdown: type === 'article' ? body : undefined,
        file_path: type === 'pdf' || type === 'image' ? file_path : undefined,
        file_name: type === 'pdf' || type === 'image' ? file_name : undefined,
        video_url: type === 'video_link' ? video.trim() : undefined,
        category,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        read_time_minutes: type === 'article' ? est : undefined,
      };

      let saved: EducationalResource | null;
      if (fiche) {
        saved = await updateResource(fiche.id, practitionerId, data);
      } else {
        saved = await createResource(practitionerId, data);
      }
      if (!saved) throw new Error('La fiche n’a pas pu être enregistrée.');
      await supabase.from('educational_resources').update({ theme_label }).eq('id', saved.id);
      showToast.success(fiche ? 'Fiche enregistrée.' : 'Fiche créée. Vous pouvez maintenant l’envoyer.');
      window.location.href = `/bibliotheque/${saved.slug ?? slugify(saved.title)}`;
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'La fiche n’a pas pu être enregistrée.');
      setBusy(false);
    }
  }

  const color = colorOfTheme(theme);
  const back = fiche ? `/bibliotheque/${fiche.slug ?? fiche.id}` : '/bibliotheque';

  return (
    <div className="flex max-w-[1180px] flex-col gap-[18px]">
      <nav aria-label="Fil d'Ariane" className="flex items-center gap-2 text-sm">
        <Link href="/bibliotheque" className="text-sage hover:text-sage-dark">← Bibliothèque</Link>
        <span className="text-mist">/</span>
        <span className="text-stone">{fiche ? 'Modifier la fiche' : 'Nouvelle fiche'}</span>
      </nav>
      <div className="flex flex-wrap items-end gap-3">
        <h1 className="flex-[1_1_300px] font-serif text-[32px] font-medium text-charcoal">{fiche ? 'Modifier la fiche' : 'Créer une fiche éducative'}</h1>
        <Link href={back} className="inline-flex h-11 items-center rounded-[10px] border border-divider px-4 text-sm text-charcoal">Annuler</Link>
        <button type="button" onClick={() => void save()} disabled={busy} className="flex h-11 items-center gap-2 rounded-[10px] bg-sage px-[18px] text-sm font-semibold text-ink disabled:opacity-70">
          {busy && <Spinner size="sm" />}
          {fiche ? 'Enregistrer' : 'Créer la fiche'}
        </button>
      </div>
      {tried && errors.length > 0 && (
        <div role="alert" className="rounded-[10px] border border-[#5A4636] bg-terracotta-light px-4 py-3 text-sm text-[#F2D2BB]">
          <strong className="font-semibold">Pour enregistrer, il reste à :</strong>
          <ul className="mt-1 list-disc pl-5">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
        </div>
      )}

      <div className="flex flex-wrap items-start gap-6">
        <section className="flex min-w-0 flex-[999_1_520px] flex-col gap-[18px] rounded-[18px] border border-divider bg-surface p-6">
          <div className="flex flex-wrap gap-3.5">
            <label className="flex flex-[2_1_280px] flex-col gap-1.5 text-[13px] text-stone">
              Titre
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex. Les bases de l’alimentation anti-inflammatoire"
                className={`${field} h-[46px] px-3.5 font-serif text-[19px]`}
                style={tried && !title.trim() ? { borderColor: '#E8A87C' } : undefined}
              />
            </label>
            <div className="flex flex-[1_1_200px] flex-col gap-1.5">
              <label className="flex flex-col gap-1.5 text-[13px] text-stone">
                Thème
                <select value={theme} onChange={(e) => setTheme(e.target.value)} className={`${field} h-[46px] px-3 text-sm`}>
                  {themes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              {adding ? (
                <div className="flex gap-1.5">
                  <input
                    autoFocus
                    value={newTheme}
                    onChange={(e) => setNewTheme(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTheme();
                      }
                    }}
                    aria-label="Nom du nouveau thème"
                    placeholder="Ex. Ménopause"
                    className={`${field} h-[38px] min-w-0 flex-1 border-[#2F5A50] px-2.5 text-sm`}
                  />
                  <button type="button" onClick={addTheme} disabled={!newTheme.trim()} className="h-[38px] rounded-[9px] bg-sage px-3 text-[13px] font-semibold text-ink disabled:bg-divider disabled:text-stone">
                    Ajouter
                  </button>
                  <button type="button" onClick={() => setAdding(false)} aria-label="Annuler" className="h-[38px] w-[38px] rounded-[9px] border border-divider text-stone">×</button>
                </div>
              ) : (
                <button type="button" onClick={() => setAdding(true)} className="h-7 self-start text-[13px] text-sage hover:text-sage-dark">＋ Ajouter un thème</button>
              )}
            </div>
          </div>
          <label className="flex flex-col gap-1.5 text-[13px] text-stone">
            Résumé, en une ou deux phrases
            <textarea rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Ce que le consultant va apprendre." className={`${field} resize-y px-3.5 py-2.5 text-[15px] leading-normal`} />
          </label>
          <div className="flex flex-col gap-2">
            <span className="text-[13px] text-stone">Format</span>
            <div role="radiogroup" aria-label="Format" className="flex flex-wrap gap-1.5">
              {(Object.keys(FORMAT_LABELS) as ResourceContentType[]).map((k) => {
                const on = type === k;
                return (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => {
                      setType(k);
                      setFile(null);
                    }}
                    className="h-10 rounded-full border px-4 text-sm font-medium"
                    style={{ borderColor: on ? '#6DD4B8' : '#3A4252', background: on ? '#6DD4B8' : 'transparent', color: on ? '#0A0E14' : '#E8EDF4' }}
                  >
                    {FORMAT_LABELS[k]}
                  </button>
                );
              })}
            </div>
          </div>

          {type === 'article' && (
            <>
              <div className="flex flex-col overflow-hidden rounded-xl border border-divider">
                <div className="flex flex-wrap items-center gap-1 border-b border-divider bg-surface-raised px-2 py-1.5">
                  {([['T', 'Intertitre', '\n## Intertitre\n'], ['G', 'Gras', '**texte**'], ['•', 'Liste', '\n- élément'], ['🔗', 'Lien', '[texte](https://)']] as const).map(([l, a, ins]) => (
                    <button key={a} type="button" aria-label={a} title={a} onClick={() => insert(ins)} disabled={preview} className="h-8 min-w-[34px] rounded-[7px] px-2 text-[13px] font-semibold text-[#B8C1CF] hover:bg-surface disabled:opacity-40">
                      {l}
                    </button>
                  ))}
                  <span className="flex-1" />
                  <button
                    type="button"
                    onClick={() => setPreview((v) => !v)}
                    className={`h-8 rounded-[7px] px-2.5 text-[13px] ${preview ? 'bg-sage-light text-sage' : 'text-[#B8C1CF]'}`}
                  >
                    {preview ? 'Revenir à l’édition' : 'Aperçu'}
                  </button>
                </div>
                {preview ? (
                  <div className="min-h-[300px] bg-cream p-[18px] text-[15px] leading-relaxed text-[#D5DBE4]">
                    {body.trim() ? <MarkdownRenderer content={body} /> : <span className="text-sm text-mist">Rien à afficher pour l’instant.</span>}
                  </div>
                ) : (
                  <textarea
                    ref={textRef}
                    rows={14}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder={'## Introduction\n\nÉcrivez le contenu de la fiche…'}
                    aria-label="Contenu de la fiche"
                    className="resize-y border-0 bg-cream p-4 text-[15px] leading-[1.7] text-charcoal outline-none placeholder:text-mist"
                  />
                )}
              </div>
              <span className="text-xs text-mist">Temps de lecture estimé : {est} min · calculé à partir du texte</span>
            </>
          )}

          {(type === 'pdf' || type === 'image') && (
            <>
              <input
                ref={fileRef}
                type="file"
                className="sr-only"
                accept={type === 'pdf' ? 'application/pdf' : 'image/png,image/jpeg,image/webp'}
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  if (f && f.size > MAX) {
                    showToast.error('Le fichier dépasse 10 Mo.');
                    return;
                  }
                  setFile(f);
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center gap-2 rounded-[14px] border-2 border-dashed px-5 py-9 text-charcoal"
                style={{ borderColor: file || existingFile ? '#2F5A50' : '#2A3140' }}
              >
                <span className="text-[28px] text-sage" aria-hidden="true">⇪</span>
                <span className="text-[15px] font-medium">{file ? `✓ ${file.name}` : existingFile ? `✓ ${existingFile} · cliquez pour remplacer` : 'Cliquez pour choisir votre fichier'}</span>
                <span className="text-[13px] text-stone">{type === 'pdf' ? 'PDF uniquement, 10 Mo maximum' : 'PNG, JPG ou WebP, 10 Mo maximum'}</span>
              </button>
            </>
          )}

          {type === 'video_link' && (
            <label className="flex flex-col gap-1.5 text-[13px] text-stone">
              Lien de la vidéo
              <input value={video} onChange={(e) => setVideo(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" className={`${field} h-11 px-3.5 text-sm`} />
            </label>
          )}

          <label className="flex flex-col gap-1.5 text-[13px] text-stone">
            Mots-clés, séparés par des virgules
            <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Ex. foie, drainage, printemps" className={`${field} h-[42px] px-3.5 text-sm`} />
          </label>
        </section>

        <aside className="flex min-w-0 max-w-[320px] flex-[1_1_280px] flex-col gap-2.5">
          <span className="px-1 text-[13px] text-stone">Ce que verra le consultant dans l’app</span>
          <div className="w-[270px] self-center rounded-[36px] border border-divider bg-surface-raised p-3">
            <div className="flex min-h-[460px] flex-col gap-2.5 overflow-hidden rounded-[26px] bg-cream px-4 py-[22px]">
              <span className="h-[5px] w-[70px] self-center rounded-sm bg-divider" />
              <span className="text-[10px] font-bold uppercase tracking-[0.06em]" style={{ color }}>
                {theme}{type === 'article' ? ` · ${est} min` : ''}
              </span>
              <span className="font-serif text-[19px] leading-[1.25] text-charcoal">{title || 'Titre de la fiche'}</span>
              {summary && <span className="text-xs leading-normal text-[#B8C1CF]">{summary}</span>}
              {type === 'article' ? (
                lines.slice(0, 7).map((l, i) => (
                  <span
                    key={i}
                    className={l.kind === 'h' ? 'font-serif text-[15px] leading-snug text-charcoal' : 'text-xs leading-normal text-[#D5DBE4]'}
                  >
                    {l.t}
                  </span>
                ))
              ) : (
                <span className="text-[13px] text-[#B8C1CF]">
                  {type === 'video_link' ? '▶ Vidéo à regarder' : file ? `📄 ${file.name}` : existingFile ? `📄 ${existingFile}` : 'Fichier à joindre'}
                </span>
              )}
              <span className="mt-auto rounded-lg bg-[#332D17] px-2 py-1.5 text-[10px] leading-[1.4] text-[#F5E3A8]">⚠ Ne remplace pas un avis médical.</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
