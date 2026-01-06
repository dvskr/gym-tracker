import { notificationService } from './notificationService';
import { logger } from '@/lib/utils/logger';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { eventEmitter } from '../utils/eventEmitter';
import { useNotificationStore } from '@/stores/notificationStore';
import { successHaptic } from '@/lib/utils/haptics';
import { playAchievementSound } from '../utils/sounds';
import { getSafeAchievementEmoji, getSafePREmoji } from '../utils/emojiValidator';

export interface PRNotification {
  exerciseName: string;
  type: 'weight' | 'reps' | 'volume';
  oldValue?: number;
  newValue: number;
  weight: number;
  reps: number;
  unit?: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'workout' | 'streak' | 'volume' | 'pr' | 'special';
}

const PR_MESSAGES = {
  weight: [
    "New weight PR! {exercise}: {value}{unit} 💪",
    "You're getting stronger! {exercise} PR: {value}{unit}",
    "Beast mode! New {exercise} record: {value}{unit} 🏋️",
    "Crushing it! {exercise}: {value}{unit} personal best!",
  ],
  reps: [
    "Rep record! {exercise}: {value} reps 🔁",
    "More reps than ever! {exercise}: {value}",
    "Rep beast! New {exercise} record: {value} reps 💪",
  ],
  volume: [
    "Volume PR! {exercise}: {value}{unit} total 📊",
    "Massive volume! {exercise}: {value}{unit} 🔥",
  ],
};

class AchievementNotificationService {
  /**
   * Notify about new PR
   * Respects settings: notificationsEnabled, prNotifications
   */
  async notifyPR(pr: PRNotification): Promise<void> {
    try {
      const { notificationsEnabled, prNotifications } = useSettingsStore.getState();
      
      const messages = PR_MESSAGES[pr.type];
      const template = messages[Math.floor(Math.random() * messages.length)];
      
      const message = template
        .replace('{exercise}', pr.exerciseName)
        .replace('{value}', pr.newValue.toString())
        .replace('{unit}', pr.unit || '');

      // Haptic celebration (checks settings internally)
      successHaptic();

      // In-app notification (toast) - ALWAYS show (good UX, non-intrusive)
      this.showPRToast(pr);

      // Get safe emoji for PR type
      const prEmoji = getSafePREmoji(pr.type);

      // Add to notification center - ALWAYS add (user can review later)
      useNotificationStore.getState().addNotification({
        type: 'pr',
        title: `New Personal Record! ${prEmoji}`,
        message: `${pr.exerciseName}: ${pr.newValue}${pr.unit || ''}`,
        data: pr,
      });

      // Push notification (controlled by settings)
      if (notificationsEnabled && prNotifications) {
        await notificationService.sendNotification(
          `${prEmoji} New Personal Record!`,
          message,
          {
            channelId: 'achievements',
            data: { 
              type: 'pr_notification',
              exercise: pr.exerciseName,
              prType: pr.type,
              value: pr.newValue,
            },
          }
        );
        logger.log(`[PRNotification] Push sent: ${pr.exerciseName} ${pr.type}`);
      } else {
        logger.log(`[PRNotification] Push skipped - notifications: ${notificationsEnabled}, prNotifications: ${prNotifications}`);
      }
    } catch (error: unknown) {
      logger.error('Failed to notify PR:', error);
    }
  }

  /**
   * Show in-app PR toast
   */
  private showPRToast(pr: PRNotification): void {
    eventEmitter.emit('pr_achieved', pr);
  }

  /**
   * Notify about achievement unlock
   */
  async notifyAchievement(achievement: Achievement): Promise<void> {
    try {
      const { achievementNotifications, achievementSoundEnabled, hapticEnabled } = useSettingsStore.getState();

      // 1. Haptic feedback (if enabled)
      if (hapticEnabled !== false) {
        try {
          successHaptic();
        } catch (error: unknown) {
          logger.log('[AchievementNotifications] Haptic not available');
        }
      }

      // 2. In-app toast - ALWAYS show (good UX, non-intrusive)
      eventEmitter.emit('achievement_unlocked', achievement);

      // 3. Add to notification center - ALWAYS add (user can review later)
      useNotificationStore.getState().addNotification({
        type: 'achievement',
        title: 'Achievement Unlocked!',
        message: achievement.description,
        data: {
          achievementId: achievement.id,
          achievementTitle: achievement.title,
          achievementIcon: achievement.icon,
          achievementDescription: achievement.description,
        },
      });

      // 4. Play custom sound (controlled by achievementSoundEnabled only)
      if (achievementSoundEnabled) {
        await playAchievementSound();
      }

      // 5. Push notification (controlled by achievementNotifications only)
      if (achievementNotifications) {
        await notificationService.sendNotification(
          `${achievement.icon} Achievement Unlocked!`,
          `${achievement.title}: ${achievement.description}`,
          {
            channelId: 'achievements',
            data: { 
              type: 'achievement',
              achievementId: achievement.id,
            },
          }
        );
        logger.log(`Achievement notification sent: ${achievement.title}`);
      } else {
        logger.log('[AchievementNotifications] Push notification skipped (disabled in settings)');
      }
    } catch (error: unknown) {
      logger.error('Failed to notify achievement:', error);
    }
  }

