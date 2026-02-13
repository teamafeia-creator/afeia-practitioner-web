'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Toast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';

const DOCUMENTS_BUCKET = 'practitioner-docs';
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium',
  timeStyle: 'short'
});

type DocumentItem = {
  name: string;
  displayName: string;
  path: string;
  createdAt: Date | null;
};

function parseTimestampFromName(name: string) {
  const match = name.match(/^(\d+)-/);
  if (!match) return null;
  const timestamp = Number(match[1]);
  if (Number.isNaN(timestamp)) return null;
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isPdfFile(file: File) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

export default function DocumentsPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [actionState, setActionState] = useState<{ id: string; type: 'view' | 'delete' } | null>(null);
  const [toast, setToast] = useState<{
    title: string;
    description?: string;
    variant?: 'success' | 'error' | 'info';
  } | null>(null);

  const selectedFileLabel = useMemo(() => {
    if (!selectedFile) return 'Aucun fichier sélectionné';
    const sizeMb = (selectedFile.size / (1024 * 1024)).toFixed(2);
    return `${selectedFile.name} • ${sizeMb} Mo`;
  }, [selectedFile]);

  useEffect(() => {
    let active = true;

    async function loadUserAndDocuments() {
      setLoadingDocuments(true);
      const { data, error } = await supabase.auth.getUser();
      if (!active) return;

      if (error || !data.user) {
        setUserId(null);
        setLoadingDocuments(false);
        setToast({
          title: 'Impossible de récupérer votre session',
          description: error?.message || 'Veuillez vous reconnecter.',
          variant: 'error'
        });
        return;
      }

      setUserId(data.user.id);
      await loadDocuments(data.user.id, active);
    }

    loadUserAndDocuments();

    return () => {
      active = false;
    };
  }, []);

  async function loadDocuments(practitionerId: string, active = true) {
    setLoadingDocuments(true);
    const { data, error } = await supabase
      .storage
      .from(DOCUMENTS_BUCKET)
      .list(`${practitionerId}/documents`, { limit: 100 });

    if (!active) return;

    if (error) {
      setToast({
        title: 'Impossible de charger les documents',
        description: error.message,
        variant: 'error'
      });
      setLoadingDocuments(false);
      return;
    }

    const items = (data ?? []).map((item) => {
      const createdAt = item.created_at ? new Date(item.created_at) : parseTimestampFromName(item.name);
      return {
        name: item.name,
        displayName: item.name.replace(/^\d+-/, ''),
        path: `${practitionerId}/documents/${item.name}`,
        createdAt
      };
    });

    items.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
    setDocuments(items);
    setLoadingDocuments(false);
  }

  function handlePickFile() {
    fileInputRef.current?.click();
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (!isPdfFile(file)) {
      setSelectedFile(null);
      event.target.value = '';
      setToast({
        title: 'Format non supporté',
        description: 'Veuillez sélectionner un fichier PDF.',
        variant: 'error'
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setSelectedFile(null);
      event.target.value = '';
      setToast({
        title: 'Fichier trop volumineux',
        description: `La taille maximale est de ${MAX_FILE_SIZE_MB} MB.`,
        variant: 'error'
      });
      return;
    }

    setSelectedFile(file);
  }

  async function handleUpload() {
    if (!selectedFile || !userId) return;

    if (!isPdfFile(selectedFile)) {
      setToast({
        title: 'Format non supporté',
        description: 'Veuillez sélectionner un fichier PDF.',
        variant: 'error'
      });
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      setToast({
        title: 'Fichier trop volumineux',
        description: `La taille maximale est de ${MAX_FILE_SIZE_MB} MB.`,
        variant: 'error'
      });
      return;
    }

    setUploading(true);
    setToast(null);

    const baseName = selectedFile.name.replace(/\.pdf$/i, '');
    const timestamp = Date.now();
    const path = `${userId}/documents/${timestamp}-${baseName}.pdf`;

    const { error } = await supabase.storage.from(DOCUMENTS_BUCKET).upload(path, selectedFile, {
      contentType: 'application/pdf',
      upsert: false
    });

    if (error) {
      setToast({
        title: 'Upload échoué',
        description: error.message,
        variant: 'error'
      });
      setUploading(false);
      return;
    }

    setToast({
      title: 'Document ajouté',
      description: 'Votre fichier a bien été uploadé.',
      variant: 'success'
    });
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    await loadDocuments(userId, true);
    setUploading(false);
  }

  async function handleViewDocument(document: DocumentItem) {
    setActionState({ id: document.path, type: 'view' });
    const { data, error } = await supabase
      .storage
      .from(DOCUMENTS_BUCKET)
      .createSignedUrl(document.path, 60);

    if (error || !data?.signedUrl) {
      setToast({
        title: 'Impossible d’ouvrir le document',
        description: error?.message || 'Lien de téléchargement indisponible.',
        variant: 'error'
      });
      setActionState(null);
      return;
    }

    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    setActionState(null);
  }

  async function handleDeleteDocument(document: DocumentItem) {
    const confirmed = window.confirm('Supprimer ce document ?');
    if (!confirmed) return;

    setActionState({ id: document.path, type: 'delete' });
    const { error } = await supabase.storage.from(DOCUMENTS_BUCKET).remove([document.path]);

    if (error) {
      setToast({
        title: 'Suppression impossible',
        description: error.message,
        variant: 'error'
      });
      setActionState(null);
      return;
    }

    setToast({
      title: 'Document supprimé',
      description: 'Le fichier a bien été supprimé.',
      variant: 'success'
    });
    if (userId) {
      await loadDocuments(userId, true);
    }
    setActionState(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mes documents"
        subtitle="Ajoutez et gérez vos documents professionnels en toute sécurité."
      />

      <Card>
        <CardHeader>
          <CardTitle>Ajouter un document</CardTitle>
          <CardDescription>PDF uniquement • {MAX_FILE_SIZE_MB} MB maximum</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading}
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button variant="secondary" onClick={handlePickFile} disabled={uploading}>
                Ajouter un document
              </Button>
              <span className="text-xs text-stone">{selectedFileLabel}</span>
            </div>
            <Button
              variant="primary"
              loading={uploading}
              disabled={!selectedFile || uploading}
              onClick={handleUpload}
            >
              Uploader
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>Retrouvez vos fichiers PDF partagés avec vos consultants.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingDocuments ? (
            <p className="text-sm text-stone">Chargement des documents...</p>
          ) : documents.length === 0 ? (
            <p className="text-sm text-charcoal">Aucun document pour le moment.</p>
          ) : (
            <ul className="divide-y divide-divider">
              {documents.map((document) => {
                const isViewing = actionState?.id === document.path && actionState?.type === 'view';
                const isDeleting = actionState?.id === document.path && actionState?.type === 'delete';

                return (
                  <li
                    key={document.path}
                    className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sage-light text-sage">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.5}
                          className="h-5 w-5"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 3h7l5 5v13a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z"
                          />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 3v6h6" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-charcoal">{document.displayName}</p>
                        <p className="text-xs text-stone">
                          {document.createdAt ? dateFormatter.format(document.createdAt) : 'Date inconnue'}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleViewDocument(document)}
                        loading={isViewing}
                        disabled={isDeleting}
                      >
                        Voir
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteDocument(document)}
                        loading={isDeleting}
                        disabled={isViewing}
                      >
                        Supprimer
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {toast ? (
        <Toast
          title={toast.title}
          description={toast.description}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      ) : null}
    </div>
  );
}
