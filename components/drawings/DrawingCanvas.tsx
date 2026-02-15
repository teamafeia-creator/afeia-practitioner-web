'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { X, Save, Download } from 'lucide-react';
import type { TemplateType, ExcalidrawData } from './types';
import { TEMPLATE_CONFIG } from './types';

const ExcalidrawWrapper = dynamic(
  () => import('./ExcalidrawWrapper'),
  { ssr: false, loading: () => <ExcalidrawLoading /> }
);

function ExcalidrawLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-white">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-sage border-t-transparent" />
        <p className="mt-3 text-sm text-stone">Chargement de l&apos;éditeur…</p>
      </div>
    </div>
  );
}

interface DrawingCanvasProps {
  initialData?: ExcalidrawData;
  templateType: TemplateType;
  title: string;
  onSave: (data: ExcalidrawData, pngBlob: Blob, title: string) => Promise<void>;
  onClose: () => void;
  readOnly?: boolean;
}

export default function DrawingCanvas({
  initialData,
  templateType,
  title: initialTitle,
  onSave,
  onClose,
  readOnly = false,
}: DrawingCanvasProps) {
  const [title, setTitle] = useState(initialTitle || TEMPLATE_CONFIG[templateType].label);
  const [saving, setSaving] = useState(false);
  const excalidrawRef = useRef<any>(null);

  const handleSave = useCallback(async () => {
    const api = excalidrawRef.current;
    if (!api) return;

    setSaving(true);
    try {
      const elements = api.getSceneElements();
      const appState = api.getAppState();
      const files = api.getFiles();

      const cleanAppState: Record<string, any> = {};
      const persistKeys = [
        'viewBackgroundColor',
        'currentItemFontFamily',
        'currentItemFontSize',
        'currentItemStrokeColor',
        'currentItemBackgroundColor',
        'currentItemFillStyle',
        'currentItemStrokeWidth',
        'currentItemRoughness',
        'currentItemOpacity',
        'currentItemRoundness',
        'gridSize',
      ];
      for (const key of persistKeys) {
        if (key in appState) {
          cleanAppState[key] = appState[key];
        }
      }

      // Exclude template SVG file data from saved JSONB — templates are reloaded on open
      const serializedFiles = files
        ? Object.fromEntries(
            Object.entries(JSON.parse(JSON.stringify(files)))
              .filter(([key]) => !key.startsWith('template-'))
          )
        : undefined;

      const data: ExcalidrawData = {
        elements: JSON.parse(JSON.stringify(elements)),
        appState: cleanAppState,
        files: serializedFiles,
      };

      const { exportToBlob } = await import('@excalidraw/excalidraw');
      const blob = await exportToBlob({
        elements,
        appState: { ...appState, exportWithDarkMode: false },
        files,
        getDimensions: () => ({ width: 1600, height: 1200, scale: 2 }),
      });

      await onSave(data, blob, title);
    } catch (err) {
      console.error('[DrawingCanvas] save error:', err);
    } finally {
      setSaving(false);
    }
  }, [onSave, title]);

  const handleExportPng = useCallback(async () => {
    const api = excalidrawRef.current;
    if (!api) return;

    try {
      const elements = api.getSceneElements();
      const appState = api.getAppState();
      const files = api.getFiles();

      const { exportToBlob } = await import('@excalidraw/excalidraw');
      const blob = await exportToBlob({
        elements,
        appState: { ...appState, exportWithDarkMode: false },
        files,
        getDimensions: () => ({ width: 1600, height: 1200, scale: 2 }),
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/[^a-zA-Z0-9àâäéèêëïîôùûüÿç\s-]/g, '').replace(/\s+/g, '-').toLowerCase()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[DrawingCanvas] export error:', err);
    }
  }, [title]);

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-3 border-b border-divider bg-white px-4 py-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="max-w-xs"
          placeholder="Titre du schéma"
          disabled={readOnly}
        />
        <div className="flex-1" />
        {!readOnly && (
          <Button
            variant="primary"
            size="sm"
            icon={<Save className="h-4 w-4" />}
            onClick={handleSave}
            loading={saving}
          >
            Sauvegarder
          </Button>
        )}
        <Button
          variant="secondary"
          size="sm"
          icon={<Download className="h-4 w-4" />}
          onClick={handleExportPng}
        >
          Exporter PNG
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={<X className="h-4 w-4" />}
          onClick={onClose}
        >
          Fermer
        </Button>
      </div>

      {/* Canvas */}
      <div className="flex-1 bg-white">
        <ExcalidrawWrapper
          ref={excalidrawRef}
          initialData={initialData}
          templateType={templateType}
          readOnly={readOnly}
        />
      </div>
    </div>
  );
}
