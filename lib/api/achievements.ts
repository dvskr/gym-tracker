import { supabase } from '@/lib/supabase';
import { calculateLongestStreak } from '@/lib/utils/streaks';

// ============================================
// Types
// ============================================

export type AchievementType = 'workouts' | 'streak' | 'volume' | 'exercises' | 'prs';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  requirement: number;
  type: AchievementType;
  unlockedAt?: string;
  progress?: number;
}

export interface AchievementProgress {
  totalWorkouts: number;
  longestStreak: number;
  totalVolume: number;
  uniqueExercises: number;
  totalPRs: number;
}

// ============================================
// Built-in Achievements
// ============================================

export const ACHIEVEMENTS: Omit<Achievement, 'unlockedAt' | 'progress'>[] = [
  // Workout Milestones
  {
    id: 'first_workout',
    title: 'First Workout',
    description: 'Complete your first workout',
    icon: '🎯',
    requirement: 1,
    type: 'workouts',
  },
  {
    id: 'getting_started',
    title: 'Getting Started',
    description: 'Complete 5 workouts',
    icon: '⭐',
    requirement: 5,
    type: 'workouts',
  },
  {
    id: 'committed',
    title: 'Committed',
    description: 'Complete 25 workouts',
    icon: '💪',
    requirement: 25,
    type: 'workouts',
  },
  {
    id: 'half_century',
    title: 'Half Century',
    description: 'Complete 50 workouts',
    icon: '🌟',
    requirement: 50,
    type: 'workouts',
  },
  {
    id: 'century_club',
    title: 'Century Club',
    description: 'Complete 100 workouts',
    icon: '💯',
    requirement: 100,
    type: 'workouts',
  },
  {
    id: 'dedicated',
    title: 'Dedicated',
    description: 'Complete 250 workouts',
    icon: '💎',
    requirement: 250,
    type: 'workouts',
  },
  {
    id: 'gym_rat',
    title: 'Gym Rat',
    description: 'Complete 500 workouts',
    icon: '🔥',
    requirement: 500,
    type: 'workouts',
  },

  // Streak Achievements
  {
    id: 'three_day_streak',
    title: 'Three-Peat',
    description: 'Achieve a 3-day streak',
    icon: '3️⃣',
    requirement: 3,
    type: 'streak',
  },
  {
    id: 'week_warrior',
    title: 'Week Warrior',
    description: 'Achieve a 7-day streak',
    icon: '📅',
    requirement: 7,
    type: 'streak',
  },
  {
    id: 'two_week_titan',
    title: 'Two Week Titan',
    description: 'Achieve a 14-day streak',
    icon: '⚡',
    requirement: 14,
    type: 'streak',
  },
  {
    id: 'month_master',
    title: 'Month Master',
    description: 'Achieve a 30-day streak',
    icon: '🗓️',
    requirement: 30,
    type: 'streak',
  },
  {
    id: 'iron_will',
    title: 'Iron Will',
    description: 'Achieve a 60-day streak',
    icon: '🦾',
    requirement: 60,
    type: 'streak',
  },
  {
    id: 'unstoppable',
    title: 'Unstoppable',
    description: 'Achieve a 100-day streak',
    icon: '👑',
    requirement: 100,
    type: 'streak',
  },

  // Volume Achievements
  {
    id: 'first_ton',
    title: 'First Ton',
    description: 'Lift 2,000 lbs total',
    icon: '🏋️',
    requirement: 2000,
    type: 'volume',
  },
  {
    id: 'heavy_lifter',
    title: 'Heavy Lifter',
    description: 'Lift 50,000 lbs total',
    icon: '💪',
    requirement: 50000,
    type: 'volume',
  },
  {
    id: 'volume_veteran',
    title: 'Volume Veteran',
    description: 'Lift 250,000 lbs total',
    icon: '🔱',
    requirement: 250000,
    type: 'volume',
  },
  {
    id: 'half_million_club',
    title: 'Half Million Club',
    description: 'Lift 500,000 lbs total',
    icon: '⚔️',
    requirement: 500000,
    type: 'volume',
  },
  {
    id: 'million_pound_club',
    title: 'Million Pound Club',
    description: 'Lift 1,000,000 lbs total',
    icon: '💎',
    requirement: 1000000,
    type: 'volume',
  },

  // Exercise Variety
  {
    id: 'variety_seeker',
    title: 'Variety Seeker',
    description: 'Try 10 different exercises',
    icon: '📊',
    requirement: 10,
    type: 'exercises',
  },
  {
    id: 'exercise_explorer',
    title: 'Exercise Explorer',
    description: 'Try 25 different exercises',
    icon: '🗺️',
    requirement: 25,
    type: 'exercises',
  },
  {
    id: 'movement_master',
    title: 'Movement Master',
    description: 'Try 50 different exercises',
    icon: '🎓',
    requirement: 50,
    type: 'exercises',
  },
  {
    id: 'exercise_encyclopedia',
    title: 'Exercise Encyclopedia',
    description: 'Try 100 different exercises',
    icon: '📚',
    requirement: 100,
    type: 'exercises',
  },

  // Personal Records
  {
    id: 'first_pr',
    title: 'First PR',
    description: 'Achieve your first personal record',
    icon: '🏆',
    requirement: 1,
    type: 'prs',
  },
  {
    id: 'pr_starter',
    title: 'PR Starter',
    description: 'Achieve 5 personal records',
    icon: '🎖️',
    requirement: 5,
    type: 'prs',
  },
  {
    id: 'pr_hunter',
    title: 'PR Hunter',
    description: 'Achieve 10 personal records',
    icon: '🎯',
    requirement: 10,
    type: 'prs',
  },
  {
    id: 'pr_machine',
    title: 'PR Machine',
    description: 'Achieve 25 personal records',
    icon: '⚙️',
    requirement: 25,
    type: 'prs',
  },
  {
    id: 'record_breaker',
    title: 'Record Breaker',
    description: 'Achieve 50 personal records',
    icon: '💥',
    requirement: 50,
    type: 'prs',
  },
  {
    id: 'pr_legend',
    title: 'PR Legend',
    description: 'Achieve 100 personal records',
    icon: '👑',
    requirement: 100,
    type: 'prs',
  },
];

