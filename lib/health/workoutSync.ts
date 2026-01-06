import { healthService, WorkoutData } from './healthService';
import { logger } from '@/lib/utils/logger';
import { supabase } from '../supabase';
import { useSettingsStore } from '@/stores/settingsStore';
import { LocalWorkout } from '@/lib/types/common';

/**
 * Sync a completed workout to health platform
 */
export async function syncWorkoutToHealth(workout: LocalWorkout): Promise<boolean> {
  try {
    // Check if health sync is enabled in settings
    const settings = useSettingsStore.getState();
    const healthSyncEnabled = settings.healthSyncEnabled ?? false;

    if (!healthSyncEnabled) {
 logger.log('a Health sync disabled in settings');
      return false;
    }

    // Check if health permissions are granted
    if (!healthService.getHasPermissions()) {
 logger.log('a No health permissions granted');
      return false;
    }

    // Check if already synced
    if (workout.health_synced) {
 logger.log(' Workout already synced to health');
      return true;
    }

    // Prepare workout data
    const workoutData: WorkoutData = {
      id: workout.id,
      name: workout.name || 'Workout',
      startTime: new Date(workout.started_at),
      endTime: new Date(workout.ended_at || new Date()),
      durationMinutes: Math.round((workout.duration_seconds || 0) / 60),
      caloriesBurned: workout.calories_burned || undefined,
      exerciseType: determinePrimaryMuscle(workout) || 'default',
      notes: workout.notes || undefined,
    };

    // Sync to health platform
    const synced = await healthService.saveWorkout(workoutData);

    if (synced) {
      // Mark as synced in database
      await supabase
        .from('workouts')
        .update({
          health_synced: true,
          health_synced_at: new Date().toISOString(),
        })
        .eq('id', workout.id);

 logger.log(`S& Workout ${workout.id} synced to health platform`);
    }

    return synced;
  } catch (error) {
 logger.error('R Error syncing workout to health:', error);
    return false;
  }
}

/**
 * Sync multiple workouts in batch
 */
export async function syncWorkoutsBatchToHealth(workouts: LocalWorkout[]): Promise<{
  success: number;
  failed: number;
  skipped: number;
}> {
 logger.log(`x Batch syncing ${workouts.length} workouts to health...`);

  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (const workout of workouts) {
    if (workout.health_synced) {
      skipped++;
      continue;
    }

    const synced = await syncWorkoutToHealth(workout);
    if (synced) {
      success++;
    } else {
      failed++;
    }
  }

 logger.log(
    `S& Batch sync complete: ${success} synced, ${failed} failed, ${skipped} skipped`
  );

  return { success, failed, skipped };
}

/**
 * Get unsynced workouts for the current user
 */
export async function getUnsyncedWorkouts(userId: string): Promise<LocalWorkout[]> {
  try {
    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', userId)
      .eq('health_synced', false)
      .is('ended_at', null, { negate: true }) // Only completed workouts
      .order('started_at', { ascending: false })
      .limit(50); // Limit to recent 50

    if (error) throw error;

    return data || [];
  } catch (error) {
 logger.error('R Error fetching unsynced workouts:', error);
    return [];
  }
}

/**
 * Determine primary muscle group from workout
 */
function determinePrimaryMuscle(workout: LocalWorkout): string | null {
  // If workout has exercises, analyze them
  if (workout.workout_exercises && workout.workout_exercises.length > 0) {
    // Count muscle groups
    const muscleGroups: Record<string, number> = {};

    workout.workout_exercises.forEach((we) => {
      if (we.exercise?.primary_muscles) {
        we.exercise.primary_muscles.forEach((muscle: string) => {
          muscleGroups[muscle] = (muscleGroups[muscle] || 0) + 1;
        });
      }
    });

    // Find most common muscle group
    const entries = Object.entries(muscleGroups);
    if (entries.length > 0) {
      entries.sort((a, b) => b[1] - a[1]);
      return entries[0][0];
    }
  }

  // Fallback to template primary muscles if available
  if (workout.template?.target_muscles && workout.template.target_muscles.length > 0) {
    return workout.template.target_muscles[0];
  }

  return null;
}

/**
 * Calculate estimated calories for a workout
 */
export function estimateWorkoutCalories(workout: LocalWorkout): number {
  const durationMinutes = (workout.duration_seconds || 0) / 60;
  const primaryMuscle = determinePrimaryMuscle(workout) || 'default';

  // Use health service estimation
  const exerciseType = healthService['mapWorkoutType'](primaryMuscle);
  return healthService.estimateCalories(durationMinutes, exerciseType);
}

/**
 * Update workout calories in database
 */
export async function updateWorkoutCalories(workoutId: string, calories: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('workouts')
      .update({ calories_burned: calories })
      .eq('id', workoutId);

    if (error) throw error;

 logger.log(`S& Updated workout ${workoutId} calories: ${calories}`);
    return true;
  } catch (error) {
 logger.error('R Error updating workout calories:', error);
    return false;
  }
}

