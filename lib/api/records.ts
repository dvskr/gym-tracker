import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/utils/logger';
import { calculate1RM } from '@/lib/utils/calculations';

// ============================================
// Types
// ============================================

export type RecordType = 'max_weight' | 'max_reps' | 'max_volume' | 'max_1rm';

export interface PersonalRecord {
  id: string;
  user_id: string;
  exercise_id: string;
  record_type: RecordType;
  value: number;
  weight?: number | null;
  reps?: number | null;
  achieved_at: string;
  workout_id?: string | null;
}

export interface SetData {
  weight: number;
  reps: number;
}

export interface NewPR {
  recordType: RecordType;
  previousValue: number | null;
  newValue: number;
  improvement: number | null;
  weight?: number;
  reps?: number;
}

export interface ExercisePRs {
  exerciseId: string;
  exerciseName?: string;
  maxWeight: PersonalRecord | null;
  maxReps: PersonalRecord | null;
  maxVolume: PersonalRecord | null;
  max1RM: PersonalRecord | null;
}

export interface PRHistoryEntry {
  value: number;
  achieved_at: string;
  workout_id: string | null;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get exercise UUID from external_id
 */
async function getExerciseUUID(exerciseId: string): Promise<string | null> {
  // First try as UUID
  const { data: direct } = await supabase
    .from('exercises')
    .select('id')
    .eq('id', exerciseId)
    .single();

  if (direct) return direct.id;

  // Try as external_id
  const { data: byExternal } = await supabase
    .from('exercises')
    .select('id')
    .eq('external_id', exerciseId)
    .single();

  return byExternal?.id || null;
}

// ============================================
// PR Check and Update Functions
// ============================================

/**
 * Check sets against existing PRs and update if new records achieved
 * @param userId - User ID
 * @param exerciseId - Exercise ID (can be UUID or external_id)
 * @param sets - Array of completed sets
 * @param workoutId - Optional workout ID for tracking
 * @returns Array of new PRs achieved
 */
export async function checkAndUpdatePRs(
  userId: string,
  exerciseId: string,
  sets: SetData[],
  workoutId?: string
): Promise<NewPR[]> {
  const newPRs: NewPR[] = [];

  if (sets.length === 0) return newPRs;

  // Get exercise UUID
  const exerciseUUID = await getExerciseUUID(exerciseId);
  if (!exerciseUUID) {
 logger.error('Exercise not found:', exerciseId);
    return newPRs;
  }

  // Get existing PRs for this exercise
  const { data: existingPRs } = await supabase
    .from('personal_records')
    .select('*')
    .eq('user_id', userId)
    .eq('exercise_id', exerciseUUID);

  const prMap = new Map<RecordType, PersonalRecord>();
  existingPRs?.forEach((pr) => {
    prMap.set(pr.record_type as RecordType, pr);
  });

  // Calculate current session values
  let sessionMaxWeight = 0;
  let sessionMaxReps = 0;
  let sessionMax1RM = 0;
  let sessionTotalVolume = 0;
  let maxWeightSet: SetData | null = null;
  let maxRepsSet: SetData | null = null;
  let max1RMSet: SetData | null = null;

  sets.forEach((set) => {
    if (set.weight > 0 && set.reps > 0) {
      // Track max weight
      if (set.weight > sessionMaxWeight) {
        sessionMaxWeight = set.weight;
        maxWeightSet = set;
      }

      // Track max reps
      if (set.reps > sessionMaxReps) {
        sessionMaxReps = set.reps;
        maxRepsSet = set;
      }

      // Track max 1RM
      const estimated1RM = calculate1RM(set.weight, set.reps);
      if (estimated1RM > sessionMax1RM) {
        sessionMax1RM = estimated1RM;
        max1RMSet = set;
      }

      // Accumulate volume
      sessionTotalVolume += set.weight * set.reps;
    }
  });

  const now = new Date().toISOString();

  // Check max_weight PR
  const currentMaxWeight = prMap.get('max_weight');
  if (sessionMaxWeight > (currentMaxWeight?.value || 0)) {
    const newPR: NewPR = {
      recordType: 'max_weight',
      previousValue: currentMaxWeight?.value || null,
      newValue: sessionMaxWeight,
      improvement: currentMaxWeight ? sessionMaxWeight - currentMaxWeight.value : null,
      weight: maxWeightSet?.weight,
      reps: maxWeightSet?.reps,
    };
    newPRs.push(newPR);

    // Upsert PR
    await supabase.from('personal_records').upsert(
      {
        user_id: userId,
        exercise_id: exerciseUUID,
        record_type: 'max_weight',
        value: sessionMaxWeight,
        weight: maxWeightSet?.weight,
        reps: maxWeightSet?.reps,
        achieved_at: now,
        workout_id: workoutId || null,
      },
      { onConflict: 'user_id,exercise_id,record_type' }
    );
  }

  // Check max_reps PR
  const currentMaxReps = prMap.get('max_reps');
  if (sessionMaxReps > (currentMaxReps?.value || 0)) {
    const newPR: NewPR = {
      recordType: 'max_reps',
      previousValue: currentMaxReps?.value || null,
      newValue: sessionMaxReps,
      improvement: currentMaxReps ? sessionMaxReps - currentMaxReps.value : null,
      weight: maxRepsSet?.weight,
      reps: maxRepsSet?.reps,
    };
    newPRs.push(newPR);

    await supabase.from('personal_records').upsert(
      {
        user_id: userId,
        exercise_id: exerciseUUID,
        record_type: 'max_reps',
        value: sessionMaxReps,
        weight: maxRepsSet?.weight,
        reps: maxRepsSet?.reps,
        achieved_at: now,
        workout_id: workoutId || null,
      },
      { onConflict: 'user_id,exercise_id,record_type' }
    );
  }

  // Check max_1rm PR
  const currentMax1RM = prMap.get('max_1rm');
  if (sessionMax1RM > (currentMax1RM?.value || 0)) {
    const newPR: NewPR = {
      recordType: 'max_1rm',
      previousValue: currentMax1RM?.value || null,
      newValue: sessionMax1RM,
      improvement: currentMax1RM ? sessionMax1RM - currentMax1RM.value : null,
      weight: max1RMSet?.weight,
      reps: max1RMSet?.reps,
    };
    newPRs.push(newPR);

    await supabase.from('personal_records').upsert(
      {
        user_id: userId,
        exercise_id: exerciseUUID,
        record_type: 'max_1rm',
        value: sessionMax1RM,
        weight: max1RMSet?.weight,
        reps: max1RMSet?.reps,
        achieved_at: now,
        workout_id: workoutId || null,
      },
      { onConflict: 'user_id,exercise_id,record_type' }
    );
  }

  // Check max_volume PR (session total)
  const currentMaxVolume = prMap.get('max_volume');
  if (sessionTotalVolume > (currentMaxVolume?.value || 0)) {
    const newPR: NewPR = {
      recordType: 'max_volume',
      previousValue: currentMaxVolume?.value || null,
      newValue: sessionTotalVolume,
      improvement: currentMaxVolume ? sessionTotalVolume - currentMaxVolume.value : null,
    };
    newPRs.push(newPR);

    await supabase.from('personal_records').upsert(
      {
        user_id: userId,
        exercise_id: exerciseUUID,
        record_type: 'max_volume',
        value: sessionTotalVolume,
        achieved_at: now,
        workout_id: workoutId || null,
      },
      { onConflict: 'user_id,exercise_id,record_type' }
    );
  }

  return newPRs;
}

/**
 * Check a single set for PRs (real-time during workout)
 * @param userId - User ID
 * @param exerciseId - Exercise ID
 * @param set - Single set data
 * @returns Array of new PRs (max_weight, max_reps, max_1rm only - not volume)
 */
export async function checkSetForPRs(
  userId: string,
  exerciseId: string,
  set: SetData
): Promise<NewPR[]> {
  const newPRs: NewPR[] = [];

  if (set.weight <= 0 || set.reps <= 0) return newPRs;

  const exerciseUUID = await getExerciseUUID(exerciseId);
  if (!exerciseUUID) return newPRs;

  // Get existing PRs
  const { data: existingPRs } = await supabase
    .from('personal_records')
    .select('*')
    .eq('user_id', userId)
    .eq('exercise_id', exerciseUUID)
    .in('record_type', ['max_weight', 'max_reps', 'max_1rm']);

  const prMap = new Map<RecordType, PersonalRecord>();
  existingPRs?.forEach((pr) => {
    prMap.set(pr.record_type as RecordType, pr);
  });

  // Check max_weight
  const currentMaxWeight = prMap.get('max_weight');
  if (set.weight > (currentMaxWeight?.value || 0)) {
    newPRs.push({
      recordType: 'max_weight',
      previousValue: currentMaxWeight?.value || null,
      newValue: set.weight,
      improvement: currentMaxWeight ? set.weight - currentMaxWeight.value : null,
      weight: set.weight,
      reps: set.reps,
    });
  }

  // Check max_reps
  const currentMaxReps = prMap.get('max_reps');
  if (set.reps > (currentMaxReps?.value || 0)) {
    newPRs.push({
      recordType: 'max_reps',
      previousValue: currentMaxReps?.value || null,
      newValue: set.reps,
      improvement: currentMaxReps ? set.reps - currentMaxReps.value : null,
      weight: set.weight,
      reps: set.reps,
    });
  }

  // Check max_1rm
  const estimated1RM = calculate1RM(set.weight, set.reps);
  const currentMax1RM = prMap.get('max_1rm');
  if (estimated1RM > (currentMax1RM?.value || 0)) {
    newPRs.push({
      recordType: 'max_1rm',
      previousValue: currentMax1RM?.value || null,
      newValue: estimated1RM,
      improvement: currentMax1RM ? estimated1RM - currentMax1RM.value : null,
      weight: set.weight,
      reps: set.reps,
    });
  }

  return newPRs;
}

// ============================================
// PR Retrieval Functions
// ============================================

/**
 * Get all PRs for a specific exercise
 */
export async function getExercisePRs(
  userId: string,
  exerciseId: string
): Promise<ExercisePRs> {
  const exerciseUUID = await getExerciseUUID(exerciseId);

  const result: ExercisePRs = {
    exerciseId,
    maxWeight: null,
    maxReps: null,
    maxVolume: null,
    max1RM: null,
  };

  if (!exerciseUUID) return result;

  const { data: prs } = await supabase
    .from('personal_records')
    .select('*')
    .eq('user_id', userId)
    .eq('exercise_id', exerciseUUID);

  prs?.forEach((pr) => {
    switch (pr.record_type) {
      case 'max_weight':
        result.maxWeight = pr;
        break;
      case 'max_reps':
        result.maxReps = pr;
        break;
      case 'max_volume':
        result.maxVolume = pr;
        break;
      case 'max_1rm':
        result.max1RM = pr;
        break;
    }
  });

  return result;
}

/**
 * Get all PRs for a user, grouped by exercise
 */
export async function getAllPRs(userId: string): Promise<ExercisePRs[]> {
  const { data: prs, error } = await supabase
    .from('personal_records')
    .select(`
      *,
      exercises (
        id,
        name,
        external_id
      )
    `)
    .eq('user_id', userId)
    .order('achieved_at', { ascending: false });

  if (error || !prs) return [];

  // Group by exercise
  const exerciseMap = new Map<string, ExercisePRs>();

  prs.forEach((pr: any) => {
    const exerciseId = pr.exercise_id;
    
    if (!exerciseMap.has(exerciseId)) {
      exerciseMap.set(exerciseId, {
        exerciseId,
        exerciseName: pr.exercises?.name,
        maxWeight: null,
        maxReps: null,
        maxVolume: null,
        max1RM: null,
      });
    }

    const exercisePRs = exerciseMap.get(exerciseId);
    if (!exercisePRs) continue;
    
    switch (pr.record_type) {
      case 'max_weight':
        if (!exercisePRs.maxWeight) exercisePRs.maxWeight = pr;
        break;
      case 'max_reps':
        if (!exercisePRs.maxReps) exercisePRs.maxReps = pr;
        break;
      case 'max_volume':
        if (!exercisePRs.maxVolume) exercisePRs.maxVolume = pr;
        break;
      case 'max_1rm':
        if (!exercisePRs.max1RM) exercisePRs.max1RM = pr;
        break;
    }
  });

  return Array.from(exerciseMap.values());
}

/**
 * Get PR history/progression for an exercise
 */
export async function getPRHistory(
  userId: string,
  exerciseId: string,
  recordType: RecordType
): Promise<PRHistoryEntry[]> {
  const exerciseUUID = await getExerciseUUID(exerciseId);
  if (!exerciseUUID) return [];

  // Note: This requires storing PR history separately or querying workout_sets
  // For now, we'll query workout_sets to reconstruct history
  const { data, error } = await supabase
    .from('workout_exercises')
    .select(`
      workout_id,
      workouts!inner (
        id,
        started_at,
        user_id
      ),
      workout_sets (
        weight,
        reps,
        is_completed
      )
    `)
    .eq('exercise_id', exerciseUUID)
    .eq('workouts.user_id', userId)
    .not('workouts.ended_at', 'is', null)
    .order('workouts(started_at)', { ascending: true });

  if (error || !data) return [];

  const history: PRHistoryEntry[] = [];
  let currentMax = 0;

  data.forEach((entry: any) => {
    const workout = Array.isArray(entry.workouts) ? entry.workouts[0] : entry.workouts;
    const completedSets = (entry.workout_sets || []).filter((s: any) => s.is_completed);

    let sessionValue = 0;

    switch (recordType) {
      case 'max_weight':
        sessionValue = Math.max(...completedSets.map((s: any) => s.weight || 0));
        break;
      case 'max_reps':
        sessionValue = Math.max(...completedSets.map((s: any) => s.reps || 0));
        break;
      case 'max_1rm':
        sessionValue = Math.max(
          ...completedSets.map((s: any) => calculate1RM(s.weight || 0, s.reps || 0))
        );
        break;
      case 'max_volume':
        sessionValue = completedSets.reduce(
          (sum: number, s: any) => sum + (s.weight || 0) * (s.reps || 0),
          0
        );
        break;
    }

    // Only add to history if it's a new PR
    if (sessionValue > currentMax) {
      currentMax = sessionValue;
      history.push({
        value: sessionValue,
        achieved_at: workout?.started_at || '',
        workout_id: entry.workout_id,
      });
    }
  });

  return history;
}

/**
 * Get recent PRs across all exercises (for dashboard/notifications)
 */
export async function getRecentPRs(
  userId: string,
  limit: number = 10
): Promise<(PersonalRecord & { exercise_name?: string })[]> {
  const { data, error } = await supabase
    .from('personal_records')
    .select(`
      *,
      exercises (
        name
      )
    `)
    .eq('user_id', userId)
    .order('achieved_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((pr: any) => ({
    ...pr,
    exercise_name: pr.exercises?.name,
  }));
}

/**
 * Delete a PR (admin/reset functionality)
 */
export async function deletePR(
  userId: string,
  exerciseId: string,
  recordType: RecordType
): Promise<boolean> {
  const exerciseUUID = await getExerciseUUID(exerciseId);
  if (!exerciseUUID) return false;

  const { error } = await supabase
    .from('personal_records')
    .delete()
    .eq('user_id', userId)
    .eq('exercise_id', exerciseUUID)
    .eq('record_type', recordType);

  return !error;
}

/**
 * Format PR type for display
 */
export function formatPRType(recordType: RecordType): string {
  switch (recordType) {
    case 'max_weight':
      return 'Max Weight';
    case 'max_reps':
      return 'Max Reps';
    case 'max_volume':
      return 'Max Volume';
    case 'max_1rm':
      return 'Est. 1RM';
    default:
      return recordType;
  }
}

/**
 * Format PR value for display
 */
export function formatPRValue(recordType: RecordType, value: number): string {
  switch (recordType) {
    case 'max_weight':
    case 'max_1rm':
      return `${value} lbs`;
    case 'max_reps':
      return `${value} reps`;
    case 'max_volume':
      return `${value.toLocaleString()} lbs`;
    default:
      return value.toString();
  }
}

