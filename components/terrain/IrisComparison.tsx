'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Select } from '../ui/Select';
import { supabase } from '../../lib/supabase';
import type { ConsultantIrisPhoto, IrisEye } from '../../lib/types';
import { EYE_LABELS } from '../../lib/terrain-constants';

interface IrisComparisonProps {
  photos: ConsultantIrisPhoto[];
  eye: IrisEye;
}

type CompareMode = 'side_by_side' | 'slider';

export function IrisComparison({ photos, eye }: IrisComparisonProps) {
  const [leftIdx, setLeftIdx] = useState(0);
  const [rightIdx, setRightIdx] = useState(photos.length > 1 ? 1 : 0);
  const [mode, setMode] = useState<CompareMode>('side_by_side');
  const [leftUrl, setLeftUrl] = useState<string | null>(null);
  const [rightUrl, setRightUrl] = useState<string | null>(null);
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const leftPhoto = photos[leftIdx];
  const rightPhoto = photos[rightIdx];

  // Load signed URLs
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (leftPhoto) {
        const { data } = await supabase.storage.from('iris-photos').createSignedUrl(leftPhoto.photo_path, 300);
        if (!cancelled && data?.signedUrl) setLeftUrl(data.signedUrl);
      }
      if (rightPhoto) {
        const { data } = await supabase.storage.from('iris-photos').createSignedUrl(rightPhoto.photo_path, 300);
        if (!cancelled && data?.signedUrl) setRightUrl(data.signedUrl);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [leftPhoto, rightPhoto]);

  const formatDate = (d: string | null) => {
    if (!d) return 'Sans date';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Slider drag handling
  const handleSliderMove = useCallback((clientX: number) => {
    if (!containerRef.current || !isDragging) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pos = ((clientX - rect.left) / rect.width) * 100;
    setSliderPos(Math.max(0, Math.min(100, pos)));
  }, [isDragging]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    handleSliderMove(e.clientX);
  }, [handleSliderMove]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches[0]) handleSliderMove(e.touches[0].clientX);
  }, [handleSliderMove]);

  if (photos.length < 2) {
    return (
      <div className="text-center py-8 text-sm text-stone">
        Il faut au minimum 2 photos du même œil pour comparer.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[140px]">
          <label className="text-xs text-warmgray block mb-1">Photo 1 (avant)</label>
          <Select value={String(leftIdx)} onChange={(e) => setLeftIdx(Number(e.target.value))}>
            {photos.map((p, i) => (
              <option key={p.id} value={String(i)}>{formatDate(p.taken_at)}</option>
            ))}
          </Select>
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="text-xs text-warmgray block mb-1">Photo 2 (après)</label>
          <Select value={String(rightIdx)} onChange={(e) => setRightIdx(Number(e.target.value))}>
            {photos.map((p, i) => (
              <option key={p.id} value={String(i)}>{formatDate(p.taken_at)}</option>
            ))}
          </Select>
        </div>
        <div className="min-w-[140px]">
          <label className="text-xs text-warmgray block mb-1">Mode</label>
          <Select value={mode} onChange={(e) => setMode(e.target.value as CompareMode)}>
            <option value="side_by_side">Côte à côte</option>
            <option value="slider">Curseur avant/après</option>
          </Select>
        </div>
      </div>

      {/* Comparison view */}
      {mode === 'side_by_side' ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="text-xs text-stone text-center">{formatDate(leftPhoto?.taken_at ?? null)}</p>
            {leftUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={leftUrl} alt={`${EYE_LABELS[eye]} - avant`} className="w-full rounded-lg object-contain border border-divider" />
            ) : (
              <div className="aspect-square bg-cream rounded-lg flex items-center justify-center text-xs text-stone">Chargement...</div>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs text-stone text-center">{formatDate(rightPhoto?.taken_at ?? null)}</p>
            {rightUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={rightUrl} alt={`${EYE_LABELS[eye]} - après`} className="w-full rounded-lg object-contain border border-divider" />
            ) : (
              <div className="aspect-square bg-cream rounded-lg flex items-center justify-center text-xs text-stone">Chargement...</div>
            )}
          </div>
        </div>
      ) : (
        /* Slider before/after mode */
        <div
          ref={containerRef}
          className="relative overflow-hidden rounded-lg border border-divider select-none"
          style={{ aspectRatio: '1/1' }}
          onMouseMove={handleMouseMove}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => setIsDragging(false)}
          onTouchMove={handleTouchMove}
          onTouchEnd={() => setIsDragging(false)}
        >
          {/* Bottom layer (right/after photo) */}
          {rightUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={rightUrl}
              alt="Après"
              className="absolute inset-0 w-full h-full object-contain"
              draggable={false}
            />
          )}

          {/* Top layer (left/before photo) with clip-path */}
          {leftUrl && (
            <div
              className="absolute inset-0"
              style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={leftUrl}
                alt="Avant"
                className="w-full h-full object-contain"
                draggable={false}
              />
            </div>
          )}

          {/* Slider handle */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg cursor-ew-resize z-10"
            style={{ left: `${sliderPos}%` }}
            onMouseDown={() => setIsDragging(true)}
            onTouchStart={() => setIsDragging(true)}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white shadow-md flex items-center justify-center text-xs text-stone">
              ⇔
            </div>
          </div>

          {/* Labels */}
          <div className="absolute top-2 left-2 bg-white/80 text-xs text-charcoal px-2 py-1 rounded">
            {formatDate(leftPhoto?.taken_at ?? null)}
          </div>
          <div className="absolute top-2 right-2 bg-white/80 text-xs text-charcoal px-2 py-1 rounded">
            {formatDate(rightPhoto?.taken_at ?? null)}
          </div>
        </div>
      )}
    </div>
  );
}
