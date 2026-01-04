import { logger } from '@/lib/utils/logger';
import { engagementNotificationService } from './engagementNotifications';
import { workoutReminderService } from './workoutReminders';
import { notificationService } from './notificationService';
import { calculateStreak } from '@/lib/utils/streakCalculation';
import { useSettingsStore } from '@/stores/settingsStore';

/**
 * Initialize all notification services on app launch
 * Should be called when user is authenticated
 */
export async function initializeNotifications(userId: string): Promise<void> {
  const { notificationsEnabled } = useSettingsStore.getState();
  
  if (!notificationsEnabled) {
    logger.log('[NotificationInit] Notifications disabled - skipping initialization');
    return;
  }

  logger.log('[NotificationInit] Initializing notifications for user:', userId);

  try {
    // 1. Initialize notification service (get push token, set up channels)
    await notificationService.initialize();

    // 2. Check for streak reminders (if user has streak at risk)
    await checkAndScheduleStreakReminder(userId);

    // 3. Schedule weekly summary if enabled
    await engagementNotificationService.scheduleWeeklySummary();

    // 4. Reschedule workout reminders (in case settings changed)
    await workoutReminderService.scheduleAllReminders();

    logger.log('[NotificationInit] All notifications initialized successfully');
  } catch (error) {
    logger.error('[NotificationInit] Error initializing notifications:', error);
  }
}

/**
 * Check if user needs a streak reminder and schedule it if needed
 */
async function checkAndScheduleStreakReminder(userId: string): Promise<void> {
  try {
    const streakData = await calculateStreak(userId);
    
    logger.log('[NotificationInit] Streak data:', {
      currentStreak: streakData.currentStreak,
      lastWorkoutDate: streakData.lastWorkoutDate,
    });

    // Check if we need to send a streak reminder
    await engagementNotificationService.checkStreakReminder(streakData);
  } catch (error) {
    logger.error('[NotificationInit] Error checking streak reminder:', error);
  }
}

/**
 * Refresh notifications after settings change
 * Call this when notification settings are updated
 */
export async function refreshNotifications(userId: string): Promise<void> {
  logger.log('[NotificationInit] Refreshing notifications after settings change');
  
  const { notificationsEnabled, streakReminders, weeklySummary } = useSettingsStore.getState();

  if (!notificationsEnabled) {
    // Cancel all engagement notifications if master toggle is off
    await engagementNotificationService.cancelAllEngagementNotifications();
    await workoutReminderService.cancelAllReminders();
    logger.log('[NotificationInit] All notifications cancelled (master toggle off)');
    return;
  }

  // Refresh streak reminders
  if (streakReminders) {
    await checkAndScheduleStreakReminder(userId);
  }

  // Refresh weekly summary
  if (weeklySummary) {
    await engagementNotificationService.scheduleWeeklySummary();
  }

  // Refresh workout reminders
  await workoutReminderService.scheduleAllReminders();

  logger.log('[NotificationInit] Notifications refreshed');
}

