import { Audio } from 'expo-av';
import { useSettingsStore } from '@/stores/settingsStore';
import { logger } from './logger';

/**
 * Sound Manager
 * Handles loading, unloading, and playing of app sounds
 * Respects user settings for PR celebrations
 */
class SoundManager {
  private prCelebrationSound: Audio.Sound | null = null;
  private achievementSound: Audio.Sound | null = null;
  private restCompleteSound: Audio.Sound | null = null;
  private isLoaded: boolean = false;
  private isLoading: boolean = false;

  /**
   * Load all app sounds
   * Safe to call multiple times - will only load once
   */
  async loadSounds(): Promise<void> {
    if (this.isLoaded || this.isLoading) {
      logger.log('[SoundManager] Sounds already loaded or loading');
      return;
    }

    this.isLoading = true;

    try {
      // Configure audio mode for playback
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: false, // Don't play when device is on silent
        staysActiveInBackground: false,
        shouldDuckAndroid: true, // Lower other audio when playing
      });

      // Load PR celebration sound (reuse achievement sound)
      try {
        const { sound } = await Audio.Sound.createAsync(
          require('@/assets/sounds/achievement.mp3'),
          { shouldPlay: false, volume: 1.0 }
        );
        this.prCelebrationSound = sound;
        logger.log('[SoundManager] PR celebration sound loaded (using achievement.mp3)');
      } catch (soundError: unknown) {
        logger.warn('[SoundManager] PR sound file not found');
      }

      // Load achievement sound
      try {
        const { sound: achieveSound } = await Audio.Sound.createAsync(
          require('@/assets/sounds/achievement.mp3'),
          { shouldPlay: false, volume: 1.0 }
        );
        this.achievementSound = achieveSound;
        logger.log('[SoundManager] Achievement sound loaded');
      } catch (soundError: unknown) {
        logger.warn('[SoundManager] Achievement sound file not found - add assets/sounds/achievement.mp3');
      }

      // Load rest timer complete sound
      try {
        const { sound: restSound } = await Audio.Sound.createAsync(
          require('@/assets/sounds/rest-complete.mp3'),
          { shouldPlay: false, volume: 1.0 }
        );
        this.restCompleteSound = restSound;
        logger.log('[SoundManager] Rest complete sound loaded');
      } catch (soundError: unknown) {
        logger.warn('[SoundManager] Rest complete sound file not found (optional)');
      }

      this.isLoaded = true;
      this.isLoading = false;
      logger.log('[SoundManager] Sound manager initialized');
    } catch (error: unknown) {
      logger.error('[SoundManager] Error initializing audio:', error);
      this.isLoading = false;
    }
  }

  /**
   * Unload all sounds and free memory
   * Call when app is closing or sounds are no longer needed
   */
  async unloadSounds(): Promise<void> {
    try {
      if (this.prCelebrationSound) {
        await this.prCelebrationSound.unloadAsync();
        this.prCelebrationSound = null;
        logger.log('[SoundManager] PR sound unloaded');
      }
      if (this.achievementSound) {
        await this.achievementSound.unloadAsync();
        this.achievementSound = null;
        logger.log('[SoundManager] Achievement sound unloaded');
      }
      if (this.restCompleteSound) {
        await this.restCompleteSound.unloadAsync();
        this.restCompleteSound = null;
        logger.log('[SoundManager] Rest complete sound unloaded');
      }
      this.isLoaded = false;
      logger.log('[SoundManager] Sounds unloaded');
    } catch (error: unknown) {
      logger.error('[SoundManager] Error unloading sounds:', error);
    }
  }

  /**
   * Play PR celebration sound
   * Respects user settings: celebratePRs AND prSound must both be enabled
   */
  async playPRCelebration(): Promise<void> {
    const { prCelebrations, prSound } = useSettingsStore.getState();

    // Check both master toggle AND sound toggle
    if (!prCelebrations || !prSound) {
      logger.log('[SoundManager] PR sound skipped (disabled in settings)');
      return;
    }

    if (!this.prCelebrationSound) {
      logger.warn('[SoundManager] PR sound not loaded - cannot play');
      return;
    }

    try {
      // Reset to beginning and play
      await this.prCelebrationSound.setPositionAsync(0);
      await this.prCelebrationSound.playAsync();
      logger.log('[SoundManager] PR celebration sound played');
    } catch (error: unknown) {
      logger.error('[SoundManager] Error playing PR sound:', error);
    }
  }

  /**
   * Play achievement sound
   * Respects user settings: achievementSoundEnabled must be enabled
   */
  async playAchievementSound(): Promise<void> {
    const { achievementSoundEnabled } = useSettingsStore.getState();

    // Check sound toggle only (not push notification toggle)
    if (!achievementSoundEnabled) {
      logger.log('[SoundManager] Achievement sound skipped (disabled in settings)');
      return;
    }

    if (!this.achievementSound) {
      logger.warn('[SoundManager] Achievement sound not loaded - cannot play');
      return;
    }

    try {
      // Reset to beginning and play
      await this.achievementSound.setPositionAsync(0);
      await this.achievementSound.playAsync();
      logger.log('[SoundManager] Achievement sound played');
    } catch (error: unknown) {
      logger.error('[SoundManager] Error playing achievement sound:', error);
    }
  }

  /**
   * Play rest timer complete sound
   * Respects user setting: restTimerSound must be enabled
   */
  async playRestCompleteSound(): Promise<void> {
    const { restTimerSound } = useSettingsStore.getState();

    // Check sound toggle
    if (!restTimerSound) {
      logger.log('[SoundManager] Rest complete sound skipped (disabled in settings)');
      return;
    }

    if (!this.restCompleteSound) {
      logger.warn('[SoundManager] Rest complete sound not loaded - cannot play');
      return;
    }

    try {
      // Reset to beginning and play
      await this.restCompleteSound.setPositionAsync(0);
      await this.restCompleteSound.playAsync();
      logger.log('[SoundManager] Rest complete sound played');
    } catch (error: unknown) {
      logger.error('[SoundManager] Error playing rest complete sound:', error);
    }
  }

  /**
   * Check if sounds are loaded
   */
  get loaded(): boolean {
    return this.isLoaded;
  }
}

// Singleton instance
export const soundManager = new SoundManager();

// Convenience exports
export const loadSounds = () => soundManager.loadSounds();
export const unloadSounds = () => soundManager.unloadSounds();
export const playPRSound = () => soundManager.playPRCelebration();
export const playAchievementSound = () => soundManager.playAchievementSound();
export const playRestCompleteSound = () => soundManager.playRestCompleteSound();
export const areSoundsLoaded = () => soundManager.loaded;


