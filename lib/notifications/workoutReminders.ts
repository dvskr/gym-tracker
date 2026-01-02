import * as Notifications from 'expo-notifications';
import { logger } from '@/lib/utils/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationService } from './notificationService';

export interface WorkoutReminder {
  id: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  hour: number;
  minute: number;
  enabled: boolean;
  workoutName?: string;
  notificationId?: string;
}

const REMINDER_MESSAGES = [
  "Time to crush it! �x�",
  "Your workout is waiting!",
  "Let's get stronger today!",
  "Ready to make progress?",
  "Your future self will thank you!",
  "No excuses - let's go! �x�",
  "Gains don't wait!",
  "Make today count!",
  "Turn your goals into results!",
  "Strong mind, strong body!",
];

class WorkoutReminderService {
  private readonly STORAGE_KEY = '@gym/workout_reminders';

  /**
   * Get saved reminders from storage
   */
  async getReminders(): Promise<WorkoutReminder[]> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      logger.error('Failed to get reminders:', error);
      return [];
    }
  }

  /**
   * Save reminders to storage
   */
  async saveReminders(reminders: WorkoutReminder[]): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(reminders));
      logger.log('�S& Reminders saved');
    } catch (error) {
      logger.error('Failed to save reminders:', error);
    }
  }

  /**
   * Schedule a weekly reminder
   */
  async scheduleReminder(reminder: WorkoutReminder): Promise<string | null> {
    // Cancel existing if updating
    await this.cancelReminder(reminder.id);

    if (!reminder.enabled) {
      logger.log(`⏸��� Reminder ${reminder.id} is disabled, skipping schedule`);
      return null;
    }

    try {
      const message = this.getRandomMessage();
      const title = reminder.workoutName 
        ? `${reminder.workoutName} Day!`
        : 'Workout Reminder';

      // Create trigger for weekly notification
      const trigger: any = {
        weekday: reminder.dayOfWeek + 1, // Expo uses 1-7 (Sun-Sat), we use 0-6
        hour: reminder.hour,
        minute: reminder.minute,
        repeats: true,
      };

      const notificationId = await notificationService.scheduleNotification(
        title,
        message,
        trigger,
        {
          channelId: 'workout-reminders',
          data: { 
            type: 'workout_reminder',
            reminderId: reminder.id,
            dayOfWeek: reminder.dayOfWeek,
          },
        }
      );

      logger.log(`�S& Scheduled reminder for ${this.getDayName(reminder.dayOfWeek)} at ${this.formatTime(reminder.hour, reminder.minute)}`);
      return notificationId;
    } catch (error) {
      logger.error('Failed to schedule reminder:', error);
      return null;
    }
  }

  /**
   * Cancel a specific reminder
   */
  async cancelReminder(id: string): Promise<void> {
    try {
      const scheduled = await notificationService.getScheduledNotifications();
      const matching = scheduled.filter(
        n => n.content.data?.reminderId === id
      );
      
      for (const notification of matching) {
        await notificationService.cancelNotification(notification.identifier);
      }

      if (matching.length > 0) {
        logger.log(`�S& Cancelled ${matching.length} notification(s) for reminder ${id}`);
      }
    } catch (error) {
      logger.error('Failed to cancel reminder:', error);
    }
  }

  /**
   * Schedule all enabled reminders
   */
  async scheduleAllReminders(): Promise<void> {
    const reminders = await this.getReminders();
    let scheduled = 0;

    for (const reminder of reminders) {
      if (reminder.enabled) {
        const notificationId = await this.scheduleReminder(reminder);
        if (notificationId) {
          scheduled++;
        }
      }
    }

    logger.log(`�S& Scheduled ${scheduled} workout reminder(s)`);
  }

  /**
   * Cancel all reminders
   */
  async cancelAllReminders(): Promise<void> {
    const reminders = await this.getReminders();
    
    for (const reminder of reminders) {
      await this.cancelReminder(reminder.id);
    }

    logger.log('�S& Cancelled all workout reminders');
  }

  /**
   * Update a single reminder
   */
  async updateReminder(id: string, updates: Partial<WorkoutReminder>): Promise<void> {
    const reminders = await this.getReminders();
    const updated = reminders.map(r => 
      r.id === id ? { ...r, ...updates } : r
    );
    
    await this.saveReminders(updated);
    
    // Reschedule if exists
    const reminder = updated.find(r => r.id === id);
    if (reminder) {
      await this.scheduleReminder(reminder);
    }
  }

  /**
   * Toggle a reminder on/off
   */
  async toggleReminder(id: string, enabled: boolean): Promise<void> {
    await this.updateReminder(id, { enabled });
  }

  /**
   * Update reminder time
   */
  async updateReminderTime(id: string, hour: number, minute: number): Promise<void> {
    await this.updateReminder(id, { hour, minute });
  }

  /**
   * Update workout name for a reminder
   */
  async updateWorkoutName(id: string, workoutName: string): Promise<void> {
    await this.updateReminder(id, { workoutName });
  }

  /**
   * Create default reminders (all disabled initially)
   */
  createDefaultReminders(): WorkoutReminder[] {
    return [
      { id: 'sun', dayOfWeek: 0, hour: 10, minute: 0, enabled: false },
      { id: 'mon', dayOfWeek: 1, hour: 18, minute: 0, enabled: false },
      { id: 'tue', dayOfWeek: 2, hour: 18, minute: 0, enabled: false },
      { id: 'wed', dayOfWeek: 3, hour: 18, minute: 0, enabled: false },
      { id: 'thu', dayOfWeek: 4, hour: 18, minute: 0, enabled: false },
      { id: 'fri', dayOfWeek: 5, hour: 18, minute: 0, enabled: false },
      { id: 'sat', dayOfWeek: 6, hour: 10, minute: 0, enabled: false },
    ];
  }

  /**
   * Apply a preset reminder schedule
   */
  async applyPreset(preset: '3day' | '4day' | '5day' | 'ppl'): Promise<void> {
    const reminders = await this.getReminders();
    
    // First disable all
    const updated = reminders.map(r => ({ ...r, enabled: false, workoutName: undefined }));

    // Apply preset
    switch (preset) {
      case '3day': // Mon, Wed, Fri
        updated[1].enabled = true; // Monday
        updated[1].workoutName = 'Full Body';
        updated[3].enabled = true; // Wednesday
        updated[3].workoutName = 'Full Body';
        updated[5].enabled = true; // Friday
        updated[5].workoutName = 'Full Body';
        break;

      case '4day': // Mon, Tue, Thu, Fri (Upper/Lower)
        updated[1].enabled = true; // Monday
        updated[1].workoutName = 'Upper';
        updated[2].enabled = true; // Tuesday
        updated[2].workoutName = 'Lower';
        updated[4].enabled = true; // Thursday
        updated[4].workoutName = 'Upper';
        updated[5].enabled = true; // Friday
        updated[5].workoutName = 'Lower';
        break;

      case '5day': // Mon-Fri (Bro Split)
        updated[1].enabled = true; // Monday
        updated[1].workoutName = 'Chest';
        updated[2].enabled = true; // Tuesday
        updated[2].workoutName = 'Back';
        updated[3].enabled = true; // Wednesday
        updated[3].workoutName = 'Legs';
        updated[4].enabled = true; // Thursday
        updated[4].workoutName = 'Shoulders';
        updated[5].enabled = true; // Friday
        updated[5].workoutName = 'Arms';
        break;

      case 'ppl': // 6-Day Push/Pull/Legs
        updated[1].enabled = true; // Monday
        updated[1].workoutName = 'Push';
        updated[2].enabled = true; // Tuesday
        updated[2].workoutName = 'Pull';
        updated[3].enabled = true; // Wednesday
        updated[3].workoutName = 'Legs';
        updated[4].enabled = true; // Thursday
        updated[4].workoutName = 'Push';
        updated[5].enabled = true; // Friday
        updated[5].workoutName = 'Pull';
        updated[6].enabled = true; // Saturday
        updated[6].workoutName = 'Legs';
        break;
    }

    await this.saveReminders(updated);
    await this.cancelAllReminders();
    await this.scheduleAllReminders();

    logger.log(`�S& Applied ${preset} preset`);
  }

  /**
   * Get count of enabled reminders
   */
  async getEnabledCount(): Promise<number> {
    const reminders = await this.getReminders();
    return reminders.filter(r => r.enabled).length;
  }

  /**
   * Get random motivational message
   */
  private getRandomMessage(): string {
    return REMINDER_MESSAGES[Math.floor(Math.random() * REMINDER_MESSAGES.length)];
  }

  /**
   * Format time for display
   */
  private formatTime(hour: number, minute: number): string {
    const period = hour >= 12 ? 'PM' : 'AM';
    const h = hour % 12 || 12;
    const m = minute.toString().padStart(2, '0');
    return `${h}:${m} ${period}`;
  }

  /**
   * Get day name
   */
  private getDayName(dayOfWeek: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek];
  }
}

export const workoutReminderService = new WorkoutReminderService();

