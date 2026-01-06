import { logger } from '@/lib/utils/logger';
// Photos are LOCAL ONLY by default
// User must explicitly opt-in for cloud sync

import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================
// Types
// ============================================

export interface PhotoPrivacySettings {
  storeLocally: boolean;      // Always true
  syncToCloud: boolean;       // Default false
  requireAuth: boolean;       // Require biometric to view
  excludeFromBackup: boolean; // Don't include in device backup
}

const PRIVACY_SETTINGS_KEY = 'photo_privacy_settings';

// ============================================
// Default Settings
// ============================================

export const DEFAULT_PHOTO_PRIVACY: PhotoPrivacySettings = {
  storeLocally: true,       // Always true - photos stored on device
  syncToCloud: false,       // Default false - user must opt-in
  requireAuth: false,       // Default false - no biometric required
  excludeFromBackup: true,  // Default true - exclude from iCloud/Google backups
};

// ============================================
// Settings Management
// ============================================

/**
 * Get current photo privacy settings
 */
export async function getPhotoPrivacySettings(): Promise<PhotoPrivacySettings> {
  try {
    const stored = await AsyncStorage.getItem(PRIVACY_SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Ensure storeLocally is always true
      return {
        ...DEFAULT_PHOTO_PRIVACY,
        ...parsed,
        storeLocally: true,
      };
    }
    return DEFAULT_PHOTO_PRIVACY;
  } catch (error: unknown) {
 logger.error('Error reading photo privacy settings:', error);
    return DEFAULT_PHOTO_PRIVACY;
  }
}

/**
 * Update photo privacy settings
 */
export async function updatePhotoPrivacySettings(
  updates: Partial<Omit<PhotoPrivacySettings, 'storeLocally'>>
): Promise<PhotoPrivacySettings> {
  try {
    const current = await getPhotoPrivacySettings();
    const updated: PhotoPrivacySettings = {
      ...current,
      ...updates,
      storeLocally: true, // Always true
    };
    await AsyncStorage.setItem(PRIVACY_SETTINGS_KEY, JSON.stringify(updated));
    return updated;
  } catch (error: unknown) {
 logger.error('Error updating photo privacy settings:', error);
    throw error;
  }
}

/**
 * Check if cloud sync is enabled
 */
export async function isCloudSyncEnabled(): Promise<boolean> {
  const settings = await getPhotoPrivacySettings();
  return settings.syncToCloud;
}

/**
 * Check if biometric auth is required to view photos
 */
export async function requiresAuthToView(): Promise<boolean> {
  const settings = await getPhotoPrivacySettings();
  return settings.requireAuth;
}

/**
 * Enable cloud sync (requires explicit user action)
 */
export async function enableCloudSync(): Promise<void> {
  await updatePhotoPrivacySettings({ syncToCloud: true });
}

/**
 * Disable cloud sync
 */
export async function disableCloudSync(): Promise<void> {
  await updatePhotoPrivacySettings({ syncToCloud: false });
}

/**
 * Enable biometric authentication for viewing photos
 */
export async function enableBiometricAuth(): Promise<void> {
  await updatePhotoPrivacySettings({ requireAuth: true });
}

/**
 * Disable biometric authentication for viewing photos
 */
export async function disableBiometricAuth(): Promise<void> {
  await updatePhotoPrivacySettings({ requireAuth: false });
}

// ============================================
// Privacy Info
// ============================================

export const PRIVACY_INFO = {
  localStorage: {
    title: 'Local Storage Only',
    description: 'Your progress photos are stored only on this device. They are never uploaded to our servers unless you explicitly enable cloud sync.',
  },
  cloudSync: {
    title: 'Cloud Sync (Optional)',
    description: 'When enabled, photos are encrypted and synced to secure cloud storage. This allows access across devices but requires an internet connection.',
    warning: 'Cloud sync will upload your photos to our secure servers. You can delete them at any time.',
  },
  biometricAuth: {
    title: 'Biometric Protection',
    description: 'Require Face ID, Touch ID, or device passcode to view your progress photos.',
  },
  excludeFromBackup: {
    title: 'Exclude from Device Backup',
    description: 'When enabled, progress photos are not included in iCloud or Google Drive device backups for additional privacy.',
  },
};

// ============================================
// Photo Security Helpers
// ============================================

/**
 * Get the appropriate directory for storing photos based on privacy settings
 * Returns a path that may be excluded from backups
 */
export function getSecurePhotoDirectory(): string {
  // On iOS: Use Documents directory with .nosync suffix
  // On Android: Use internal app storage
  return 'progress_photos';
}

/**
 * Check if a photo should be synced to cloud
 */
export async function shouldSyncPhoto(photoId: string): Promise<boolean> {
  const settings = await getPhotoPrivacySettings();
  return settings.syncToCloud;
}

/**
 * Get privacy status summary for UI display
 */
export async function getPrivacyStatusSummary(): Promise<{
  icon: string;
  title: string;
  description: string;
}> {
  const settings = await getPhotoPrivacySettings();
  
  if (settings.syncToCloud) {
    return {
      icon: '܁',
      title: 'Cloud Sync Enabled',
      description: 'Photos are synced across devices',
    };
  }
  
  if (settings.requireAuth) {
    return {
      icon: 'x',
      title: 'Protected',
      description: 'Biometric required to view',
    };
  }
  
  return {
    icon: 'x',
    title: 'Local Only',
    description: 'Photos stored on this device only',
  };
}

