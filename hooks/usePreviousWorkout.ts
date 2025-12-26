import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';

interface PreviousWorkoutData {
  lastWeight: number | null;
  lastReps: number | null;
  lastDate: string | null;
  lastSets: number;
}

/**
 * Hook to fetch previous workout data for a specific exercise
 * @param exerciseExternalId - The external ID of the exercise (from ExerciseDB)
 * @returns Previous workout data or null if no previous workout found
 */
export function usePreviousWorkout(exerciseExternalId: string): PreviousWorkoutData | null {
  const [previousData, setPreviousData] = useState<PreviousWorkoutData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!exerciseExternalId) return;

    const fetchPreviousWorkout = async () => {
      setIsLoading(true);

      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setPreviousData(null);
          return;
        }

        // First, find the exercise UUID by external_id
        const { data: exercise, error: exerciseError } = await supabase
          .from('exercises')
          .select('id')
          .eq('external_id', exerciseExternalId)
          .single();

        if (exerciseError || !exercise) {
          // Exercise not found in DB (might not have been saved yet)
          setPreviousData(null);
          return;
        }

        // Query for the most recent completed workout containing this exercise
        const { data: workoutExercises, error: workoutError } = await supabase
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
          .eq('workouts.user_id', user.id)
          .not('workouts.ended_at', 'is', null)
          .order('workouts(started_at)', { ascending: false })
          .limit(1);

        if (workoutError || !workoutExercises || workoutExercises.length === 0) {
          setPreviousData(null);
          return;
        }

        const workoutExercise = workoutExercises[0];
        const workout = Array.isArray(workoutExercise.workouts) 
          ? workoutExercise.workouts[0] 
          : workoutExercise.workouts;

        // Now fetch the sets for this exercise in that workout
        const { data: setsData, error: setsError } = await supabase
          .from('workout_sets')
          .select('weight, reps, is_completed')
          .eq('workout_exercise_id', workoutExercise.id)
          .eq('is_completed', true)
          .order('set_number', { ascending: true });

        if (setsError || !setsData || setsData.length === 0) {
          setPreviousData(null);
          return;
        }

        // Get the last set's data (usually the most representative)
        const lastSet = setsData[setsData.length - 1];

        // Format the date
        const workoutDate = workout?.started_at;
        const formattedDate = workoutDate 
          ? formatDistanceToNow(new Date(workoutDate), { addSuffix: true })
          : null;

        setPreviousData({
          lastWeight: lastSet.weight,
          lastReps: lastSet.reps,
          lastDate: formattedDate,
          lastSets: setsData.length,
        });
      } catch (error) {
        console.error('Error fetching previous workout:', error);
        setPreviousData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreviousWorkout();
  }, [exerciseExternalId]);

  return previousData;
}
