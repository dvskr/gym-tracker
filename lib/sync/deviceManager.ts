import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { supabase } from '../supabase';
import { useAuthStore } from '@/stores/authStore';

export interface DeviceInfo {
  id: string;
  name: string;
  platform: 'ios' | 'android' | 'web';
  lastActive: Date;
  appVersion: string;
  isCurrent: boolean;
  createdAt: Date;
}

export interface ActiveWorkout {
  id: string;
  deviceId: string;
  deviceName: string;
  startedAt: Date;
}

class DeviceManager {
  private deviceId: string | null = null;
  private readonly DEVICE_ID_KEY = '@gym/device_id';
  private updateInterval: NodeJS.Timeout | null = null;

  /**
   * Get or create unique device ID
   */
  async getDeviceId(): Promise<string> {
    if (this.deviceId) return this.deviceId;

    let id = await AsyncStorage.getItem(this.DEVICE_ID_KEY);
    if (!id) {
      id = this.generateDeviceId();
      await AsyncStorage.setItem(this.DEVICE_ID_KEY, id);
      console.log('📱 New device ID created:', id);
    }

    this.deviceId = id;
    return id;
  }

  /**
   * Register this device in the database
   */
  async registerDevice(): Promise<void> {
    console.log('📱 Registering device...');

    const userId = useAuthStore.getState().user?.id;
    if (!userId) {
      console.log('⚠️ No user ID, skipping device registration');
      return;
    }

    try {
      const deviceId = await this.getDeviceId();
      const deviceInfo = await this.getDeviceInfo();

      const { error } = await supabase.from('user_devices').upsert(
        {
          id: deviceId,
          user_id: userId,
          name: deviceInfo.name,
          platform: Platform.OS as 'ios' | 'android' | 'web',
          app_version: deviceInfo.appVersion,
          last_active: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

      if (error) {
        console.error('❌ Error registering device:', error);
      } else {
        console.log('✅ Device registered successfully');
      }
    } catch (error) {
      console.error('❌ Error in registerDevice:', error);
    }
  }

  /**
   * Update last active timestamp
   */
  async updateLastActive(): Promise<void> {
    try {
      const deviceId = await this.getDeviceId();
      const userId = useAuthStore.getState().user?.id;

      if (!userId) return;

      await supabase
        .from('user_devices')
        .update({ last_active: new Date().toISOString() })
        .eq('id', deviceId)
        .eq('user_id', userId);
    } catch (error) {
      console.error('Error updating last active:', error);
    }
  }

  /**
   * Start periodic last active updates
   */
  startPeriodicUpdates(): void {
    if (this.updateInterval) return;

    // Update immediately
    this.updateLastActive();

    // Then update every 5 minutes
    this.updateInterval = setInterval(() => {
      this.updateLastActive();
    }, 5 * 60 * 1000);

    console.log('⏰ Started periodic device updates (every 5 min)');
  }

  /**
   * Stop periodic updates
   */
  stopPeriodicUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      console.log('⏸️ Stopped periodic device updates');
    }
  }

  /**
   * Get all devices for current user
   */
  async getDevices(): Promise<DeviceInfo[]> {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return [];

    try {
      const currentDeviceId = await this.getDeviceId();

      const { data, error } = await supabase
        .from('user_devices')
        .select('*')
        .eq('user_id', userId)
        .order('last_active', { ascending: false });

      if (error) {
        console.error('Error fetching devices:', error);
        return [];
      }

      return (data || []).map((d) => ({
        id: d.id,
        name: d.name,
        platform: d.platform,
        lastActive: new Date(d.last_active),
        appVersion: d.app_version,
        isCurrent: d.id === currentDeviceId,
        createdAt: new Date(d.created_at),
      }));
    } catch (error) {
      console.error('Error getting devices:', error);
      return [];
    }
  }

  /**
   * Remove a device (logout from device)
   */
  async removeDevice(deviceId: string): Promise<void> {
    console.log('🗑️ Removing device:', deviceId);

    try {
      const { error } = await supabase.from('user_devices').delete().eq('id', deviceId);

      if (error) {
        console.error('Error removing device:', error);
        throw error;
      }

      console.log('✅ Device removed successfully');
    } catch (error) {
      console.error('Error in removeDevice:', error);
      throw error;
    }
  }

