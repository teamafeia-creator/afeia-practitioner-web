'use client';

import { useState, useEffect } from 'react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { ConfirmModal } from '../ui/Modal';
import { Plus, Eye, FileDown, Trash2, Pencil } from 'lucide-react';
import { TEMPLATE_CONFIG, type TemplateType } from './types';
import type { ConsultantDrawing } from '../../lib/types';
import { getSnapshotUrl } from '../../lib/queries/drawings';

const DATE_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

interface DrawingGalleryProps {
  drawings: ConsultantDrawing[];
  onOpen: (drawing: ConsultantDrawing) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
  onExportPDF: (drawingId: string) => void;
}

export function DrawingGallery({ drawings, onOpen, onDelete, onCreate, onExportPDF }: DrawingGalleryProps) {
  const [snapshotUrls, setSnapshotUrls] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadUrls() {
      const urls: Record<string, string> = {};
      const promises = drawings
        .filter((d) => d.snapshot_path)
        .map(async (d) => {
          const url = await getSnapshotUrl(d.snapshot_path!);
          if (url) urls[d.id] = url;
        });
      await Promise.all(promises);
      if (!cancelled) setSnapshotUrls(urls);
    }

    loadUrls();
    return () => { cancelled = true; };
  }, [drawings]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Schémas corporels</h2>
            <p className="text-xs text-stone">Annotez des schémas anatomiques pour le suivi du consultant</p>
          </div>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="h-4 w-4" />}
            onClick={onCreate}
          >
            Nouveau schéma
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {drawings.length === 0 ? (
          <EmptyState
            icon={<Pencil className="h-6 w-6" />}
            title="Aucun schéma corporel"
            description="Créez un premier schéma pour annoter des silhouettes anatomiques."
            action={
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="h-4 w-4" />}
                onClick={onCreate}
              >
                Créer un premier schéma
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {drawings.map((drawing) => {
              const config = TEMPLATE_CONFIG[drawing.template_type as TemplateType] ?? TEMPLATE_CONFIG.blank;
              return (
                <div
                  key={drawing.id}
                  className="flex flex-col rounded-xl border border-divider bg-cream/60 p-4 transition hover:shadow-card"
                >
                  {/* Miniature */}
                  <div className="mb-3 flex h-36 items-center justify-center rounded-lg bg-white">
                    {snapshotUrls[drawing.id] ? (
                      <img
                        src={snapshotUrls[drawing.id]}
                        alt={drawing.title}
                        className="h-32 w-auto object-contain"
                      />
                    ) : config.file ? (
                      <div className="relative">
                        <img
                          src={config.file}
                          alt={config.label}
                          className="h-28 w-auto object-contain opacity-40"
                        />
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded bg-stone/10 px-2 py-0.5 text-[10px] text-stone">
                          Pas de preview
                        </span>
                      </div>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-stone/30">
                        <Pencil className="h-10 w-10" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <p className="text-sm font-medium text-charcoal truncate">{drawing.title}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="default">{config.label}</Badge>
                    <span className="text-xs text-stone">
                      {DATE_FORMATTER.format(new Date(drawing.created_at))}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Eye className="h-3.5 w-3.5" />}
                      onClick={() => onOpen(drawing)}
                    >
                      Ouvrir
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<FileDown className="h-3.5 w-3.5" />}
                      onClick={() => onExportPDF(drawing.id)}
                    >
                      PDF
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-rose hover:text-rose"
                      icon={<Trash2 className="h-3.5 w-3.5" />}
                      onClick={() => setDeleteTarget(drawing.id)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            onDelete(deleteTarget);
            setDeleteTarget(null);
          }
        }}
        title="Supprimer le schéma"
        message="Cette action est définitive. Le schéma et son snapshot seront supprimés."
        confirmText="Supprimer"
        variant="danger"
      />
    </Card>
  );
}
