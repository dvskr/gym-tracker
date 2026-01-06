import { notificationService } from './notificationService';
import { logger } from '@/lib/utils/logger';
import { useNotificationStore } from '@/stores/notificationStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export interface StreakData {
  currentStreak: number;
  lastWorkoutDate: string;
  longestStreak: number;
}

const STREAK_MESSAGES = {
  reminder: [
    "Don't let your {streak}-day streak end! x",
    "Keep the fire alive! {streak} days strong x",
    "One workout away from {nextStreak} days!",
    "Your {streak}-day streak is counting on you!",
    "{streak} days of progress - keep going! x",
  ],
  celebration: [
    "Amazing! {streak} days in a row! 🔥",
    "{streak}-day streak! You're unstoppable!",
    "New streak record: {streak} days! 💪",
    "Incredible dedication! {streak} consecutive days!",
    "{streak} days strong! This is your year! ⭐",
  ],
  milestone: [
    "🎖️ Milestone Alert: {streak} days!",
    "🏆 {streak}-Day Warrior!",
    "⭐ Legend Status: {streak} Days!",
  ],
};

const INACTIVITY_MESSAGES = [
  { days: 3, message: "Haven't seen you in a bit! Ready to train? x" },
  { days: 7, message: "A week without a workout? Let's fix that! x9️" },
  { days: 14, message: "We miss you! Start fresh today xRx" },
  { days: 21, message: "Three weeks is long enough. Your comeback starts now! x" },
  { days: 30, message: "It's never too late to restart. One workout at a time xa" },
];

const MILESTONE_STREAKS = [7, 14, 21, 30, 60, 90, 100, 150, 200, 250, 300, 365];

class EngagementNotificationService {
  /**
   * Check if we should send a streak reminder (user hasn't worked out today but has a streak)
   * Respects settings: notificationsEnabled, streakReminders
   */
  async checkStreakReminder(streakData: StreakData): Promise<void> {
    const { notificationsEnabled, streakReminders } = useSettingsStore.getState();
    
    // Check settings first
    if (!notificationsEnabled) {
      logger.log('[StreakReminder] Skipped - notifications disabled globally');
      return;
    }
    
    if (!streakReminders) {
      logger.log('[StreakReminder] Skipped - streak reminders disabled in settings');
      return;
    }
    
    const { currentStreak, lastWorkoutDate } = streakData;
    
    if (currentStreak < 2) {
      logger.log('[StreakReminder] No streak to protect (streak < 2)');
      return;
    }
    
    const lastWorkout = new Date(lastWorkoutDate);
    const today = new Date();
    const hoursSinceWorkout = (today.getTime() - lastWorkout.getTime()) / (1000 * 60 * 60);
    
    // If it's been 20+ hours and less than 48 hours, send reminder
    if (hoursSinceWorkout >= 20 && hoursSinceWorkout < 48) {
      // Check if already sent today
      const alreadySent = await this.hasStreakReminderToday();
      if (alreadySent) {
 logger.log(' Streak reminder already sent today');
        return;
      }

      // Schedule for 8 PM today
      const reminderTime = new Date();
      reminderTime.setHours(20, 0, 0, 0);
      
      if (reminderTime > today) {
        await this.scheduleStreakReminder(currentStreak, reminderTime);
      }
    }
  }

