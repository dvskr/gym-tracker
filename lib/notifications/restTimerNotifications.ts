import * as Notifications from 'expo-notifications';
import { logger } from '@/lib/utils/logger';
import * as Haptics from 'expo-haptics';
import { Vibration } from 'react-native';
import { notificationService } from './notificationService';
import { useSettingsStore } from '@/stores/settingsStore';
import { playRestCompleteSound } from '@/lib/utils/sounds';

class RestTimerNotificationService {
  private currentNotificationId: string | null = null;
  private vibrationTimeout: NodeJS.Timeout | null = null;

  /**
   * Schedule a rest timer completion notification (deprecated - keeping for compatibility)
   * Now using triggerRestComplete() for immediate alerts
   * @param seconds - Duration in seconds until rest is complete
   * @param nextExercise - Optional name of next exercise
   */
  async scheduleRestComplete(seconds: number, nextExercise?: string): Promise<void> {
    // Cancel any existing rest notification
    await this.cancelRestNotification();
    
    logger.log(`[RestTimer] Timer set for ${seconds}s`);
  }

  /**
   * Cancel the current rest notification
   */
  async cancelRestNotification(): Promise<void> {
    if (this.currentNotificationId) {
      try {
        await notificationService.cancelNotification(this.currentNotificationId);
        logger.log('[RestTimer] Cancelled notification');
      } catch (error: unknown) {
        logger.error('[RestTimer] Failed to cancel notification:', error);
      }
      this.currentNotificationId = null;
    }
    this.stopVibration();
  }

  /**
   * Trigger rest timer complete alerts
   * Respects ALL settings: notificationsEnabled, restTimerAlerts, restTimerSound, restTimerVibration
   * 
   * IMPORTANT: This triggers IMMEDIATE alerts (sound + vibration), not push notifications
   * Push notifications for rest timer are not implemented (app should be in foreground during workout)
   */
  async triggerRestComplete(): Promise<void> {
    const { 
      notificationsEnabled,  // Global master toggle
      restTimerSound,        // Sound toggle
      restTimerVibration,    // Vibration toggle
    } = useSettingsStore.getState();

    // Check global master first
    if (!notificationsEnabled) {
      logger.log('[RestTimer] All notifications disabled - skipping');
      return;
    }

    // Check if at least one alert type is enabled
    if (!restTimerSound && !restTimerVibration) {
      logger.log('[RestTimer] Both sound and vibration disabled - skipping');
      return;
    }

    logger.log('[RestTimer] Rest complete - triggering configured alerts');

    // 1. Play sound (if enabled)
    if (restTimerSound) {
      await playRestCompleteSound();
    } else {
      logger.log('[RestTimer] Sound skipped (disabled)');
    }

    // 2. Vibration (if enabled)
    if (restTimerVibration) {
      await this.triggerVibration();
    } else {
      logger.log('[RestTimer] Vibration skipped (disabled)');
    }
  }

  /**
   * Trigger warning haptics (10 seconds remaining)
   * NOTE: This is intentionally disabled. Users want vibration ONLY on completion, not at 10s warning.
   * The 10-second warning is visual only (timer display changes color).
   */
  async triggerWarning(): Promise<void> {
    // 10-second warning vibration disabled by design
    // Users expect vibration only on completion, not during countdown
    logger.log('[RestTimer] 10s warning (vibration disabled by design)');
  }

  /**
   * Trigger light tick haptic (every second during countdown)
   * Note: This uses the global hapticEnabled setting
   * Tick haptics are very subtle and don't need a separate setting
   */
  async triggerTick(): Promise<void> {
    const { hapticEnabled } = useSettingsStore.getState();
    
    if (!hapticEnabled) {
      return;
    }

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error: unknown) {
      // Silently fail - don't spam console for ticks
    }
  }

  /**
   * Trigger attention-grabbing vibration pattern
   * Called when rest timer completes and restTimerVibration is enabled
   */
  private async triggerVibration(): Promise<void> {
    try {
      // Strong haptic notification first
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Additional vibration pattern for emphasis: [wait, vibrate, wait, vibrate]
      // Pattern: 0ms wait, 400ms vibrate, 200ms wait, 400ms vibrate
      Vibration.vibrate([0, 400, 200, 400]);
      
      logger.log('[RestTimer] Vibration pattern triggered');
    } catch (error: unknown) {
      logger.error('[RestTimer] Error triggering vibration:', error);
    }
  }

  /**
   * Stop vibration pattern
   */
  private stopVibration(): void {
    if (this.vibrationTimeout) {
      clearTimeout(this.vibrationTimeout);
      this.vibrationTimeout = null;
    }
    Vibration.cancel();
  }

  /**
   * Check if a rest timer notification is currently scheduled
   */
  hasActiveNotification(): boolean {
    return this.currentNotificationId !== null;
  }

  /**
   * Cleanup - cancel all rest timer notifications and vibrations
   */
  async cleanup(): Promise<void> {
    await this.cancelRestNotification();
    this.stopVibration();
  }
}

export const restTimerNotificationService = new RestTimerNotificationService();

