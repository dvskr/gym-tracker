import { notificationService } from './notificationService';
import { logger } from '@/lib/utils/logger';

/**
 * Schedule a workout reminder notification
 */
export async function scheduleWorkoutReminder(
  day: string,
  time: { hour: number; minute: number },
  message: string = "Time to crush your workout! �x�"
): Promise<string> {
  const trigger: any = {
    hour: time.hour,
    minute: time.minute,
    repeats: true,
  };

  // Map day names to numbers (Sunday = 1, Monday = 2, etc.)
  const dayMap: Record<string, number> = {
    sun: 1,
    mon: 2,
    tue: 3,
    wed: 4,
    thu: 5,
    fri: 6,
    sat: 7,
  };

  if (dayMap[day.toLowerCase()]) {
    trigger.weekday = dayMap[day.toLowerCase()];
  }

  const id = await notificationService.scheduleNotification(
    "Workout Reminder",
    message,
    trigger,
    {
      channelId: 'workout-reminders',
      data: { type: 'workout-reminder', day },
    }
  );

  logger.log(`�S& Scheduled workout reminder for ${day} at ${time.hour}:${String(time.minute).padStart(2, '0')}`);
  return id;
}

/**
 * Send rest timer completion notification
 */
export async function sendRestTimerNotification(nextExercise?: string): Promise<void> {
  const body = nextExercise 
    ? `Rest complete! Time for ${nextExercise}` 
    : "Rest complete! Time to get back to work";

  await notificationService.sendNotification(
    "Rest Timer Complete",
    body,
    {
      channelId: 'rest-timer',
      data: { type: 'rest-complete', nextExercise },
    }
  );

  logger.log('�S& Sent rest timer notification');
}

/**
 * Send personal record notification
 */
export async function sendPRNotification(exercise: string, newRecord: string): Promise<void> {
  await notificationService.sendNotification(
    "New Personal Record! �x}0",
    `Amazing! You just hit a new PR on ${exercise}: ${newRecord}`,
    {
      channelId: 'achievements',
      data: { type: 'pr', exercise, record: newRecord },
    }
  );

  logger.log(`�S& Sent PR notification for ${exercise}`);
}

/**
 * Send streak reminder notification
 */
export async function sendStreakReminderNotification(streakDays: number): Promise<void> {
  const messages = [
    `�x� Don't break your ${streakDays}-day streak!`,
    `You're on fire! ${streakDays} days strong - keep it going!`,
    `${streakDays} days in a row! One more workout to keep the streak alive`,
  ];

  const body = messages[Math.floor(Math.random() * messages.length)];

  await notificationService.sendNotification(
    "Streak Alert",
    body,
    {
      channelId: 'streaks',
      data: { type: 'streak-reminder', streakDays },
    }
  );

  logger.log(`�S& Sent streak reminder (${streakDays} days)`);
}

/**
 * Send milestone achievement notification
 */
export async function sendMilestoneNotification(
  milestone: string,
  description: string
): Promise<void> {
  await notificationService.sendNotification(
    `Milestone Unlocked: ${milestone}! �x� `,
    description,
    {
      channelId: 'achievements',
      data: { type: 'milestone', milestone },
    }
  );

  logger.log(`�S& Sent milestone notification: ${milestone}`);
}

/**
 * Schedule multiple workout reminders for a week
 */
export async function scheduleWeeklyWorkoutReminders(
  days: string[],
  time: { hour: number; minute: number }
): Promise<string[]> {
  const ids: string[] = [];

  for (const day of days) {
    const id = await scheduleWorkoutReminder(day, time);
    ids.push(id);
  }

  logger.log(`�S& Scheduled ${ids.length} workout reminders`);
  return ids;
}

/**
 * Cancel all workout reminder notifications
 */
export async function cancelAllWorkoutReminders(): Promise<void> {
  const scheduled = await notificationService.getScheduledNotifications();
  
  for (const notification of scheduled) {
    if (notification.content.data?.type === 'workout-reminder') {
      await notificationService.cancelNotification(notification.identifier);
    }
  }

  logger.log('�S& Cancelled all workout reminders');
}

/**
 * Get count of scheduled workout reminders
 */
export async function getWorkoutReminderCount(): Promise<number> {
  const scheduled = await notificationService.getScheduledNotifications();
  return scheduled.filter(n => n.content.data?.type === 'workout-reminder').length;
}

