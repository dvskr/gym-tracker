import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Slot } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { clearMemoryCache } from '@/lib/images/cacheManager';
import { ThemeProvider } from '@/context/ThemeContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useAuthStore } from '@/stores/authStore';
import { useProStore } from '@/stores/proStore';
import { initializeSettings, useSettingsStore } from '@/stores/settingsStore';
import { loadSounds, unloadSounds } from '@/lib/utils/sounds';
import { initializeNotifications } from '@/lib/notifications';
import { initializePurchases, identifyUser, logoutUser } from '@/lib/services/revenuecat';
import { initSentry, setUser, clearUser } from '@/lib/sentry';
import { logger } from '@/lib/utils/logger';

// Initialize Sentry before any component renders
initSentry();

export default function RootLayout() {
  const { user, initialize, isInitialized } = useAuthStore();
  const { checkStatus, reset: resetProStore } = useProStore();
  const hasInitializedNotifications = useRef(false);
  const hasInitializedPurchases = useRef(false);
  const previousUserId = useRef<string | undefined>(undefined); // Track previous user ID
  const settingsHydrated = useSettingsStore((s) => s._hasHydrated);

  useEffect(() => {
    // Initialize auth
    initialize();
  }, []);

  useEffect(() => {
    // Initialize RevenueCat once on app startup
    if (!hasInitializedPurchases.current) {
      hasInitializedPurchases.current = true;
      const initPurchases = async () => {
        try {
          await initializePurchases(user?.id);
        } catch (error) {
          logger.error('Failed to initialize purchases:', error);
        }
      };
      initPurchases();
    }
  }, []);

  useEffect(() => {
    // Handle user login/logout for purchases
    const handleUserChange = async () => {
      // User logged in
      if (user?.id && hasInitializedPurchases.current) {
        try {
          await identifyUser(user.id);
          await checkStatus();
          previousUserId.current = user.id; // Update previous user ID
        } catch (error) {
          logger.error('Error identifying user:', error);
        }
      } 
      // User logged out (only if there was a previous user)
      else if (!user?.id && previousUserId.current && hasInitializedPurchases.current) {
        try {
          await logoutUser();
          resetProStore();
          previousUserId.current = undefined; // Clear previous user ID
        } catch (error) {
          logger.error('Error logging out user:', error);
        }
      }
    };
    handleUserChange();
  }, [user?.id]);

  useEffect(() => {
    // Initialize settings from profile when user logs in
    // Add a small delay for new signups to allow profile creation trigger to complete
    if (user?.id && isInitialized) {
      const timer = setTimeout(() => {
        initializeSettings(user.id);
      }, 500); // Small delay to let database trigger complete
      
      return () => clearTimeout(timer);
    }
  }, [user?.id, isInitialized]);

  useEffect(() => {
    // Set/clear Sentry user for error context
    if (user?.id) {
      setUser({ id: user.id, email: user.email ?? undefined });
    } else {
      clearUser();
    }
  }, [user?.id, user?.email]);

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
    } else if (nextState === 'active') {
      // Refresh Pro status when app comes to foreground
      checkStatus();
    }
  };

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider>
          <Slot />
        </ThemeProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}


