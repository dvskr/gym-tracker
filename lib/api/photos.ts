import { supabase } from '@/lib/supabase';
import { PhotoType, deletePhotoLocally } from '@/lib/services/photoService';

// Types
export interface ProgressPhoto {
  id: string;
  user_id: string;
  taken_at: string;
  photo_type: PhotoType;
  local_uri: string;
  cloud_uri?: string;
  notes?: string;
  is_synced: boolean;
  created_at: string;
}

export interface PhotoFilters {
  type?: PhotoType;
  startDate?: string;
  endDate?: string;
}

/**
 * Save a photo record to the database
 */
export async function savePhotoRecord(
  userId: string,
  localUri: string,
  type: PhotoType,
  date: string,
  notes?: string
): Promise<ProgressPhoto> {
  const { data, error } = await supabase
    .from('progress_photos')
    .insert({
      user_id: userId,
      local_uri: localUri,
      photo_type: type,
      taken_at: date,
      notes: notes || null,
      is_synced: false,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get photos with optional filters
 */
export async function getPhotos(
  userId: string,
  filters?: PhotoFilters
): Promise<ProgressPhoto[]> {
  let query = supabase
    .from('progress_photos')
    .select('*')
    .eq('user_id', userId)
    .order('taken_at', { ascending: false });

  if (filters?.type) {
    query = query.eq('photo_type', filters.type);
  }

  if (filters?.startDate) {
    query = query.gte('taken_at', filters.startDate);
  }

  if (filters?.endDate) {
    query = query.lte('taken_at', filters.endDate);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * Get photos for a specific date
 */
export async function getPhotosByDate(
  userId: string,
  date: string
): Promise<ProgressPhoto[]> {
  const { data, error } = await supabase
    .from('progress_photos')
    .select('*')
    .eq('user_id', userId)
    .eq('taken_at', date)
    .order('photo_type');

  if (error) throw error;
  return data || [];
}

/**
 * Get the latest photo of each type
 */
export async function getLatestPhotos(
  userId: string
): Promise<ProgressPhoto[]> {
  // Get all photos ordered by date
  const { data, error } = await supabase
    .from('progress_photos')
    .select('*')
    .eq('user_id', userId)
    .order('taken_at', { ascending: false });

  if (error) throw error;
  
  // Group by type and get the latest of each
  const latestByType = new Map<PhotoType, ProgressPhoto>();
  
  for (const photo of (data || [])) {
    if (!latestByType.has(photo.photo_type)) {
      latestByType.set(photo.photo_type, photo);
    }
  }

  return Array.from(latestByType.values());
}

/**
 * Get a single photo by ID
 */
export async function getPhotoById(photoId: string): Promise<ProgressPhoto | null> {
  const { data, error } = await supabase
    .from('progress_photos')
    .select('*')
    .eq('id', photoId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return data || null;
}

/**
 * Update a photo record
 */
export async function updatePhotoRecord(
  photoId: string,
  updates: Partial<Pick<ProgressPhoto, 'notes' | 'taken_at' | 'photo_type'>>
): Promise<ProgressPhoto> {
  const { data, error } = await supabase
    .from('progress_photos')
    .update(updates)
    .eq('id', photoId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a photo (both record and local file)
 */
export async function deletePhoto(photoId: string): Promise<void> {
  // First get the photo to get the local URI
  const photo = await getPhotoById(photoId);
  
  if (photo) {
    // Delete local file
    try {
      await deletePhotoLocally(photo.local_uri);
    } catch (error) {
      console.warn('Failed to delete local photo file:', error);
    }

    // Delete database record
    const { error } = await supabase
      .from('progress_photos')
      .delete()
      .eq('id', photoId);

    if (error) throw error;
  }
}

/**
 * Get photo count by type
 */
export async function getPhotoCountByType(
  userId: string
): Promise<Record<PhotoType, number>> {
  const { data, error } = await supabase
    .from('progress_photos')
    .select('photo_type')
    .eq('user_id', userId);

  if (error) throw error;

  const counts: Record<string, number> = {
    front: 0,
    side_left: 0,
    side_right: 0,
    back: 0,
    flexed_front: 0,
    flexed_back: 0,
  };

  for (const photo of (data || [])) {
    counts[photo.photo_type] = (counts[photo.photo_type] || 0) + 1;
  }

  return counts as Record<PhotoType, number>;
}

/**
 * Get dates that have photos (for calendar marking)
 */
export async function getPhotoDates(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('progress_photos')
    .select('taken_at')
    .eq('user_id', userId);

  if (error) throw error;

  // Get unique dates
  const dates = new Set<string>();
  for (const photo of (data || [])) {
    dates.add(photo.taken_at);
  }

  return Array.from(dates).sort().reverse();
}

