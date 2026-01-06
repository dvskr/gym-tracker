import { logger } from '@/lib/utils/logger';
/**
 * Global cache for tab data that persists across component unmounts
 * Solves the issue where useRef values are lost when React Native
 * tab navigator unmounts screens on tab switch
 */

interface CacheEntry<T = unknown> {
  lastFetched: number;
  data: T;
}

class TabDataCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly DEFAULT_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Check if cache is valid for a given key
   */
  isValid(key: string, duration: number = this.DEFAULT_DURATION): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const age = Date.now() - entry.lastFetched;
    return age < duration;
  }

  /**
   * Get cached data if valid
   */
  get<T = unknown>(key: string, duration?: number): T | null {
    if (this.isValid(key, duration)) {
      const entry = this.cache.get(key);
      if (entry) {
        const age = Math.round((Date.now() - entry.lastFetched) / 1000);
        logger.log(`[Cache] S ${key} hit (age: ${age}s)`);
        return entry.data as T;
      }
    }
    logger.log(`[Cache] S ${key} miss`);
    return null;
  }

  /**
   * Set cache data
   */
  set<T = unknown>(key: string, data: T): void {
    this.cache.set(key, {
      lastFetched: Date.now(),
      data,
    });
 logger.log(`[Cache] S} ${key} stored`);
  }

  /**
   * Invalidate specific cache key
   */
  invalidate(key: string): void {
    this.cache.delete(key);
 logger.log(`[Cache] S ${key} invalidated`);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
 logger.log('[Cache] S All cleared');
  }

  /**
   * Get cache age in seconds
   */
  getAge(key: string): number | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    return Math.round((Date.now() - entry.lastFetched) / 1000);
  }
}

// Singleton instance
export const tabDataCache = new TabDataCache();

