import * as Notifications from 'expo-notifications';
import { logger } from '@/lib/utils/logger';
import { useState, useEffect } from 'react';
import { Platform, Linking } from 'react-native';

export type NotificationPermissionStatus = 'undetermined' | 'granted' | 'denied';

export interface NotificationPermissions {
  status: NotificationPermissionStatus;
  isLoading: boolean;
  isGranted: boolean;
  isDenied: boolean;
  isUndetermined: boolean;
  requestPermissions: () => Promise<boolean>;
  checkPermissions: () => Promise<void>;
  openSettings: () => void;
}

/**
 * Hook for managing notification permissions
 */
export function useNotificationPermissions(): NotificationPermissions {
  const [status, setStatus] = useState<NotificationPermissionStatus>('undetermined');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkPermissions();
  }, []);

  /**
   * Check current permission status
   */
  async function checkPermissions(): Promise<void> {
    setIsLoading(true);
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      setStatus(existingStatus as NotificationPermissionStatus);
    } catch (error) {
      logger.error('Failed to check notification permissions:', error);
      setStatus('undetermined');
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Request notification permissions
   * @returns true if granted, false otherwise
   */
  async function requestPermissions(): Promise<boolean> {
    try {
      // Check current status first
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      
      if (existingStatus === 'granted') {
        setStatus('granted');
        return true;
      }

      // Request permissions with all iOS options
      const { status: newStatus } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowAnnouncements: true,
        },
      });

      setStatus(newStatus as NotificationPermissionStatus);
      
      if (newStatus === 'granted') {
        logger.log('�S& Notification permissions granted');
        return true;
      } else {
        logger.log('�R Notification permissions denied');
        return false;
      }
    } catch (error) {
      logger.error('Failed to request notification permissions:', error);
      return false;
    }
  }

  /**
   * Open device settings to change notification permissions
   */
  function openSettings(): void {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  }

  return {
    status,
    isLoading,
    isGranted: status === 'granted',
    isDenied: status === 'denied',
    isUndetermined: status === 'undetermined',
    requestPermissions,
    checkPermissions,
    openSettings,
  };
}

