/**
 * Exercise Image Utilities
 * 
 * Single source of truth for generating exercise image URLs.
 * Thumbnails are derived from GIF URLs - no separate database column needed.
 */

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const GIF_BUCKET = 'exercise-gifs';
const THUMBNAIL_BUCKET = 'exercise-thumbnails';
const THUMBNAIL_VERSION = '224'; // Cache buster

/**
 * Get thumbnail URL from a GIF URL
 * 
 * Transforms: https://.../exercise-gifs/0001.gif
 * To:         https://.../exercise-thumbnails/0001.png?v=224
 * 
 * @param gifUrl - Full GIF URL from database
 * @returns Thumbnail URL or null if no gifUrl
 */
export function getThumbnailUrl(gifUrl: string | null | undefined): string | null {
  if (!gifUrl) return null;

  try {
    // Extract filename from GIF URL
    const filename = gifUrl.split('/').pop();
    if (!filename) return null;

    // Convert filename to thumbnail format
    // Handle both:
    // - "8ada58c2-f509-42aa-b57a-e7850d90f9e7.gif" -> "8ada58c2-f509-42aa-b57a-e7850d90f9e7.png"
    // - "1271" -> "1271.png"
    let thumbnailFilename: string;
    if (filename.endsWith('.gif')) {
      thumbnailFilename = filename.replace('.gif', '.png');
    } else {
      thumbnailFilename = filename + '.png';
    }

    // Build full thumbnail URL
    return `${SUPABASE_URL}/storage/v1/object/public/${THUMBNAIL_BUCKET}/${thumbnailFilename}?v=${THUMBNAIL_VERSION}`;
  } catch {
    return null;
  }
}

/**
 * Get GIF URL (passthrough, for consistency)
 * 
 * @param gifUrl - GIF URL from database
 * @returns Same URL or null
 */
export function getGifUrl(gifUrl: string | null | undefined): string | null {
  return gifUrl || null;
}

/**
 * Extract filename from a storage URL
 * 
 * @param url - Full Supabase storage URL
 * @returns Filename without extension
 */
export function getFilenameFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  
  try {
    const filename = url.split('/').pop();
    if (!filename) return null;
    
    // Remove extension and query params
    return filename.split('.')[0].split('?')[0];
  } catch {
    return null;
  }
}


