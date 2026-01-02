import { logger } from '@/lib/utils/logger';
/**
 * Global cache for tab data that persists across component unmounts
 * Solves the issue where useRef values are lost when React Native
 * tab navigator unmounts screens on tab switch
 */

interface CacheEntry {
  lastFetched: number;
  data: any;
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
  get(key: string, duration?: number): any | null {
    if (this.isValid(key, duration)) {
      const entry = this.cache.get(key);
      const age = Math.round((Date.now() - entry!.lastFetched) / 1000);
      logger.log(`[Cache] âœ“ ${key} hit (age: ${age}s)`);
      return entry!.data;
    }
    logger.log(`[Cache] âœ— ${key} miss`);
    return null;
  }

  /**
   * Set cache data
   */
  set(key: string, data: any): void {
    this.cache.set(key, {
      lastFetched: Date.now(),
      data,
    });
    logger.log(`[Cache] âœŽ ${key} stored`);
  }

  /**
   * Invalidate specific cache key
   */
  invalidate(key: string): void {
    this.cache.delete(key);
    logger.log(`[Cache] âœ— ${key} invalidated`);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    logger.log('[Cache] âœ— All cleared');
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

