import { supabase } from '@/lib/supabase';
import { startOfWeek, endOfWeek, subWeeks, subDays, format, differenceInDays, parseISO } from 'date-fns';

// ============================================
// Types
// ============================================

export interface WeeklyStats {
  workoutsCompleted: number;
  totalMinutes: number;
  totalVolume: number;
  volumeChange: number; // percentage vs last week
}

export interface AllTimeStats {
  totalWorkouts: number;
  totalVolume: number;
  currentStreak: number;
  longestStreak: number;
  avgDuration: number; // minutes
  mostTrainedMuscle: string;
}

export interface RecentPR {
  id: string;
  exerciseId: string;
  exerciseName: string;
  recordType: string;
  value: number;
  achievedAt: string;
  weight?: number | null;
  reps?: number | null;
}

export interface MuscleDistribution {
  muscle: string;
  volume: number;
  percentage: number;
  color: string;
}

// ============================================
// Muscle Colors
// ============================================

const MUSCLE_COLORS: Record<string, string> = {
  chest: '#ef4444',
  back: '#3b82f6',
  shoulders: '#f59e0b',
  biceps: '#22c55e',
  triceps: '#a855f7',
  legs: '#ec4899',
  quadriceps: '#ec4899',
  hamstrings: '#f472b6',
  glutes: '#fb7185',
  calves: '#fda4af',
  core: '#14b8a6',
  abs: '#14b8a6',
  forearms: '#84cc16',
  traps: '#6366f1',
  lats: '#0ea5e9',
  default: '#64748b',
};

function getMuscleColor(muscle: string): string {
  const normalized = muscle.toLowerCase();
  return MUSCLE_COLORS[normalized] || MUSCLE_COLORS.default;
}

// ============================================
// Helper Functions
// ============================================

function calculateStreak(workoutDates: string[]): { current: number; longest: number } {
  if (workoutDates.length === 0) return { current: 0, longest: 0 };

  // Sort dates descending (most recent first)
  const sortedDates = [...workoutDates]
    .map(d => format(parseISO(d), 'yyyy-MM-dd'))
    .filter((d, i, arr) => arr.indexOf(d) === i) // Unique dates
    .sort((a, b) => b.localeCompare(a));

  if (sortedDates.length === 0) return { current: 0, longest: 0 };

  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

  // Calculate current streak
  let currentStreak = 0;
  const mostRecent = sortedDates[0];
  
  // Only count current streak if most recent workout is today or yesterday
  if (mostRecent === today || mostRecent === yesterday) {
    currentStreak = 1;
    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = parseISO(sortedDates[i - 1]);
      const currDate = parseISO(sortedDates[i]);
      const diff = differenceInDays(prevDate, currDate);
      
      if (diff === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  // Calculate longest streak
  let longestStreak = 1;
  let tempStreak = 1;
  
  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = parseISO(sortedDates[i - 1]);
    const currDate = parseISO(sortedDates[i]);
    const diff = differenceInDays(prevDate, currDate);
    
    if (diff === 1) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 1;
    }
  }

  return { current: currentStreak, longest: Math.max(longestStreak, currentStreak) };
}

function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

// ============================================
// API Functions
// ============================================

/**
 * Get weekly statistics with comparison to previous week
 */
