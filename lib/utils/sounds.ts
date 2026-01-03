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

      // Load PR celebration sound
      // NOTE: For now using a placeholder path - user needs to add actual sound file
      try {
        const { sound } = await Audio.Sound.createAsync(
          require('@/assets/sounds/pr-celebration.mp3'),
          { shouldPlay: false, volume: 1.0 }
        );
        this.prCelebrationSound = sound;
        logger.log('[SoundManager] ✅ PR celebration sound loaded');
      } catch (soundError) {
        logger.warn('[SoundManager] ⚠️ PR sound file not found - add assets/sounds/pr-celebration.mp3');
        // Don't throw - app can work without sound
      }

      this.isLoaded = true;
      this.isLoading = false;
      logger.log('[SoundManager] ✅ Sound manager initialized');
    } catch (error) {
      logger.error('[SoundManager] ❌ Error initializing audio:', error);
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
        logger.log('[SoundManager] ✅ PR sound unloaded');
      }
      this.isLoaded = false;
      logger.log('[SoundManager] ✅ Sounds unloaded');
    } catch (error) {
      logger.error('[SoundManager] ❌ Error unloading sounds:', error);
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
      logger.log('[SoundManager] 🔇 PR sound skipped (disabled in settings)');
      return;
    }

    if (!this.prCelebrationSound) {
      logger.warn('[SoundManager] ⚠️ PR sound not loaded - cannot play');
      return;
    }

    try {
      // Reset to beginning and play
      await this.prCelebrationSound.setPositionAsync(0);
      await this.prCelebrationSound.playAsync();
      logger.log('[SoundManager] 🔊 PR celebration sound played');
    } catch (error) {
      logger.error('[SoundManager] ❌ Error playing PR sound:', error);
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
export const areSoundsLoaded = () => soundManager.loaded;

