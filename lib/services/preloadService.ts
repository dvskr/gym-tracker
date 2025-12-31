import { useExerciseStore } from '@/stores/exerciseStore';
import { useAuthStore } from '@/stores/authStore';
import { prefetchAIData } from '@/lib/ai/prefetch';
import { preloadRecentThumbnails } from '@/lib/images/preloadService';

export interface PreloadProgress {
  phase: string;
  percentage: number;
  isComplete: boolean;
}

type ProgressCallback = (progress: PreloadProgress) => void;

/**
 * Preload all app data on startup
 * Call this once after user authenticates
 */
export async function preloadAllAppData(
  userId: string,
  onProgress?: ProgressCallback
): Promise<void> {
  console.log('[Preload] Starting full app preload...');
  const startTime = Date.now();

  const phases = [
    { name: 'exercises', weight: 40 },
    { name: 'favorites', weight: 10 },
    { name: 'ai', weight: 30 },
    { name: 'images', weight: 20 },
  ];

  let completedWeight = 0;
  const totalWeight = phases.reduce((sum, p) => sum + p.weight, 0);

  const updateProgress = (phase: string) => {
    const phaseWeight = phases.find(p => p.name === phase)?.weight || 0;
    completedWeight += phaseWeight;
    onProgress?.({
      phase,
      percentage: Math.round((completedWeight / totalWeight) * 100),
      isComplete: completedWeight >= totalWeight,
    });
  };

  try {
    // Phase 1: Exercises (critical - needed for workout tab)
    console.log('[Preload] Loading exercises...');
    await useExerciseStore.getState().fetchExercises();
    updateProgress('exercises');

    // Phase 2: Favorites (needed for exercise library)
    console.log('[Preload] Loading favorites...');
    await useExerciseStore.getState().loadFavorites();
    updateProgress('favorites');

    // Phase 3: AI Data (needed for home tab cards)
    console.log('[Preload] Loading AI data...');
    try {
      await prefetchAIData(userId);
    } catch (error) {
      console.warn('[Preload] AI data prefetch failed, continuing...', error);
    }
    updateProgress('ai');

    // Phase 4: Images (thumbnails for recently used exercises)
    console.log('[Preload] Preloading images...');
    try {
      const recentIds = useExerciseStore.getState().recentlyUsedIds.slice(0, 10);
      await preloadRecentThumbnails(recentIds);
    } catch (error) {
      console.warn('[Preload] Image preload failed, continuing...', error);
    }
    updateProgress('images');

    console.log(`[Preload] Complete in ${Date.now() - startTime}ms`);

  } catch (error) {
    console.error('[Preload] Error during preload:', error);
    // Don't throw - let app continue with partial data
  }
}

/**
 * Check if all critical data is loaded
 */
export function isAppDataReady(): boolean {
  const exerciseStore = useExerciseStore.getState();
  
  return (
    exerciseStore.exercises.length > 0 &&
    !exerciseStore.isLoading
  );
}

/**
 * Refresh AI data after completing a workout
 * (other stores handle their own refreshes)
 */
export async function refreshAIData(userId: string): Promise<void> {
  console.log('[Preload] Refreshing AI data...');
  
  try {
    await prefetchAIData(userId);
    console.log('[Preload] AI data refresh complete');
  } catch (error) {
    console.error('[Preload] AI data refresh failed:', error);
  }
}

