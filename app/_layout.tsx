import { useEffect } from 'react';
import { Slot, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, AppState, AppStateStatus } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { backgroundSync } from '../lib/sync/backgroundSync';
import { healthSyncService } from '../lib/health/healthSync';
import { notificationService } from '../lib/notifications/notificationService';
import { engagementNotificationService } from '../lib/notifications/engagementNotifications';
import { notificationAnalyticsService } from '../lib/notifications/notificationAnalytics';
import { calculateStreak } from '../lib/utils/streakCalculation';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { PRToast, AchievementToast } from '../components/notifications';
import { usePrefetchAI } from '../hooks/usePrefetchAI';

export default function RootLayout() {
  const router = useRouter();
  const { user, session, isInitialized } = useAuthStore();
  
  // Handle auth-based navigation
  useEffect(() => {
    if (!isInitialized) return;
    
    if (!session && !user) {
      // User signed out, redirect to login
      router.replace('/(auth)/login');
    }
  }, [session, user, isInitialized, router]);

  // Pre-fetch AI data after authentication
  usePrefetchAI();

  // Initialize notifications
  useEffect(() => {
    console.log('🔔 Initializing notifications...');
    
    notificationService.initialize().then(async (token) => {
      if (token) {
        console.log('📱 Push token received:', token.substring(0, 20) + '...');
        // Save token to user profile
        await savePushToken(token);
      }
    });

    // Set up notification listeners
    const notificationListener = notificationService.addNotificationReceivedListener((notification) => {
      console.log('🔔 Notification received:', notification);
      
      // Track received event
      const data = notification.request.content.data;
      notificationAnalyticsService.trackEvent({
        type: 'received',
        notificationType: (data?.type as string) || 'unknown',
        timestamp: new Date().toISOString(),
        data,
      });
    });

    const responseListener = notificationService.addNotificationResponseListener((response) => {
      console.log('👆 Notification tapped:', response);
      
      // Track opened event
      const data = response.notification.request.content.data;
      notificationAnalyticsService.trackEvent({
        type: 'opened',
        notificationType: (data?.type as string) || 'unknown',
        timestamp: new Date().toISOString(),
        data,
      });
      
      handleNotificationResponse(response);
    });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  // Check streak on app open
  useEffect(() => {
    checkStreakReminder();
  }, []);

  /**
   * Check if we should send a streak reminder
   */
  async function checkStreakReminder() {
    try {
      const { user } = useAuthStore.getState();
      if (!user) return;

      // Get streak data
      const streakData = await calculateStreak(user.id);
      
      // Check if we should send streak reminder
      await engagementNotificationService.checkStreakReminder(streakData);
    } catch (error) {
      console.error('Error checking streak reminder:', error);
    }
  }

  /**
   * Handle notification tap - navigate to appropriate screen
   */
  function handleNotificationResponse(response: Notifications.NotificationResponse) {
    const data = response.notification.request.content.data;
    
    if (data?.type === 'rest_complete') {
      // Rest timer complete - navigate to active workout if exists
      // The workout should already be active, just bring app to foreground
      console.log('🔔 Rest complete notification tapped - opening workout');
      router.push('/workout/active');
    } else if (data?.type === 'workout_reminder') {
      // Workout reminder - navigate to home where user can start a workout
      console.log('🔔 Workout reminder tapped - opening home');
      router.push('/(tabs)');
    } else if (data?.type === 'pr') {
      // PR notification - navigate to history
      console.log('🔔 PR notification tapped - opening history');
      router.push('/(tabs)/history');
    } else if (data?.type === 'streak_reminder') {
      // Streak reminder - navigate to home
      console.log('🔔 Streak reminder tapped - opening home');
      router.push('/(tabs)');
    }
  }

  // Start/stop background sync based on app state
  useEffect(() => {
    console.log('🚀 Initializing background sync...');
    
    // Start sync when app mounts
    backgroundSync.start();

    // Initial health sync
    healthSyncService.syncOnAppOpen();

    // Listen to app state changes
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        console.log('📱 App became active - starting sync...');
        backgroundSync.start();
        
        // Trigger health sync when app comes to foreground
        healthSyncService.syncOnAppOpen();
        
        // Clear badge when app opens
        notificationService.clearBadge();
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        console.log('📱 App went to background - stopping sync...');
        backgroundSync.stop();
      }
    });

    // Cleanup
    return () => {
      console.log('🛑 Cleaning up background sync...');
      backgroundSync.stop();
      subscription.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar style="light" />
        <Slot />
        {/* Toast notifications for PRs and achievements */}
        <PRToast />
        <AchievementToast />
      </View>
    </SafeAreaProvider>
  );
}

/**
 * Save push token to user profile
 */
async function savePushToken(token: string): Promise<void> {
  try {
    const { user } = useAuthStore.getState();
    if (!user) {
      console.log('⚠️ No user logged in, skipping push token save');
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ push_token: token })
      .eq('id', user.id);

    if (error) {
      console.error('❌ Failed to save push token:', error);
    } else {
      console.log('✅ Push token saved to profile');
    }
  } catch (error) {
    console.error('❌ Error saving push token:', error);
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
});
