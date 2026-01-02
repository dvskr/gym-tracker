import { Image } from 'expo-image';
import { logger } from '@/lib/utils/logger';
import * as FileSystem from 'expo-file-system/legacy';

// ============================================
// CACHE MANAGEMENT
// ============================================

/**
 * Get current cache size
 */
export async function getCacheSize(): Promise<{
  sizeBytes: number;
  sizeMB: string;
  sizeFormatted: string;
}> {
  try {
    // expo-image stores cache here
    const cacheDir = `${FileSystem.cacheDirectory}`;
    const dirInfo = await FileSystem.getInfoAsync(cacheDir);
    
    if (dirInfo.exists && 'size' in dirInfo) {
      const sizeBytes = dirInfo.size || 0;
      const sizeMB = (sizeBytes / 1024 / 1024).toFixed(2);
      
      return {
        sizeBytes,
        sizeMB: `${sizeMB} MB`,
        sizeFormatted: formatBytes(sizeBytes),
      };
    }
    
    return { sizeBytes: 0, sizeMB: '0 MB', sizeFormatted: '0 B' };
  } catch (error) {
    logger.error('[Cache] Error getting size:', error);
    return { sizeBytes: 0, sizeMB: '0 MB', sizeFormatted: '0 B' };
  }
}

/**
 * Clear all cached images
 */
export async function clearImageCache(): Promise<boolean> {
  try {
    logger.log('[Cache] Clearing image cache...');
    
    // Clear expo-image memory cache
    await Image.clearMemoryCache();
    
    // Clear expo-image disk cache
    await Image.clearDiskCache();
    
    logger.log('[Cache] Image cache cleared!');
    return true;
  } catch (error) {
    logger.error('[Cache] Error clearing cache:', error);
    return false;
  }
}

/**
 * Clear only memory cache (keep disk cache)
 * Use when app goes to background to free RAM
 */
export async function clearMemoryCache(): Promise<void> {
  try {
    await Image.clearMemoryCache();
    logger.log('[Cache] Memory cache cleared');
  } catch (error) {
    logger.error('[Cache] Error clearing memory cache:', error);
  }
}

/**
 * Auto-clear cache if it exceeds max size
 * Call this periodically (e.g., on app startup)
 */
export async function autoClearCacheIfNeeded(
  maxSizeMB: number = 500 // Default 500MB max
): Promise<boolean> {
  const { sizeBytes } = await getCacheSize();
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  
  if (sizeBytes > maxSizeBytes) {
    logger.log(`[Cache] Size ${(sizeBytes / 1024 / 1024).toFixed(2)}MB exceeds ${maxSizeMB}MB limit`);
    return await clearImageCache();
  }
  
  return false;
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  size: string;
  exerciseCount: number;
  thumbnailsLoaded: boolean;
  gifsLoaded: boolean;
}> {
  const { sizeFormatted } = await getCacheSize();
  
  // Check if we've preloaded by looking at a known exercise
  // This is a simple heuristic - you could track this more precisely
  return {
    size: sizeFormatted,
    exerciseCount: 424, // Your active exercise count
    thumbnailsLoaded: true, // Would need to track this in state
    gifsLoaded: true, // Would need to track this in state
  };
}

// Helper function
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

