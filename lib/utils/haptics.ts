import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { useSettingsStore } from '@/stores/settingsStore';

/**
 * Haptic feedback utilities
 * All functions are safe to call - they check platform, settings, and fail silently
 */

/**
 * Success haptic - for positive actions like completing a set or finishing a workout
 */
export function successHaptic() {
  if (Platform.OS === 'web') return;
  
  const { hapticEnabled } = useSettingsStore.getState();
  if (!hapticEnabled) return;
  
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch (error) {
    // Fail silently
  }
}

/**
 * Warning haptic - for alerts like rest timer ending
 */
export function warningHaptic() {
  if (Platform.OS === 'web') return;
  
  const { hapticEnabled } = useSettingsStore.getState();
  if (!hapticEnabled) return;
  
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch (error) {
    // Fail silently
  }
}

/**
 * Error haptic - for error states or destructive actions
 */
export function errorHaptic() {
  if (Platform.OS === 'web') return;
  
  const { hapticEnabled } = useSettingsStore.getState();
  if (!hapticEnabled) return;
  
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch (error) {
    // Fail silently
  }
}

/**
 * Light impact - for light taps like increment buttons
 */
export function lightHaptic() {
  if (Platform.OS === 'web') return;
  
  const { hapticEnabled } = useSettingsStore.getState();
  if (!hapticEnabled) return;
  
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch (error) {
    // Fail silently
  }
}

/**
 * Medium impact - for medium actions like deleting a set
 */
export function mediumHaptic() {
  if (Platform.OS === 'web') return;
  
  const { hapticEnabled } = useSettingsStore.getState();
  if (!hapticEnabled) return;
  
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch (error) {
    // Fail silently
  }
}

/**
 * Heavy impact - for heavy actions
 */
export function heavyHaptic() {
  if (Platform.OS === 'web') return;
  
  const { hapticEnabled } = useSettingsStore.getState();
  if (!hapticEnabled) return;
  
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } catch (error) {
    // Fail silently
  }
}

/**
 * Selection haptic - for selection changes like scrolling through options
 */
export function selectionHaptic() {
  if (Platform.OS === 'web') return;
  
  const { hapticEnabled } = useSettingsStore.getState();
  if (!hapticEnabled) return;
  
  try {
    Haptics.selectionAsync();
  } catch (error) {
    // Fail silently
  }
}

