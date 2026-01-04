import { useEffect, useRef } from 'react';
import { logger } from '@/lib/utils/logger';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';

export function useNotifications() {
  const router = useRouter();
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  useEffect(() => {
    // Listen for notifications received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
 logger.log('Notification received:', notification);
        // Handle notification received
      }
    );

    // Listen for user interactions with notifications
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
 logger.log('Notification response:', response);
        handleNotificationResponse(response);
      }
    );

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data;

    // Navigate based on notification type
    if (data?.type === 'pr' || data?.type === 'pr_notification') {
      // Navigate to progress to see PRs
      router.push('/(tabs)/progress');
    } else if (data?.type === 'milestone' || data?.type === 'achievement') {
      // Navigate to progress/achievements
      router.push('/(tabs)/progress');
    } else if (data?.type === 'workout_reminder') {
      // Navigate to workout screen
      router.push('/(tabs)/workout');
    } else if (data?.type === 'weekly_summary') {
      // Navigate to progress screen to see stats
      router.push('/(tabs)/progress');
    } else if (data?.type === 'streak_reminder' || data?.type === 'streak_celebration') {
      // Navigate to progress to see streak
      router.push('/(tabs)/progress');
    } else if (data?.type === 'inactivity_reminder') {
      // Navigate to workout screen to start a workout
      router.push('/(tabs)/workout');
    }
  };

  return {
    // You can expose functions here if needed
  };
}

