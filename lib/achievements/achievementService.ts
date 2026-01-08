import { supabase } from '@/lib/supabase';
import { 
  ACHIEVEMENTS, 
  Achievement,
  TIER_ORDER,
  getAchievementIcon 
} from '@/constants/achievements';
import { 
  AchievementProgress, 
  AchievementWithStatus,
  DEFAULT_ACHIEVEMENT_STATS 
} from '@/types/achievements';

// ============================================
// PROGRESS MANAGEMENT (Cached)
// ============================================

/**
 * Get cached achievement progress from profile
 * Performance: 1 query instead of 5
 */
export async function getAchievementProgress(
  userId: string
): Promise<AchievementProgress> {
  const { data, error } = await supabase
    .from('profiles')
    .select('achievement_stats')
    .eq('id', userId)
    .single();

  if (error || !data?.achievement_stats) {
    return DEFAULT_ACHIEVEMENT_STATS;
  }
  
  return data.achievement_stats as AchievementProgress;
}

/**
 * Update cached achievement stats
 * Call after workout completion
 */
export async function updateAchievementStats(
  userId: string, 
  updates: Partial<AchievementProgress>
): Promise<void> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('achievement_stats')
    .eq('id', userId)
    .single();

  const currentStats = profile?.achievement_stats || DEFAULT_ACHIEVEMENT_STATS;
  
  const newStats: AchievementProgress = {
    ...currentStats,
    ...updates,
    lastUpdated: new Date().toISOString(),
  };

  await supabase
    .from('profiles')
    .update({ achievement_stats: newStats })
    .eq('id', userId);
}

// ============================================
// ACHIEVEMENT STATUS
// ============================================

/**
 * Get user's unlocked achievement IDs
 */
export async function getUnlockedAchievementIds(
  userId: string
): Promise<Set<string>> {
  const { data } = await supabase
    .from('user_achievements')
    .select('achievement_id')
    .eq('user_id', userId);

  return new Set(data?.map(a => a.achievement_id) || []);
}

/**
 * Get unlocked achievements with earned dates
 */
export async function getUnlockedAchievements(
  userId: string
): Promise<Map<string, string>> {
  const { data } = await supabase
    .from('user_achievements')
    .select('achievement_id, earned_at')
    .eq('user_id', userId);

  return new Map(data?.map(a => [a.achievement_id, a.earned_at]) || []);
}

/**
 * Get all achievements with unlock status and progress
 */
export async function getAchievementsWithStatus(
  userId: string
): Promise<AchievementWithStatus[]> {
  const [progress, unlockedMap] = await Promise.all([
    getAchievementProgress(userId),
    getUnlockedAchievements(userId),
  ]);

  return ACHIEVEMENTS.map(achievement => {
    const isUnlocked = unlockedMap.has(achievement.id);
    const earnedAt = unlockedMap.get(achievement.id) || null;
    const currentValue = getProgressValue(achievement, progress);
    const progressPercent = Math.min(100, (currentValue / achievement.requirement) * 100);
    const remaining = Math.max(0, achievement.requirement - currentValue);

    return {
      achievement,
      unlocked: isUnlocked,
      earnedAt,
      progress: currentValue,
      progressPercent,
      remaining,
    };
  });
}

/**
 * Get progress value for a specific achievement
 */
function getProgressValue(
  achievement: Achievement, 
  progress: AchievementProgress
): number {
  if (!achievement.checkField) return 0;
  return (progress as any)[achievement.checkField] || 0;
}

// ============================================
// NEXT ACHIEVEMENT (For Home Widget)
// ============================================

/**
 * Get the next closest achievement to unlock
 * Used for Recovery Status card widget
 */
export async function getNextAchievement(
  userId: string
): Promise<AchievementWithStatus | null> {
  const achievements = await getAchievementsWithStatus(userId);
  
  // Filter to locked achievements with progress
  const locked = achievements
    .filter(a => !a.unlocked && a.progressPercent < 100)
    .sort((a, b) => {
      // Primary: closest to completion
      if (b.progressPercent !== a.progressPercent) {
        return b.progressPercent - a.progressPercent;
      }
      // Secondary: prefer higher tier (more rewarding to show)
      return TIER_ORDER[b.achievement.tier] - TIER_ORDER[a.achievement.tier];
    });

  return locked[0] || null;
}

// ============================================
// ACHIEVEMENT CHECKING & UNLOCKING
// ============================================

/**
 * Check if user has specific achievement
 */
export async function hasAchievement(
  userId: string, 
  achievementId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('user_achievements')
    .select('id')
    .eq('user_id', userId)
    .eq('achievement_id', achievementId)
    .single();

  return !!data;
}

/**
 * Unlock an achievement for user
 */
export async function unlockAchievement(
  userId: string, 
  achievementId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('user_achievements')
    .insert({
      user_id: userId,
      achievement_id: achievementId,
      earned_at: new Date().toISOString(),
    });

  return !error;
}

/**
 * Check and unlock all eligible achievements
 * Call after workout completion
 */
