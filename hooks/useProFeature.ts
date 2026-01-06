import { useProStore } from '@/stores/proStore';
import { useCallback } from 'react';

// Feature limits
const LIMITS = {
  FREE: {
    AI_COACH_DAILY: 5,
    TEMPLATES: 10,
    ACHIEVEMENTS: 10,
  },
  PRO: {
    AI_COACH_DAILY: 100,
    TEMPLATES: Infinity,
    ACHIEVEMENTS: 28,
  },
};

export function useProFeature() {
  const { isPro, isLoading } = useProStore();

  // Get current limits based on subscription
  const limits = isPro ? LIMITS.PRO : LIMITS.FREE;

  // AI Coach
  const canUseAICoach = useCallback(
    (usedToday: number) => usedToday < limits.AI_COACH_DAILY,
    [limits.AI_COACH_DAILY]
  );

  const getAILimit = useCallback(
    () => limits.AI_COACH_DAILY,
    [limits.AI_COACH_DAILY]
  );

  const getAIRemaining = useCallback(
    (usedToday: number) => Math.max(0, limits.AI_COACH_DAILY - usedToday),
    [limits.AI_COACH_DAILY]
  );

  // Templates
  const canCreateTemplate = useCallback(
    (currentCount: number) => currentCount < limits.TEMPLATES,
    [limits.TEMPLATES]
  );

  const getTemplateLimit = useCallback(
    () => limits.TEMPLATES,
    [limits.TEMPLATES]
  );

  // Achievements
  const canViewAchievement = useCallback(
    (achievementIndex: number) => achievementIndex < limits.ACHIEVEMENTS,
    [limits.ACHIEVEMENTS]
  );

  const getAchievementLimit = useCallback(
    () => limits.ACHIEVEMENTS,
    [limits.ACHIEVEMENTS]
  );

  // Health Sync (Pro only)
  const canUseHealthSync = useCallback(() => isPro, [isPro]);

  // Data Export (Pro only)
  const canExportData = useCallback(() => isPro, [isPro]);

  return {
    isPro,
    isLoading,
    limits,
    // AI Coach
    canUseAICoach,
    getAILimit,
    getAIRemaining,
    // Templates
    canCreateTemplate,
    getTemplateLimit,
    // Achievements
    canViewAchievement,
    getAchievementLimit,
    // Pro-only features
    canUseHealthSync,
    canExportData,
  };
}

