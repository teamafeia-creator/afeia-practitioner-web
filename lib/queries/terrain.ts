import { supabase } from '../supabase';
import type {
  ConsultantTerrain,
  ConsultantIrisPhoto,
  IrisAnnotation,
  IrisEye,
} from '../types';

// ============================================
// TERRAIN
// ============================================

export async function getTerrainForConsultant(
  consultantId: string
): Promise<ConsultantTerrain | null> {
  const { data, error } = await supabase
    .from('consultant_terrain')
    .select('*')
    .eq('consultant_id', consultantId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching terrain:', error);
    return null;
  }
  return data;
}

export async function upsertTerrain(
  consultantId: string,
  practitionerId: string,
  data: Partial<ConsultantTerrain>
): Promise<ConsultantTerrain | null> {
  // Remove read-only fields
  const { id, created_at, updated_at, ...rest } = data as any;

  const { data: result, error } = await supabase
    .from('consultant_terrain')
    .upsert(
      {
        consultant_id: consultantId,
        practitioner_id: practitionerId,
        ...rest,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'consultant_id' }
    )
    .select()
    .single();

  if (error) {
    console.error('Error upserting terrain:', error);
    return null;
  }
  return result;
}

// ============================================
// IRIS PHOTOS
// ============================================

export async function getIrisPhotosForConsultant(
  consultantId: string
): Promise<ConsultantIrisPhoto[]> {
  const { data, error } = await supabase
    .from('consultant_iris_photos')
    .select('*')
    .eq('consultant_id', consultantId)
    .order('taken_at', { ascending: false });

  if (error) {
    console.error('Error fetching iris photos:', error);
    return [];
  }
  return data || [];
}

export async function createIrisPhoto(
  photo: Omit<ConsultantIrisPhoto, 'id' | 'created_at' | 'updated_at'>
): Promise<ConsultantIrisPhoto | null> {
  const { data, error } = await supabase
    .from('consultant_iris_photos')
    .insert(photo)
    .select()
    .single();

  if (error) {
    console.error('Error creating iris photo:', error);
    return null;
  }
  return data;
}

export async function updateIrisPhotoAnnotations(
  id: string,
  annotations: IrisAnnotation[],
  notes?: string
): Promise<ConsultantIrisPhoto | null> {
  const update: Record<string, unknown> = { annotations };
  if (notes !== undefined) {
    update.notes = notes;
  }

  const { data, error } = await supabase
    .from('consultant_iris_photos')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating iris photo annotations:', error);
    return null;
  }
  return data;
}

export async function deleteIrisPhoto(
  id: string,
  photoPath: string
): Promise<boolean> {
  // Delete file from storage
  const { error: storageError } = await supabase.storage
    .from('iris-photos')
    .remove([photoPath]);

  if (storageError) {
    console.error('Error deleting iris photo file:', storageError);
  }

  // Delete record from database
  const { error } = await supabase
    .from('consultant_iris_photos')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting iris photo record:', error);
    return false;
  }
  return true;
}

export async function uploadIrisPhoto(
  practitionerId: string,
  consultantId: string,
  eye: IrisEye,
  file: File
): Promise<string | null> {
  const path = `${practitionerId}/iris/${consultantId}/${eye}_${Date.now()}.jpg`;

  const { error } = await supabase.storage
    .from('iris-photos')
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) {
    console.error('Error uploading iris photo:', error);
    return null;
  }
  return path;
}
