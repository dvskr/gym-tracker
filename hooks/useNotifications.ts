import { useEffect, useRef } from 'react';
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
        console.log('Notification received:', notification);
        // Handle notification received
      }
    );

    // Listen for user interactions with notifications
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('Notification response:', response);
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
    if (data?.type === 'pr') {
      // Navigate to exercise history
      if (data.exerciseName) {
        // router.push(`/exercise/${data.exerciseId}/history`);
      }
    } else if (data?.type === 'milestone') {
      // Navigate to history/stats
      router.push('/(tabs)/history');
    } else if (data?.type === 'workout_reminder') {
      // Navigate to workout screen
      router.push('/(tabs)/workout');
    }
  };

  return {
    // You can expose functions here if needed
  };
}

