import { supabase } from '../supabase';
import type {
  EducationalResource,
  ResourceAssignment,
  ResourceCategory,
  ResourceSource,
} from '../types';

// ============================================
// EDUCATIONAL RESOURCES
// ============================================

type ResourceFilters = {
  category?: ResourceCategory;
  source?: ResourceSource;
  search?: string;
};

export async function getEducationalResources(
  practitionerId: string,
  filters?: ResourceFilters
): Promise<EducationalResource[]> {
  let query = supabase
    .from('educational_resources')
    .select('*')
    .or(`practitioner_id.is.null,practitioner_id.eq.${practitionerId}`)
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  if (filters?.category) {
    query = query.eq('category', filters.category);
  }
  if (filters?.source) {
    query = query.eq('source', filters.source);
  }
  if (filters?.search) {
    const term = `%${filters.search}%`;
    query = query.or(`title.ilike.${term},summary.ilike.${term}`);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching educational resources:', error);
    return [];
  }
  return data ?? [];
}

export async function getResourceBySlug(
  slug: string
): Promise<EducationalResource | null> {
  const { data, error } = await supabase
    .from('educational_resources')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    console.error('Error fetching resource by slug:', error);
    return null;
  }
  return data;
}

export async function getResourceById(
  id: string
): Promise<EducationalResource | null> {
  const { data, error } = await supabase
    .from('educational_resources')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Error fetching resource by id:', error);
    return null;
  }
  return data;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

type CreateResourceData = {
  title: string;
  summary?: string;
  content_type: EducationalResource['content_type'];
  content_markdown?: string;
  file_path?: string;
  file_name?: string;
  video_url?: string;
  thumbnail_path?: string;
  category: ResourceCategory;
  tags?: string[];
  read_time_minutes?: number;
};

export async function createResource(
  practitionerId: string,
  data: CreateResourceData
): Promise<EducationalResource | null> {
  const slug = slugify(data.title);

  const { data: created, error } = await supabase
    .from('educational_resources')
    .insert({
      practitioner_id: practitionerId,
      title: data.title,
      slug,
      summary: data.summary ?? null,
      content_type: data.content_type,
      content_markdown: data.content_markdown ?? null,
      file_path: data.file_path ?? null,
      file_name: data.file_name ?? null,
      video_url: data.video_url ?? null,
      thumbnail_path: data.thumbnail_path ?? null,
      category: data.category,
      tags: data.tags ?? [],
      source: 'practitioner',
      is_published: true,
      read_time_minutes: data.read_time_minutes ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating resource:', error);
    return null;
  }
  return created;
}

export async function updateResource(
  resourceId: string,
  practitionerId: string,
  data: Partial<CreateResourceData>
): Promise<EducationalResource | null> {
  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) {
    updateData.title = data.title;
    updateData.slug = slugify(data.title);
  }
  if (data.summary !== undefined) updateData.summary = data.summary;
  if (data.content_type !== undefined) updateData.content_type = data.content_type;
  if (data.content_markdown !== undefined) updateData.content_markdown = data.content_markdown;
  if (data.file_path !== undefined) updateData.file_path = data.file_path;
  if (data.file_name !== undefined) updateData.file_name = data.file_name;
  if (data.video_url !== undefined) updateData.video_url = data.video_url;
  if (data.thumbnail_path !== undefined) updateData.thumbnail_path = data.thumbnail_path;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.tags !== undefined) updateData.tags = data.tags;
  if (data.read_time_minutes !== undefined) updateData.read_time_minutes = data.read_time_minutes;

  const { data: updated, error } = await supabase
    .from('educational_resources')
    .update(updateData)
    .eq('id', resourceId)
    .eq('practitioner_id', practitionerId)
    .select()
    .single();

  if (error) {
    console.error('Error updating resource:', error);
    return null;
  }
  return updated;
}

export async function deleteResource(
  resourceId: string,
  practitionerId: string
): Promise<boolean> {
  // First get the resource to check for storage files
  const { data: resource } = await supabase
    .from('educational_resources')
    .select('file_path')
    .eq('id', resourceId)
    .eq('practitioner_id', practitionerId)
    .single();

  if (resource?.file_path) {
    await supabase.storage
      .from('educational-resources')
      .remove([resource.file_path]);
  }

  const { error } = await supabase
    .from('educational_resources')
    .delete()
    .eq('id', resourceId)
    .eq('practitioner_id', practitionerId);

  if (error) {
    console.error('Error deleting resource:', error);
    return false;
  }
  return true;
}

// ============================================
// RESOURCE ASSIGNMENTS
// ============================================

type AssignOptions = {
  consultant_plan_id?: string;
  plan_section_key?: string;
  message?: string;
};

export async function assignResourceToConsultant(
  resourceId: string,
  consultantId: string,
  practitionerId: string,
  options?: AssignOptions
): Promise<ResourceAssignment | null> {
  const { data, error } = await supabase
    .from('resource_assignments')
    .upsert(
      {
        resource_id: resourceId,
        consultant_id: consultantId,
        practitioner_id: practitionerId,
        consultant_plan_id: options?.consultant_plan_id ?? null,
        plan_section_key: options?.plan_section_key ?? null,
        message: options?.message ?? null,
      },
      {
        onConflict: options?.consultant_plan_id
          ? 'resource_id,consultant_id,consultant_plan_id'
          : 'resource_id,consultant_id',
      }
    )
    .select()
    .single();

  if (error) {
    console.error('Error assigning resource:', error);
    return null;
  }
  return data;
}

export async function getResourceAssignmentsForConsultant(
  consultantId: string
): Promise<ResourceAssignment[]> {
  const { data, error } = await supabase
    .from('resource_assignments')
    .select(`
      *,
      resource:educational_resources(*)
    `)
    .eq('consultant_id', consultantId)
    .order('sent_at', { ascending: false });

  if (error) {
    console.error('Error fetching resource assignments:', error);
    return [];
  }
  return (data ?? []).map((d: any) => ({
    ...d,
    resource: d.resource ?? undefined,
  }));
}

export async function getResourceAssignmentsForPlan(
  planId: string
): Promise<ResourceAssignment[]> {
  const { data, error } = await supabase
    .from('resource_assignments')
    .select(`
      *,
      resource:educational_resources(*)
    `)
    .eq('consultant_plan_id', planId)
    .order('sent_at', { ascending: false });

  if (error) {
    console.error('Error fetching plan resource assignments:', error);
    return [];
  }
  return (data ?? []).map((d: any) => ({
    ...d,
    resource: d.resource ?? undefined,
  }));
}

export async function markResourceAsRead(
  assignmentId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('resource_assignments')
    .update({ read_at: new Date().toISOString() })
    .eq('id', assignmentId);

  if (error) {
    console.error('Error marking resource as read:', error);
    return false;
  }
  return true;
}