// ============================================
// Helper Functions
// ============================================

async function getAchievementProgress(userId: string): Promise<AchievementProgress> {
  // Get total workouts and dates
  const { data: workouts } = await supabase
    .from('workouts')
    .select('started_at')
    .eq('user_id', userId)
    .not('ended_at', 'is', null);

  interface WorkoutStartRow {
    started_at: string;
  }

  const workoutDates = (workouts || []).map((w: WorkoutStartRow) => w.started_at);
  const longestStreak = calculateLongestStreak(workoutDates);

  // Get total volume and unique exercises
  const { data: workoutData } = await supabase
    .from('workouts')
    .select(`
      workout_exercises (
        exercise_id,
        workout_sets (
          weight,
          reps,
          is_completed
        )
      )
    `)
    .eq('user_id', userId)
    .not('ended_at', 'is', null);

  interface WorkoutDataRow {
    workout_exercises: Array<{
      exercise_id: string;
      workout_sets: Array<{
        weight: number | null;
        reps: number | null;
        is_completed: boolean;
      }>;
    }>;
  }

  let totalVolume = 0;
  const uniqueExerciseIds = new Set<string>();

  (workoutData || []).forEach((workout: WorkoutDataRow) => {
    (workout.workout_exercises || []).forEach((we) => {
      uniqueExerciseIds.add(we.exercise_id);
      (we.workout_sets || []).forEach((set) => {
        if (set.is_completed && set.weight && set.reps) {
          totalVolume += set.weight * set.reps;
        }
      });
    });
  });

  // Get total PRs
  const { count: totalPRs } = await supabase
    .from('personal_records')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  return {
    totalWorkouts: workouts?.length || 0,
    longestStreak,
    totalVolume,
    uniqueExercises: uniqueExerciseIds.size,
    totalPRs: totalPRs || 0,
  };
}