export async function getWeeklyStats(userId: string): Promise<WeeklyStats> {
  const now = new Date();
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
  const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
  const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

  // This week's workouts
  const { data: thisWeekWorkouts } = await supabase
    .from('workouts')
    .select(`
      id,
      started_at,
      ended_at,
      workout_exercises (
        workout_sets (
          weight,
          reps,
          is_completed
        )
      )
    `)
    .eq('user_id', userId)
    .gte('started_at', thisWeekStart.toISOString())
    .lte('started_at', thisWeekEnd.toISOString())
    .not('ended_at', 'is', null);

  // Last week's workouts
  const { data: lastWeekWorkouts } = await supabase
    .from('workouts')
    .select(`
      id,
      started_at,
      ended_at,
      workout_exercises (
        workout_sets (
          weight,
          reps,
          is_completed
        )
      )
    `)
    .eq('user_id', userId)
    .gte('started_at', lastWeekStart.toISOString())
    .lte('started_at', lastWeekEnd.toISOString())
    .not('ended_at', 'is', null);

  interface WorkoutRow {
    id: string;
    started_at: string;
    ended_at: string | null;
    workout_exercises: Array<{
      workout_sets: Array<{
        weight: number | null;
        reps: number | null;
        is_completed: boolean;
      }>;
    }>;
  }

  // Calculate this week stats
  let thisWeekVolume = 0;
  let thisWeekMinutes = 0;
  let thisWeekSets = 0;

  (thisWeekWorkouts || []).forEach((workout: WorkoutRow) => {
    if (workout.started_at && workout.ended_at) {
      const start = new Date(workout.started_at);
      const end = new Date(workout.ended_at);
      thisWeekMinutes += Math.round((end.getTime() - start.getTime()) / 60000);
    }

    (workout.workout_exercises || []).forEach((we) => {
      (we.workout_sets || []).forEach((set) => {
        if (set.is_completed && set.weight && set.reps) {
          thisWeekVolume += set.weight * set.reps;
          thisWeekSets++;
        }
      });
    });
  });

  // Calculate last week stats
  let lastWeekVolume = 0;
  let lastWeekMinutes = 0;

  (lastWeekWorkouts || []).forEach((workout: WorkoutRow) => {
    if (workout.started_at && workout.ended_at) {
      const start = new Date(workout.started_at);
      const end = new Date(workout.ended_at);
      lastWeekMinutes += Math.round((end.getTime() - start.getTime()) / 60000);
    }

    (workout.workout_exercises || []).forEach((we) => {
      (we.workout_sets || []).forEach((set) => {
        if (set.is_completed && set.weight && set.reps) {
          lastWeekVolume += set.weight * set.reps;
        }
      });
    });
  });

  return {
    workoutsCompleted: thisWeekWorkouts?.length || 0,
    totalMinutes: thisWeekMinutes,
    totalVolume: thisWeekVolume,
    volumeChange: calculatePercentageChange(thisWeekVolume, lastWeekVolume),
  };
}

/**
 * Get all-time statistics
 */
export async function getAllTimeStats(userId: string): Promise<AllTimeStats> {
  // Get all completed workouts
  const { data: workouts } = await supabase
    .from('workouts')
    .select(`
      id,
      started_at,
      ended_at,
      workout_exercises (
        exercise_id,
        exercises (
          primary_muscles
        ),
        workout_sets (
          weight,
          reps,
          is_completed
        )
      )
    `)
    .eq('user_id', userId)
    .not('ended_at', 'is', null)
    .order('started_at', { ascending: true });

  if (!workouts || workouts.length === 0) {
    return {
      totalWorkouts: 0,
      totalVolume: 0,
      currentStreak: 0,
      longestStreak: 0,
      avgDuration: 0,
      mostTrainedMuscle: '',
    };
  }

  interface AllTimeWorkoutRow {
    id: string;
    started_at: string;
    ended_at: string | null;
    workout_exercises: Array<{
      exercise_id: string;
      exercises: {
        primary_muscles: string[];
      } | null;
      workout_sets: Array<{
        weight: number | null;
        reps: number | null;
        is_completed: boolean;
      }>;
    }>;
  }

  let totalVolume = 0;
  let totalSets = 0;
  let totalMinutes = 0;
  const muscleSetCount: Record<string, number> = {};
  const workoutDates: string[] = [];

  workouts.forEach((workout: AllTimeWorkoutRow) => {
    // Track workout date
    if (workout.started_at) {
      workoutDates.push(workout.started_at);
    }

    // Calculate duration
    if (workout.started_at && workout.ended_at) {
      const start = new Date(workout.started_at);
      const end = new Date(workout.ended_at);
      totalMinutes += Math.round((end.getTime() - start.getTime()) / 60000);
    }

    // Process exercises and sets
    (workout.workout_exercises || []).forEach((we) => {
      const muscles = we.exercises?.primary_muscles || [];

      (we.workout_sets || []).forEach((set) => {
        if (set.is_completed) {
          totalSets++;
          if (set.weight && set.reps) {
            totalVolume += set.weight * set.reps;
          }

          // Count sets per muscle
          muscles.forEach((muscle: string) => {
            const normalized = muscle.toLowerCase();
            muscleSetCount[normalized] = (muscleSetCount[normalized] || 0) + 1;
          });
        }
      });
    });
  });

  // Find most trained muscle
  let mostTrainedMuscle: string | null = null;
  let mostTrainedMuscleCount = 0;

  Object.entries(muscleSetCount).forEach(([muscle, count]) => {
    if (count > mostTrainedMuscleCount) {
      mostTrainedMuscle = muscle;
      mostTrainedMuscleCount = count;
    }
  });

  // Calculate streaks
  const streaks = calculateStreak(workoutDates);

  return {
    totalWorkouts: workouts.length,
    totalVolume,
    currentStreak: streaks.current,
    longestStreak: streaks.longest,
    avgDuration: workouts.length > 0 ? Math.round(totalMinutes / workouts.length) : 0,
    mostTrainedMuscle: mostTrainedMuscle || '',
  };
}

