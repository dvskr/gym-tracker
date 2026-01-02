import { Image } from 'expo-image';
import { logger } from '@/lib/utils/logger';
import { supabase } from '@/lib/supabase';

interface PreloadProgress {
  total: number;
  loaded: number;
  percentage: number;
}

type ProgressCallback = (progress: PreloadProgress) => void;

/**
 * Preload thumbnails for specific exercise IDs
 * Used during app startup to preload recently used exercises
 */
export async function preloadRecentThumbnails(
  exerciseIds: string[],
  onProgress?: ProgressCallback
): Promise<void> {
  if (exerciseIds.length === 0) {
    logger.log('[Image Preload] No exercise IDs provided');
    return;
  }

  logger.log('[Image Preload] Starting smart thumbnail preload...');
  const startTime = Date.now();

  try {
    // Fetch thumbnails for these exercises
    const { data: exercises } = await supabase
      .from('exercises')
      .select('id, thumbnail_url')
      .in('id', exerciseIds);

    const thumbnailUrls = exercises
      ?.map(ex => ex.thumbnail_url)
      .filter((url): url is string => !!url) || [];

    logger.log(`[Image Preload] Preloading ${thumbnailUrls.length} thumbnails...`);

    let loaded = 0;
    const total = thumbnailUrls.length;

    // Preload in small batches
    const BATCH_SIZE = 5;

    for (let i = 0; i < thumbnailUrls.length; i += BATCH_SIZE) {
      const batch = thumbnailUrls.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (url) => {
          try {
            await Image.prefetch(url);
            loaded++;
            onProgress?.({
              total,
              loaded,
              percentage: Math.round((loaded / total) * 100),
            });
          } catch (err) {
            loaded++;
          }
        })
      );
    }

    logger.log(`[Image Preload] Smart preload complete in ${Date.now() - startTime}ms`);
  } catch (error) {
    logger.error('[Image Preload] Failed:', error);
  }
}

/**
 * Preload thumbnails for visible exercises only
 * Call this when exercise list screen is opened
 */
export async function preloadVisibleThumbnails(
  exerciseIds: string[]
): Promise<void> {
  if (exerciseIds.length === 0) return;

  logger.log(`[Image Preload] Preloading ${exerciseIds.length} visible thumbnails...`);

  const { data: exercises } = await supabase
    .from('exercises')
    .select('id, thumbnail_url')
    .in('id', exerciseIds.slice(0, 20)); // Only first 20 visible

  const thumbnailUrls = exercises
    ?.map(ex => ex.thumbnail_url)
    .filter((url): url is string => !!url) || [];

  await Promise.all(
    thumbnailUrls.map(url => Image.prefetch(url).catch(() => {}))
  );
}

/**
 * Preload images for specific exercises (e.g., in a workout template)
 */
export async function preloadExerciseImages(
  exerciseIds: string[]
): Promise<void> {
  if (exerciseIds.length === 0) return;

  const { data: exercises, error } = await supabase
    .from('exercises')
    .select('gif_url, thumbnail_url')
    .in('id', exerciseIds);

  if (error || !exercises) return;

  const urls = exercises.flatMap(ex => [
    ex.thumbnail_url, // Thumbnail first (smaller)
    // Skip GIF for now - only load on demand
  ]).filter((url): url is string => !!url);

  logger.log(`[Image Preload] Preloading ${urls.length} images for ${exerciseIds.length} exercises...`);

  await Promise.all(urls.map(url => Image.prefetch(url).catch(() => {})));
}

/**
 * DEPRECATED: Don't use on app startup - too slow!
 * Preload all exercise thumbnails (216px - small, fast)
 */
export async function preloadThumbnails(
  onProgress?: ProgressCallback
): Promise<void> {
  logger.warn('[Image Preload] preloadThumbnails is deprecated - use preloadRecentThumbnails instead');
  logger.log('[Image Preload] Skipping full thumbnail preload to improve app startup time');
}

/**
 * DEPRECATED: Don't use on app startup - too slow!
 * Preload all exercise GIFs (1080px - large, slower)
 */
export async function preloadGifs(
  onProgress?: ProgressCallback
): Promise<void> {
  logger.warn('[Image Preload] preloadGifs is deprecated - GIFs should load on demand');
  logger.log('[Image Preload] Skipping GIF preload - they will load on demand');
}

/**
 * DEPRECATED: Don't use - too slow!
 */
export async function preloadAllImages(
  onProgress?: ProgressCallback
): Promise<void> {
  logger.warn('[Image Preload] preloadAllImages is deprecated - images load on demand with expo-image caching');
}
