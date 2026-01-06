import { supabase } from '@/lib/supabase';

// ============================================
// Types
// ============================================

export interface ExerciseHistorySet {
  set_number: number;
  weight: number;
  weight_unit?: string;
  reps: number;
  rpe?: number | null;
  set_type?: string;
}

export interface ExerciseHistoryEntry {
  date: string;
  workoutId: string;
  workoutName: string;
  sets: ExerciseHistorySet[];
  bestSet: { weight: number; weight_unit?: string; reps: number };
  totalVolume: number;
  totalSets: number;
}

export interface ExerciseStats {
  totalTimesPerformed: number;
  lastPerformed: string | null;
  bestWeight: { value: number; weight_unit?: string; date: string; reps: number } | null;
  bestVolume: { value: number; date: string } | null;
  bestReps: { value: number; date: string; weight: number; weight_unit?: string } | null;
  estimated1RM: number | null;
  estimated1RMUnit?: string;
  totalVolume: number;
  averageSetsPerSession: number;
}

export interface Exercise {
  id: string;
  external_id: string;
  name: string;
  description: string | null;
  instructions: string[] | null;
  primary_muscles: string[];
  secondary_muscles: string[];
  equipment: string;
  category: string;
  difficulty: string | null;
  gif_url: string | null;
  body_part: string | null;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Calculate estimated 1RM using Brzycki formula
 */
function calculate1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  if (reps > 12) return weight * (1 + reps / 30); // Less accurate for high reps
  return weight * (36 / (37 - reps));
}

/**
 * Find best set by volume (weight × reps)
 */
function findBestSet(sets: ExerciseHistorySet[]): { weight: number; weight_unit?: string; reps: number } {
  return sets.reduce(
    (best, set) => {
      const volume = set.weight * set.reps;
      const bestVolume = best.weight * best.reps;
      return volume > bestVolume ? { weight: set.weight, weight_unit: set.weight_unit, reps: set.reps } : best;
    },
    { weight: 0, reps: 0 }
  );
}

// ============================================
// API Functions
// ============================================

/**
 * Get exercise by ID (either internal ID or external_id)
 */
