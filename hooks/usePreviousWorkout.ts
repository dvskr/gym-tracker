import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/utils/logger';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

// ============================================
// Types
// ============================================

export interface PreviousSetData {
  set_number: number;
  weight: number;
  reps: number;
}

export interface PreviousWorkoutData {
  workout_id: string;
  workout_date: string;
  sets: PreviousSetData[];
}

interface UsePreviousWorkoutReturn {
  data: PreviousWorkoutData | null;
  isLoading: boolean;
  error: string | null;
  getPreviousSet: (setNumber: number) => PreviousSetData | null;
  daysAgo: number | null;
}

// ============================================
// Helper Functions
// ============================================

function getDaysAgo(dateString: string): number {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

// ============================================
// Hook
// ============================================

export function usePreviousWorkout(exerciseExternalId: string | undefined): UsePreviousWorkoutReturn {
  const { user } = useAuthStore();
  const [data, setData] = useState<PreviousWorkoutData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!exerciseExternalId || !user?.id) {
      setData(null);
      return;
    }

    async function fetchPreviousData() {
      setIsLoading(true);
      setError(null);

      try {
        // First, find the exercise UUID by external_id
        const { data: exercise, error: exerciseError } = await supabase
          .from('exercises')
          .select('id')
          .eq('external_id', exerciseExternalId)
          .single();

        if (exerciseError) {
          if (exerciseError.code === 'PGRST116') {
            // Exercise not found - no previous data
            setData(null);
            return;
          }
          throw exerciseError;
        }

        if (!exercise) {
          setData(null);
          return;
        }

        // Query: Get the most recent completed workout containing this exercise
        const { data: workoutExercises, error: weError } = await supabase
          .from('workout_exercises')
          .select(`
            id,
            workout_id,
            workouts!inner (
              id,
              started_at,
              ended_at,
              user_id
            )
          `)
          .eq('exercise_id', exercise.id)
          .eq('workouts.user_id', user!.id)
          .not('workouts.ended_at', 'is', null)
          .order('workouts(started_at)', { ascending: false })
          .limit(1);

        if (weError) throw weError;

        if (!workoutExercises || workoutExercises.length === 0) {
          setData(null);
          return;
        }

        const workoutExercise = workoutExercises[0];
        const workout = Array.isArray(workoutExercise.workouts)
          ? workoutExercise.workouts[0]
          : workoutExercise.workouts;

        // Get all completed sets for this workout_exercise
        const { data: setsData, error: setsError } = await supabase
          .from('workout_sets')
          .select('set_number, weight, reps, is_completed')
          .eq('workout_exercise_id', workoutExercise.id)
          .eq('is_completed', true)
          .order('set_number', { ascending: true });

        if (setsError) throw setsError;

        if (!setsData || setsData.length === 0) {
          setData(null);
          return;
        }

        // Map to our format
        const sets: PreviousSetData[] = setsData.map((s) => ({
          set_number: s.set_number,
          weight: s.weight || 0,
          reps: s.reps || 0,
        }));

        setData({
          workout_id: workoutExercise.workout_id,
          workout_date: workout?.started_at || '',
          sets,
        });
      } catch (err) {
        logger.error('Error fetching previous workout:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch previous data');
        setData(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPreviousData();
  }, [exerciseExternalId, user?.id]);

  // Helper to get previous data for a specific set number
  const getPreviousSet = useCallback(
    (setNumber: number): PreviousSetData | null => {
      if (!data?.sets || data.sets.length === 0) return null;

      // Try to find exact set number match
      const exactMatch = data.sets.find((s) => s.set_number === setNumber);
      if (exactMatch) return exactMatch;

      // Fallback to last set if requested set doesn't exist
      return data.sets[data.sets.length - 1] || null;
    },
    [data]
  );

  // Calculate days ago
  const daysAgo = data?.workout_date ? getDaysAgo(data.workout_date) : null;

  return {
    data,
    isLoading,
    error,
    getPreviousSet,
    daysAgo,
  };
}

// ============================================
// Non-hook function for fetching previous data
// Use this when you need to fetch data outside of a component
// ============================================

/**
 * Fetch previous workout data for an exercise (non-hook version)
 * Use this when you need to fetch data outside of a React component
 */
export async function fetchPreviousWorkoutData(
  userId: string,
  exerciseExternalId: string
): Promise<PreviousWorkoutData | null> {
  try {
    // First, find the exercise UUID by external_id
    const { data: exercise, error: exerciseError } = await supabase
      .from('exercises')
      .select('id')
      .eq('external_id', exerciseExternalId)
      .single();

    if (exerciseError || !exercise) {
      return null;
    }

    // Query: Get the most recent completed workout containing this exercise
    const { data: workoutExercises, error: weError } = await supabase
      .from('workout_exercises')
      .select(`
        id,
        workout_id,
        workouts!inner (
          id,
          started_at,
          ended_at,
          user_id
        )
      `)
      .eq('exercise_id', exercise.id)
      .eq('workouts.user_id', userId)
      .not('workouts.ended_at', 'is', null)
      .order('workouts(started_at)', { ascending: false })
      .limit(1);

    if (weError || !workoutExercises || workoutExercises.length === 0) {
      return null;
    }

    const workoutExercise = workoutExercises[0];
    const workout = Array.isArray(workoutExercise.workouts)
      ? workoutExercise.workouts[0]
      : workoutExercise.workouts;

    // Get all completed sets for this workout_exercise
    const { data: setsData, error: setsError } = await supabase
      .from('workout_sets')
      .select('set_number, weight, reps, is_completed')
      .eq('workout_exercise_id', workoutExercise.id)
      .eq('is_completed', true)
      .order('set_number', { ascending: true });

    if (setsError || !setsData || setsData.length === 0) {
      return null;
    }

    // Map to our format
    const sets: PreviousSetData[] = setsData.map((s) => ({
      set_number: s.set_number,
      weight: s.weight || 0,
      reps: s.reps || 0,
    }));

    return {
      workout_id: workoutExercise.workout_id,
      workout_date: workout?.started_at || '',
      sets,
    };
  } catch (err) {
    logger.error('Error fetching previous workout:', err);
    return null;
  }
}

// ============================================
// Legacy export for backwards compatibility
// ============================================

export interface LegacyPreviousWorkoutData {
  lastWeight: number | null;
  lastReps: number | null;
  lastDate: string | null;
  lastSets: number;
}

/**
 * @deprecated Use usePreviousWorkout with getPreviousSet instead
 */
export function usePreviousWorkoutLegacy(exerciseExternalId: string): LegacyPreviousWorkoutData | null {
  const { data } = usePreviousWorkout(exerciseExternalId);

  if (!data || data.sets.length === 0) return null;

  const lastSet = data.sets[data.sets.length - 1];
  const daysAgo = getDaysAgo(data.workout_date);

  let lastDateStr: string | null = null;
  if (daysAgo === 0) {
    lastDateStr = 'today';
  } else if (daysAgo === 1) {
    lastDateStr = 'yesterday';
  } else {
    lastDateStr = `${daysAgo} days ago`;
  }

  return {
    lastWeight: lastSet.weight,
    lastReps: lastSet.reps,
    lastDate: lastDateStr,
    lastSets: data.sets.length,
  };
}
