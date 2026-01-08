import * as Sharing from 'expo-sharing';
import { Achievement, TIER_CONFIG, getAchievementIcon } from '@/constants/achievements';
import { AchievementProgress } from '@/types/achievements';

/**
 * Share achievement via native share sheet
 */
export async function shareAchievement(
  achievement: Achievement,
  earnedAt: string,
  stats: AchievementProgress,
  imageUri?: string
): Promise<void> {
  const tierLabel = TIER_CONFIG[achievement.tier].label.toUpperCase();
  const icon = getAchievementIcon(achievement.iconKey);
  
  const message = `${icon} I just earned "${achievement.name}" in Gym Tracker!

${achievement.description}
${tierLabel} Achievement

My Stats:
- ${stats.totalWorkouts} Workouts
- ${stats.longestStreak}-day Best Streak  
- ${(stats.totalVolume / 1000).toFixed(0)}K lbs Lifted

Download Gym Tracker and start your fitness journey!
https://gymtracker.app`;

  try {
    if (imageUri && await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(imageUri, {
        mimeType: 'image/png',
        dialogTitle: `Share ${achievement.name} Achievement`,
      });
    } else {
      // Fallback to text-only share
      await Sharing.shareAsync(message);
    }
  } catch (error) {
    console.error('Failed to share achievement:', error);
    throw error;
  }
}

