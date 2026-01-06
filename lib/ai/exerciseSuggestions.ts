import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/utils/logger';

export interface PersonalizedExercise {
  name: string;
  sets: number;
  reps: string;
  lastWeight?: number;
  exerciseId: string;
}

// Muscle groups for each workout type
const MUSCLE_GROUPS_MAP: Record<string, string[]> = {
  'Push': ['chest', 'shoulders', 'triceps'],
  'Pull': ['back', 'lats', 'biceps', 'traps'],
  'Legs': ['quadriceps', 'hamstrings', 'glutes', 'calves'],
  'Full Body': ['chest', 'back', 'quadriceps', 'shoulders'],
};

/**
 * Get personalized exercise suggestions based on user's workout history
 * Falls back to real exercises from the library if no history exists
 */
export async function getPersonalizedExercises(
  userId: string,
  workoutType: 'Push' | 'Pull' | 'Legs' | 'Full Body'
): Promise<PersonalizedExercise[]> {
  try {
    const targetMuscles = MUSCLE_GROUPS_MAP[workoutType] || MUSCLE_GROUPS_MAP['Push'];
    
    // Fetch user's exercise history for these muscles (last 60 days)
    // Start from workouts (which has user_id) and join down
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    
    const { data: workouts, error } = await supabase
      .from('workouts')
      .select(`
        workout_exercises (
          exercise_id,
          exercises (
            id,
            name,
            primary_muscles
          ),
          workout_sets (
            weight,
            reps
          )
        )
      `)
      .eq('user_id', userId)
      .gte('created_at', sixtyDaysAgo.toISOString())
      .order('created_at', { ascending: false });
    
    // Flatten the nested structure to get individual sets
    const recentSets: Array<{
      weight: number;
      reps: number;
      exercise_id: string;
      exercise: { id: string; name: string; primary_muscles: string[] };
    }> = [];
    
    for (const workout of workouts || []) {
      for (const we of workout.workout_exercises || []) {
        if (!we.exercises) continue;
        for (const set of we.workout_sets || []) {
          recentSets.push({
            weight: set.weight,
            reps: set.reps,
            exercise_id: we.exercise_id,
            exercise: we.exercises as { id: string; name: string; primary_muscles: string[] },
          });
        }
      }
    }
    
    if (error) {
      logger.error('Error fetching exercise history:', error);
      return await getDefaultExercisesFromLibrary(targetMuscles, workoutType);
    }
    
    // Filter by target muscles and group by exercise
    const exerciseMap = new Map<string, {
      exerciseId: string;
      name: string;
      muscle: string;
      totalSets: number;
      totalReps: number;
      maxWeight: number;
      frequency: number;
    }>();
    
    for (const set of recentSets) {
      if (!set.exercise) continue;
      
      // Check if exercise targets any of our muscles
      const primaryMuscles = set.exercise.primary_muscles || [];
      const targetsMuscle = primaryMuscles.some((m: string) => 
        targetMuscles.includes(m.toLowerCase())
      );
      
      if (!targetsMuscle) continue;
      
      const key = set.exercise_id;
      const existing = exerciseMap.get(key);
      
      if (existing) {
        existing.totalSets++;
        existing.totalReps += set.reps || 0;
        existing.maxWeight = Math.max(existing.maxWeight, set.weight || 0);
        existing.frequency++;
      } else {
        exerciseMap.set(key, {
          exerciseId: set.exercise_id,
          name: set.exercise.name,
          muscle: primaryMuscles[0]?.toLowerCase() || 'unknown',
          totalSets: 1,
          totalReps: set.reps || 0,
          maxWeight: set.weight || 0,
          frequency: 1,
        });
      }
    }
    
    // Sort by frequency (most used exercises first)
    const sortedExercises = Array.from(exerciseMap.values())
      .sort((a, b) => b.frequency - a.frequency);
    
    // Pick top exercises (max 2 per muscle group, max 5 total)
    const selectedExercises: PersonalizedExercise[] = [];
    const muscleCount: Record<string, number> = {};
    
    for (const exercise of sortedExercises) {
      if (selectedExercises.length >= 5) break;
      
      const muscleExercises = muscleCount[exercise.muscle] || 0;
      if (muscleExercises >= 2) continue; // Max 2 per muscle
      
      const avgReps = Math.round(exercise.totalReps / exercise.totalSets);
      const avgSets = Math.min(4, Math.max(3, Math.round(exercise.totalSets / exercise.frequency)));
      
      selectedExercises.push({
        name: exercise.name,
        sets: avgSets,
        reps: formatRepsRange(avgReps),
        lastWeight: exercise.maxWeight > 0 ? exercise.maxWeight : undefined,
        exerciseId: exercise.exerciseId,
      });
      
      muscleCount[exercise.muscle] = muscleExercises + 1;
    }
    
    // If not enough exercises from history, fill with real exercises from library
    if (selectedExercises.length < 4) {
      const defaults = await getDefaultExercisesFromLibrary(targetMuscles, workoutType);
      for (const def of defaults) {
        if (selectedExercises.length >= 5) break;
        if (!selectedExercises.some(e => e.exerciseId === def.exerciseId)) {
          selectedExercises.push(def);
        }
      }
    }
    
    logger.log(`[ExerciseSuggestions] Found ${selectedExercises.length} personalized exercises for ${workoutType}`);
    return selectedExercises;
    
  } catch (error: unknown) {
    logger.error('Failed to get personalized exercises:', error);
    const targetMuscles = MUSCLE_GROUPS_MAP[workoutType] || MUSCLE_GROUPS_MAP['Push'];
    return await getDefaultExercisesFromLibrary(targetMuscles, workoutType);
  }
}