export async function checkAndUnlockAchievements(
  userId: string,
  progress: AchievementProgress,
  workoutData?: {
    startedAt: Date;
    endedAt: Date;
    volume: number;
    reps: number;
    muscles: string[];
  }
): Promise<Achievement[]> {
  const unlockedIds = await getUnlockedAchievementIds(userId);
  const newlyUnlocked: Achievement[] = [];

  for (const achievement of ACHIEVEMENTS) {
    // Skip already unlocked
    if (unlockedIds.has(achievement.id)) continue;

    // Check if earned
    const isEarned = checkAchievementEarned(achievement, progress, workoutData);
    
    if (isEarned) {
      const success = await unlockAchievement(userId, achievement.id);
      if (success) {
        newlyUnlocked.push(achievement);
      }
    }
  }

  return newlyUnlocked;
}

/**
 * Check if single achievement is earned
 */
function checkAchievementEarned(
  achievement: Achievement,
  progress: AchievementProgress,
  workoutData?: any
): boolean {
  switch (achievement.checkType) {
    case 'total':
    case 'streak':
      const value = (progress as any)[achievement.checkField!] || 0;
      return value >= achievement.requirement;

    case 'single':
      if (!workoutData) return false;
      if (achievement.checkField === 'workoutTotalReps') {
        return workoutData.reps >= achievement.requirement;
      }
      if (achievement.checkField === 'workoutVolume') {
        return workoutData.volume >= achievement.requirement;
      }
      return false;

    case 'custom':
      return checkCustomAchievement(achievement.customCheck!, progress, workoutData);

    default:
      return false;
  }
}

/**
 * Handle custom achievement logic
 */
function checkCustomAchievement(
  customCheck: string,
  progress: AchievementProgress,
  workoutData?: any
): boolean {
  const [checkType, ...params] = customCheck.split(':');

  switch (checkType) {
    case 'workoutBeforeHour':
      if (!workoutData?.startedAt) return false;
      return new Date(workoutData.startedAt).getHours() < parseInt(params[0]);

    case 'workoutAfterHour':
      if (!workoutData?.startedAt) return false;
      return new Date(workoutData.startedAt).getHours() >= parseInt(params[0]);

    case 'workoutBetweenHours':
      if (!workoutData?.startedAt) return false;
      const hour = new Date(workoutData.startedAt).getHours();
      return hour >= parseInt(params[0]) && hour < parseInt(params[1]);

    case 'workoutDurationUnder':
      if (!workoutData?.startedAt || !workoutData?.endedAt) return false;
      const durationMin = (new Date(workoutData.endedAt).getTime() - 
        new Date(workoutData.startedAt).getTime()) / 60000;
      return durationMin < parseInt(params[0]);

    case 'workoutDurationOver':
      if (!workoutData?.startedAt || !workoutData?.endedAt) return false;
      const durationMin2 = (new Date(workoutData.endedAt).getTime() - 
        new Date(workoutData.startedAt).getTime()) / 60000;
      return durationMin2 > parseInt(params[0]);

    case 'workoutOnDate':
      if (!workoutData?.startedAt) return false;
      const date = new Date(workoutData.startedAt);
      const [month, day] = params[0].split('-').map(Number);
      return date.getMonth() + 1 === month && date.getDate() === day;

    case 'workoutAfterBreak':
      // User had no workouts for 7+ days, then worked out
      return progress.currentStreak === 1 && progress.totalWorkouts > 1;

    case 'workoutsInWeek':
      // Check if current week has 4+ workouts
      // This would need additional tracking
      return false; // Implement based on your week tracking

    case 'workoutOnHoliday':
      if (!workoutData?.startedAt) return false;
      return isHoliday(new Date(workoutData.startedAt));

    default:
      return false;
  }
}

/**
 * Check if date is a US holiday
 */
function isHoliday(date: Date): boolean {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  // Major US holidays (simplified)
  const holidays = [
    { month: 1, day: 1 },   // New Year's Day
    { month: 7, day: 4 },   // Independence Day
    { month: 12, day: 25 }, // Christmas
    { month: 12, day: 31 }, // New Year's Eve
  ];
  
  return holidays.some(h => h.month === month && h.day === day);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format earned_at date for display
 */
export function formatEarnedAt(earnedAt: string): string {
  const earned = new Date(earnedAt);
  const now = new Date();
  const diffMs = now.getTime() - earned.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  
  return earned.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Get achievement stats summary
 */
export async function getAchievementStats(userId: string): Promise<{
  total: number;
  unlocked: number;
  locked: number;
  percent: number;
  byTier: Record<string, { total: number; unlocked: number }>;
}> {
  const unlockedIds = await getUnlockedAchievementIds(userId);
  
  const byTier = {
    bronze: { total: 0, unlocked: 0 },
    silver: { total: 0, unlocked: 0 },
    gold: { total: 0, unlocked: 0 },
    platinum: { total: 0, unlocked: 0 },
  };

  for (const achievement of ACHIEVEMENTS) {
    byTier[achievement.tier].total++;
    if (unlockedIds.has(achievement.id)) {
      byTier[achievement.tier].unlocked++;
    }
  }

  const total = ACHIEVEMENTS.length;
  const unlocked = unlockedIds.size;

  return {
    total,
    unlocked,
    locked: total - unlocked,
    percent: Math.round((unlocked / total) * 100),
    byTier,
  };
}

