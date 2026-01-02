import * as Notifications from 'expo-notifications';
import { logger } from '@/lib/utils/logger';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions from the user
 */
export async function requestPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return false;
    }

    // Configure notification channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3b82f6',
      });
    }

    return true;
  } catch (error) {
 logger.error('Error requesting notification permissions:', error);
    return false;
  }
}

/**
 * Check if notification permissions are granted
 */
export async function checkPermissions(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

/**
 * Schedule recurring workout reminders for selected days
 * @param days Array of day numbers (0=Sunday, 1=Monday, etc.)
 * @param time Object with hour and minute
 */
export async function scheduleWorkoutReminders(
  days: number[],
  time: { hour: number; minute: number }
): Promise<void> {
  try {
    // Cancel existing workout reminders first
    await cancelWorkoutReminders();

    // Schedule notification for each selected day
    for (const day of days) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Time to Workout! x",
          body: "Don't break your streak! Let's get moving today.",
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          weekday: day,
          hour: time.hour,
          minute: time.minute,
          repeats: true,
        },
      });
    }
  } catch (error) {
 logger.error('Error scheduling workout reminders:', error);
    throw error;
  }
}

/**
 * Cancel all scheduled workout reminders
 */
export async function cancelWorkoutReminders(): Promise<void> {
  try {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    
    // Cancel all workout reminder notifications
    for (const notification of scheduledNotifications) {
      if (notification.content.title?.includes('Workout')) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
  } catch (error) {
 logger.error('Error canceling workout reminders:', error);
  }
}

/**
 * Send an immediate local notification
 */
export async function sendLocalNotification(
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        data,
      },
      trigger: null, // Send immediately
    });
  } catch (error) {
 logger.error('Error sending local notification:', error);
  }
}

/**
 * Schedule a streak reminder notification
 */
export async function scheduleStreakReminder(
  daysStreak: number
): Promise<void> {
  try {
    // Schedule for tomorrow evening if user hasn't worked out today
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(19, 0, 0, 0); // 7 PM

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Don't Break Your ${daysStreak}-Day Streak! x`,
        body: "You're doing amazing! One more workout to keep it going.",
        sound: true,
      },
      trigger: tomorrow,
    });
  } catch (error) {
 logger.error('Error scheduling streak reminder:', error);
  }
}

/**
 * Send PR celebration notification
 */
export async function sendPRNotification(
  exerciseName: string,
  recordType: string,
  value: number
): Promise<void> {
  try {
    await sendLocalNotification(
      `New PR! x}0`,
      `You just hit a ${recordType} record on ${exerciseName}: ${value}!`,
      { type: 'pr', exerciseName, recordType, value }
    );
  } catch (error) {
 logger.error('Error sending PR notification:', error);
  }
}

/**
 * Send milestone notification
 */
export async function sendMilestoneNotification(
  milestone: number
): Promise<void> {
  try {
    await sendLocalNotification(
      `Milestone Reached! x `,
      `Congratulations on completing ${milestone} workouts!`,
      { type: 'milestone', count: milestone }
    );
  } catch (error) {
 logger.error('Error sending milestone notification:', error);
  }
}

/**
 * Schedule weekly summary notification
 */
export async function scheduleWeeklySummary(): Promise<void> {
  try {
    // Schedule for Sunday evening at 6 PM
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Your Weekly Summary x`",
        body: "Check out your progress this week!",
        sound: true,
      },
      trigger: {
        weekday: 1, // Sunday
        hour: 18,
        minute: 0,
        repeats: true,
      },
    });
  } catch (error) {
 logger.error('Error scheduling weekly summary:', error);
  }
}

/**
 * Cancel all notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
 logger.error('Error canceling all notifications:', error);
  }
}

/**
 * Get scheduled notification count
 */
export async function getScheduledNotificationCount(): Promise<number> {
  try {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    return notifications.length;
  } catch (error) {
 logger.error('Error getting notification count:', error);
    return 0;
  }
}
