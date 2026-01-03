import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Slot } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { clearMemoryCache } from '@/lib/images/cacheManager';
import { ThemeProvider } from '@/context/ThemeContext';
import { useAuthStore } from '@/stores/authStore';
import { initializeSettings } from '@/stores/settingsStore';
import { loadSounds, unloadSounds } from '@/lib/utils/sounds';

export default function RootLayout() {
  const { user, initialize, isInitialized } = useAuthStore();

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
