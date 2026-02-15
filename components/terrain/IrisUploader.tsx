'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Eye } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { uploadIrisPhoto, createIrisPhoto } from '../../lib/queries/terrain';
import type { ConsultantIrisPhoto, IrisEye } from '../../lib/types';
import { EYE_LABELS } from '../../lib/terrain-constants';
import { cn } from '../../lib/cn';

interface IrisUploaderProps {
  consultantId: string;
  practitionerId: string;
  onUploadComplete: (photo: ConsultantIrisPhoto) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/heic': ['.heic'] };

export function IrisUploader({ consultantId, practitionerId, onUploadComplete }: IrisUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [eye, setEye] = useState<IrisEye>('right');
  const [takenAt, setTakenAt] = useState(new Date().toISOString().slice(0, 10));
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((accepted: File[], rejected: any[]) => {
    setError(null);
    if (rejected.length > 0) {
      const err = rejected[0]?.errors?.[0];
      if (err?.code === 'file-too-large') {
        setError('Le fichier dépasse 10 Mo.');
      } else if (err?.code === 'file-invalid-type') {
        setError('Format non supporté. Utilisez JPG, PNG ou HEIC.');
      } else {
        setError('Fichier invalide.');
      }
      return;
    }
    const f = accepted[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: false,
  });

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError(null);

    try {
      const path = await uploadIrisPhoto(practitionerId, consultantId, eye, file);
      if (!path) throw new Error('Échec de l\'upload du fichier.');

      const photo = await createIrisPhoto({
        consultant_id: consultantId,
        practitioner_id: practitionerId,
        eye,
        photo_path: path,
        thumbnail_path: path,
        annotations: [],
        notes: null,
        taken_at: takenAt || null,
      });

      if (!photo) throw new Error('Échec de l\'enregistrement de la photo.');

      // Clean up preview
      if (preview) URL.revokeObjectURL(preview);
      setFile(null);
      setPreview(null);

      onUploadComplete(photo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'import.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      {!preview ? (
        <div
          {...getRootProps()}
          className={cn(
            'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
            isDragActive ? 'border-sage bg-sage/5' : 'border-divider hover:border-sage/50'
          )}
        >
          <input {...getInputProps()} />
          <Upload className="h-8 w-8 text-stone mx-auto mb-3" />
          <p className="text-sm text-charcoal font-medium">
            {isDragActive ? 'Déposez la photo ici' : 'Glissez-déposez une photo d\'iris'}
          </p>
          <p className="text-xs text-stone mt-1">
            JPG, PNG ou HEIC • Max 10 Mo
          </p>
        </div>
      ) : (
        /* Preview */
        <div className="space-y-3">
          <div className="relative rounded-xl overflow-hidden border border-divider bg-cream">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Aperçu"
              className="w-full max-h-64 object-contain"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              if (preview) URL.revokeObjectURL(preview);
              setFile(null);
              setPreview(null);
            }}
            className="text-xs text-rose hover:underline"
          >
            Changer de photo
          </button>
        </div>
      )}

      {/* Fields */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-warmgray block mb-1">Œil *</label>
          <Select value={eye} onChange={(e) => setEye(e.target.value as IrisEye)}>
            <option value="right">{EYE_LABELS.right}</option>
            <option value="left">{EYE_LABELS.left}</option>
          </Select>
        </div>
        <div>
          <Input
            label="Date de prise de vue"
            type="date"
            value={takenAt}
            onChange={(e) => setTakenAt(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <p className="text-xs text-rose">{error}</p>
      )}

      <Button
        variant="primary"
        onClick={handleUpload}
        loading={uploading}
        disabled={!file || uploading}
        className="w-full"
      >
        <Eye className="h-4 w-4 mr-1.5" />
        Importer la photo
      </Button>
    </div>
  );
}