  /**
   * Schedule a streak reminder notification
   */
  private async scheduleStreakReminder(streak: number, time: Date): Promise<void> {
    try {
      const messages = STREAK_MESSAGES.reminder;
      const message = messages[Math.floor(Math.random() * messages.length)]
        .replace('{streak}', streak.toString())
        .replace('{nextStreak}', (streak + 1).toString());

      await notificationService.scheduleNotification(
        'Streak Alert! x',
        message,
        {
          type: 'date' as const,
          date: time.getTime(),
        },
        {
          channelId: 'streaks',
          data: { 
            type: 'streak_reminder', 
            streak,
            date: (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`; })(), // Track date sent (local timezone)
          },
        }
      );

 logger.log(`S& Scheduled streak reminder for ${time.toLocaleTimeString()}`);
    } catch (error: unknown) {
 logger.error('Failed to schedule streak reminder:', error);
    }
  }

  /**
   * Check if we've already sent a streak reminder today
   */
  private async hasStreakReminderToday(): Promise<boolean> {
    const scheduled = await notificationService.getScheduledNotifications();
    // Use local date format (not UTC) for timezone-correct comparison
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    return scheduled.some(n => 
      n.content.data?.type === 'streak_reminder' &&
      n.content.data?.date === today
    );
  }

  /**
   * Schedule inactivity reminders after each workout
   * Respects settings: notificationsEnabled, inactivityReminders
   */
  async scheduleInactivityReminders(lastWorkoutDate: string): Promise<void> {
    const { notificationsEnabled, inactivityReminders } = useSettingsStore.getState();
    
    // Always cancel existing first (in case setting was turned off)
    await this.cancelInactivityReminders();
    
    // Check settings
    if (!notificationsEnabled) {
      logger.log('[InactivityReminder] Skipped - notifications disabled globally');
      return;
    }
    
    if (!inactivityReminders) {
      logger.log('[InactivityReminder] Skipped - inactivity reminders disabled in settings');
      return;
    }
    
    try {
      const lastWorkout = new Date(lastWorkoutDate);
      let scheduled = 0;
      
      for (const { days, message } of INACTIVITY_MESSAGES) {
        const reminderDate = new Date(lastWorkout);
        reminderDate.setDate(reminderDate.getDate() + days);
        reminderDate.setHours(18, 0, 0, 0); // 6 PM

        // Only schedule if in the future
        if (reminderDate > new Date()) {
          await notificationService.scheduleNotification(
            days <= 7 ? 'Missing You! x' : 'Ready to Restart? xRx',
            message,
            {
              type: 'date' as const,
              date: reminderDate.getTime(),
            },
            {
              channelId: 'general',
              data: { type: 'inactivity_reminder', daysSince: days },
            }
          );
          scheduled++;
        }
      }

 logger.log(`S& Scheduled ${scheduled} inactivity reminder(s)`);
    } catch (error: unknown) {
 logger.error('Failed to schedule inactivity reminders:', error);
    }
  }

  /**
   * Cancel all inactivity reminders
   */
  private async cancelInactivityReminders(): Promise<void> {
    try {
      const scheduled = await notificationService.getScheduledNotifications();
      let cancelled = 0;

      for (const notification of scheduled) {
        if (notification.content.data?.type === 'inactivity_reminder') {
          await notificationService.cancelNotification(notification.identifier);
          cancelled++;
        }
      }

      if (cancelled > 0) {
 logger.log(`S& Cancelled ${cancelled} inactivity reminder(s)`);
      }
    } catch (error: unknown) {
 logger.error('Failed to cancel inactivity reminders:', error);
    }
  }

  /**
   * Send streak celebration (immediate) for milestone streaks
   * Respects settings: notificationsEnabled, streakReminders
   */
  async celebrateStreak(streak: number): Promise<void> {
    if (!MILESTONE_STREAKS.includes(streak)) {
      return;
    }
    
    const { notificationsEnabled, streakReminders } = useSettingsStore.getState();
    
    // Check settings
    if (!notificationsEnabled || !streakReminders) {
      logger.log('[StreakCelebration] Skipped - notifications or streak reminders disabled');
      return;
    }

    try {
      const messages = STREAK_MESSAGES.celebration;
      const message = messages[Math.floor(Math.random() * messages.length)]
        .replace('{streak}', streak.toString());

      const title = STREAK_MESSAGES.milestone[
        Math.floor(Math.random() * STREAK_MESSAGES.milestone.length)
      ].replace('{streak}', streak.toString());

      // Add to notification center
      useNotificationStore.getState().addNotification({
        type: 'streak',
        title,
        message,
        data: { streak },
      });

      await notificationService.sendNotification(
        title,
        message,
        {
          channelId: 'achievements',
          data: { type: 'streak_celebration', streak },
        }
      );

logger.log(`Sent streak celebration for ${streak} days`);
    } catch (error: unknown) {
 logger.error('Failed to send streak celebration:', error);
    }
  }

  /**
   * Check if a streak is a milestone
   */
  isMilestoneStreak(streak: number): boolean {
    return MILESTONE_STREAKS.includes(streak);
  }

  /**
   * Get the next milestone for a given streak
   */
  getNextMilestone(currentStreak: number): number {
    return MILESTONE_STREAKS.find(m => m > currentStreak) || 365;
  }

  /**
   * Cancel all engagement notifications
   */
  async cancelAllEngagementNotifications(): Promise<void> {
    const scheduled = await notificationService.getScheduledNotifications();
    
    for (const notification of scheduled) {
      const type = notification.content.data?.type;
      if (type === 'streak_reminder' || type === 'inactivity_reminder' || type === 'streak_celebration' || type === 'weekly_summary') {
        await notificationService.cancelNotification(notification.identifier);
      }
    }

    logger.log('[Engagement] Cancelled all engagement notifications');
  }

  /**
   * Calculate weekly stats for the current user
   */
  private async calculateWeeklyStats(userId: string): Promise<{
    workoutsThisWeek: number;
    volumeThisWeek: number;
    workoutsLastWeek: number;
    volumeLastWeek: number;
    currentStreak: number;
    totalPRs: number;
  }> {
    try {
      const now = new Date();
      
      // Get start of this week (Monday)
      const thisWeekStart = new Date(now);
      thisWeekStart.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
      thisWeekStart.setHours(0, 0, 0, 0);
      
      // Get start of last week
      const lastWeekStart = new Date(thisWeekStart);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      
      // Get end of last week (start of this week)
      const lastWeekEnd = new Date(thisWeekStart);

      // Query this week's workouts
      const { data: thisWeekWorkouts } = await supabase
        .from('workouts')
        .select('total_volume')
        .eq('user_id', userId)
        .not('ended_at', 'is', null)
        .gte('ended_at', thisWeekStart.toISOString());

      // Query last week's workouts
      const { data: lastWeekWorkouts } = await supabase
        .from('workouts')
        .select('total_volume')
        .eq('user_id', userId)
        .not('ended_at', 'is', null)
        .gte('ended_at', lastWeekStart.toISOString())
        .lt('ended_at', lastWeekEnd.toISOString());

      // Query this week's PRs
      const { count: prCount } = await supabase
        .from('personal_records')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('achieved_at', thisWeekStart.toISOString());

      // Calculate streak
      const { calculateStreak } = await import('@/lib/utils/streakCalculation');
      const streakData = await calculateStreak(userId);

      const workoutsThisWeek = thisWeekWorkouts?.length || 0;
      const volumeThisWeek = thisWeekWorkouts?.reduce((sum, w) => sum + (w.total_volume || 0), 0) || 0;
      const workoutsLastWeek = lastWeekWorkouts?.length || 0;
      const volumeLastWeek = lastWeekWorkouts?.reduce((sum, w) => sum + (w.total_volume || 0), 0) || 0;

      return {
        workoutsThisWeek,
        volumeThisWeek,
        workoutsLastWeek,
        volumeLastWeek,
        currentStreak: streakData.currentStreak,
        totalPRs: prCount || 0,
      };
    } catch (error: unknown) {
      logger.error('[WeeklySummary] Error calculating stats:', error);
      return {
        workoutsThisWeek: 0,
        volumeThisWeek: 0,
        workoutsLastWeek: 0,
        volumeLastWeek: 0,
        currentStreak: 0,
        totalPRs: 0,
      };
    }
  }

  /**
   * Format volume for display (e.g., 25430 -> "25.4K")
   */
  private formatVolume(volume: number): string {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K`;
    }
    return volume.toLocaleString();
  }

  /**
   * Schedule weekly summary notification (sent every Sunday at 6 PM)
   * Respects settings: notificationsEnabled, weeklySummary
   */
  async scheduleWeeklySummary(): Promise<void> {
    const { notificationsEnabled, weeklySummary } = useSettingsStore.getState();
    
    // Cancel existing weekly summary
    await this.cancelWeeklySummary();
    
    if (!notificationsEnabled || !weeklySummary) {
      logger.log('[WeeklySummary] Skipped - notifications or weekly summary disabled');
      return;
    }

    try {
      // Schedule for next Sunday at 6 PM
      const now = new Date();
      const daysUntilSunday = (7 - now.getDay()) % 7 || 7; // If today is Sunday, schedule for next Sunday
      const nextSunday = new Date(now);
      nextSunday.setDate(now.getDate() + daysUntilSunday);
      nextSunday.setHours(18, 0, 0, 0);

      // Note: We can't calculate stats at schedule time (they'd be stale by Sunday)
      // Instead, we schedule a generic notification and calculate stats when it fires
      // For now, store the user ID so we can fetch stats on notification receive
      const userId = useAuthStore.getState().user?.id;

      await notificationService.scheduleNotification(
        'Weekly Progress Report',
        'Tap to see your workout stats from this week!',
        {
          type: 'date' as const,
          date: nextSunday.getTime(),
        },
        {
          channelId: 'general',
          data: { 
            type: 'weekly_summary',
            userId, // Include user ID for potential deep linking
          },
        }
      );

      logger.log(`[WeeklySummary] Scheduled for ${nextSunday.toLocaleDateString()}`);
    } catch (error: unknown) {
      logger.error('[WeeklySummary] Failed to schedule:', error);
    }
  }

  /**
   * Send immediate weekly summary with calculated stats
   * Call this when user taps the weekly summary notification or for testing
   */
  async sendWeeklySummaryNow(userId: string): Promise<void> {
    const { notificationsEnabled, weeklySummary } = useSettingsStore.getState();
    
    if (!notificationsEnabled || !weeklySummary) {
      return;
    }

    try {
      const stats = await this.calculateWeeklyStats(userId);
      const { weightUnit } = useSettingsStore.getState();
      
      // Build dynamic message based on stats
      let message = '';
      
      if (stats.workoutsThisWeek === 0) {
        message = 'No workouts this week. Start fresh next week!';
      } else {
        const parts: string[] = [];
        
        // Workouts count
        parts.push(`${stats.workoutsThisWeek} workout${stats.workoutsThisWeek !== 1 ? 's' : ''}`);
        
        // Volume
        if (stats.volumeThisWeek > 0) {
          parts.push(`${this.formatVolume(stats.volumeThisWeek)} ${weightUnit} lifted`);
        }
        
        // PRs
        if (stats.totalPRs > 0) {
          parts.push(`${stats.totalPRs} PR${stats.totalPRs !== 1 ? 's' : ''}`);
        }
        
        // Streak
        if (stats.currentStreak >= 3) {
          parts.push(`${stats.currentStreak}-day streak`);
        }
        
        message = parts.join(' | ');
        
        // Week over week comparison
        if (stats.workoutsLastWeek > 0) {
          const workoutDiff = stats.workoutsThisWeek - stats.workoutsLastWeek;
          const volumeChange = stats.volumeLastWeek > 0 
            ? Math.round(((stats.volumeThisWeek - stats.volumeLastWeek) / stats.volumeLastWeek) * 100)
            : 0;
          
          if (volumeChange > 0) {
            message += ` (+${volumeChange}% vs last week)`;
          } else if (volumeChange < 0) {
            message += ` (${volumeChange}% vs last week)`;
          }
        }
      }

      // Add to notification center
      useNotificationStore.getState().addNotification({
        type: 'info',
        title: 'Weekly Progress Report',
        message,
        data: stats,
      });

      await notificationService.sendNotification(
        'Weekly Progress Report',
        message,
        {
          channelId: 'general',
          data: { type: 'weekly_summary', ...stats },
        }
      );

      logger.log('[WeeklySummary] Sent with stats:', stats);
    } catch (error: unknown) {
      logger.error('[WeeklySummary] Failed to send:', error);
    }
  }

  /**
   * Cancel weekly summary notification
   */
  private async cancelWeeklySummary(): Promise<void> {
    try {
      const scheduled = await notificationService.getScheduledNotifications();
      for (const notification of scheduled) {
        if (notification.content.data?.type === 'weekly_summary') {
          await notificationService.cancelNotification(notification.identifier);
        }
      }
    } catch (error: unknown) {
      logger.error('[WeeklySummary] Failed to cancel:', error);
    }
  }
}

export const engagementNotificationService = new EngagementNotificationService();


