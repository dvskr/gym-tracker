import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { notificationService } from './notificationService';
import { useSettingsStore } from '@/stores/settingsStore';

class RestTimerNotificationService {
  private currentNotificationId: string | null = null;
  private vibrationInterval: NodeJS.Timeout | null = null;

  /**
   * Schedule a rest timer completion notification
   * (Deprecated - now only using haptics, kept for compatibility)
   * @param seconds - Duration in seconds until rest is complete
   * @param nextExercise - Optional name of next exercise
   */
  async scheduleRestComplete(seconds: number, nextExercise?: string): Promise<void> {
    // Cancel any existing rest notification
    await this.cancelRestNotification();
    
    // No longer scheduling notifications - using haptics only
    console.log(`✅ Rest timer set for ${seconds}s (haptics only, no notification)`);
  }

  /**
   * Cancel the current rest notification
   */
  async cancelRestNotification(): Promise<void> {
    if (this.currentNotificationId) {
      try {
        await notificationService.cancelNotification(this.currentNotificationId);
        console.log('✅ Cancelled rest timer notification');
      } catch (error) {
        console.error('Failed to cancel rest notification:', error);
      }
      this.currentNotificationId = null;
    }
    this.stopVibration();
  }

  /**
   * Trigger rest complete haptics/vibration (when app is in foreground)
   * Note: Sound is handled by the scheduled notification (works in background)
   * For foreground, we only trigger haptics since playing sound requires more complex setup
   */
  async triggerRestComplete(): Promise<void> {
    // Check if haptics are enabled in settings
    const { hapticEnabled } = useSettingsStore.getState();
    
    // Trigger haptics if enabled
    if (hapticEnabled) {
      try {
        // Strong success haptic feedback
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Additional vibration pattern for attention
        this.startVibrationPattern();

        console.log('✅ Triggered rest complete haptics');
      } catch (error) {
        console.error('Failed to trigger rest complete haptics:', error);
      }
    } else {
      console.log('⏭️ Skipping rest complete haptics (disabled in settings)');
    }
  }

  /**
   * Trigger warning haptics (10 seconds remaining)
   */
  async triggerWarning(): Promise<void> {
    // Check if haptics are enabled in settings
    const { hapticEnabled } = useSettingsStore.getState();
    
    if (!hapticEnabled) {
      return;
    }

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      console.log('⚠️ Triggered rest timer warning haptic');
    } catch (error) {
      console.error('Failed to trigger warning haptic:', error);
    }
  }

  /**
   * Trigger light tick haptic (every second)
   */
  async triggerTick(): Promise<void> {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      // Silently fail - don't spam console for ticks
    }
  }

  /**
   * Start attention-grabbing vibration pattern
   */
  private startVibrationPattern(): void {
    let count = 0;
    
    this.vibrationInterval = setInterval(async () => {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        count++;
        
        if (count >= 3) {
          this.stopVibration();
        }
      } catch (error) {
        console.error('Vibration pattern error:', error);
        this.stopVibration();
      }
    }, 300);
  }

  /**
   * Stop vibration pattern
   */
  private stopVibration(): void {
    if (this.vibrationInterval) {
      clearInterval(this.vibrationInterval);
      this.vibrationInterval = null;
    }
  }

  /**
   * Check if a rest timer notification is currently scheduled
   */
  hasActiveNotification(): boolean {
    return this.currentNotificationId !== null;
  }

  /**
   * Cleanup - cancel all rest timer notifications
   */
  async cleanup(): Promise<void> {
    await this.cancelRestNotification();
  }
}

export const restTimerNotificationService = new RestTimerNotificationService();

