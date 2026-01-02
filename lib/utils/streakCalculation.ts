import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/utils/logger';
import { StreakData } from '../notifications/engagementNotifications';

/**
 * Calculate the current workout streak for a user
 */
export async function calculateStreak(userId: string): Promise<StreakData> {
  try {
    // Get all workouts for the user, ordered by date (newest first)
    const { data: workouts, error } = await supabase
      .from('workouts')
      .select('ended_at')
      .eq('user_id', userId)
      .not('ended_at', 'is', null)
      .order('ended_at', { ascending: false });

    if (error || !workouts || workouts.length === 0) {
      return {
        currentStreak: 0,
        lastWorkoutDate: new Date().toISOString(),
        longestStreak: 0,
      };
    }

    // Calculate current streak
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let previousDate: Date | null = null;

    for (const workout of workouts) {
      const workoutDate = new Date(workout.ended_at);
      workoutDate.setHours(0, 0, 0, 0); // Normalize to start of day

      if (!previousDate) {
        // First workout
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        // Check if workout was today or yesterday
        if (workoutDate.getTime() === today.getTime() || workoutDate.getTime() === yesterday.getTime()) {
          currentStreak = 1;
          tempStreak = 1;
        }
      } else {
        const daysDiff = Math.floor((previousDate.getTime() - workoutDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff === 1) {
          // Consecutive day
          if (currentStreak > 0) {
            currentStreak++;
          }
          tempStreak++;
        } else if (daysDiff > 1) {
          // Streak broken
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
          currentStreak = 0; // No longer counting current streak
        }
        // daysDiff === 0 means multiple workouts same day (don't increment)
      }

      previousDate = workoutDate;
    }

    longestStreak = Math.max(longestStreak, tempStreak, currentStreak);

    return {
      currentStreak,
      lastWorkoutDate: workouts[0].ended_at,
      longestStreak,
    };
  } catch (error) {
 logger.error('Error calculating streak:', error);
    return {
      currentStreak: 0,
      lastWorkoutDate: new Date().toISOString(),
      longestStreak: 0,
    };
  }
}

/**
 * Get workout count for a user
 */
export async function getWorkoutCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('workouts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('ended_at', 'is', null);

    if (error) {
 logger.error('Error getting workout count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
 logger.error('Error getting workout count:', error);
    return 0;
  }
}

/**
 * Get days since last workout
 */
export async function getDaysSinceLastWorkout(userId: string): Promise<number> {
  try {
    const { data: workout, error } = await supabase
      .from('workouts')
      .select('ended_at')
      .eq('user_id', userId)
      .not('ended_at', 'is', null)
      .order('ended_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !workout) {
      return -1; // No workouts yet
    }

    const lastWorkout = new Date(workout.ended_at);
    const today = new Date();
    const daysDiff = Math.floor((today.getTime() - lastWorkout.getTime()) / (1000 * 60 * 60 * 24));

    return daysDiff;
  } catch (error) {
 logger.error('Error getting days since last workout:', error);
    return -1;
  }
}
