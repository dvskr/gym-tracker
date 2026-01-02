import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/utils/logger';
import { successHaptic } from './haptics';

// ============================================
// Types
// ============================================

export type PRType = 'max_weight' | 'max_reps' | 'max_volume';

export interface PRCheck {
  isNewPR: boolean;
  prType: PRType | null;
  previousRecord: number | null;
  newRecord: number | null;
  exerciseId: string;
  exerciseName?: string;
}

export interface PersonalRecord {
  id: string;
  userId: string;
  exerciseId: string;
  recordType: PRType;
  value: number;
  weight: number | null;
  reps: number | null;
  workoutId: string | null;
  achievedAt: string;
}

export interface WorkoutPR {
  exerciseId: string;
  exerciseName: string;
  prType: PRType;
  value: number;
  weight: number;
  reps: number;
  previousValue: number | null;
}

// ============================================
// PR Detection Functions
// ============================================

/**
 * Check if a completed set is a new personal record
 */
export async function checkForPR(
  userId: string,
  exerciseId: string,
  weight: number,
  reps: number,
  exerciseName?: string
): Promise<PRCheck[]> {
  const results: PRCheck[] = [];

  if (!weight || !reps || weight <= 0 || reps <= 0) {
    return results;
  }

  try {
    // Calculate volume for this set
    const volume = weight * reps;

    // Fetch current PRs for this exercise
    const { data: currentPRs, error } = await supabase
      .from('personal_records')
      .select('*')
      .eq('user_id', userId)
      .eq('exercise_id', exerciseId);

    if (error) {
      logger.error('Error fetching PRs:', error);
      return results;
    }

    // Find existing records
    const maxWeightRecord = currentPRs?.find((pr) => pr.record_type === 'max_weight');
    const maxRepsRecord = currentPRs?.find((pr) => pr.record_type === 'max_reps');
    const maxVolumeRecord = currentPRs?.find((pr) => pr.record_type === 'max_volume');

    // Check for max weight PR
    if (!maxWeightRecord || weight > maxWeightRecord.value) {
      results.push({
        isNewPR: true,
        prType: 'max_weight',
        previousRecord: maxWeightRecord?.value ?? null,
        newRecord: weight,
        exerciseId,
        exerciseName,
      });
    }

    // Check for max reps PR (at any weight)
    if (!maxRepsRecord || reps > maxRepsRecord.value) {
      results.push({
        isNewPR: true,
        prType: 'max_reps',
        previousRecord: maxRepsRecord?.value ?? null,
        newRecord: reps,
        exerciseId,
        exerciseName,
      });
    }

    // Check for max volume PR (weight × reps)
    if (!maxVolumeRecord || volume > maxVolumeRecord.value) {
      results.push({
        isNewPR: true,
        prType: 'max_volume',
        previousRecord: maxVolumeRecord?.value ?? null,
        newRecord: volume,
        exerciseId,
        exerciseName,
      });
    }

    return results;
  } catch (error) {
    logger.error('Error checking for PR:', error);
    return results;
  }
}

/**
 * Save a new personal record
 */
export async function savePR(
  userId: string,
  exerciseId: string,
  recordType: PRType,
  value: number,
  weight: number,
  reps: number,
  workoutId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Upsert (insert or update) the personal record
    const { error } = await supabase
      .from('personal_records')
      .upsert(
        {
          user_id: userId,
          exercise_id: exerciseId,
          record_type: recordType,
          value,
          weight,
          reps,
          workout_id: workoutId || null,
          achieved_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,exercise_id,record_type',
        }
      );

    if (error) {
      logger.error('Error saving PR:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    logger.error('Error saving PR:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save PR',
    };
  }
}

/**
 * Save multiple PRs at once
 */
export async function savePRs(
  userId: string,
  prs: Array<{
    exerciseId: string;
    prType: PRType;
    value: number;
    weight: number;
    reps: number;
  }>,
  workoutId?: string
): Promise<{ success: boolean; savedCount: number; error?: string }> {
  let savedCount = 0;

  for (const pr of prs) {
    const result = await savePR(
      userId,
      pr.exerciseId,
      pr.prType,
      pr.value,
      pr.weight,
      pr.reps,
      workoutId
    );

    if (result.success) {
      savedCount++;
    }
  }

  return { success: savedCount > 0, savedCount };
}

/**
 * Get all personal records for a user
 */
export async function getUserPRs(
  userId: string
): Promise<{ data: PersonalRecord[] | null; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('personal_records')
      .select('*')
      .eq('user_id', userId)
      .order('achieved_at', { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }

    const records: PersonalRecord[] = (data || []).map((pr) => ({
      id: pr.id,
      userId: pr.user_id,
      exerciseId: pr.exercise_id,
      recordType: pr.record_type as PRType,
      value: pr.value,
      weight: pr.weight,
      reps: pr.reps,
      workoutId: pr.workout_id,
      achievedAt: pr.achieved_at,
    }));

    return { data: records };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to fetch PRs',
    };
  }
}

/**
 * Get PRs for a specific exercise
 */
export async function getExercisePRs(
  userId: string,
  exerciseId: string
): Promise<{ data: PersonalRecord[] | null; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('personal_records')
      .select('*')
      .eq('user_id', userId)
      .eq('exercise_id', exerciseId);

    if (error) {
      return { data: null, error: error.message };
    }

    const records: PersonalRecord[] = (data || []).map((pr) => ({
      id: pr.id,
      userId: pr.user_id,
      exerciseId: pr.exercise_id,
      recordType: pr.record_type as PRType,
      value: pr.value,
      weight: pr.weight,
      reps: pr.reps,
      workoutId: pr.workout_id,
      achievedAt: pr.achieved_at,
    }));

    return { data: records };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to fetch PRs',
    };
  }
}

/**
 * Get the formatted display text for a PR type
 */
export function getPRTypeLabel(prType: PRType): string {
  switch (prType) {
    case 'max_weight':
      return 'Max Weight';
    case 'max_reps':
      return 'Max Reps';
    case 'max_volume':
      return 'Max Volume';
    default:
      return 'Record';
  }
}

/**
 * Format PR value for display
 */
export function formatPRValue(prType: PRType, value: number, weight?: number, reps?: number): string {
  switch (prType) {
    case 'max_weight':
      return `${value} lbs${reps ? ` × ${reps}` : ''}`;
    case 'max_reps':
      return `${value} reps${weight ? ` @ ${weight} lbs` : ''}`;
    case 'max_volume':
      return `${value.toLocaleString()} lbs${weight && reps ? ` (${weight} × ${reps})` : ''}`;
    default:
      return value.toString();
  }
}

/**
 * Trigger PR celebration
 */
export function celebratePR() {
  successHaptic();
}