  /**
   * Remove all devices except current
   */
  async removeAllOtherDevices(): Promise<number> {
    console.log('🗑️ Removing all other devices...');

    const userId = useAuthStore.getState().user?.id;
    const currentDeviceId = await this.getDeviceId();

    if (!userId) throw new Error('Not authenticated');

    try {
      const { data, error } = await supabase
        .from('user_devices')
        .delete()
        .eq('user_id', userId)
        .neq('id', currentDeviceId)
        .select();

      if (error) throw error;

      const count = data?.length || 0;
      console.log(`✅ Removed ${count} device(s)`);
      return count;
    } catch (error) {
      console.error('Error removing other devices:', error);
      throw error;
    }
  }

  /**
   * Check for active workout on other devices
   */
  async checkActiveWorkoutOnOtherDevices(): Promise<ActiveWorkout | null> {
    const userId = useAuthStore.getState().user?.id;
    const currentDeviceId = await this.getDeviceId();

    if (!userId) return null;

    try {
      // Find workouts that are still in progress (no end time)
      const { data: workouts, error: workoutsError } = await supabase
        .from('workouts')
        .select('id, started_at, device_id')
        .eq('user_id', userId)
        .is('ended_at', null)
        .neq('device_id', currentDeviceId)
        .order('started_at', { ascending: false })
        .limit(1);

      if (workoutsError) throw workoutsError;

      if (!workouts || workouts.length === 0) {
        return null;
      }

      const workout = workouts[0];

      // Get device info
      const { data: device, error: deviceError } = await supabase
        .from('user_devices')
        .select('name')
        .eq('id', workout.device_id)
        .single();

      if (deviceError) {
        console.error('Error fetching device info:', deviceError);
      }

      return {
        id: workout.id,
        deviceId: workout.device_id,
        deviceName: device?.name || 'Another device',
        startedAt: new Date(workout.started_at),
      };
    } catch (error) {
      console.error('Error checking active workout:', error);
      return null;
    }
  }

  /**
   * End workout on another device
   */
  async endWorkoutOnOtherDevice(workoutId: string): Promise<void> {
    console.log('⏹️ Ending workout on other device:', workoutId);

    try {
      const { error } = await supabase
        .from('workouts')
        .update({
          ended_at: new Date().toISOString(),
          duration_seconds: 0, // Will be calculated if needed
        })
        .eq('id', workoutId);

      if (error) throw error;

      console.log('✅ Workout ended on other device');
    } catch (error) {
      console.error('Error ending workout on other device:', error);
      throw error;
    }
  }

  /**
   * Cleanup on logout
   */
  async cleanup(): Promise<void> {
    this.stopPeriodicUpdates();
    this.deviceId = null;
  }

  // Private helper methods

  private generateDeviceId(): string {
    return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async getDeviceInfo(): Promise<{ name: string; appVersion: string }> {
    let deviceName = 'Unknown Device';
    let appVersion = '1.0.0';

    try {
      // Get device name
      if (Platform.OS === 'web') {
        deviceName = 'Web Browser';
      } else {
        const name = await Device.deviceName;
        const modelName = Device.modelName;
        deviceName = name || modelName || `${Platform.OS} Device`;
      }

      // Get app version
      if (Platform.OS !== 'web') {
        appVersion = Application.nativeApplicationVersion || '1.0.0';
      }
    } catch (error) {
      console.error('Error getting device info:', error);
    }

    return { name: deviceName, appVersion };
  }

  /**
   * Get device platform icon emoji
   */
  getPlatformIcon(platform: string): string {
    switch (platform) {
      case 'ios':
        return '📱';
      case 'android':
        return '🤖';
      case 'web':
        return '🌐';
      default:
        return '📱';
    }
  }

  /**
   * Format last active time
   */
  formatLastActive(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'Just now';
    if (minutes < 2) return '1 minute ago';
    if (minutes < 60) return `${minutes} minutes ago`;
    if (hours < 2) return '1 hour ago';
    if (hours < 24) return `${hours} hours ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;

    return date.toLocaleDateString();
  }
}

// Singleton instance
export const deviceManager = new DeviceManager();
export default deviceManager;

