import { workoutSuggestionService } from './workoutSuggestions';
import { logger } from '@/lib/utils/logger';
import { recoveryService } from './recoveryService';
import { plateauDetectionService } from './plateauDetection';
import { buildCoachContext } from './contextBuilder';

// Types
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// In-memory cache for pre-fetched data
const prefetchCache = new Map<string, CacheEntry<any>>();

// Cache durations
export const CACHE_DURATIONS = {
  recovery: 30 * 60 * 1000,      // 30 minutes
  plateaus: 24 * 60 * 60 * 1000, // 24 hours
  suggestion: 4 * 60 * 60 * 1000, // 4 hours
  formTips: Infinity,             // Forever (tips don't change)
  coachContext: 5 * 60 * 1000,    // 5 minutes (for coach chat)
};

/**
 * Pre-fetch all AI data after sign-in
 * Call this once after user authenticates
 */
export async function prefetchAIData(userId: string): Promise<void> {
 logger.log('[AI Prefetch] Starting for user:', userId.substring(0, 8) + '...');
  const startTime = Date.now();
  
  // Fetch all in parallel for speed
  const results = await Promise.allSettled([
    recoveryService.getRecoveryStatus(userId),
    plateauDetectionService.detectPlateaus(userId),
    workoutSuggestionService.getSuggestion(userId),
    buildCoachContext(userId), // Pre-fetch coach context
  ]);
  
  // Cache successful results
  const keys = ['recovery', 'plateaus', 'suggestion', 'coachContext'];
  let successCount = 0;
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      let dataToCache = result.value;
      
      // *** FIX: Extract .text from CoachContext before caching ***
      if (keys[index] === 'coachContext') {
        // buildCoachContext returns { text, flags, warnings }
        // We only want to cache the text string
        dataToCache = typeof result.value === 'string' 
          ? result.value 
          : result.value.text;
      }
      
      setCacheData(userId, keys[index], dataToCache);
 logger.log(`[AI Prefetch] S ${keys[index]} cached`);
      successCount++;
    } else {
 logger.warn(`[AI Prefetch] S ${keys[index]} failed:`, result.reason?.message || result.reason);
    }
  });
  
  const duration = Date.now() - startTime;
 logger.log(`[AI Prefetch] Complete: ${successCount}/${keys.length} succeeded in ${duration}ms`);
}

/**
 * Get cached data if available and not expired
 */
export function getCachedData<T>(
  userId: string, 
  key: string, 
  maxAge?: number
): T | null {
  const cacheKey = `${userId}:${key}`;
  const cached = prefetchCache.get(cacheKey);
  
  if (!cached) {
    return null;
  }
  
  const age = Date.now() - cached.timestamp;
  const maxAgeMs = maxAge ?? (CACHE_DURATIONS[key as keyof typeof CACHE_DURATIONS] || 60000);
  
  if (age > maxAgeMs) {
    prefetchCache.delete(cacheKey);
 logger.log(`[AI Cache] ${key} expired (age: ${Math.round(age / 1000)}s)`);
    return null;
  }
  
 logger.log(`[AI Cache] S ${key} hit (age: ${Math.round(age / 1000)}s)`);
  return cached.data as T;
}

/**
 * Set cached data
 */
export function setCacheData<T>(userId: string, key: string, data: T): void {
  const cacheKey = `${userId}:${key}`;
  prefetchCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
  });
 logger.log(`[AI Cache] ${key} stored`);
}

/**
 * Invalidate all cached data for user
 * Call this after completing a workout
 */
export function invalidateCache(userId: string): void {
  let count = 0;
  const keysToDelete: string[] = [];
  
  for (const key of prefetchCache.keys()) {
    if (key.startsWith(userId)) {
      keysToDelete.push(key);
      count++;
    }
  }
  
  keysToDelete.forEach(key => prefetchCache.delete(key));
  
 logger.log(`[AI Cache] Invalidated ${count} entries for user`);
}

/**
 * Invalidate specific cache key
 */
export function invalidateCacheKey(userId: string, key: string): void {
  const cacheKey = `${userId}:${key}`;
  prefetchCache.delete(cacheKey);
 logger.log(`[AI Cache] Invalidated: ${key}`);
}

/**
 * Check if data is cached and fresh
 */
export function isCached(userId: string, key: string): boolean {
  return getCachedData(userId, key) !== null;
}

/**
 * Get cache statistics (for debugging)
 */
export function getCacheStats(): {
  totalEntries: number;
  entries: Array<{ key: string; age: number }>;
} {
  const entries: Array<{ key: string; age: number }> = [];
  
  for (const [key, value] of prefetchCache.entries()) {
    entries.push({
      key,
      age: Date.now() - value.timestamp,
    });
  }
  
  return {
    totalEntries: prefetchCache.size,
    entries,
  };
}

/**
 * Clear all cache (for debugging/logout)
 */
export function clearAllCache(): void {
  const count = prefetchCache.size;
  prefetchCache.clear();
 logger.log(`[AI Cache] Cleared all ${count} entries`);
}

