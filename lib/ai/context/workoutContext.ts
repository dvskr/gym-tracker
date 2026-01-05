/**
 * Workout history context building for AI prompts
 */

import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/utils/logger';
import type {
  WorkoutWithExercises,
  PersonalRecordWithExercise,
  DbProfile,
  DbDailyCheckin,
  DbUserInjury,
  MainLiftData,
  LiftSession,
} from '../types';

// ==========================================
// Data Fetching Functions
// ==========================================

/**
 * Get recent workouts with exercises
 */
export async function getRecentWorkouts(userId: string, limit = 14): Promise<WorkoutWithExercises[]> {
  try {
    const { data, error } = await supabase
      .from('workouts')
      .select(`
        *,
        workout_exercises(
          *,
          exercises(*),
          workout_sets(*)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return (data as unknown as WorkoutWithExercises[]) || [];
  } catch (error) {
    logger.error('Error fetching recent workouts:', error);
    return [];
  }
}

/**
 * Get personal records with exercise names
 */
export async function getPersonalRecords(userId: string, limit = 10): Promise<PersonalRecordWithExercise[]> {
  try {
    const { data, error } = await supabase
      .from('personal_records')
      .select('*, exercises(name)')
      .eq('user_id', userId)
      .order('achieved_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return (data as unknown as PersonalRecordWithExercise[]) || [];
  } catch (error) {
    logger.error('Error fetching personal records:', error);
    return [];
  }
}

/**
 * Get user profile
 */
export async function getUserProfile(userId: string): Promise<DbProfile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    logger.error('Error fetching user profile:', error);
    return null;
  }
}

/**
 * Get active injuries
 */
export async function getActiveInjuries(userId: string): Promise<DbUserInjury[]> {
  try {
    const { data, error } = await supabase
      .from('user_injuries')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error('Error fetching active injuries:', error);
    return [];
  }
}

/**
 * Get today's check-in
 */
export async function getTodayCheckin(userId: string): Promise<DbDailyCheckin | null> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('daily_checkins')
      .select('*')
      .eq('user_id', userId)
      .eq('checkin_date', today)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  } catch (error) {
    logger.error('Error fetching today checkin:', error);
    return null;
  }
}

// ==========================================
// Context Building Functions
// ==========================================

/**
 * Build workout history context string
 */
export function buildWorkoutHistoryContext(workouts: WorkoutWithExercises[]): string {
  if (!workouts || workouts.length === 0) {
    return 'No recent workout history available.\n';
  }

  let context = '\n=== RECENT WORKOUT HISTORY ===\n';
  
  const recentWorkouts = workouts.slice(0, 7);
  
  for (const workout of recentWorkouts) {
    const date = new Date(workout.created_at).toLocaleDateString();
    const name = workout.name || 'Workout';
    const duration = workout.duration_seconds 
      ? `${Math.round(workout.duration_seconds / 60)}min` 
      : '';
    const volume = workout.total_volume 
      ? `${workout.total_volume.toLocaleString()} lbs` 
      : '';
    
    context += `\n${date}: ${name}`;
    if (duration) context += ` (${duration})`;
    if (volume) context += ` - Volume: ${volume}`;
    context += '\n';
    
    // Add exercises
    if (workout.workout_exercises && workout.workout_exercises.length > 0) {
      for (const we of workout.workout_exercises.slice(0, 5)) {
        const exerciseName = we.exercises?.name || 'Unknown';
        const sets = we.workout_sets || [];
        const completedSets = sets.filter(s => s.is_completed);
        
        if (completedSets.length > 0) {
          // Show best set
          const bestSet = completedSets.reduce((best, current) => {
            const currentVolume = (current.weight || 0) * (current.reps || 0);
            const bestVolume = (best.weight || 0) * (best.reps || 0);
            return currentVolume > bestVolume ? current : best;
          }, completedSets[0]);
          
          context += `  - ${exerciseName}: ${completedSets.length} sets, best: ${bestSet.weight}x${bestSet.reps}\n`;
        }
      }
    }
  }

  return context;
}

/**
 * Build personal records context string
 */
export function buildPRContext(prs: PersonalRecordWithExercise[]): string {
  if (!prs || prs.length === 0) {
    return '';
  }

  let context = '\n=== PERSONAL RECORDS ===\n';
  
  for (const pr of prs.slice(0, 5)) {
    const exerciseName = pr.exercises?.name || 'Unknown';
    const date = new Date(pr.achieved_at).toLocaleDateString();
    
    context += `- ${exerciseName}: ${pr.weight}lbs x ${pr.reps} (${pr.record_type}) - ${date}\n`;
  }

  return context;
}

/**
 * Get detailed history for main compound lifts
 */
export async function getMainLiftHistory(userId: string): Promise<MainLiftData[]> {
  try {
    const mainLifts = [
      'Bench Press', 'Barbell Bench Press',
      'Squat', 'Barbell Squat', 'Back Squat',
      'Deadlift', 'Barbell Deadlift', 'Conventional Deadlift',
      'Overhead Press', 'Barbell Overhead Press', 'Military Press',
      'Barbell Row', 'Bent Over Row', 'Pendlay Row'
    ];
    
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    
    const { data: workouts } = await supabase
      .from('workouts')
      .select(`
        created_at,
        workout_exercises(
          exercises(name),
          workout_sets(weight, reps, is_completed)
        )
      `)
      .eq('user_id', userId)
      .gte('created_at', sixtyDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    if (!workouts || workouts.length === 0) {
      return [];
    }

    // Group by exercise and analyze
    const liftData: Map<string, MainLiftData> = new Map();

    for (const workout of workouts) {
      const workoutDate = new Date(workout.created_at).toISOString().split('T')[0];
      const exercises = workout.workout_exercises as Array<{
        exercises: { name: string } | null;
        workout_sets: Array<{ weight: number | null; reps: number | null; is_completed: boolean }>;
      }>;
      
      for (const we of exercises || []) {
        const exerciseName = we.exercises?.name;
        if (!exerciseName || !mainLifts.includes(exerciseName)) continue;

        // Normalize name
        const normalizedName = normalizeExerciseName(exerciseName);
        
        if (!liftData.has(normalizedName)) {
          liftData.set(normalizedName, {
            name: normalizedName,
            sessions: [],
            trend: 'maintaining',
          });
        }

        const completedSets = we.workout_sets?.filter(s => s.is_completed && s.weight && s.reps) || [];
        if (completedSets.length === 0) continue;

        // Find best set (highest volume)
        const bestSet = completedSets.reduce((best, current) => {
          const currentVol = (current.weight || 0) * (current.reps || 0);
          const bestVol = (best.weight || 0) * (best.reps || 0);
          return currentVol > bestVol ? current : best;
        }, completedSets[0]);

        const entry = liftData.get(normalizedName);
        if (entry) {
          entry.sessions.push({
            date: workoutDate,
            weight: bestSet.weight || 0,
            reps: bestSet.reps || 0,
            volume: (bestSet.weight || 0) * (bestSet.reps || 0),
          });
        }
      }
    }

    // Analyze trends
    for (const [, lift] of liftData) {
      lift.trend = analyzeTrend(lift.sessions);
    }

    return Array.from(liftData.values());
  } catch (error) {
    logger.error('Error getting main lift history:', error);
    return [];
  }
}

/**
 * Normalize exercise name to standard form
 */
function normalizeExerciseName(name: string): string {
  const nameMap: Record<string, string> = {
    'Barbell Bench Press': 'Bench Press',
    'Back Squat': 'Squat',
    'Barbell Squat': 'Squat',
    'Barbell Deadlift': 'Deadlift',
    'Conventional Deadlift': 'Deadlift',
    'Barbell Overhead Press': 'Overhead Press',
    'Military Press': 'Overhead Press',
    'Bent Over Row': 'Barbell Row',
    'Pendlay Row': 'Barbell Row',
  };
  
  return nameMap[name] || name;
}

/**
 * Analyze training trend from sessions
 */
function analyzeTrend(sessions: LiftSession[]): 'improving' | 'declining' | 'plateau' | 'maintaining' {
  if (sessions.length < 3) return 'maintaining';

  const recentSessions = sessions.slice(0, 5);
  const volumes = recentSessions.map(s => s.volume);
  
  // Check if consistently improving
  let improving = 0;
  let declining = 0;
  
  for (let i = 0; i < volumes.length - 1; i++) {
    if (volumes[i] > volumes[i + 1] * 1.02) improving++;
    if (volumes[i] < volumes[i + 1] * 0.98) declining++;
  }

  if (improving >= 3) return 'improving';
  if (declining >= 3) return 'declining';
  
  // Check for plateau (similar weights for weeks)
  const maxVolume = Math.max(...volumes);
  const minVolume = Math.min(...volumes);
  
  if ((maxVolume - minVolume) / maxVolume < 0.05) {
    return 'plateau';
  }

  return 'maintaining';
}

