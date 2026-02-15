'use client';

import { useEffect, useState } from 'react';
import { MarkdownRenderer } from '../ui/MarkdownRenderer';
import { supabase } from '../../lib/supabase';
import type { EducationalResource } from '../../lib/types';

function extractVideoEmbedUrl(url: string): string | null {
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return null;
}

export function ResourceDetail({ resource }: { resource: EducationalResource }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if ((resource.content_type === 'pdf' || resource.content_type === 'image') && resource.file_path) {
      supabase.storage
        .from('educational-resources')
        .createSignedUrl(resource.file_path, 3600)
        .then(({ data }) => {
          if (data?.signedUrl) setSignedUrl(data.signedUrl);
        });
    }
  }, [resource]);

  if (resource.content_type === 'article' && resource.content_markdown) {
    return <MarkdownRenderer content={resource.content_markdown} />;
  }

  if (resource.content_type === 'pdf' && signedUrl) {
    return (
      <div className="w-full aspect-[3/4] rounded-lg overflow-hidden border border-divider">
        <embed src={signedUrl} type="application/pdf" className="w-full h-full" />
      </div>
    );
  }

  if (resource.content_type === 'image' && signedUrl) {
    return (
      <div className="rounded-lg overflow-hidden border border-divider">
        <img src={signedUrl} alt={resource.title} className="w-full h-auto" />
      </div>
    );
  }

  if (resource.content_type === 'video_link' && resource.video_url) {
    const embedUrl = extractVideoEmbedUrl(resource.video_url);
    if (embedUrl) {
      return (
        <div className="w-full aspect-video rounded-lg overflow-hidden border border-divider">
          <iframe
            src={embedUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }
    return (
      <a
        href={resource.video_url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sage underline"
      >
        Ouvrir la vidéo
      </a>
    );
  }

  return <p className="text-sm text-stone">Contenu non disponible</p>;
}
