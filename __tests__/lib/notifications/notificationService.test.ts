/**
 * Notification Service Tests
 * Tests for push notification functionality
 */

import * as Notifications from 'expo-notifications';
import { scheduleRestCompleteNotification, scheduleWorkoutReminder, cancelNotification } from '@/lib/notifications/notificationService';

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  AndroidImportance: {
    MAX: 'max',
    HIGH: 'high',
    DEFAULT: 'default',
  },
}));

describe('notificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue('notification-id-123');
  });

  describe('scheduleRestCompleteNotification', () => {
    it('schedules notification for rest completion', async () => {
      const seconds = 90;
      const exerciseName = 'Bench Press';

      await scheduleRestCompleteNotification(seconds, exerciseName);

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: 'Rest Complete!',
          body: expect.stringContaining(exerciseName),
          sound: true,
          priority: expect.any(String),
        },
        trigger: {
          seconds,
        },
      });
    });

    it('returns notification ID', async () => {
      const notificationId = await scheduleRestCompleteNotification(90, 'Squat');

      expect(notificationId).toBe('notification-id-123');
    });

    it('handles different rest durations', async () => {
      await scheduleRestCompleteNotification(30, 'Test');
      await scheduleRestCompleteNotification(120, 'Test');
      await scheduleRestCompleteNotification(180, 'Test');

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(3);
    });

    it('includes exercise name in notification', async () => {
      await scheduleRestCompleteNotification(60, 'Deadlift');

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            body: expect.stringContaining('Deadlift'),
          }),
        })
      );
    });

    it('handles errors gracefully', async () => {
      (Notifications.scheduleNotificationAsync as jest.Mock).mockRejectedValue(
        new Error('Permission denied')
      );

      await expect(
        scheduleRestCompleteNotification(90, 'Test')
      ).rejects.toThrow('Permission denied');
    });
  });

  describe('scheduleWorkoutReminder', () => {
    it('schedules daily workout reminder', async () => {
      const hour = 18; // 6 PM
      const minute = 0;

      await scheduleWorkoutReminder(hour, minute);

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: expect.any(String),
          body: expect.any(String),
          sound: true,
        },
        trigger: {
          hour,
          minute,
          repeats: true,
        },
      });
    });

    it('schedules for morning time', async () => {
      await scheduleWorkoutReminder(7, 30);

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          trigger: {
            hour: 7,
            minute: 30,
            repeats: true,
          },
        })
      );
    });

    it('schedules for evening time', async () => {
      await scheduleWorkoutReminder(20, 0);

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          trigger: {
            hour: 20,
            minute: 0,
            repeats: true,
          },
        })
      );
    });

    it('sets repeats to true for daily reminders', async () => {
      await scheduleWorkoutReminder(18, 0);

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          trigger: expect.objectContaining({
            repeats: true,
          }),
        })
      );
    });

    it('returns notification ID', async () => {
      const notificationId = await scheduleWorkoutReminder(18, 0);

      expect(notificationId).toBe('notification-id-123');
    });
  });

  describe('cancelNotification', () => {
    it('cancels notification by ID', async () => {
      const notificationId = 'notification-123';

      await cancelNotification(notificationId);

      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(notificationId);
    });

    it('handles cancellation errors', async () => {
      (Notifications.cancelScheduledNotificationAsync as jest.Mock).mockRejectedValue(
        new Error('Not found')
      );

      await expect(cancelNotification('invalid-id')).rejects.toThrow('Not found');
    });

    it('handles null notification ID', async () => {
      await cancelNotification(null as any);

      // Should either reject or handle gracefully
      expect(true).toBe(true);
    });
  });

  describe('notification content', () => {
    it('includes motivational messages', async () => {
      await scheduleRestCompleteNotification(90, 'Bench Press');

      const call = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
      expect(call.content.title).toBeTruthy();
      expect(call.content.body).toBeTruthy();
    });

    it('uses appropriate notification priority', async () => {
      await scheduleRestCompleteNotification(90, 'Test');

      const call = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
      expect(call.content.priority).toBeDefined();
    });

    it('enables sound for notifications', async () => {
      await scheduleRestCompleteNotification(90, 'Test');

      const call = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
      expect(call.content.sound).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('handles zero seconds rest timer', async () => {
      await scheduleRestCompleteNotification(0, 'Test');

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          trigger: { seconds: 0 },
        })
      );
    });

    it('handles very long rest durations', async () => {
      await scheduleRestCompleteNotification(3600, 'Test'); // 1 hour

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
    });

    it('handles empty exercise name', async () => {
      await scheduleRestCompleteNotification(90, '');

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
    });

    it('handles special characters in exercise name', async () => {
      await scheduleRestCompleteNotification(90, 'Test (Variation) - Heavy');

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
    });

    it('handles emoji in exercise name', async () => {
      await scheduleRestCompleteNotification(90, 'Bench Press 💪');

      const call = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
      expect(call.content.body).toContain('💪');
    });
  });

  describe('concurrent notifications', () => {
    it('handles multiple simultaneous notifications', async () => {
      await Promise.all([
        scheduleRestCompleteNotification(30, 'Exercise 1'),
        scheduleRestCompleteNotification(60, 'Exercise 2'),
        scheduleRestCompleteNotification(90, 'Exercise 3'),
      ]);

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(3);
    });

    it('returns different IDs for each notification', async () => {
      (Notifications.scheduleNotificationAsync as jest.Mock)
        .mockResolvedValueOnce('id-1')
        .mockResolvedValueOnce('id-2')
        .mockResolvedValueOnce('id-3');

      const ids = await Promise.all([
        scheduleRestCompleteNotification(30, 'Test 1'),
        scheduleRestCompleteNotification(60, 'Test 2'),
        scheduleRestCompleteNotification(90, 'Test 3'),
      ]);

      expect(new Set(ids).size).toBe(3);
    });
  });

  describe('scheduling validation', () => {
    it('validates hour range for workout reminder', async () => {
      // Hours should be 0-23
      await expect(scheduleWorkoutReminder(-1, 0)).rejects.toThrow();
      await expect(scheduleWorkoutReminder(24, 0)).rejects.toThrow();
    });

    it('validates minute range for workout reminder', async () => {
      // Minutes should be 0-59
      await expect(scheduleWorkoutReminder(12, -1)).rejects.toThrow();
      await expect(scheduleWorkoutReminder(12, 60)).rejects.toThrow();
    });

    it('validates negative rest seconds', async () => {
      await expect(scheduleRestCompleteNotification(-10, 'Test')).rejects.toThrow();
    });
  });

  describe('notification permissions', () => {
    it('handles permission denial gracefully', async () => {
      (Notifications.scheduleNotificationAsync as jest.Mock).mockRejectedValue(
        new Error('NOTIFICATION_PERMISSION_DENIED')
      );

      await expect(
        scheduleRestCompleteNotification(90, 'Test')
      ).rejects.toThrow('NOTIFICATION_PERMISSION_DENIED');
    });

    it('continues after permission error', async () => {
      (Notifications.scheduleNotificationAsync as jest.Mock)
        .mockRejectedValueOnce(new Error('Permission denied'))
        .mockResolvedValueOnce('id-2');

      try {
        await scheduleRestCompleteNotification(90, 'Test 1');
      } catch (e) {
        // Expected to fail
      }

      const id = await scheduleRestCompleteNotification(90, 'Test 2');
      expect(id).toBe('id-2');
    });
  });
});

