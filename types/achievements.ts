import { Achievement } from '@/constants/achievements';

export interface AchievementProgress {
  // Core stats
  totalWorkouts: number;
  currentStreak: number;
  longestStreak: number;
  totalVolume: number;
  uniqueExercises: number;
  totalPRs: number;
  
  // Time-based
  weekendWorkouts: number;
  earlyWorkouts: number;
  lateWorkouts: number;
  
  // Body focus
  legWorkouts: number;
  pushWorkouts: number;
  pullWorkouts: number;
  fullBodyWorkouts: number;
  
  // Consistency
  perfectWeeks: number;
  consecutiveWeeksWithWorkout: number;
  consecutiveMonthsWithWorkout: number;
  
  // Single workout maxes
  maxWorkoutVolume: number;
  maxWorkoutReps: number;
  maxWorkoutDuration: number;
  minWorkoutDuration: number;
  
  // Metadata
  lastUpdated: string | null;
}

export interface UserAchievement {
  id: string;
  achievement_id: string;
  user_id: string;
  earned_at: string;
  created_at: string;
}

export interface AchievementWithStatus {
  achievement: Achievement;
  unlocked: boolean;
  earnedAt: string | null;
  progress: number;
  progressPercent: number;
  remaining: number;
}

export const DEFAULT_ACHIEVEMENT_STATS: AchievementProgress = {
  totalWorkouts: 0,
  currentStreak: 0,
  longestStreak: 0,
  totalVolume: 0,
  uniqueExercises: 0,
  totalPRs: 0,
  weekendWorkouts: 0,
  earlyWorkouts: 0,
  lateWorkouts: 0,
  legWorkouts: 0,
  pushWorkouts: 0,
  pullWorkouts: 0,
  fullBodyWorkouts: 0,
  perfectWeeks: 0,
  consecutiveWeeksWithWorkout: 0,
  consecutiveMonthsWithWorkout: 0,
  maxWorkoutVolume: 0,
  maxWorkoutReps: 0,
  maxWorkoutDuration: 0,
  minWorkoutDuration: 999999,
  lastUpdated: null,
};