/**
 * Get recent personal records
 */
export async function getRecentPRs(userId: string, limit: number = 5): Promise<RecentPR[]> {
  const { data, error } = await supabase
    .from('personal_records')
    .select(`
      id,
      exercise_id,
      record_type,
      value,
      weight,
      reps,
      achieved_at,
      exercises (
        name
      )
    `)
    .eq('user_id', userId)
    .order('achieved_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  interface PRRow {
    id: string;
    exercise_id: string;
    record_type: string;
    value: number;
    weight: number | null;
    reps: number | null;
    achieved_at: string;
    exercises: {
      name: string;
    } | null;
  }

  return data.map((pr: PRRow) => ({
    id: pr.id,
    exerciseId: pr.exercise_id,
    exerciseName: pr.exercises?.name || 'Unknown Exercise',
    recordType: pr.record_type,
    value: pr.value,
    achievedAt: pr.achieved_at,
    weight: pr.weight,
    reps: pr.reps,
  }));
}

/**
 * Get muscle group distribution for the last N days
 */
export async function getMuscleDistribution(
  userId: string,
  days: number = 30
): Promise<MuscleDistribution[]> {
  const startDate = subDays(new Date(), days);

  const { data: workouts } = await supabase
    .from('workouts')
    .select(`
      workout_exercises (
        exercises (
          primary_muscles
        ),
        workout_sets (
          weight,
          reps,
          is_completed
        )
      )
    `)
    .eq('user_id', userId)
    .gte('started_at', startDate.toISOString())
    .not('ended_at', 'is', null);

  interface MuscleWorkoutRow {
    workout_exercises: Array<{
      exercises: {
        primary_muscles: string[];
      } | null;
      workout_sets: Array<{
        weight: number | null;
        reps: number | null;
        is_completed: boolean;
      }>;
    }>;
  }

  const muscleData: Record<string, number> = {};
  let totalVolume = 0;

  (workouts || []).forEach((workout: MuscleWorkoutRow) => {
    (workout.workout_exercises || []).forEach((we) => {
      const muscles = we.exercises?.primary_muscles || [];

      (we.workout_sets || []).forEach((set) => {
        if (set.is_completed && set.weight && set.reps) {
          const setVolume = set.weight * set.reps;
          totalVolume += setVolume;

          muscles.forEach((muscle: string) => {
            const normalized = muscle.toLowerCase();
            muscleData[normalized] = (muscleData[normalized] || 0) + setVolume;
          });
        }
      });
    });
  });

  // Convert to array and calculate percentages
  const distribution: MuscleDistribution[] = Object.entries(muscleData)
    .map(([muscle, volume]) => ({
      muscle: muscle.charAt(0).toUpperCase() + muscle.slice(1),
      volume,
      percentage: totalVolume > 0 ? Math.round((volume / totalVolume) * 100) : 0,
      color: getMuscleColor(muscle),
    }))
    .sort((a, b) => b.volume - a.volume);

  return distribution;
}

/**
 * Get workout frequency by day of week
 */
export async function getWorkoutFrequencyByDay(
  userId: string,
  days: number = 90
): Promise<Record<string, number>> {
  const startDate = subDays(new Date(), days);

  const { data: workouts } = await supabase
    .from('workouts')
    .select('started_at')
    .eq('user_id', userId)
    .gte('started_at', startDate.toISOString())
    .not('ended_at', 'is', null);

  interface FrequencyWorkoutRow {
    started_at: string;
  }

  const dayCount: Record<string, number> = {
    Sunday: 0,
    Monday: 0,
    Tuesday: 0,
    Wednesday: 0,
    Thursday: 0,
    Friday: 0,
    Saturday: 0,
  };

  (workouts || []).forEach((workout: FrequencyWorkoutRow) => {
    if (workout.started_at) {
      const day = format(parseISO(workout.started_at), 'EEEE');
      dayCount[day]++;
    }
  });

  return dayCount;
}

/**
 * Format PR type for display
 */
export function formatPRType(recordType: string): string {
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
export function formatPRValue(recordType: string, value: number): string {
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

