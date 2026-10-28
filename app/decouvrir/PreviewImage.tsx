'use client';

import { useState } from 'react';

/**
 * Capture statique d'un écran (fournie dans public/decouvrir/).
 * Tant que l'image n'est pas déposée, on affiche un fond neutre plutôt qu'une image cassée.
 */
export function PreviewImage({ src, alt }: { src: string; alt: string }) {
  const [missing, setMissing] = useState(false);
  if (missing) {
    return <div className="flex h-full w-full items-center justify-center text-sm text-mist">Capture à venir</div>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      onError={() => setMissing(true)}
      className="h-full w-full select-none object-cover object-top"
      draggable={false}
    />
  );
}