export async function getExerciseById(exerciseId: string): Promise<Exercise | null> {
  // Try internal ID first
  let { data, error } = await supabase
    .from('exercises')
    .select('*')
    .eq('id', exerciseId)
    .single();

  // If not found, try external_id
  if (error || !data) {
    const result = await supabase
      .from('exercises')
      .select('*')
      .eq('external_id', exerciseId)
      .single();

    data = result.data;
    error = result.error;
  }

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

/**
 * Get all workout instances for a specific exercise
 */
export async function getExerciseHistory(
  userId: string,
  exerciseId: string
): Promise<ExerciseHistoryEntry[]> {
  // First get the exercise UUID if we have external_id
  const exercise = await getExerciseById(exerciseId);
  if (!exercise) return [];

  const { data, error } = await supabase
    .from('workout_exercises')
    .select(`
      id,
      workout_id,
      workouts!inner (
        id,
        name,
        started_at,
        user_id
      ),
      workout_sets (
        set_number,
        weight,
        weight_unit,
        reps,
        rpe,
        set_type,
        is_completed
      )
    `)
    .eq('exercise_id', exercise.id)
    .eq('workouts.user_id', userId)
    .not('workouts.ended_at', 'is', null)
    .order('workouts(started_at)', { ascending: false });

  if (error) throw error;

  // Process the data into ExerciseHistoryEntry format
  interface WorkoutExercisesRow {
    workout_id: string;
    workouts: {
      id: string;
      name: string;
      started_at: string;
      user_id: string;
    } | Array<{
      id: string;
      name: string;
      started_at: string;
      user_id: string;
    }>;
    workout_sets: Array<{
      set_number: number;
      weight: number | null;
      weight_unit: string | null;
      reps: number | null;
      rpe: number | null;
      set_type: string | null;
      is_completed: boolean;
    }>;
  }

  const history: ExerciseHistoryEntry[] = (data || []).map((entry: WorkoutExercisesRow) => {
    const workout = Array.isArray(entry.workouts) ? entry.workouts[0] : entry.workouts;
    const completedSets = (entry.workout_sets || [])
      .filter((s) => s.is_completed)
      .sort((a, b) => a.set_number - b.set_number)
      .map((s) => ({
        set_number: s.set_number,
        weight: s.weight || 0,
        weight_unit: s.weight_unit || 'lbs',
        reps: s.reps || 0,
        rpe: s.rpe,
        set_type: s.set_type,
      }));

    const bestSet = findBestSet(completedSets);
    const totalVolume = completedSets.reduce(
      (sum: number, s: ExerciseHistorySet) => sum + s.weight * s.reps,
      0
    );

    return {
      date: workout?.started_at || '',
      workoutId: workout?.id || entry.workout_id,
      workoutName: workout?.name || 'Workout',
      sets: completedSets,
      bestSet,
      totalVolume,
      totalSets: completedSets.length,
    };
  });

  return history;
}

/**
 * Get aggregated stats for a specific exercise
 */
export async function getExerciseStats(
  userId: string,
  exerciseId: string
): Promise<ExerciseStats> {
  const history = await getExerciseHistory(userId, exerciseId);

  if (history.length === 0) {
    return {
      totalTimesPerformed: 0,
      lastPerformed: null,
      bestWeight: null,
      bestVolume: null,
      bestReps: null,
      estimated1RM: null,
      totalVolume: 0,
      averageSetsPerSession: 0,
    };
  }

  // Calculate stats
  let bestWeight: ExerciseStats['bestWeight'] = null;
  let bestVolume: ExerciseStats['bestVolume'] = null;
  let bestReps: ExerciseStats['bestReps'] = null;
  let max1RM = 0;
  let max1RMUnit: string | undefined;
  let totalVolume = 0;
  let totalSets = 0;

  history.forEach((entry) => {
    const entryVolume = entry.sets.reduce((sum, s) => sum + (s.weight * s.reps), 0);
    totalVolume += entryVolume;
    totalSets += entry.totalSets;

    // Track best session volume
    if (!bestVolume || entryVolume > bestVolume.value) {
      bestVolume = { value: entryVolume, date: entry.date };
    }

    // Check each set
    entry.sets.forEach((set) => {
      // Best weight
      if (!bestWeight || set.weight > bestWeight.value) {
        bestWeight = { value: set.weight, weight_unit: set.weight_unit, date: entry.date, reps: set.reps };
      }

      // Best reps (at any weight)
      if (!bestReps || set.reps > bestReps.value) {
        bestReps = { value: set.reps, date: entry.date, weight: set.weight, weight_unit: set.weight_unit };
      }

      // Calculate 1RM for each set and track max
      if (set.weight > 0 && set.reps > 0) {
        const estimated = calculate1RM(set.weight, set.reps);
        if (estimated > max1RM) {
          max1RM = estimated;
          max1RMUnit = set.weight_unit;
        }
      }
    });
  });

  return {
    totalTimesPerformed: history.length,
    lastPerformed: history[0]?.date || null,
    bestWeight,
    bestVolume,
    bestReps,
    estimated1RM: max1RM > 0 ? Math.round(max1RM) : null,
    estimated1RMUnit: max1RMUnit,
    totalVolume,
    averageSetsPerSession: history.length > 0 ? Math.round(totalSets / history.length) : 0,
  };
}

// ============================================
// Raw Set Data for Charts
// ============================================

export interface ExerciseSetRecord {
  workout_id: string;
  started_at: string;
  weight: number;
  reps: number;
  set_number: number;
  volume: number;
  estimated_1rm: number;
}

/**
 * Get all sets for a specific exercise across all workouts (raw data for charts)
 * 
 * SQL:
 * SELECT 
 *   w.id as workout_id,
 *   w.started_at,
 *   ws.weight,
 *   ws.reps,
 *   ws.set_number
 * FROM workout_sets ws
 * JOIN workout_exercises we ON ws.workout_exercise_id = we.id
 * JOIN workouts w ON we.workout_id = w.id
 * WHERE we.exercise_id = $1 AND w.user_id = $2
 * ORDER BY w.started_at DESC, ws.set_number ASC;
 */
export async function getExerciseSetRecords(
  userId: string,
  exerciseId: string
): Promise<ExerciseSetRecord[]> {
  // Get the exercise UUID if we have external_id
  const exercise = await getExerciseById(exerciseId);
  if (!exercise) return [];

  const { data, error } = await supabase
    .from('workout_sets')
    .select(`
      weight,
      reps,
      set_number,
      is_completed,
      workout_exercises!inner (
        exercise_id,
        workouts!inner (
          id,
          started_at,
          user_id,
          ended_at
        )
      )
    `)
    .eq('workout_exercises.exercise_id', exercise.id)
    .eq('workout_exercises.workouts.user_id', userId)
    .not('workout_exercises.workouts.ended_at', 'is', null)
    .eq('is_completed', true);

  if (error) throw error;

  interface WorkoutSetRow {
    weight: number | null;
    reps: number | null;
    set_number: number;
    is_completed: boolean;
    workout_exercises: {
      exercise_id: string;
      workouts: {
        id: string;
        started_at: string;
        user_id: string;
        ended_at: string | null;
      } | Array<{
        id: string;
        started_at: string;
        user_id: string;
        ended_at: string | null;
      }>;
    };
  }

  // Process and flatten the data
  const records: ExerciseSetRecord[] = (data || [])
    .map((set: WorkoutSetRow) => {
      const workout = Array.isArray(set.workout_exercises?.workouts)
        ? set.workout_exercises.workouts[0]
        : set.workout_exercises?.workouts;

      const weight = set.weight || 0;
      const reps = set.reps || 0;

      return {
        workout_id: workout?.id || '',
        started_at: workout?.started_at || '',
        weight,
        reps,
        set_number: set.set_number,
        volume: weight * reps,
        estimated_1rm: weight > 0 && reps > 0 ? Math.round(calculate1RM(weight, reps)) : 0,
      };
    })
    .filter((r: ExerciseSetRecord) => r.workout_id && r.started_at)
    .sort((a: ExerciseSetRecord, b: ExerciseSetRecord) => {
      // Sort by date DESC, then set_number ASC
      const dateCompare = new Date(b.started_at).getTime() - new Date(a.started_at).getTime();
      if (dateCompare !== 0) return dateCompare;
      return a.set_number - b.set_number;
    });

  return records;
}

/**
 * Get chart data for an exercise (aggregated per workout session)
 */
export interface ExerciseChartData {
  date: string;
  workoutId: string;
  maxWeight: number;
  totalVolume: number;
  max1RM: number;
  totalReps: number;
  setCount: number;
}

export async function getExerciseChartData(
  userId: string,
  exerciseId: string,
  limit?: number
): Promise<ExerciseChartData[]> {
  const records = await getExerciseSetRecords(userId, exerciseId);

  // Group by workout
  const workoutMap = new Map<string, ExerciseSetRecord[]>();
  records.forEach((record) => {
    const key = record.workout_id;
    if (!workoutMap.has(key)) {
      workoutMap.set(key, []);
    }
    const workoutRecords = workoutMap.get(key);
    if (workoutRecords) {
      workoutRecords.push(record);
    }
  });

  // Aggregate per workout
  const chartData: ExerciseChartData[] = Array.from(workoutMap.entries())
    .map(([workoutId, sets]) => {
      const maxWeight = Math.max(...sets.map((s) => s.weight));
      const totalVolume = sets.reduce((sum, s) => sum + s.volume, 0);
      const max1RM = Math.max(...sets.map((s) => s.estimated_1rm));
      const totalReps = sets.reduce((sum, s) => sum + s.reps, 0);

      return {
        date: sets[0].started_at,
        workoutId,
        maxWeight,
        totalVolume,
        max1RM,
        totalReps,
        setCount: sets.length,
      };
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Chronological for charts

  // Apply limit if specified
  if (limit && chartData.length > limit) {
    return chartData.slice(-limit); // Take most recent
  }

  return chartData;
}

/**
 * Search exercises by name
 */
export async function searchExercises(
  query: string,
  limit: number = 20
): Promise<Exercise[]> {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .ilike('name', `%${query}%`)
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Get exercises by body part/muscle
 */
export async function getExercisesByMuscle(
  muscle: string,
  limit: number = 50
): Promise<Exercise[]> {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .or(`primary_muscles.cs.{${muscle}},secondary_muscles.cs.{${muscle}}`)
    .limit(limit);

  if (error) throw error;
  return data || [];
}

