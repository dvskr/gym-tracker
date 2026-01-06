import { useSettingsStore } from '@/stores/settingsStore';
import { playPRSound } from './sounds';
import { successHaptic } from './haptics';
import { logger } from './logger';

/**
 * Celebration System
 * Coordinates multi-sensory PR celebrations (sound, confetti, haptics)
 * Respects user settings for each celebration type
 */

// Callback type for triggering confetti from UI component
type ConfettiCallback = () => void;

// Global confetti trigger - registered by the PRConfetti component
let triggerConfetti: ConfettiCallback | null = null;

/**
 * Register the confetti trigger function from the UI component
 * Call this from the component that renders <PRConfetti />
 * 
 * @param callback Function that triggers the confetti animation
 */
export function registerConfettiTrigger(callback: ConfettiCallback): void {
  triggerConfetti = callback;
  logger.log('[Celebrations] Confetti trigger registered');
}

/**
 * Unregister confetti trigger
 * Call this when the component with <PRConfetti /> unmounts
 */
export function unregisterConfettiTrigger(): void {
  triggerConfetti = null;
  logger.log('[Celebrations] Confetti trigger unregistered');
}

/**
 * Check if confetti trigger is registered and ready
 */
export function isConfettiReady(): boolean {
  return triggerConfetti !== null;
}

/**
 * Trigger full PR celebration
 * Respects all user settings:
 * - Master toggle: prCelebrations (controls everything)
 * - Sound toggle: prSound (if master is on)
 * - Confetti toggle: prConfetti (if master is on)
 * - Haptic is always triggered if master is on
 * 
 * @example
 * // When a PR is detected:
 * if (isPR) {
 *   await celebratePR();
 * }
 */
export async function celebratePR(): Promise<void> {
  const { prCelebrations, prSound, prConfetti } = useSettingsStore.getState();

  logger.log('[Celebrations] celebratePR() called with settings:', {
    masterToggle: prCelebrations,
    soundEnabled: prSound,
    confettiEnabled: prConfetti,
  });

  // Check master toggle first
  if (!prCelebrations) {
    logger.log('[Celebrations] SKIPPED - Master toggle (prCelebrations) is OFF');
    return;
  }

  logger.log('[Celebrations] Starting PR celebration sequence...');

  // 1. Haptic feedback (always if master is on)
  try {
    successHaptic();
    logger.log('[Celebrations] Haptic feedback triggered');
  } catch (error: unknown) {
    logger.warn('[Celebrations] Haptic not available:', error);
  }

  // 2. Play sound (if enabled)
  if (prSound) {
    logger.log('[Celebrations] Playing PR sound...');
    try {
      await playPRSound();
      logger.log('[Celebrations] PR sound played successfully');
    } catch (error: unknown) {
      logger.error('[Celebrations] Error playing sound:', error);
    }
  } else {
    logger.log('[Celebrations] Sound SKIPPED - prSound setting is OFF');
  }

  // 3. Trigger confetti (if enabled and registered)
  if (prConfetti) {
    logger.log('[Celebrations] Confetti enabled - checking if PRConfetti component is mounted...');
    if (triggerConfetti) {
      try {
        logger.log('[Celebrations] Firing confetti animation!');
        triggerConfetti();
        logger.log('[Celebrations] Confetti triggered successfully');
      } catch (error: unknown) {
        logger.error('[Celebrations] Error triggering confetti:', error);
      }
    } else {
      logger.warn('[Celebrations] Confetti FAILED - PRConfetti component not mounted (triggerConfetti is null)');
    }
  } else {
    logger.log('[Celebrations] Confetti SKIPPED - prConfetti setting is OFF');
  }
  
  logger.log('[Celebrations] PR celebration sequence complete!');
}

/**
 * Check if any celebration will happen
 * Useful for UI purposes (e.g., showing preview)
 * 
 * @returns true if master toggle is enabled
 */
export function willCelebrate(): boolean {
  const { prCelebrations } = useSettingsStore.getState();
  return prCelebrations;
}

/**
 * Get current celebration settings
 * Useful for debugging or displaying current state
 */
export function getCelebrationSettings() {
  const { prCelebrations, prSound, prConfetti } = useSettingsStore.getState();
  return {
    enabled: prCelebrations,
    sound: prCelebrations && prSound,
    confetti: prCelebrations && prConfetti,
    haptic: prCelebrations,
  };
}

