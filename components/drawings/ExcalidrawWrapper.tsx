'use client';

import { forwardRef, useImperativeHandle, useRef, useEffect, useState, useCallback } from 'react';
import { Excalidraw, exportToBlob } from '@excalidraw/excalidraw';
import type { ExcalidrawData, TemplateType } from './types';
import { TEMPLATE_CONFIG } from './types';

interface ExcalidrawWrapperProps {
  initialData?: ExcalidrawData;
  templateType: TemplateType;
  readOnly?: boolean;
}

async function loadTemplateSvgAsDataUrl(templateType: TemplateType): Promise<string | null> {
  const config = TEMPLATE_CONFIG[templateType];
  if (!config.file) return null;

  try {
    const resp = await fetch(config.file);
    const svgText = await resp.text();
    const blob = new Blob([svgText], { type: 'image/svg+xml' });
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error('[ExcalidrawWrapper] failed to load template SVG:', err);
    return null;
  }
}

const ExcalidrawWrapper = forwardRef<any, ExcalidrawWrapperProps>(
  function ExcalidrawWrapperInner({ initialData, templateType, readOnly }, ref) {
    const excalidrawApiRef = useRef<any>(null);
    const [sceneData, setSceneData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useImperativeHandle(ref, () => ({
      getSceneElements: () => excalidrawApiRef.current?.getSceneElements() ?? [],
      getAppState: () => excalidrawApiRef.current?.getAppState() ?? {},
      getFiles: () => excalidrawApiRef.current?.getFiles() ?? {},
    }));

    useEffect(() => {
      let cancelled = false;

      async function prepare() {
        if (initialData) {
          setSceneData({
            elements: initialData.elements || [],
            appState: {
              viewBackgroundColor: '#ffffff',
              ...initialData.appState,
            },
            files: initialData.files || {},
          });
          setLoading(false);
          return;
        }

        if (templateType === 'blank') {
          setSceneData({
            elements: [],
            appState: { viewBackgroundColor: '#ffffff' },
            files: {},
          });
          setLoading(false);
          return;
        }

        const dataUrl = await loadTemplateSvgAsDataUrl(templateType);
        if (cancelled) return;

        if (!dataUrl) {
          setSceneData({
            elements: [],
            appState: { viewBackgroundColor: '#ffffff' },
            files: {},
          });
          setLoading(false);
          return;
        }

        const fileId = `template-${templateType}` as const;

        const templateElement = {
          id: `template-bg-${templateType}`,
          type: 'image' as const,
          x: 0,
          y: 0,
          width: 800,
          height: templateType === 'body_front' || templateType === 'body_back' || templateType === 'spine' ? 1200 : 800,
          angle: 0,
          strokeColor: 'transparent',
          backgroundColor: 'transparent',
          fillStyle: 'solid' as const,
          strokeWidth: 0,
          roughness: 0,
          opacity: 100,
          groupIds: [],
          roundness: null,
          seed: Math.floor(Math.random() * 100000),
          version: 1,
          versionNonce: Math.floor(Math.random() * 100000),
          isDeleted: false,
          boundElements: null,
          updated: Date.now(),
          link: null,
          locked: true,
          fileId,
          status: 'saved' as const,
          scale: [1, 1] as [number, number],
        };

        setSceneData({
          elements: [templateElement],
          appState: { viewBackgroundColor: '#ffffff' },
          files: {
            [fileId]: {
              id: fileId,
              mimeType: 'image/svg+xml',
              dataURL: dataUrl,
              created: Date.now(),
              lastRetrieved: Date.now(),
            },
          },
        });
        setLoading(false);
      }

      prepare();
      return () => { cancelled = true; };
    }, [initialData, templateType]);

    const handleExcalidrawApi = useCallback((api: any) => {
      excalidrawApiRef.current = api;
    }, []);

    if (loading || !sceneData) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-white">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-sage border-t-transparent" />
        </div>
      );
    }

    return (
      <div style={{ width: '100%', height: '100%' }}>
        <Excalidraw
          excalidrawAPI={handleExcalidrawApi}
          initialData={sceneData}
          viewModeEnabled={readOnly}
          langCode="fr-FR"
          theme="light"
        />
      </div>
    );
  }
);

export default ExcalidrawWrapper;
