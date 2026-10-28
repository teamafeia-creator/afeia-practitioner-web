import { supabase } from '../supabase';
import type { Block } from '../blocks-types';
import type { ResourceFormat } from '../library';

// ---------- Favoris des fiches ----------

export async function getFicheFavorites(): Promise<Set<string>> {
  const { data } = await supabase.from('educational_resource_favorites').select('resource_id');
  return new Set((data ?? []).map((r: { resource_id: string }) => r.resource_id));
}

export async function setFicheFavorite(practitionerId: string, resourceId: string, on: boolean) {
  if (on) {
    await supabase.from('educational_resource_favorites').upsert({ practitioner_id: practitionerId, resource_id: resourceId });
  } else {
    await supabase.from('educational_resource_favorites').delete().eq('practitioner_id', practitionerId).eq('resource_id', resourceId);
  }
}

// ---------- Envois des fiches ----------

export type SentRow = { consultant_id: string; name: string; sent_at: string; read_at: string | null };

export async function getAssignmentCounts(practitionerId: string): Promise<Record<string, number>> {
  const { data } = await supabase.from('resource_assignments').select('resource_id').eq('practitioner_id', practitionerId);
  const out: Record<string, number> = {};
  (data ?? []).forEach((r: { resource_id: string }) => (out[r.resource_id] = (out[r.resource_id] ?? 0) + 1));
  return out;
}

export async function getSentForResource(practitionerId: string, resourceId: string): Promise<SentRow[]> {
  const { data } = await supabase
    .from('resource_assignments')
    .select('consultant_id, sent_at, read_at, consultant:consultants(name, first_name, last_name)')
    .eq('practitioner_id', practitionerId)
    .eq('resource_id', resourceId)
    .order('sent_at', { ascending: false });
  type Raw = { consultant_id: string; sent_at: string; read_at: string | null; consultant: { name: string | null; first_name: string | null; last_name: string | null } | null };
  return ((data ?? []) as unknown as Raw[]).map((r) => ({
    consultant_id: r.consultant_id,
    sent_at: r.sent_at,
    read_at: r.read_at,
    name: r.consultant?.name || [r.consultant?.first_name, r.consultant?.last_name].filter(Boolean).join(' ') || 'Consultant',
  }));
}

/** Envoie (ou renvoie) une fiche à plusieurs consultants avec un petit mot. */
export async function sendFiche(practitionerId: string, resourceId: string, consultantIds: string[], message: string | null) {
  const now = new Date().toISOString();
  const rows = consultantIds.map((consultant_id) => ({
    resource_id: resourceId,
    consultant_id,
    practitioner_id: practitionerId,
    consultant_plan_id: null,
    plan_section_key: null,
    message,
    read_at: null,
    sent_at: now,
  }));
  const { error } = await supabase.from('resource_assignments').upsert(rows, { onConflict: 'resource_id,consultant_id' });
  if (error) throw new Error('La fiche n’a pas pu être envoyée.');
  await supabase.from('notifications').insert(
    consultantIds.map((consultant_id) => ({
      practitioner_id: practitionerId,
      consultant_id,
      type: 'general',
      title: 'Nouvelle fiche',
      description: 'Votre praticien vous a envoyé une fiche à lire dans « Mes fiches ».',
      level: 'info',
      read: false,
    }))
  );
}

// ---------- Blocs du praticien ----------

async function token() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? '';
}

export type PractitionerBlock = Block & { custom_motifs?: string[] };

export async function listMyBlocks(): Promise<PractitionerBlock[]> {
  const res = await fetch('/api/blocks?source=praticien', { headers: { Authorization: `Bearer ${await token()}` } });
  if (!res.ok) throw new Error('Les blocs n’ont pas pu être chargés.');
  const body = await res.json();
  return (body.blocks ?? []) as PractitionerBlock[];
}

export type BlockInput = { title: string; content: string; section: string; motifs: string[]; custom_motifs: string[]; tags: string[] };

export async function saveBlock(id: string | null, input: BlockInput): Promise<PractitionerBlock> {
  const res = await fetch(id ? `/api/blocks/${id}` : '/api/blocks', {
    method: id ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
    body: JSON.stringify(input),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Le bloc n’a pas pu être enregistré.');
  return body.block as PractitionerBlock;
}

export async function archiveBlock(id: string) {
  const res = await fetch(`/api/blocks/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${await token()}` } });
  if (!res.ok) throw new Error('Le bloc n’a pas pu être supprimé.');
}

export async function toggleBlockFavorite(id: string) {
  const res = await fetch(`/api/blocks/${id}/favorite`, { method: 'POST', headers: { Authorization: `Bearer ${await token()}` } });
  if (!res.ok) throw new Error('Action impossible.');
}

// ---------- Ressources pour les praticiens ----------

export type PractitionerResource = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  format: ResourceFormat;
  url: string | null;
  file_path: string | null;
  file_name: string | null;
  source: 'afeia' | 'practitioner';
  owner_id: string | null;
  author_label: string | null;
  review_status: 'private' | 'pending' | 'published' | 'rejected';
  created_at: string;
};

export async function listResources(): Promise<PractitionerResource[]> {
  const { data, error } = await supabase.from('practitioner_resources').select('*').order('created_at', { ascending: false });
  if (error) throw new Error('Les ressources n’ont pas pu être chargées.');
  return (data ?? []) as PractitionerResource[];
}

export async function getResourceFavorites(): Promise<Set<string>> {
  const { data } = await supabase.from('practitioner_resource_favorites').select('resource_id');
  return new Set((data ?? []).map((r: { resource_id: string }) => r.resource_id));
}

export async function setResourceFavorite(practitionerId: string, resourceId: string, on: boolean) {
  if (on) await supabase.from('practitioner_resource_favorites').upsert({ practitioner_id: practitionerId, resource_id: resourceId });
  else await supabase.from('practitioner_resource_favorites').delete().eq('practitioner_id', practitionerId).eq('resource_id', resourceId);
}

export async function proposeResource(
  practitionerId: string,
  input: { title: string; description: string; category: string; format: ResourceFormat; url: string; file: File | null; share: boolean },
  authorLabel: string
): Promise<PractitionerResource> {
  let file_path: string | null = null;
  let file_name: string | null = null;
  if (input.file) {
    const safe = input.file.name.normalize('NFD').replace(/[^\w.-]+/g, '-');
    file_path = `${practitionerId}/${Date.now()}-${safe}`;
    const { error: up } = await supabase.storage.from('practitioner-resources').upload(file_path, input.file);
    if (up) throw new Error('Le fichier n’a pas pu être envoyé.');
    file_name = input.file.name;
  }
  const { data, error } = await supabase
    .from('practitioner_resources')
    .insert({
      title: input.title.trim(),
      description: input.description.trim() || null,
      category: input.category,
      format: input.format,
      url: input.url.trim() || null,
      file_path,
      file_name,
      source: 'practitioner',
      owner_id: practitionerId,
      author_label: authorLabel,
      review_status: input.share ? 'pending' : 'private',
    })
    .select()
    .single();
  if (error || !data) throw new Error('La ressource n’a pas pu être enregistrée.');
  return data as PractitionerResource;
}

export async function openResource(r: PractitionerResource): Promise<string | null> {
  if (r.url) return r.url;
  if (!r.file_path) return null;
  const { data } = await supabase.storage.from('practitioner-resources').createSignedUrl(r.file_path, 3600);
  return data?.signedUrl ?? null;
}
