import * as Notifications from 'expo-notifications';
import { logger } from '@/lib/utils/logger';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { notificationAnalyticsService } from './notificationAnalytics';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  private expoPushToken: string | null = null;

  /**
   * Initialize notifications and get push token
   */
  async initialize(): Promise<string | null> {
    if (!Device.isDevice) {
      logger.log('âš ï¸ Push notifications require physical device');
      return null;
    }

    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      logger.log('âŒ Failed to get push notification permissions');
      return null;
    }

    // Get push token
    this.expoPushToken = await this.registerForPushNotifications();

    // Set up notification channels (Android)
    if (Platform.OS === 'android') {
      await this.setupAndroidChannels();
    }

    logger.log('âœ… Notifications initialized');
    return this.expoPushToken;
  }

  /**
   * Register for push notifications
   */
  private async registerForPushNotifications(): Promise<string | null> {
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;

      if (!projectId) {
        logger.warn('âš ï¸ No project ID found for push notifications');
        return null;
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      logger.log('ðŸ“± Push token:', token.data);
      return token.data;
    } catch (error) {
      logger.error('âŒ Failed to get push token:', error);
      return null;
    }
  }

  /**
   * Set up Android notification channels
   */
  private async setupAndroidChannels(): Promise<void> {
    // Workout reminders
    await Notifications.setNotificationChannelAsync('workout-reminders', {
      name: 'Workout Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3b82f6',
      sound: 'default',
    });

    // Rest timer
    await Notifications.setNotificationChannelAsync('rest-timer', {
      name: 'Rest Timer',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 200, 500],
      lightColor: '#22c55e',
      sound: 'default',
    });

    // Achievements
    await Notifications.setNotificationChannelAsync('achievements', {
      name: 'Achievements & PRs',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#f59e0b',
      sound: 'default',
    });

    // Streaks
    await Notifications.setNotificationChannelAsync('streaks', {
      name: 'Streak Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#ef4444',
      sound: 'default',
    });

    // General
    await Notifications.setNotificationChannelAsync('general', {
      name: 'General',
      importance: Notifications.AndroidImportance.LOW,
      sound: null,
    });

    logger.log('âœ… Android notification channels configured');
  }

  /**
   * Get the push token
   */
  getExpoPushToken(): string | null {
    return this.expoPushToken;
  }

  /**
   * Schedule a local notification
   */
  async scheduleNotification(
    title: string,
    body: string,
    trigger: Notifications.NotificationTriggerInput,
    options?: {
      channelId?: string;
      data?: Record<string, any>;
      sound?: string;
    }
  ): Promise<string> {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: options?.sound ?? 'default',
        data: options?.data ?? {},
        ...(Platform.OS === 'android' && {
          channelId: options?.channelId ?? 'general',
        }),
      },
      trigger,
    });

    // Track sent event
    const notificationType = options?.data?.type as string || 'unknown';
    notificationAnalyticsService.trackEvent({
      type: 'sent',
      notificationType,
      timestamp: new Date().toISOString(),
      data: options?.data,
    });

    return id;
  }

  /**
   * Send immediate notification
   */
  async sendNotification(
    title: string,
    body: string,
    options?: {
      channelId?: string;
      data?: Record<string, any>;
      sound?: string;
    }
  ): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: options?.sound ?? 'default',
        data: options?.data ?? {},
        ...(Platform.OS === 'android' && {
          channelId: options?.channelId ?? 'general',
        }),
      },
      trigger: null, // Send immediately
    });
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelNotification(id: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(id);
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  /**
   * Get all scheduled notifications
   */
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    return await Notifications.getAllScheduledNotificationsAsync();
  }

  /**
   * Set badge count
   */
  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }

  /**
   * Clear badge
   */
  async clearBadge(): Promise<void> {
    await Notifications.setBadgeCountAsync(0);
  }

  /**
   * Add notification received listener
   */
  addNotificationReceivedListener(
    listener: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(listener);
  }

  /**
   * Add notification response listener (when user taps notification)
   */
  addNotificationResponseListener(
    listener: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(listener);
  }
}

export const notificationService = new NotificationService();

