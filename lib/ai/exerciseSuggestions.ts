/**
 * Personalized Exercise Suggestions
 * 
 * Fetches exercises based on user's workout history and target muscles.
 * Uses database queries - NOT AI/OpenAI - completely free.
 * 
 * How it works:
 * - Queries user's recent workouts (last 60 days)
 * - Finds exercises they've done for target muscle groups
 * - Calculates average weight used
 * - Falls back to exercise library if no history
 * 
 * Cost: $0 (database queries only)
 */

import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/utils/logger';

export interface PersonalizedExercise {
  name: string;
  sets: number;
  reps: string;
  restTime?: string; // NEW: Rest time between sets
  lastWeight?: number;
  exerciseId: string;
  gifUrl?: string; // NEW: Exercise GIF URL for display
  // Progressive Overload
  suggestedWeight?: number;
  progressionNote?: string;
  lastSetsCompleted?: number;
  targetRepsHit?: boolean;
  // Exercise Explanation
  explanation?: string;
  frequency?: number; // How often user does this exercise
  equipment?: string;
  isCompound?: boolean; // NEW: Compound vs accessory
}

// Muscle groups for each workout type
const MUSCLE_GROUPS_MAP: Record<string, string[]> = {
  'Push': ['chest', 'shoulders', 'triceps'],
  'Pull': ['back', 'lats', 'biceps', 'traps'],
  'Legs': ['quadriceps', 'hamstrings', 'glutes', 'calves'],
  'Full Body': ['chest', 'back', 'quadriceps', 'shoulders'],
};

// OPTIMIZATION D: Goal-based training schemes
const GOAL_SCHEMES = {
  strength: {
    compound: { sets: 5, reps: '3-5', restTime: '3-5 min' },
    accessory: { sets: 4, reps: '6-8', restTime: '2-3 min' },
  },
  build_muscle: {
    compound: { sets: 4, reps: '8-10', restTime: '90-120 sec' },
    accessory: { sets: 3, reps: '10-12', restTime: '60-90 sec' },
  },
  lose_fat: {
    compound: { sets: 3, reps: '10-12', restTime: '60-90 sec' },
    accessory: { sets: 3, reps: '12-15', restTime: '45-60 sec' },
  },
  endurance: {
    compound: { sets: 3, reps: '12-15', restTime: '45-60 sec' },
    accessory: { sets: 3, reps: '15-20', restTime: '30-45 sec' },
  },
  general_fitness: {
    compound: { sets: 4, reps: '8-10', restTime: '90 sec' },
    accessory: { sets: 3, reps: '10-12', restTime: '60 sec' },
  },
  maintain: {
    compound: { sets: 3, reps: '8-10', restTime: '90 sec' },
    accessory: { sets: 3, reps: '10-12', restTime: '60 sec' },
  },
};

// Compound exercise keywords (main strength movements)
const COMPOUND_KEYWORDS = [
  'bench press', 'press', 'squat', 'deadlift', 'row', 'pull-up', 'chin-up',
  'dip', 'lunge', 'leg press', 'overhead press', 'military press',
  'clean', 'snatch', 'thruster', 'front squat', 'back squat',
];

/**
 * Check if exercise is compound movement
 */
function isCompoundExercise(exerciseName: string): boolean {
  const nameLower = exerciseName.toLowerCase();
  return COMPOUND_KEYWORDS.some(keyword => nameLower.includes(keyword));
}

/**
 * Get personalized exercise suggestions based on user's workout history
 * Falls back to real exercises from the library if no history exists
 * 
 * OPTIMIZATIONS:
 * - Equipment filtering: Only shows exercises user can do
 * - Progressive overload: Suggests weight progression
 * - Goal-adaptive sets/reps: Adjusts to user's fitness goal
 * - Exercise explanations: Shows WHY each exercise was selected
 */
