'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { X, ZoomIn, ZoomOut, Grid3X3, MapPin, Circle, Type, Trash2, Save } from 'lucide-react';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { JensenChart } from './JensenChart';
import { supabase } from '../../lib/supabase';
import type { ConsultantIrisPhoto, IrisAnnotation, IrisAnnotationType } from '../../lib/types';
import { EYE_LABELS } from '../../lib/terrain-constants';
import { cn } from '../../lib/cn';

interface IrisViewerProps {
  photo: ConsultantIrisPhoto;
  onSave: (annotations: IrisAnnotation[], notes: string) => void;
  onClose: () => void;
}

const ANNOTATION_COLORS = [
  { value: '#EF4444', label: 'Rouge' },
  { value: '#F97316', label: 'Orange' },
  { value: '#22C55E', label: 'Vert' },
  { value: '#3B82F6', label: 'Bleu' },
];

export function IrisViewer({ photo, onSave, onClose }: IrisViewerProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [annotations, setAnnotations] = useState<IrisAnnotation[]>(photo.annotations ?? []);
  const [notes, setNotes] = useState(photo.notes ?? '');
  const [annotationMode, setAnnotationMode] = useState<IrisAnnotationType | null>(null);
  const [activeColor, setActiveColor] = useState(ANNOTATION_COLORS[0].value);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  // Load signed URL
  useEffect(() => {
    let cancelled = false;
    async function loadUrl() {
      setLoading(true);
      const { data } = await supabase.storage
        .from('iris-photos')
        .createSignedUrl(photo.photo_path, 300);
      if (!cancelled && data?.signedUrl) {
        setImageUrl(data.signedUrl);
      }
      if (!cancelled) setLoading(false);
    }
    loadUrl();
    return () => { cancelled = true; };
  }, [photo.photo_path]);

  // Handle wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((prev) => Math.min(4, Math.max(1, prev - e.deltaY * 0.002)));
  }, []);

  // Handle pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (annotationMode) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }, [annotationMode, pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
  }, [isPanning, panStart]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Handle click to add annotation
  const handleImageClick = useCallback((e: React.MouseEvent) => {
    if (!annotationMode || !imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if (x < 0 || x > 100 || y < 0 || y > 100) return;

    const label = prompt('Label de l\'annotation :') ?? '';
    if (!label.trim() && annotationMode !== 'point') return;

    const newAnnotation: IrisAnnotation = {
      type: annotationMode,
      x,
      y,
      label: label.trim(),
      color: activeColor,
      ...(annotationMode === 'circle' ? { radius: 5 } : {}),
    };

    setAnnotations((prev) => [...prev, newAnnotation]);
    setAnnotationMode(null);
  }, [annotationMode, activeColor]);

  function removeAnnotation(index: number) {
    setAnnotations((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSave() {
    onSave(annotations, notes);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-charcoal/95">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 bg-white border-b border-divider flex-wrap">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-charcoal">
            {EYE_LABELS[photo.eye]}
          </h3>
          {photo.taken_at && (
            <span className="text-xs text-stone">
              {new Date(photo.taken_at).toLocaleDateString('fr-FR')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Grid toggle */}
          <button
            type="button"
            onClick={() => setShowGrid(!showGrid)}
            className={cn(
              'p-2 rounded-lg text-xs transition-colors',
              showGrid ? 'bg-sage/10 text-sage' : 'text-stone hover:bg-cream'
            )}
            title="Grille de Jensen"
          >
            <Grid3X3 className="h-4 w-4" />
          </button>

          {/* Annotations toggle */}
          <button
            type="button"
            onClick={() => setShowAnnotations(!showAnnotations)}
            className={cn(
              'p-2 rounded-lg text-xs transition-colors',
              showAnnotations ? 'bg-sage/10 text-sage' : 'text-stone hover:bg-cream'
            )}
            title="Annotations"
          >
            <MapPin className="h-4 w-4" />
          </button>

          <div className="w-px h-5 bg-divider mx-1" />

          {/* Zoom controls */}
          <button type="button" onClick={() => setZoom((z) => Math.max(1, z - 0.5))} className="p-2 rounded-lg text-stone hover:bg-cream">
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-xs text-stone w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => setZoom((z) => Math.min(4, z + 0.5))} className="p-2 rounded-lg text-stone hover:bg-cream">
            <ZoomIn className="h-4 w-4" />
          </button>

          <div className="w-px h-5 bg-divider mx-1" />

          {/* Annotation tools */}
          <button
            type="button"
            onClick={() => setAnnotationMode(annotationMode === 'point' ? null : 'point')}
            className={cn(
              'p-2 rounded-lg text-xs transition-colors',
              annotationMode === 'point' ? 'bg-sage/10 text-sage ring-1 ring-sage/30' : 'text-stone hover:bg-cream'
            )}
            title="Ajouter un point"
          >
            <MapPin className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setAnnotationMode(annotationMode === 'circle' ? null : 'circle')}
            className={cn(
              'p-2 rounded-lg text-xs transition-colors',
              annotationMode === 'circle' ? 'bg-sage/10 text-sage ring-1 ring-sage/30' : 'text-stone hover:bg-cream'
            )}
            title="Ajouter un cercle"
          >
            <Circle className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setAnnotationMode(annotationMode === 'text' ? null : 'text')}
            className={cn(
              'p-2 rounded-lg text-xs transition-colors',
              annotationMode === 'text' ? 'bg-sage/10 text-sage ring-1 ring-sage/30' : 'text-stone hover:bg-cream'
            )}
            title="Ajouter du texte"
          >
            <Type className="h-4 w-4" />
          </button>

          {/* Color picker */}
          <div className="flex gap-1 ml-1">
            {ANNOTATION_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setActiveColor(c.value)}
                className={cn(
                  'h-5 w-5 rounded-full border-2 transition-all',
                  activeColor === c.value ? 'border-charcoal scale-110' : 'border-transparent'
                )}
                style={{ backgroundColor: c.value }}
                title={c.label}
              />
            ))}
          </div>

          <div className="w-px h-5 bg-divider mx-1" />

          <Button variant="primary" onClick={handleSave} className="text-xs">
            <Save className="h-3.5 w-3.5 mr-1" />
            Sauvegarder
          </Button>
          <button type="button" onClick={onClose} className="p-2 rounded-lg text-stone hover:bg-cream">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Image area */}
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden relative"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: annotationMode ? 'crosshair' : isPanning ? 'grabbing' : 'grab' }}
        >
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-8 w-8 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            </div>
          ) : imageUrl ? (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                transformOrigin: 'center center',
              }}
            >
              <div
                ref={imageRef}
                className="relative"
                style={{ maxWidth: '90%', maxHeight: '90%' }}
                onClick={handleImageClick}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt={EYE_LABELS[photo.eye]}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg"
                  draggable={false}
                />

                {/* Jensen grid overlay */}
                {showGrid && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <JensenChart
                      eye={photo.eye}
                      size={Math.min(500, 400)}
                      opacity={0.5}
                      showLabels={true}
                    />
                  </div>
                )}

                {/* Annotations overlay */}
                {showAnnotations && annotations.map((ann, idx) => (
                  <div
                    key={idx}
                    className="absolute group"
                    style={{
                      left: `${ann.x}%`,
                      top: `${ann.y}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    {ann.type === 'point' && (
                      <div
                        className="h-3 w-3 rounded-full border-2 border-white shadow-md"
                        style={{ backgroundColor: ann.color }}
                      />
                    )}
                    {ann.type === 'circle' && (
                      <div
                        className="rounded-full border-2 border-white/50"
                        style={{
                          width: `${(ann.radius ?? 5) * 2}%`,
                          height: `${(ann.radius ?? 5) * 2}%`,
                          minWidth: 20,
                          minHeight: 20,
                          borderColor: ann.color,
                          backgroundColor: `${ann.color}20`,
                        }}
                      />
                    )}
                    {ann.label && (
                      <span
                        className="absolute left-full ml-1 top-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] font-medium px-1 py-0.5 rounded bg-white/90 shadow-sm"
                        style={{ color: ann.color }}
                      >
                        {ann.label}
                      </span>
                    )}
                    {ann.type === 'text' && !ann.label && null}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeAnnotation(idx); }}
                      className="absolute -top-2 -right-2 hidden group-hover:flex h-4 w-4 items-center justify-center rounded-full bg-rose text-white text-[8px]"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white/50 text-sm">
              Impossible de charger l&apos;image
            </div>
          )}
        </div>

        {/* Notes sidebar */}
        <div className="w-72 bg-white border-l border-divider p-4 space-y-3 overflow-y-auto hidden lg:block">
          <h4 className="text-xs font-semibold text-charcoal uppercase tracking-wide">Notes iridologiques</h4>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observations sur l'iris..."
            rows={8}
          />

          {annotations.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-charcoal uppercase tracking-wide">
                Annotations ({annotations.length})
              </h4>
              {annotations.map((ann, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs p-2 rounded-lg bg-cream">
                  <span
                    className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: ann.color }}
                  />
                  <span className="flex-1 text-charcoal truncate">{ann.label || `${ann.type} #${idx + 1}`}</span>
                  <button
                    type="button"
                    onClick={() => removeAnnotation(idx)}
                    className="text-stone hover:text-rose flex-shrink-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
