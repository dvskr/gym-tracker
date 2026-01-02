import { useEffect } from 'react';
import { logger } from '@/lib/utils/logger';
import { prefetchAIData } from '@/lib/ai/prefetch';
import { useAuthStore } from '@/stores/authStore';

/**
 * Hook to trigger AI data prefetch on mount
 * Use in app layout or after auth success
 * 
 * This pre-fetches:
 * - Recovery status (30min cache)
 * - Plateau alerts (24hr cache)
 * - Workout suggestion (4hr cache)
 * 
 * All fetching happens in background and won't block UI
 */
export function usePrefetchAI() {
  const { user } = useAuthStore();
  
  useEffect(() => {
    if (user?.id) {
 logger.log('[usePrefetchAI] Triggering prefetch for user');
      
      // Pre-fetch in background, don't block UI
      prefetchAIData(user.id).catch((error) => {
 logger.warn('[usePrefetchAI] Failed:', error);
        // Don't throw - prefetch failures shouldn't break the app
      });
    }
  }, [user?.id]);
}
