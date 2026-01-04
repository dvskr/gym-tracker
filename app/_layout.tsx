import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Slot } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { clearMemoryCache } from '@/lib/images/cacheManager';
import { ThemeProvider } from '@/context/ThemeContext';
import { useAuthStore } from '@/stores/authStore';
import { initializeSettings, useSettingsStore } from '@/stores/settingsStore';
import { loadSounds, unloadSounds } from '@/lib/utils/sounds';
import { initializeNotifications } from '@/lib/notifications';

export default function RootLayout() {
  const { user, initialize, isInitialized } = useAuthStore();
  const hasInitializedNotifications = useRef(false);
  const settingsHydrated = useSettingsStore((s) => s._hasHydrated);

  useEffect(() => {
    // Initialize auth
    initialize();
  }, []);

  useEffect(() => {
    // Initialize settings from profile when user logs in
    if (user?.id && isInitialized) {
      initializeSettings(user.id);
    }
  }, [user?.id, isInitialized]);

  useEffect(() => {
    // Initialize notifications after settings are hydrated and user is logged in
    // Only run once per app session
    if (user?.id && isInitialized && settingsHydrated && !hasInitializedNotifications.current) {
      hasInitializedNotifications.current = true;
      initializeNotifications(user.id);
    }
  }, [user?.id, isInitialized, settingsHydrated]);

  useEffect(() => {
    // Load sounds on app startup
    loadSounds();

    // DON'T preload images on app startup - let them load on demand
    // Images are cached by expo-image automatically
    
    // Listen for app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
      // Unload sounds when app closes
      unloadSounds();
    };
  }, []);

  const handleAppStateChange = (nextState: AppStateStatus) => {
    if (nextState === 'background') {
      // Free up RAM when app goes to background
      clearMemoryCache();
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <Slot />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
