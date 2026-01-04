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

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/068831e1-39c2-46d3-afd8-7578e38ed77a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'celebrations.ts:59',message:'celebratePR called',data:{prCelebrations,prSound,prConfetti},timestamp:Date.now(),sessionId:'debug-session',runId:'pr-sound-v2',hypothesisId:'SETTINGS_DISABLED'})}).catch(()=>{});
  // #endregion

  // Check master toggle first
  if (!prCelebrations) {
    logger.log('[Celebrations] PR celebrations disabled in settings');
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/068831e1-39c2-46d3-afd8-7578e38ed77a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'celebrations.ts:68',message:'Celebrations DISABLED',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'pr-sound-v2',hypothesisId:'SETTINGS_DISABLED'})}).catch(()=>{});
    // #endregion
    return;
  }

  logger.log('[Celebrations] Celebrating PR', {
    sound: prSound,
    confetti: prConfetti,
  });

  // 1. Haptic feedback (always if master is on)
  try {
    successHaptic();
    logger.log('[Celebrations] Haptic feedback triggered');
  } catch (error) {
    logger.warn('[Celebrations] Haptic not available:', error);
  }

  // 2. Play sound (if enabled)
  if (prSound) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/068831e1-39c2-46d3-afd8-7578e38ed77a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'celebrations.ts:89',message:'About to call playPRSound',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'pr-sound-v2',hypothesisId:'SOUND_NOT_LOADED'})}).catch(()=>{});
    // #endregion
    try {
      await playPRSound();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/068831e1-39c2-46d3-afd8-7578e38ed77a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'celebrations.ts:95',message:'playPRSound completed',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'pr-sound-v2',hypothesisId:'SOUND_NOT_LOADED'})}).catch(()=>{});
      // #endregion
    } catch (error) {
      logger.error('[Celebrations] Error playing sound:', error);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/068831e1-39c2-46d3-afd8-7578e38ed77a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'celebrations.ts:101',message:'playPRSound ERROR',data:{error:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'pr-sound-v2',hypothesisId:'SOUND_NOT_LOADED'})}).catch(()=>{});
      // #endregion
    }
  } else {
    logger.log('[Celebrations] Sound skipped (disabled)');
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/068831e1-39c2-46d3-afd8-7578e38ed77a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'celebrations.ts:108',message:'Sound SKIPPED - disabled in settings',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'pr-sound-v2',hypothesisId:'SETTINGS_DISABLED'})}).catch(()=>{});
    // #endregion
  }

  // 3. Trigger confetti (if enabled and registered)
  if (prConfetti) {
    logger.log('[Celebrations] Confetti enabled - checking if registered');
    logger.log('[Celebrations] triggerConfetti function exists:', !!triggerConfetti);
    if (triggerConfetti) {
      try {
        logger.log('[Celebrations] Calling triggerConfetti()');
        triggerConfetti();
        logger.log('[Celebrations] Confetti triggered');
      } catch (error) {
        logger.error('[Celebrations] Error triggering confetti:', error);
      }
    } else {
      logger.warn('[Celebrations] Confetti enabled but not registered - PRConfetti component may not be mounted');
    }
  } else {
    logger.log('[Celebrations] Confetti skipped (disabled in settings)');
  }
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

