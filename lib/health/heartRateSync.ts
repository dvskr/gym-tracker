import { healthService } from './healthService';
import { supabase } from '../supabase';
import type { HeartRateStats } from './healthService';

/**
 * Fetch and save heart rate data for a completed workout
 */
export async function saveWorkoutHeartRate(
  workoutId: string,
  startTime: Date,
  endTime: Date
): Promise<boolean> {
  try {
    console.log(`❤️ Fetching heart rate data for workout ${workoutId}...`);

    // Fetch heart rate data from health platform
    const stats = await healthService.getHeartRate(startTime, endTime);

    if (!stats) {
      console.log('ℹ️ No heart rate data found for this workout');
      return false;
    }

    console.log(
      `📊 Heart rate stats: Avg ${stats.average}, Max ${stats.max}, Min ${stats.min}`
    );

    // Save to database
    const { error } = await supabase
      .from('workouts')
      .update({
        avg_heart_rate: stats.average,
        max_heart_rate: stats.max,
        min_heart_rate: stats.min,
        resting_heart_rate: stats.resting || null,
      })
      .eq('id', workoutId);

    if (error) throw error;

    console.log(`✅ Heart rate data saved for workout ${workoutId}`);
    return true;
  } catch (error) {
    console.error('❌ Error saving workout heart rate:', error);
    return false;
  }
}

/**
 * Batch update heart rate for multiple workouts
 */
export async function batchUpdateWorkoutHeartRate(
  workouts: Array<{ id: string; started_at: string; ended_at: string }>
): Promise<{ success: number; failed: number; skipped: number }> {
  console.log(`📦 Batch updating heart rate for ${workouts.length} workouts...`);

  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (const workout of workouts) {
    if (!workout.ended_at) {
      skipped++;
      continue;
    }

    const saved = await saveWorkoutHeartRate(
      workout.id,
      new Date(workout.started_at),
      new Date(workout.ended_at)
    );

    if (saved) {
      success++;
    } else {
      // Check if it failed or just no data
      const stats = await healthService.getHeartRate(
        new Date(workout.started_at),
        new Date(workout.ended_at)
      );

      if (stats === null) {
        skipped++;
      } else {
        failed++;
      }
    }
  }

  console.log(
    `✅ Batch update complete: ${success} updated, ${failed} failed, ${skipped} skipped`
  );

  return { success, failed, skipped };
}

/**
 * Get workouts without heart rate data
 */
export async function getWorkoutsWithoutHeartRate(
  userId: string,
  limit: number = 50
): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('workouts')
      .select('id, started_at, ended_at')
      .eq('user_id', userId)
      .is('avg_heart_rate', null)
      .not('ended_at', 'is', null)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('❌ Error fetching workouts without heart rate:', error);
    return [];
  }
}

/**
 * Calculate heart rate recovery (difference between max HR and HR 1 minute after workout)
 */
export async function calculateHeartRateRecovery(
  endTime: Date
): Promise<{ recovery: number; maxHR: number; recoveryHR: number } | null> {
  try {
    // Get max HR during last 5 minutes of workout
    const fiveMinsBefore = new Date(endTime.getTime() - 5 * 60 * 1000);
    const workoutStats = await healthService.getHeartRate(fiveMinsBefore, endTime);

    if (!workoutStats) {
      return null;
    }

    // Get HR 1 minute after workout
    const oneMinAfter = new Date(endTime.getTime() + 60 * 1000);
    const recoveryStats = await healthService.getHeartRate(endTime, oneMinAfter);

    if (!recoveryStats) {
      return null;
    }

    const recovery = workoutStats.max - recoveryStats.min;

    return {
      recovery,
      maxHR: workoutStats.max,
      recoveryHR: recoveryStats.min,
    };
  } catch (error) {
    console.error('❌ Error calculating heart rate recovery:', error);
    return null;
  }
}

/**
 * Get heart rate intensity percentage (% of max heart rate)
 */
export function getHeartRateIntensity(bpm: number, age: number): number {
  const maxHR = 220 - age;
  return Math.round((bpm / maxHR) * 100);
}

/**
 * Format heart rate stats for display
 */
export function formatHeartRateStats(stats: HeartRateStats): string {
  const parts = [`Avg: ${stats.average} bpm`, `Max: ${stats.max} bpm`];

  if (stats.resting) {
    parts.push(`Resting: ${stats.resting} bpm`);
  }

  return parts.join(' • ');
}

/**
 * Check if heart rate data is available for a workout
 */
export async function hasHeartRateData(startTime: Date, endTime: Date): Promise<boolean> {
  try {
    const stats = await healthService.getHeartRate(startTime, endTime);
    return stats !== null && stats.readings.length > 0;
  } catch (error) {
    return false;
  }
}

