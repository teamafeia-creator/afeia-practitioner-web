import { supabase } from '../supabase';
import type { ConsultantDrawing } from '../../components/drawings/types';

const DRAWINGS_BUCKET = 'consultant-drawings';

export async function getDrawingsForConsultant(consultantId: string): Promise<ConsultantDrawing[]> {
  const { data, error } = await supabase
    .from('consultant_drawings')
    .select('*')
    .eq('consultant_id', consultantId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[drawings] fetch error:', error);
    return [];
  }
  return (data ?? []) as ConsultantDrawing[];
}

export async function createDrawing(data: {
  consultant_id: string;
  practitioner_id: string;
  title: string;
  template_type: string;
  excalidraw_data: any;
  appointment_id?: string;
  notes?: string;
}): Promise<ConsultantDrawing | null> {
  const { data: drawing, error } = await supabase
    .from('consultant_drawings')
    .insert(data)
    .select('*')
    .single();

  if (error) {
    console.error('[drawings] create error:', error);
    return null;
  }
  return drawing as ConsultantDrawing;
}

export async function updateDrawing(
  id: string,
  data: {
    title?: string;
    excalidraw_data?: any;
    snapshot_path?: string;
    notes?: string;
    version?: number;
  }
): Promise<ConsultantDrawing | null> {
  const { data: drawing, error } = await supabase
    .from('consultant_drawings')
    .update(data)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('[drawings] update error:', error);
    return null;
  }
  return drawing as ConsultantDrawing;
}

export async function deleteDrawing(id: string, snapshotPath?: string | null): Promise<boolean> {
  if (snapshotPath) {
    await supabase.storage.from(DRAWINGS_BUCKET).remove([snapshotPath]);
  }

  const { error } = await supabase
    .from('consultant_drawings')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[drawings] delete error:', error);
    return false;
  }
  return true;
}

export async function uploadDrawingSnapshot(
  practitionerId: string,
  drawingId: string,
  blob: Blob
): Promise<string | null> {
  const path = `${practitionerId}/drawings/${drawingId}/snapshot.png`;

  const { error } = await supabase.storage
    .from(DRAWINGS_BUCKET)
    .upload(path, blob, {
      contentType: 'image/png',
      upsert: true,
    });

  if (error) {
    console.error('[drawings] snapshot upload error:', error);
    return null;
  }
  return path;
}

export async function getSnapshotUrl(snapshotPath: string): Promise<string | null> {
  const { data } = await supabase.storage
    .from(DRAWINGS_BUCKET)
    .createSignedUrl(snapshotPath, 3600);

  return data?.signedUrl ?? null;
}