function getProgressForType(
  type: AchievementType,
  progress: AchievementProgress
): number {
  switch (type) {
    case 'workouts':
      return progress.totalWorkouts;
    case 'streak':
      return progress.longestStreak;
    case 'volume':
      return progress.totalVolume;
    case 'exercises':
      return progress.uniqueExercises;
    case 'prs':
      return progress.totalPRs;
    default:
      return 0;
  }
}

// ============================================
// API Functions
// ============================================

/**
 * Get all achievements with unlock status and progress
 */
export async function getAchievements(userId: string): Promise<Achievement[]> {
  // Get user progress
  const progress = await getAchievementProgress(userId);

  // Get unlocked achievements from database (if we store them)
  // For now, we calculate based on progress
  const achievements: Achievement[] = ACHIEVEMENTS.map((achievement) => {
    const currentProgress = getProgressForType(achievement.type, progress);
    const isUnlocked = currentProgress >= achievement.requirement;

    return {
      ...achievement,
      progress: currentProgress,
      unlockedAt: isUnlocked ? 'earned' : undefined, // We could store actual unlock dates
    };
  });

  return achievements;
}

/**
 * Check for newly unlocked achievements
 * Returns array of newly unlocked achievements
 */
export async function checkAchievements(userId: string): Promise<Achievement[]> {
  const progress = await getAchievementProgress(userId);
  const newlyUnlocked: Achievement[] = [];

  // Check each achievement
  ACHIEVEMENTS.forEach((achievement) => {
    const currentProgress = getProgressForType(achievement.type, progress);
    
    if (currentProgress >= achievement.requirement) {
      // In a full implementation, we'd check against stored achievements
      // to determine if this is actually "new"
      newlyUnlocked.push({
        ...achievement,
        progress: currentProgress,
        unlockedAt: new Date().toISOString(),
      });
    }
  });

  return newlyUnlocked;
}

/**
 * Get recently unlocked achievements
 */
export async function getRecentAchievements(
  userId: string,
  limit: number = 5
): Promise<Achievement[]> {
  const achievements = await getAchievements(userId);
  
  // Return unlocked achievements, sorted by requirement (highest first = most impressive)
  return achievements
    .filter((a) => a.unlockedAt)
    .sort((a, b) => b.requirement - a.requirement)
    .slice(0, limit);
}

/**
 * Get locked achievements sorted by closest to completion
 */
export async function getNextAchievements(
  userId: string,
  limit: number = 3
): Promise<Achievement[]> {
  const achievements = await getAchievements(userId);
  
  return achievements
    .filter((a) => !a.unlockedAt)
    .map((a) => ({
      ...a,
      percentComplete: Math.min(100, Math.round(((a.progress || 0) / a.requirement) * 100)),
    }))
    .sort((a, b) => {
      const aPercent = 'percentComplete' in a ? (a as { percentComplete: number }).percentComplete : 0;
      const bPercent = 'percentComplete' in b ? (b as { percentComplete: number }).percentComplete : 0;
      return bPercent - aPercent;
    })
    .slice(0, limit);
}

/**
 * Get achievement stats summary
 */
export async function getAchievementStats(userId: string): Promise<{
  unlocked: number;
  total: number;
  percentage: number;
}> {
  const achievements = await getAchievements(userId);
  const unlocked = achievements.filter((a) => a.unlockedAt).length;
  
  return {
    unlocked,
    total: achievements.length,
    percentage: Math.round((unlocked / achievements.length) * 100),
  };
}

/**
 * Get achievements by type
 */
export async function getAchievementsByType(
  userId: string,
  type: AchievementType
): Promise<Achievement[]> {
  const achievements = await getAchievements(userId);
  return achievements.filter((a) => a.type === type);
}
