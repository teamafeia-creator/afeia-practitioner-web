'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { ResourceEditor } from '@/components/resources/ResourceEditor';
import { createResource, updateResource, getResourceById } from '@/lib/queries/resources';
import type { EducationalResource } from '@/lib/types';

export default function NouvelleRessourcePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const [loading, setLoading] = useState(false);
  const [editData, setEditData] = useState<EducationalResource | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(!!editId);

  useEffect(() => {
    if (editId) {
      getResourceById(editId).then((data) => {
        setEditData(data);
        setLoadingEdit(false);
      });
    }
  }, [editId]);

  async function handleSubmit(
    form: {
      title: string;
      summary: string;
      content_type: string;
      content_markdown: string;
      video_url: string;
      category: string;
      tags: string;
      read_time_minutes: string;
    },
    file: File | null
  ) {
    setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) { setLoading(false); return; }
    const practitionerId = session.user.id;

    let filePath: string | undefined;
    let fileName: string | undefined;

    // Upload file if needed
    if (file && (form.content_type === 'pdf' || form.content_type === 'image')) {
      const path = `${practitionerId}/resources/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('educational-resources')
        .upload(path, file);
      if (uploadError) {
        console.error('Upload error:', uploadError);
        setLoading(false);
        return;
      }
      filePath = path;
      fileName = file.name;
    }

    const tags = form.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const readTime = form.read_time_minutes ? parseInt(form.read_time_minutes, 10) : undefined;

    const data = {
      title: form.title,
      summary: form.summary || undefined,
      content_type: form.content_type as EducationalResource['content_type'],
      content_markdown: form.content_type === 'article' ? form.content_markdown : undefined,
      file_path: filePath,
      file_name: fileName,
      video_url: form.content_type === 'video_link' ? form.video_url : undefined,
      category: form.category as EducationalResource['category'],
      tags,
      read_time_minutes: readTime,
    };

    if (editId && editData) {
      const updated = await updateResource(editId, practitionerId, data);
      if (updated) {
        router.push(`/bibliotheque/${updated.slug}`);
      }
    } else {
      const created = await createResource(practitionerId, data);
      if (created) {
        router.push(`/bibliotheque/${created.slug}`);
      }
    }

    setLoading(false);
  }

  if (loadingEdit) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-sage border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <button
          onClick={() => router.push('/bibliotheque')}
          className="flex items-center gap-1 text-sage hover:text-sage/80 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Bibliothèque
        </button>
        <span className="text-stone">/</span>
        <span className="text-charcoal font-medium">
          {editData ? 'Modifier la fiche' : 'Nouvelle fiche'}
        </span>
      </div>

      <Card>
        <CardHeader>
          <h1 className="text-xl font-semibold text-charcoal">
            {editData ? 'Modifier la fiche éducative' : 'Créer une fiche éducative'}
          </h1>
          <p className="text-sm text-stone">
            {editData
              ? 'Modifiez le contenu de votre fiche.'
              : 'Rédigez un article, importez un PDF ou une image, ou ajoutez un lien vidéo.'}
          </p>
        </CardHeader>
        <CardContent>
          <ResourceEditor
            initialData={editData ?? undefined}
            onSubmit={handleSubmit}
            loading={loading}
          />
        </CardContent>
      </Card>
    </div>
  );
}
