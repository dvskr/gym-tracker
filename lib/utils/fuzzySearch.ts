import Fuse from 'fuse.js';
import { logger } from '@/lib/utils/logger';

// Generic DisplayExercise type matching the store
interface DisplayExercise {
  id: string; // UUID from database
  externalId: string | null; // ExerciseDB ID
  name: string;
  bodyPart: string;
  target: string;
  equipment: string;
  gifUrl: string;
  secondaryMuscles: string[];
  instructions: string[];
  measurementType?: string;
}

let fuseInstance: Fuse<DisplayExercise> | null = null;

/**
 * Initialize Fuse.js search instance with exercises
 * Call this whenever exercises are loaded/updated
 */
export function initializeFuseSearch(exercises: DisplayExercise[]): void {
  fuseInstance = new Fuse(exercises, {
    keys: [
      { name: 'name', weight: 0.5 },        // Name is most important
      { name: 'equipment', weight: 0.2 },   // Equipment is somewhat important
      { name: 'bodyPart', weight: 0.2 },    // Body part is somewhat important
      { name: 'target', weight: 0.1 },      // Target muscle is least important
    ],
    threshold: 0.3,              // 0 = exact match, 1 = match anything (0.3 is good balance)
    includeScore: true,          // Include match score in results
    minMatchCharLength: 2,       // Minimum characters before searching
    ignoreLocation: true,        // Don't care where in the string the match is
    findAllMatches: true,        // Find all matches, not just the first
    useExtendedSearch: false,    // Keep it simple
  });
  
  logger.log(`[Fuzzy Search] Initialized with ${exercises.length} exercises`);
}

/**
 * Perform fuzzy search on exercises
 * Returns exercises sorted by relevance (best matches first)
 */
export function fuzzySearchExercises(query: string): DisplayExercise[] {
  if (!fuseInstance) {
    logger.warn('[Fuzzy Search] Not initialized, call initializeFuseSearch() first');
    return [];
  }
  
  if (!query.trim()) {
    return [];
  }
  
  const results = fuseInstance.search(query.trim());
  
  // Return just the exercise items (Fuse wraps them in { item, score })
  return results.map(result => result.item);
}

/**
 * Clear the Fuse instance (e.g., when exercises are invalidated)
 */
export function clearFuseInstance(): void {
  fuseInstance = null;
  logger.log('[Fuzzy Search] Instance cleared');
}

/**
 * Check if Fuse is initialized
 */
export function isFuseInitialized(): boolean {
  return fuseInstance !== null;
}