  /**
   * Check for achievements after workout
   * Respects settings: notificationsEnabled, milestoneAlerts
   */
  async checkWorkoutAchievements(workoutStats: {
    totalWorkouts: number;
    totalSets: number;
    totalVolume: number;
    totalReps: number;
    streak: number;
    userId: string;
  }): Promise<void> {
    const { notificationsEnabled, milestoneAlerts } = useSettingsStore.getState();
    
    // Check if milestone alerts are enabled
    if (!notificationsEnabled || !milestoneAlerts) {
      logger.log('[Achievements] Milestone alerts disabled - skipping check');
      return;
    }
    
    try {
      const achievements: Achievement[] = [];

      // First workout
      if (workoutStats.totalWorkouts === 1) {
        achievements.push({
          id: 'first_workout',
          title: 'First Steps',
          description: 'Completed your first workout',
          icon: getSafeAchievementEmoji('first_workout'),
          category: 'workout',
        });
      }

      // Workout milestones
      const workoutMilestones = [10, 25, 50, 100, 250, 500, 1000];
      if (workoutMilestones.includes(workoutStats.totalWorkouts)) {
        const icon = workoutStats.totalWorkouts >= 500 ? '👑' : 
                    workoutStats.totalWorkouts >= 100 ? '💯' : '💪';
        achievements.push({
          id: `workouts_${workoutStats.totalWorkouts}`,
          title: `${workoutStats.totalWorkouts} Workouts!`,
          description: `Completed ${workoutStats.totalWorkouts} workouts`,
          icon,
          category: 'workout',
        });
      }

      // Streak milestones (also handled by engagement service, but can celebrate here too)
      const streakMilestones = [7, 30, 100, 365];
      if (streakMilestones.includes(workoutStats.streak)) {
        const icon = workoutStats.streak >= 365 ? '🎖️' : 
                    workoutStats.streak >= 100 ? '👑' : 
                    workoutStats.streak >= 30 ? '🗓️' : '📅';
        achievements.push({
          id: `streak_${workoutStats.streak}`,
          title: `${workoutStats.streak}-Day Warrior!`,
          description: `Worked out ${workoutStats.streak} days in a row`,
          icon,
          category: 'streak',
        });
      }

      // Set milestones
      const setMilestones = [100, 500, 1000, 5000, 10000];
      if (setMilestones.includes(workoutStats.totalSets)) {
        const icon = workoutStats.totalSets >= 1000 ? '💎' : '💪';
        achievements.push({
          id: `sets_${workoutStats.totalSets}`,
          title: `${workoutStats.totalSets.toLocaleString()} Sets!`,
          description: `Completed ${workoutStats.totalSets.toLocaleString()} total sets`,
          icon,
          category: 'volume',
        });
      }

      // Rep milestones
      const repMilestones = [1000, 5000, 10000, 50000, 100000];
      if (repMilestones.includes(workoutStats.totalReps)) {
        const icon = workoutStats.totalReps >= 10000 ? '🔁' : '💪';
        achievements.push({
          id: `reps_${workoutStats.totalReps}`,
          title: `${workoutStats.totalReps.toLocaleString()} Reps!`,
          description: `Completed ${workoutStats.totalReps.toLocaleString()} total reps`,
          icon,
          category: 'volume',
        });
      }

      // Volume milestones (in lbs)
      const volumeMilestones = [
        { value: 10000, title: '10K Club', icon: '🎊' },
        { value: 50000, title: '50K Club', icon: '🚀' },
        { value: 100000, title: '100K Club', icon: '💎' },
        { value: 500000, title: 'Half Million Club', icon: '🌟' },
        { value: 1000000, title: 'Million Pound Club', icon: '🏆' },
      ];

      for (const milestone of volumeMilestones) {
        if (workoutStats.totalVolume >= milestone.value && 
            workoutStats.totalVolume - milestone.value < 10000) { // Just crossed threshold
          achievements.push({
            id: `volume_${milestone.value}`,
            title: milestone.title,
            description: `Lifted ${milestone.value.toLocaleString()}+ lbs total`,
            icon: milestone.icon,
            category: 'volume',
          });
        }
      }

      // Notify each achievement
      for (const achievement of achievements) {
        const alreadyEarned = await this.hasAchievement(workoutStats.userId, achievement.id);
        if (!alreadyEarned) {
          await this.saveAchievement(workoutStats.userId, achievement.id);
          await this.notifyAchievement(achievement);
        }
      }
    } catch (error: unknown) {
logger.error('Failed to check workout achievements:', error);
    }
  }

  /**
   * Check if user has earned an achievement
   */
  private async hasAchievement(userId: string, achievementId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('id')
        .eq('user_id', userId)
        .eq('achievement_id', achievementId)
        .maybeSingle();

      if (error) {
logger.error('Error checking achievement:', error);
        return false;
      }

      return !!data;
    } catch (error: unknown) {
logger.error('Error checking achievement:', error);
      return false;
    }
  }

  /**
   * Save achievement to database
   */
  private async saveAchievement(userId: string, achievementId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_achievements')
        .insert({
          user_id: userId,
          achievement_id: achievementId,
          earned_at: new Date().toISOString(),
        });

      if (error) {
logger.error('Error saving achievement:', error);
      }
    } catch (error: unknown) {
logger.error('Error saving achievement:', error);
    }
  }

  /**
   * Get all achievements for a user
   */
  async getUserAchievements(userId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('achievement_id')
        .eq('user_id', userId);

      if (error) {
logger.error('Error getting achievements:', error);
        return [];
      }

      return data.map(a => a.achievement_id);
    } catch (error: unknown) {
logger.error('Error getting achievements:', error);
      return [];
    }
  }

  /**
   * Get achievement count for a user
   */
  async getAchievementCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('user_achievements')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) {
logger.error('Error counting achievements:', error);
        return 0;
      }

      return count || 0;
    } catch (error: unknown) {
logger.error('Error counting achievements:', error);
      return 0;
    }
  }
}

export const achievementNotificationService = new AchievementNotificationService();