export async function getPersonalizedExercises(
  userId: string,
  workoutType: 'Push' | 'Pull' | 'Legs' | 'Full Body',
  recoveryData?: { muscleDetails: Array<{ name: string; status: string; daysSinceTraining: number; recoveryPercent: number }> }
): Promise<PersonalizedExercise[]> {
  try {
    const targetMuscles = MUSCLE_GROUPS_MAP[workoutType] || MUSCLE_GROUPS_MAP['Push'];
    
    // OPTIMIZATION A: Get user's equipment and fitness goal from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('available_equipment, fitness_goal')
      .eq('id', userId)
      .single();
    
    const userEquipment = profile?.available_equipment || [];
    const fitnessGoal = profile?.fitness_goal || 'build_muscle';
    
    // Fetch user's exercise history for these muscles (last 60 days)
    // Start from workouts (which has user_id) and join down
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    
    const { data: workouts, error } = await supabase
      .from('workouts')
      .select(`
        id,
        created_at,
        workout_exercises (
          exercise_id,
          exercises (
            id,
            name,
            primary_muscles,
            equipment,
            gif_url
          ),
          workout_sets (
            weight,
            reps,
            is_completed,
            set_number
          )
        )
      `)
      .eq('user_id', userId)
      .gte('created_at', sixtyDaysAgo.toISOString())
      .not('ended_at', 'is', null) // Only completed workouts
      .order('created_at', { ascending: false });
    
    // Flatten the nested structure to get individual exercises
    const exerciseHistory = new Map<string, {
      exerciseId: string;
      name: string;
      muscle: string;
      equipment: string;
      gifUrl?: string; // NEW: Store GIF URL
      sets: Array<{
        weight: number;
        reps: number;
        isCompleted: boolean;
        setNumber: number;
        workoutDate: string;
      }>;
      workoutCount: number;
    }>();
    
    for (const workout of workouts || []) {
      for (const we of workout.workout_exercises || []) {
        if (!we.exercises) continue;
        
        // IMPORTANT: Skip exercises without GIF URLs
        if (!we.exercises.gif_url || we.exercises.gif_url === '') {
          continue;
        }
        
        const key = we.exercise_id;
        const existing = exerciseHistory.get(key);
        
        const sets = (we.workout_sets || []).map((s: any) => ({
          weight: s.weight || 0,
          reps: s.reps || 0,
          isCompleted: s.is_completed || false,
          setNumber: s.set_number || 1,
          workoutDate: workout.created_at,
        }));
        
        if (existing) {
          existing.sets.push(...sets);
          existing.workoutCount++;
        } else {
          exerciseHistory.set(key, {
            exerciseId: we.exercise_id,
            name: we.exercises.name,
            muscle: (we.exercises.primary_muscles?.[0] || 'unknown').toLowerCase(),
            equipment: we.exercises.equipment || 'bodyweight',
            gifUrl: we.exercises.gif_url || undefined, // NEW: Store GIF URL
            sets,
            workoutCount: 1,
          });
        }
      }
    }
    
    if (error) {
      logger.error('Error fetching exercise history:', error);
      return await getDefaultExercisesFromLibrary(targetMuscles, workoutType, userEquipment, fitnessGoal);
    }
    
    // Filter by target muscles and equipment
    const filteredExercises = Array.from(exerciseHistory.values()).filter(ex => {
      // IMPORTANT: Only include exercises with GIF URLs
      if (!ex.gifUrl || ex.gifUrl === '') {
        return false;
      }
      
      // Check if exercise targets our muscles
      const targetsMuscle = targetMuscles.includes(ex.muscle);
      
      // OPTIMIZATION A: Check if user has required equipment
      const hasEquipment = !userEquipment.length || 
                          userEquipment.includes(ex.equipment) ||
                          ex.equipment === 'bodyweight' ||
                          ex.equipment === 'body weight' ||
                          !ex.equipment;
      
      return targetsMuscle && hasEquipment;
    });
    
    // Calculate stats and progression for each exercise
    const exercisesWithProgression = filteredExercises.map(ex => {
      // OPTIMIZATION B: Calculate progressive overload
      const progression = calculateProgression(ex, fitnessGoal);
      
      // OPTIMIZATION D: Goal-adaptive sets/reps with rest times
      const { sets, reps, restTime, isCompound } = getGoalAdaptiveSetsReps(ex.name, ex.muscle, fitnessGoal);
      
      // OPTIMIZATION E: Generate explanation with recovery context
      const explanation = generateExerciseExplanation(ex, targetMuscles, recoveryData);
      
      return {
        ...ex,
        ...progression,
        sets,
        reps,
        restTime,
        isCompound,
        explanation,
        frequency: ex.workoutCount,
      };
    });
    
    // Sort by frequency (most used exercises first)
    const sortedExercises = exercisesWithProgression.sort((a, b) => b.workoutCount - a.workoutCount);
    
    // Pick top exercises (max 2 per muscle group, max 5 total)
    const selectedExercises: PersonalizedExercise[] = [];
    const muscleCount: Record<string, number> = {};
    
    for (const exercise of sortedExercises) {
      if (selectedExercises.length >= 5) break;
      
      const muscleExercises = muscleCount[exercise.muscle] || 0;
      if (muscleExercises >= 2) continue; // Max 2 per muscle
      
      selectedExercises.push({
        name: exercise.name,
        sets: exercise.sets,
        reps: exercise.reps,
        restTime: exercise.restTime,
        lastWeight: exercise.lastWeight,
        exerciseId: exercise.exerciseId,
        gifUrl: exercise.gifUrl, // NEW: Pass GIF URL
        suggestedWeight: exercise.suggestedWeight,
        progressionNote: exercise.progressionNote,
        lastSetsCompleted: exercise.lastSetsCompleted,
        targetRepsHit: exercise.targetRepsHit,
        explanation: exercise.explanation,
        frequency: exercise.frequency,
        equipment: exercise.equipment,
        isCompound: exercise.isCompound,
      });
      
      muscleCount[exercise.muscle] = muscleExercises + 1;
    }
    
    // If not enough exercises from history, fill with real exercises from library
    if (selectedExercises.length < 4) {
      const defaults = await getDefaultExercisesFromLibrary(targetMuscles, workoutType, userEquipment, fitnessGoal, recoveryData);
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
    return await getDefaultExercisesFromLibrary(targetMuscles, workoutType, [], 'build_muscle', recoveryData);
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
 * OPTIMIZATION B: Calculate progressive overload recommendation
 * Analyzes last workout performance to suggest weight progression
 */
function calculateProgression(
  exercise: {
    sets: Array<{ weight: number; reps: number; isCompleted: boolean; setNumber: number; workoutDate: string }>;
    muscle: string;
  },
  fitnessGoal: string
): {
  lastWeight: number;
  suggestedWeight?: number;
  progressionNote?: string;
  lastSetsCompleted?: number;
  targetRepsHit?: boolean;
} {
  if (!exercise.sets.length) {
    return { lastWeight: 0 };
  }
  
  // Get most recent workout
  const sortedSets = [...exercise.sets].sort((a, b) => 
    new Date(b.workoutDate).getTime() - new Date(a.workoutDate).getTime()
  );
  
  const mostRecentDate = sortedSets[0].workoutDate;
  const lastWorkoutSets = sortedSets.filter(s => s.workoutDate === mostRecentDate && s.isCompleted);
  
  if (!lastWorkoutSets.length) {
    return { lastWeight: Math.max(...exercise.sets.map(s => s.weight)) };
  }
  
  // Calculate last workout stats
  const lastWeight = Math.max(...lastWorkoutSets.map(s => s.weight));
  const avgReps = lastWorkoutSets.reduce((sum, s) => sum + s.reps, 0) / lastWorkoutSets.length;
  const completedSets = lastWorkoutSets.length;
  const totalSets = Math.max(...lastWorkoutSets.map(s => s.setNumber));
  const completionRate = completedSets / totalSets;
  
  // Determine target reps based on goal
  let targetReps = 8; // Default for hypertrophy
  if (fitnessGoal === 'strength') targetReps = 5;
  else if (fitnessGoal === 'endurance') targetReps = 12;
  
  const targetRepsHit = avgReps >= targetReps;
  
  // Small muscle groups use smaller increments
  const isSmallMuscle = ['biceps', 'triceps', 'calves', 'shoulders', 'forearms'].includes(exercise.muscle);
  const increment = isSmallMuscle ? 2.5 : 5;
  
  // Progressive overload logic
  if (completionRate >= 1.0 && targetRepsHit) {
    // Success! User hit all sets and reps → Increase weight
    return {
      lastWeight,
      suggestedWeight: lastWeight + increment,
      progressionNote: `↑ +${increment} lbs`,
      lastSetsCompleted: completedSets,
      targetRepsHit: true,
    };
  } else if (completionRate >= 0.75) {
    // Almost there → Stay at same weight
    return {
      lastWeight,
      suggestedWeight: lastWeight,
      progressionNote: '→ Repeat',
      lastSetsCompleted: completedSets,
      targetRepsHit,
    };
  } else {
    // Struggled → Deload 10%
    const deloadWeight = Math.round(lastWeight * 0.9 / 2.5) * 2.5; // Round to nearest 2.5
    return {
      lastWeight,
      suggestedWeight: deloadWeight,
      progressionNote: '↓ Deload',
      lastSetsCompleted: completedSets,
      targetRepsHit: false,
    };
  }
}

/**
 * OPTIMIZATION D: Get goal-adaptive sets, reps, and rest time
 * Adjusts programming based on user's fitness goal and exercise type
 */
function getGoalAdaptiveSetsReps(
  exerciseName: string,
  muscle: string,
  fitnessGoal: string
): { sets: number; reps: string; restTime: string; isCompound: boolean } {
  // Determine if compound or accessory
  const isCompound = isCompoundExercise(exerciseName);
  
  // Get scheme for user's goal (fallback to general_fitness)
  const scheme = GOAL_SCHEMES[fitnessGoal as keyof typeof GOAL_SCHEMES] || GOAL_SCHEMES.general_fitness;
  
  // Return appropriate scheme
  const config = isCompound ? scheme.compound : scheme.accessory;
  
  return {
    sets: config.sets,
    reps: config.reps,
    restTime: config.restTime,
    isCompound,
  };
}

/**
 * OPTIMIZATION E: Generate exercise explanation
 * Explains why this exercise was selected with recovery context
 */
function generateExerciseExplanation(
  exercise: { 
    workoutCount: number; 
    muscle: string; 
    sets: Array<{ workoutDate: string }>;
    name: string;
  },
  targetMuscles: string[],
  recoveryData?: { muscleDetails: Array<{ name: string; status: string; daysSinceTraining: number; recoveryPercent: number }> }
): string {
  const muscleCapitalized = exercise.muscle.charAt(0).toUpperCase() + exercise.muscle.slice(1);
  
  // Calculate days since last done
  let daysSinceLastDone = 0;
  if (exercise.sets.length > 0) {
    const sortedDates = exercise.sets
      .map(s => new Date(s.workoutDate))
      .sort((a, b) => b.getTime() - a.getTime());
    
    const mostRecent = sortedDates[0];
    daysSinceLastDone = Math.floor((Date.now() - mostRecent.getTime()) / (1000 * 60 * 60 * 24));
  }
  
  // Get muscle recovery status
  const muscleStatus = recoveryData?.muscleDetails.find(
    m => m.name.toLowerCase() === exercise.muscle.toLowerCase()
  );
  
  // Calculate frequency (times per week)
  const timesPerWeek = Math.round(exercise.workoutCount / 8.5 * 10) / 10;
  
  // Priority 1: Fresh muscle + long gap (best reason)
  if (muscleStatus?.status === 'ready' && daysSinceLastDone > 5) {
    return `${muscleCapitalized} is fully recovered • Last done ${daysSinceLastDone} days ago`;
  }
  
  // Priority 2: High frequency (user's favorite)
  if (timesPerWeek >= 2 || exercise.workoutCount >= 8) {
    const frequencyText = timesPerWeek >= 2 
      ? `You do this ${timesPerWeek}x/week`
      : `One of your favorites • ${exercise.workoutCount}x in 90 days`;
    return `${frequencyText} • Targets ${muscleCapitalized}`;
  }
  
  // Priority 3: Long gap (time to train again)
  if (daysSinceLastDone > 7) {
    return `Time to hit ${muscleCapitalized} again • ${daysSinceLastDone} days rest`;
  }
  
  // Priority 4: Muscle recovery info
  if (muscleStatus) {
    if (muscleStatus.status === 'ready') {
      return `${muscleCapitalized} ready • ${muscleStatus.recoveryPercent}% recovered`;
    } else if (muscleStatus.status === 'almost') {
      return `${muscleCapitalized} almost ready • ${muscleStatus.recoveryPercent}% recovered`;
    }
  }
  
  // Priority 5: Generic fallback
  if (daysSinceLastDone > 0) {
    return `Targets ${muscleCapitalized} • Last done ${daysSinceLastDone} days ago`;
  }
  
  return `Good for ${muscleCapitalized} • Core ${workoutType} movement`;
}

/**
 * Get default exercises from the actual exercise library
 * OPTIMIZATION A: Filters by user's available equipment
 * OPTIMIZATION D: Adapts sets/reps to fitness goal
 */
async function getDefaultExercisesFromLibrary(
  targetMuscles: string[],
  workoutType: string,
  userEquipment: string[],
  fitnessGoal: string,
  recoveryData?: { muscleDetails: Array<{ name: string; status: string; daysSinceTraining: number; recoveryPercent: number }> }
): Promise<PersonalizedExercise[]> {
  try {
    // Fetch real exercises from the library that match target muscles
    const { data: exercises, error } = await supabase
      .from('exercises')
      .select('id, name, primary_muscles, equipment, gif_url')
      .eq('is_active', true)
      .not('gif_url', 'is', null)
      .not('gif_url', 'eq', '')
      .order('name');
    
    if (error || !exercises) {
      logger.error('Error fetching exercises from library:', error);
      return [];
    }
    
    // Filter exercises that target our muscles AND match equipment
    const matchingExercises = exercises.filter(ex => {
      const primaryMuscles = ex.primary_muscles || [];
      const targetsMuscle = primaryMuscles.some((m: string) => 
        targetMuscles.includes(m.toLowerCase())
      );
      
      // OPTIMIZATION A: Equipment filtering
      const equipmentMatch = !userEquipment.length ||
                            userEquipment.includes(ex.equipment?.toLowerCase() || '') ||
                            ex.equipment === 'bodyweight' ||
                            ex.equipment === 'body weight' ||
                            !ex.equipment;
      
      return targetsMuscle && equipmentMatch;
    });
    
    // Group by muscle and pick best ones (prefer compound movements)
    const selectedExercises: PersonalizedExercise[] = [];
    const muscleCount: Record<string, number> = {};
    
    // Sort to prefer exercises with user's equipment
    const sortedExercises = matchingExercises.sort((a, b) => {
      // If user has equipment, prefer it. Otherwise, prefer common equipment
      const preferredEquipment = userEquipment.length > 0 
        ? userEquipment 
        : ['barbell', 'dumbbell', 'cable', 'machine'];
      
      const aScore = preferredEquipment.indexOf(a.equipment?.toLowerCase() || '') ?? 99;
      const bScore = preferredEquipment.indexOf(b.equipment?.toLowerCase() || '') ?? 99;
      return aScore - bScore;
    });
    
    for (const exercise of sortedExercises) {
      if (selectedExercises.length >= 5) break;
      
      const muscle = (exercise.primary_muscles?.[0] || 'unknown').toLowerCase();
      const muscleExercises = muscleCount[muscle] || 0;
      if (muscleExercises >= 2) continue; // Max 2 per muscle
      
      // OPTIMIZATION D: Goal-adaptive sets/reps with rest times
      const { sets, reps, restTime, isCompound } = getGoalAdaptiveSetsReps(exercise.name, muscle, fitnessGoal);
      
      // OPTIMIZATION E: Generate explanation with recovery context
      const muscleCapitalized = muscle.charAt(0).toUpperCase() + muscle.slice(1);
      const muscleStatus = recoveryData?.muscleDetails.find(
        m => m.name.toLowerCase() === muscle.toLowerCase()
      );
      
      let explanation = `From exercise library • Targets ${muscleCapitalized}`;
      if (muscleStatus?.status === 'ready') {
        explanation = `${muscleCapitalized} ready (${muscleStatus.recoveryPercent}% recovered) • Great for ${workoutType}`;
      }
      
      selectedExercises.push({
        name: exercise.name,
        sets,
        reps,
        restTime,
        exerciseId: exercise.id,
        gifUrl: exercise.gif_url || undefined, // NEW: Include GIF URL
        equipment: exercise.equipment,
        explanation,
        isCompound,
      });
      
      muscleCount[muscle] = muscleExercises + 1;
    }
    
    logger.log(`[ExerciseSuggestions] Fetched ${selectedExercises.length} default exercises from library (equipment-filtered)`);
    return selectedExercises;
    
  } catch (error: unknown) {
    logger.error('Failed to get default exercises from library:', error);
    return [];
  }
}

