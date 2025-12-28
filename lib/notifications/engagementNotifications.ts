import { notificationService } from './notificationService';
import { useNotificationStore } from '@/stores/notificationStore';

export interface StreakData {
  currentStreak: number;
  lastWorkoutDate: string;
  longestStreak: number;
}

const STREAK_MESSAGES = {
  reminder: [
    "Don't let your {streak}-day streak end! 🔥",
    "Keep the fire alive! {streak} days strong 💪",
    "One workout away from {nextStreak} days!",
    "Your {streak}-day streak is counting on you!",
    "{streak} days of progress - keep going! 💯",
  ],
  celebration: [
    "Amazing! {streak} days in a row! 🎉",
    "{streak}-day streak! You're unstoppable!",
    "New streak record: {streak} days! 🏆",
    "Incredible dedication! {streak} consecutive days!",
    "{streak} days strong! This is your year! ⭐",
  ],
  milestone: [
    "🎊 Milestone Alert: {streak} days!",
    "🏆 {streak}-Day Warrior!",
    "⭐ Legend Status: {streak} Days!",
  ],
};

const INACTIVITY_MESSAGES = [
  { days: 3, message: "Haven't seen you in a bit! Ready to train? 💪" },
  { days: 7, message: "A week without a workout? Let's fix that! 🏋️" },
  { days: 14, message: "We miss you! Start fresh today 🌟" },
  { days: 21, message: "Three weeks is long enough. Your comeback starts now! 🔥" },
  { days: 30, message: "It's never too late to restart. One workout at a time 💚" },
];

const MILESTONE_STREAKS = [7, 14, 21, 30, 60, 90, 100, 150, 200, 250, 300, 365];

class EngagementNotificationService {
  /**
   * Check if we should send a streak reminder (user hasn't worked out today but has a streak)
   */
  async checkStreakReminder(streakData: StreakData): Promise<void> {
    const { currentStreak, lastWorkoutDate } = streakData;
    
    if (currentStreak < 2) {
      console.log('⏸️ No streak to protect (streak < 2)');
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
        console.log('⏸️ Streak reminder already sent today');
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
        'Streak Alert! 🔥',
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
            date: new Date().toISOString().split('T')[0], // Track date sent
          },
        }
      );

      console.log(`✅ Scheduled streak reminder for ${time.toLocaleTimeString()}`);
    } catch (error) {
      console.error('Failed to schedule streak reminder:', error);
    }
  }

  /**
   * Check if we've already sent a streak reminder today
   */
  private async hasStreakReminderToday(): Promise<boolean> {
    const scheduled = await notificationService.getScheduledNotifications();
    const today = new Date().toISOString().split('T')[0];
    
    return scheduled.some(n => 
      n.content.data?.type === 'streak_reminder' &&
      n.content.data?.date === today
    );
  }

  /**
   * Schedule inactivity reminders after each workout
   */
  async scheduleInactivityReminders(lastWorkoutDate: string): Promise<void> {
    try {
      // Cancel existing inactivity notifications
      await this.cancelInactivityReminders();

      const lastWorkout = new Date(lastWorkoutDate);
      let scheduled = 0;
      
      for (const { days, message } of INACTIVITY_MESSAGES) {
        const reminderDate = new Date(lastWorkout);
        reminderDate.setDate(reminderDate.getDate() + days);
        reminderDate.setHours(18, 0, 0, 0); // 6 PM

        // Only schedule if in the future
        if (reminderDate > new Date()) {
          await notificationService.scheduleNotification(
            days <= 7 ? 'Missing You! 💪' : 'Ready to Restart? 🌟',
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

      console.log(`✅ Scheduled ${scheduled} inactivity reminder(s)`);
    } catch (error) {
      console.error('Failed to schedule inactivity reminders:', error);
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
        console.log(`✅ Cancelled ${cancelled} inactivity reminder(s)`);
      }
    } catch (error) {
      console.error('Failed to cancel inactivity reminders:', error);
    }
  }

  /**
   * Send streak celebration (immediate) for milestone streaks
   */
  async celebrateStreak(streak: number): Promise<void> {
    if (!MILESTONE_STREAKS.includes(streak)) {
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

      console.log(`🎉 Sent streak celebration for ${streak} days`);
    } catch (error) {
      console.error('Failed to send streak celebration:', error);
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
      if (type === 'streak_reminder' || type === 'inactivity_reminder' || type === 'streak_celebration') {
        await notificationService.cancelNotification(notification.identifier);
      }
    }

    console.log('✅ Cancelled all engagement notifications');
  }
}

export const engagementNotificationService = new EngagementNotificationService();

