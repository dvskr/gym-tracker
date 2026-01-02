import { invalidateCacheKey } from './prefetch';
import { logger } from '@/lib/utils/logger';

/**
 * Cache invalidation helpers for AI features
 * Call these after user data changes to ensure fresh context
 */

/**
 * Invalidate coach context after completing a workout
 * This ensures the AI coach sees the latest workout data
 */
export function invalidateCoachContextAfterWorkout(userId: string): void {
 logger.log('[Cache] Invalidating coach context after workout');
  invalidateCacheKey(userId, 'coachContext');
  invalidateCacheKey(userId, 'recovery');
  invalidateCacheKey(userId, 'suggestion');
}

/**
 * Invalidate coach context after profile/settings update
 */
export function invalidateCoachContextAfterProfileUpdate(userId: string): void {
 logger.log('[Cache] Invalidating coach context after profile update');
  invalidateCacheKey(userId, 'coachContext');
}

/**
 * Invalidate coach context after injury update
 */
export function invalidateCoachContextAfterInjuryUpdate(userId: string): void {
 logger.log('[Cache] Invalidating coach context after injury update');
  invalidateCacheKey(userId, 'coachContext');
}

/**
 * Invalidate coach context after equipment update
 */
export function invalidateCoachContextAfterEquipmentUpdate(userId: string): void {
 logger.log('[Cache] Invalidating coach context after equipment update');
  invalidateCacheKey(userId, 'coachContext');
}

/**
 * Invalidate coach context after daily check-in
 */
export function invalidateCoachContextAfterCheckin(userId: string): void {
 logger.log('[Cache] Invalidating coach context after check-in');
  invalidateCacheKey(userId, 'coachContext');
  invalidateCacheKey(userId, 'recovery');
}

/**
 * Invalidate coach context after setting a new PR
 */
export function invalidateCoachContextAfterPR(userId: string): void {
 logger.log('[Cache] Invalidating coach context after PR');
  invalidateCacheKey(userId, 'coachContext');
}