/**
 * Format rep range based on average reps
 */
function formatRepsRange(avgReps: number): string {
  if (avgReps <= 5) return '4-6';
  if (avgReps <= 8) return '6-8';
  if (avgReps <= 10) return '8-10';
  if (avgReps <= 12) return '10-12';
  return '12-15';
}

/**
 * Get default exercises from the actual exercise library
 */
async function getDefaultExercisesFromLibrary(
  targetMuscles: string[],
  workoutType: string
): Promise<PersonalizedExercise[]> {
  try {
    // Fetch real exercises from the library that match target muscles
    const { data: exercises, error } = await supabase
      .from('exercises')
      .select('id, name, primary_muscles, equipment')
      .order('name');
    
    if (error || !exercises) {
      logger.error('Error fetching exercises from library:', error);
      return [];
    }
    
    // Filter exercises that target our muscles
    const matchingExercises = exercises.filter(ex => {
      const primaryMuscles = ex.primary_muscles || [];
      return primaryMuscles.some((m: string) => 
        targetMuscles.includes(m.toLowerCase())
      );
    });
    
    // Group by muscle and pick best ones (prefer compound movements)
    const selectedExercises: PersonalizedExercise[] = [];
    const muscleCount: Record<string, number> = {};
    
    // Sort to prefer exercises with common equipment (barbell, dumbbell)
    const sortedExercises = matchingExercises.sort((a, b) => {
      const preferredEquipment = ['barbell', 'dumbbell', 'cable', 'machine'];
      const aScore = preferredEquipment.indexOf(a.equipment?.toLowerCase() || '') ?? 99;
      const bScore = preferredEquipment.indexOf(b.equipment?.toLowerCase() || '') ?? 99;
      return aScore - bScore;
    });
    
    for (const exercise of sortedExercises) {
      if (selectedExercises.length >= 5) break;
      
      const muscle = (exercise.primary_muscles?.[0] || 'unknown').toLowerCase();
      const muscleExercises = muscleCount[muscle] || 0;
      if (muscleExercises >= 2) continue; // Max 2 per muscle
      
      // Default sets/reps based on workout type
      const setsReps = getDefaultSetsReps(workoutType, muscle);
      
      selectedExercises.push({
        name: exercise.name,
        sets: setsReps.sets,
        reps: setsReps.reps,
        exerciseId: exercise.id,
      });
      
      muscleCount[muscle] = muscleExercises + 1;
    }
    
    logger.log(`[ExerciseSuggestions] Fetched ${selectedExercises.length} default exercises from library`);
    return selectedExercises;
    
  } catch (error: unknown) {
    logger.error('Failed to get default exercises from library:', error);
    return [];
  }
}

/**
 * Get default sets and reps based on workout type and muscle
 */
function getDefaultSetsReps(workoutType: string, muscle: string): { sets: number; reps: string } {
  // Compound movements (chest, back, legs) = lower reps, more sets
  const isCompound = ['chest', 'back', 'quadriceps', 'hamstrings', 'glutes'].includes(muscle);
  
  if (workoutType === 'Legs') {
    return isCompound ? { sets: 4, reps: '6-8' } : { sets: 3, reps: '10-12' };
  }
  
  if (isCompound) {
    return { sets: 4, reps: '8-10' };
  }
  
  // Isolation movements = higher reps
  return { sets: 3, reps: '10-12' };
}

