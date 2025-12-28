import { notificationService } from './notificationService';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { eventEmitter } from '../utils/eventEmitter';
import { useNotificationStore } from '@/stores/notificationStore';

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
    "New weight PR! {exercise}: {value}{unit} 🏆",
    "You're getting stronger! {exercise} PR: {value}{unit}",
    "Beast mode! New {exercise} record: {value}{unit} 💪",
    "Crushing it! {exercise}: {value}{unit} personal best!",
  ],
  reps: [
    "Rep record! {exercise}: {value} reps 🎯",
    "More reps than ever! {exercise}: {value}",
    "Rep beast! New {exercise} record: {value} reps 💯",
  ],
  volume: [
    "Volume PR! {exercise}: {value}{unit} total 📈",
    "Massive volume! {exercise}: {value}{unit} 🚀",
  ],
};

class AchievementNotificationService {
  /**
   * Notify about new PR
   */
  async notifyPR(pr: PRNotification): Promise<void> {
    try {
      const messages = PR_MESSAGES[pr.type];
      const template = messages[Math.floor(Math.random() * messages.length)];
      
      const message = template
        .replace('{exercise}', pr.exerciseName)
        .replace('{value}', pr.newValue.toString())
        .replace('{unit}', pr.unit || '');

      // Haptic celebration
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // In-app notification (toast)
      this.showPRToast(pr);

      // Add to notification center
      useNotificationStore.getState().addNotification({
        type: 'pr',
        title: 'New Personal Record! 🏆',
        message: `${pr.exerciseName}: ${pr.newValue}${pr.unit || ''}`,
        data: pr,
      });

      // Push notification (only if app is backgrounded)
      await notificationService.sendNotification(
        '🏆 New Personal Record!',
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

      console.log(`🏆 PR notification sent: ${pr.exerciseName} ${pr.type}`);
    } catch (error) {
      console.error('Failed to notify PR:', error);
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
      // Haptic celebration
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // In-app celebration
      eventEmitter.emit('achievement_unlocked', achievement);

      // Add to notification center
      useNotificationStore.getState().addNotification({
        type: 'achievement',
        title: `${achievement.icon} Achievement Unlocked!`,
        message: `${achievement.title}: ${achievement.description}`,
        data: achievement,
      });

      // Push notification
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

      console.log(`🎖️ Achievement unlocked: ${achievement.title}`);
    } catch (error) {
      console.error('Failed to notify achievement:', error);
    }
  }

  /**
   * Check for achievements after workout
   */
  async checkWorkoutAchievements(workoutStats: {
    totalWorkouts: number;
    totalSets: number;
    totalVolume: number;
    totalReps: number;
    streak: number;
    userId: string;
  }): Promise<void> {
    try {
      const achievements: Achievement[] = [];

      // First workout
      if (workoutStats.totalWorkouts === 1) {
        achievements.push({
          id: 'first_workout',
          title: 'First Steps',
          description: 'Completed your first workout',
          icon: '🎯',
          category: 'workout',
        });
      }

      // Workout milestones
      const workoutMilestones = [10, 25, 50, 100, 250, 500, 1000];
      if (workoutMilestones.includes(workoutStats.totalWorkouts)) {
        achievements.push({
          id: `workouts_${workoutStats.totalWorkouts}`,
          title: `${workoutStats.totalWorkouts} Workouts!`,
          description: `Completed ${workoutStats.totalWorkouts} workouts`,
          icon: workoutStats.totalWorkouts >= 500 ? '🏆' : '💪',
          category: 'workout',
        });
      }

      // Streak milestones (also handled by engagement service, but can celebrate here too)
      const streakMilestones = [7, 30, 100, 365];
      if (streakMilestones.includes(workoutStats.streak)) {
        achievements.push({
          id: `streak_${workoutStats.streak}`,
          title: `${workoutStats.streak}-Day Warrior!`,
          description: `Worked out ${workoutStats.streak} days in a row`,
          icon: '🔥',
          category: 'streak',
        });
      }

      // Set milestones
      const setMilestones = [100, 500, 1000, 5000, 10000];
      if (setMilestones.includes(workoutStats.totalSets)) {
        achievements.push({
          id: `sets_${workoutStats.totalSets}`,
          title: `${workoutStats.totalSets.toLocaleString()} Sets!`,
          description: `Completed ${workoutStats.totalSets.toLocaleString()} total sets`,
          icon: '📊',
          category: 'volume',
        });
      }

      // Rep milestones
      const repMilestones = [1000, 5000, 10000, 50000, 100000];
      if (repMilestones.includes(workoutStats.totalReps)) {
        achievements.push({
          id: `reps_${workoutStats.totalReps}`,
          title: `${workoutStats.totalReps.toLocaleString()} Reps!`,
          description: `Completed ${workoutStats.totalReps.toLocaleString()} total reps`,
          icon: '🔢',
          category: 'volume',
        });
      }

      // Volume milestones (in lbs)
      const volumeMilestones = [
        { value: 10000, title: '10K Club' },
        { value: 50000, title: '50K Club' },
        { value: 100000, title: '100K Club' },
        { value: 500000, title: 'Half Million Club' },
        { value: 1000000, title: 'Million Pound Club' },
      ];

      for (const milestone of volumeMilestones) {
        if (workoutStats.totalVolume >= milestone.value && 
            workoutStats.totalVolume - milestone.value < 10000) { // Just crossed threshold
          achievements.push({
            id: `volume_${milestone.value}`,
            title: milestone.title,
            description: `Lifted ${milestone.value.toLocaleString()}+ lbs total`,
            icon: milestone.value >= 1000000 ? '🏋️' : '💯',
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
    } catch (error) {
      console.error('Failed to check workout achievements:', error);
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
        console.error('Error checking achievement:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking achievement:', error);
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
        console.error('Error saving achievement:', error);
      }
    } catch (error) {
      console.error('Error saving achievement:', error);
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
        console.error('Error getting achievements:', error);
        return [];
      }

      return data.map(a => a.achievement_id);
    } catch (error) {
      console.error('Error getting achievements:', error);
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
        console.error('Error counting achievements:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error counting achievements:', error);
      return 0;
    }
  }
}

export const achievementNotificationService = new AchievementNotificationService();

