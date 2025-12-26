import { supabase } from '@/lib/supabase';

// ============================================
// Types
// ============================================

interface SetData {
  weight: number | null;
  reps: number | null;
  set_number: number;
  is_completed: boolean;
  set_type?: string;
  rpe?: number | null;
  weight_unit?: string;
}

interface ExerciseData {
  exercise_id: string;
  order_index: number;
  sets: SetData[];
  notes?: string;
}

interface WorkoutData {
  name?: string;
  notes?: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  rating?: number;
  exercises: ExerciseData[];
}

export interface WorkoutSummary {
  id: string;
  name: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  total_volume: number;
  total_sets: number;
  total_reps: number;
  rating: number | null;
}

export interface WorkoutDetail extends WorkoutSummary {
  notes: string | null;
  workout_exercises: {
    id: string;
    order_index: number;
    notes: string | null;
    exercises: {
      id: string;
      name: string;
      equipment: string;
      gif_url: string | null;
    };
    workout_sets: {
      id: string;
      set_number: number;
      weight: number | null;
      weight_unit: string;
      reps: number | null;
      set_type: string;
      rpe: number | null;
      is_completed: boolean;
    }[];
  }[];
}

// ============================================
// API Functions
// ============================================

/**
 * Save a completed workout to Supabase
 */
export async function saveWorkout(userId: string, workout: WorkoutData) {
  // Calculate totals
  let totalVolume = 0;
  let totalSets = 0;
  let totalReps = 0;

  workout.exercises.forEach((ex) => {
    ex.sets.forEach((set) => {
      if (set.is_completed) {
        totalVolume += (set.weight || 0) * (set.reps || 0);
        totalSets += 1;
        totalReps += set.reps || 0;
      }
    });
  });

  // 1. Insert workout
  const { data: workoutRecord, error: workoutError } = await supabase
    .from('workouts')
    .insert({
      user_id: userId,
      name: workout.name || 'Workout',
      notes: workout.notes,
      started_at: workout.started_at,
      ended_at: workout.ended_at,
      duration_seconds: workout.duration_seconds,
      total_volume: totalVolume,
      total_sets: totalSets,
      total_reps: totalReps,
      rating: workout.rating,
    })
    .select()
    .single();

  if (workoutError) throw workoutError;

  // 2. Insert workout_exercises and their sets
  for (const exercise of workout.exercises) {
    const { data: exerciseRecord, error: exerciseError } = await supabase
      .from('workout_exercises')
      .insert({
        workout_id: workoutRecord.id,
        exercise_id: exercise.exercise_id,
        order_index: exercise.order_index,
        notes: exercise.notes,
      })
      .select()
      .single();

    if (exerciseError) throw exerciseError;

    // 3. Insert sets for this exercise
    const completedSets = exercise.sets.filter((s) => s.is_completed);
    
    if (completedSets.length > 0) {
      const setsToInsert = completedSets.map((set) => ({
        workout_exercise_id: exerciseRecord.id,
        set_number: set.set_number,
        weight: set.weight,
        weight_unit: set.weight_unit || 'lbs',
        reps: set.reps,
        is_completed: true,
        set_type: set.set_type || 'normal',
        rpe: set.rpe,
        completed_at: new Date().toISOString(),
      }));

      const { error: setsError } = await supabase
        .from('workout_sets')
        .insert(setsToInsert);

      if (setsError) throw setsError;
    }
  }

  return workoutRecord;
}

/**
 * Get workout history for a user
 */
export async function getWorkoutHistory(
  userId: string,
  limit = 20,
  offset = 0
): Promise<WorkoutSummary[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select('id, name, started_at, ended_at, duration_seconds, total_volume, total_sets, total_reps, rating')
    .eq('user_id', userId)
    .not('ended_at', 'is', null) // Only completed workouts
    .order('started_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data || [];
}

/**
 * Get detailed workout by ID
 */
export async function getWorkoutById(workoutId: string): Promise<WorkoutDetail | null> {
  const { data, error } = await supabase
    .from('workouts')
    .select(`
      *,
      workout_exercises (
        id,
        order_index,
        notes,
        exercises (
          id,
          name,
          equipment,
          gif_url
        ),
        workout_sets (
          id,
          set_number,
          weight,
          weight_unit,
          reps,
          set_type,
          rpe,
          is_completed
        )
      )
    `)
    .eq('id', workoutId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  
  return data;
}

/**
 * Update workout name and rating
 */
export async function updateWorkout(
  workoutId: string,
  updates: { name?: string; rating?: number | null; notes?: string }
) {
  const { data, error } = await supabase
    .from('workouts')
    .update(updates)
    .eq('id', workoutId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a workout and all related data
 */
export async function deleteWorkout(workoutId: string) {
  const { error } = await supabase
    .from('workouts')
    .delete()
    .eq('id', workoutId);

  if (error) throw error;
}

/**
 * Get workout count for a user
 */
export async function getWorkoutCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('workouts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .not('ended_at', 'is', null);

  if (error) throw error;
  return count || 0;
}

