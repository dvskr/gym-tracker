import { supabase } from '@/lib/supabase';

// ============================================
// Types
// ============================================

export interface TemplateFolder {
  id: string;
  user_id: string;
  name: string;
  color: string;
  order_index: number;
  created_at: string;
}

// ============================================
// CRUD Functions
// ============================================

/**
 * Get all folders for a user
 */
export async function getFolders(userId: string): Promise<TemplateFolder[]> {
  const { data, error } = await supabase
    .from('template_folders')
    .select('*')
    .eq('user_id', userId)
    .order('order_index', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Create a new folder
 */
export async function createFolder(
  userId: string,
  name: string,
  color?: string
): Promise<TemplateFolder> {
  // Get max order_index
  const { data: maxOrder } = await supabase
    .from('template_folders')
    .select('order_index')
    .eq('user_id', userId)
    .order('order_index', { ascending: false })
    .limit(1)
    .single();

  const nextOrder = (maxOrder?.order_index ?? -1) + 1;

  const { data, error } = await supabase
    .from('template_folders')
    .insert({
      user_id: userId,
      name,
      color: color || '#3b82f6',
      order_index: nextOrder,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update a folder
 */
export async function updateFolder(
  folderId: string,
  updates: Partial<Pick<TemplateFolder, 'name' | 'color' | 'order_index'>>
): Promise<void> {
  const { error } = await supabase
    .from('template_folders')
    .update(updates)
    .eq('id', folderId);

  if (error) throw error;
}

/**
 * Delete a folder (templates will have folder_id set to NULL)
 */
export async function deleteFolder(folderId: string): Promise<void> {
  const { error } = await supabase
    .from('template_folders')
    .delete()
    .eq('id', folderId);

  if (error) throw error;
}

/**
 * Reorder folders
 */
export async function reorderFolders(
  folders: Array<{ id: string; order_index: number }>
): Promise<void> {
  for (const folder of folders) {
    await supabase
      .from('template_folders')
      .update({ order_index: folder.order_index })
      .eq('id', folder.id);
  }
}

/**
 * Move template to folder
 */
export async function moveTemplateToFolder(
  templateId: string,
  folderId: string | null
): Promise<void> {
  const { error } = await supabase
    .from('workout_templates')
    .update({ folder_id: folderId })
    .eq('id', templateId);

  if (error) throw error;
}

/**
 * Get templates grouped by folder
 */
export async function getTemplatesGroupedByFolder(userId: string): Promise<{
  folders: Array<TemplateFolder & { templates: unknown[] }>;
  uncategorized: unknown[];
}> {
  // Get all folders
  const folders = await getFolders(userId);

  interface TemplateRow {
    id: string;
    folder_id: string | null;
    user_id: string;
    name: string;
    template_exercises: Array<{
      id: string;
      exercises: unknown;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  }

  // Get all templates with folder info
  const { data: templates, error } = await supabase
    .from('workout_templates')
    .select(`
      *,
      template_exercises (
        *,
        exercises (*)
      )
    `)
    .eq('user_id', userId)
    .eq('is_archived', false)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Transform templates
  const transformedTemplates = (templates || []).map((t: TemplateRow) => ({
    ...t,
    exercises: (t.template_exercises || []).map((te) => ({
      ...te,
      exercise: te.exercises,
    })),
  }));

  // Group by folder
  const foldersWithTemplates = folders.map((folder) => ({
    ...folder,
    templates: transformedTemplates.filter((t) => t.folder_id === folder.id),
  }));

  // Get uncategorized (no folder)
  const uncategorized = transformedTemplates.filter((t) => !t.folder_id);

  return {
    folders: foldersWithTemplates,
    uncategorized,
  };
}

// ============================================
// Preset Colors for Folders
// ============================================

export const FOLDER_COLORS = [
  '#3b82f6', // Blue
  '#22c55e', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#6366f1', // Indigo
  '#84cc16', // Lime
];

