import { useEffect, useCallback } from 'react';
import { BackHandler, Platform } from 'react-native';
import { router, usePathname } from 'expo-router';
import { getCurrentTab } from '@/lib/navigation/navigationState';

/**
 * Custom hook to handle Android hardware back button and system back gestures.
 * 
 * On Android:
 * - Handles hardware back button presses
 * - Handles system back gestures (Android 10+)
 * - Navigates to the current tab instead of exiting app
 * 
 * On iOS:
 * - No-op (iOS doesn't have hardware back, and swipe gestures require Stack navigator)
 * 
 * Usage:
 * ```typescript
 * export default function MyScreen() {
 *   useBackNavigation();
 *   // ... rest of component
 * }
 * ```
 */
/**
 * Custom hook to handle Android hardware back button and system back gestures.
 * 
 * On Android:
 * - Handles hardware back button presses
 * - Handles system back gestures (Android 10+)
 * - Navigates to the current tab instead of exiting app
 * 
 * On iOS:
 * - No-op (iOS doesn't have hardware back, and swipe gestures require Stack navigator)
 * 
 * Usage:
 * ```typescript
 * export default function MyScreen() {
 *   useBackNavigation();
 *   // ... rest of component
 * }
 * ```
 * 
 * IMPORTANT: Do NOT use this hook on main tab screens (Home, Workout, History, Progress, Profile).
 * Only use it on nested/sub-screens (Settings, Templates, Exercise Detail, etc.).
 */
export function useBackNavigation() {
  const pathname = usePathname();

  useEffect(() => {
    // Only run on Android (iOS doesn't have hardware back button)
    if (Platform.OS !== 'android') {
      return;
    }

    // Define main tabs - these should allow default back behavior (exit app)
    const mainTabs = [
      '/',
      '/(tabs)',
      '/(tabs)/index',
      '/(tabs)/workout',
      '/(tabs)/history',
      '/(tabs)/progress',
      '/(tabs)/profile',
    ];

    // If we're on a main tab, don't register the handler at all
    // This prevents the hook from interfering with app exit
    if (mainTabs.includes(pathname)) {
      return; // Don't register any handler
    }

    const onBackPress = () => {
      // For nested routes, navigate to parent tab
      const currentTab = getCurrentTab();

      if (currentTab) {
        // Use replace instead of push to prevent screen stacking and loops
        router.replace(currentTab as any);
        return true; // Prevent default behavior (we handled it)
      }

      return false; // Let default behavior happen
    };

    // Add event listener
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress
    );

    // Clean up on unmount
    return () => subscription.remove();
  }, [pathname]); // Re-run when pathname changes
}


