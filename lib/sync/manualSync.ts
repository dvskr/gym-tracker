import NetInfo from '@react-native-community/netinfo';
import { logger } from '@/lib/utils/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncQueue } from './syncQueue';
import { backgroundSync } from './backgroundSync';
import { localDB } from '../storage/localDatabase';

export interface SyncResult {
  success: boolean;
  syncedCount?: number;
  failedCount?: number;
  pulledCount?: number;
  error?: string;
  timestamp: number;
}

export interface SyncSettings {
  autoSync: boolean;
  syncOnWifiOnly: boolean;
  syncFrequency: 30000 | 60000 | 300000 | -1; // 30s, 1m, 5m, or manual (-1)
}

const SETTINGS_KEY = '@gym/sync_settings';
const LAST_SYNC_KEY = '@gym/last_sync';
const DATA_USAGE_KEY = '@gym/data_usage';

class ManualSync {
  private defaultSettings: SyncSettings = {
    autoSync: true,
    syncOnWifiOnly: false,
    syncFrequency: 30000, // 30 seconds
  };

  /**
   * Perform a manual sync now
   * Combines queue processing and background sync
   */
  async syncNow(): Promise<SyncResult> {
 logger.log('x Manual sync initiated...');

    const result: SyncResult = {
      success: false,
      syncedCount: 0,
      failedCount: 0,
      pulledCount: 0,
      timestamp: Date.now(),
    };

    try {
      // 1. Check network connectivity
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        result.error = 'No internet connection';
 logger.log('R Sync failed: offline');
        return result;
      }

      // Check WiFi-only setting
      const settings = await this.getSettings();
      if (settings.syncOnWifiOnly && netInfo.type !== 'wifi') {
        result.error = 'WiFi required for sync (check settings)';
 logger.log('R Sync failed: WiFi only enabled');
        return result;
      }

 logger.log('S& Network check passed');

      // 2. Process sync queue (push local changes)
      const queueResult = await syncQueue.syncAll();
      result.syncedCount = queueResult.synced;
      result.failedCount = queueResult.failed;
      
 logger.log(`x Pushed ${queueResult.synced} changes, ${queueResult.failed} failed`);

      // 3. Pull latest from server (background sync)
      const bgSyncResult = await backgroundSync.syncNow();
      result.pulledCount = bgSyncResult.itemsPulled;
      
 logger.log(`x Pulled ${bgSyncResult.itemsPulled} updates`);

      // 4. Update last sync time
      await this.updateLastSyncTime();

      // 5. Track data usage (approximate)
      await this.trackDataUsage(result);

      result.success = true;
 logger.log('S& Manual sync completed successfully');
      
    } catch (error) {
 logger.error('R Manual sync error:', error);
      result.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return result;
  }

  /**
   * Retry all failed operations
   */
  async retryAllFailed(): Promise<SyncResult> {
 logger.log('x Retrying all failed operations...');

    const result: SyncResult = {
      success: false,
      timestamp: Date.now(),
    };

    try {
      // Check network
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        result.error = 'No internet connection';
        return result;
      }

      // Retry failed operations
      const retryResult = await syncQueue.retryFailedOperations();
      result.syncedCount = retryResult.synced;
      result.failedCount = retryResult.failed;
      result.success = true;

 logger.log(`S& Retry complete: ${retryResult.synced} synced, ${retryResult.failed} still failed`);
      
    } catch (error) {
 logger.error('R Retry failed:', error);
      result.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return result;
  }

  /**
   * Discard all failed operations
   * Removes them from the queue without syncing
   */
  async discardAllFailed(): Promise<number> {
 logger.log('x Discarding all failed operations...');

    try {
      const count = await syncQueue.clearFailedOperations();
 logger.log(`S& Discarded ${count} failed operation(s)`);
      return count;
    } catch (error) {
 logger.error('R Discard failed:', error);
      return 0;
    }
  }

  /**
   * Retry a specific failed operation
   */
  async retryOperation(operationId: string): Promise<boolean> {
    try {
      const queue = await syncQueue.getStatus();
      const operation = queue.operations.find(op => op.id === operationId);
      
      if (!operation) {
 logger.error('Operation not found:', operationId);
        return false;
      }

      // Reset attempts and retry
      await localDB.updateSyncOperation(operationId, {
        attempts: 0,
        error: undefined,
      });

      await syncQueue.syncAll();
      return true;
    } catch (error) {
 logger.error('Retry operation failed:', error);
      return false;
    }
  }

  /**
   * Discard a specific failed operation
   */
  async discardOperation(operationId: string): Promise<boolean> {
    try {
      await localDB.removeFromSyncQueue(operationId);
 logger.log('S& Operation discarded:', operationId);
      return true;
    } catch (error) {
 logger.error('Discard operation failed:', error);
      return false;
    }
  }

  /**
   * Get sync settings
   */
  async getSettings(): Promise<SyncSettings> {
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      return this.defaultSettings;
    } catch (error) {
 logger.error('Error loading sync settings:', error);
      return this.defaultSettings;
    }
  }

  /**
   * Update sync settings
   */
  async updateSettings(settings: Partial<SyncSettings>): Promise<void> {
    try {
      const current = await this.getSettings();
      const updated = { ...current, ...settings };
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));

      // Apply new settings to background sync
      if (updated.autoSync) {
        backgroundSync.setSyncInterval(updated.syncFrequency > 0 ? updated.syncFrequency : 30000);
        if (!backgroundSync.getStatus().isRunning) {
          // Auto-sync is enabled but not running - start it
          const user = await this.getCurrentUser();
          if (user) {
            backgroundSync.start();
          }
        }
      } else {
        backgroundSync.stop();
      }

 logger.log('S& Sync settings updated:', updated);
    } catch (error) {
 logger.error('Error updating sync settings:', error);
    }
  }

  /**
   * Get last sync time
   */
  async getLastSyncTime(): Promise<number | null> {
    try {
      const time = await backgroundSync.getLastSyncTime();
      return time;
    } catch (error) {
 logger.error('Error getting last sync time:', error);
      return null;
    }
  }

  /**
   * Get pending changes by type
   */
  async getPendingChanges(): Promise<{
    workouts: number;
    templates: number;
    weightLog: number;
    measurements: number;
    total: number;
  }> {
    try {
      const status = await syncQueue.getStatus();
      const operations = status.operations.filter(op => op.attempts < 3);

      const counts = {
        workouts: operations.filter(op => op.table === 'workouts').length,
        templates: operations.filter(op => op.table === 'workout_templates').length,
        weightLog: operations.filter(op => op.table === 'body_weight_log').length,
        measurements: operations.filter(op => op.table === 'body_measurements').length,
        total: operations.length,
      };

      return counts;
    } catch (error) {
 logger.error('Error getting pending changes:', error);
      return { workouts: 0, templates: 0, weightLog: 0, measurements: 0, total: 0 };
    }
  }

  /**
   * Get data usage this month (approximate)
   */
  async getDataUsage(): Promise<{ bytes: number; formatted: string }> {
    try {
      const stored = await AsyncStorage.getItem(DATA_USAGE_KEY);
      if (!stored) {
        return { bytes: 0, formatted: '0 B' };
      }

      const data = JSON.parse(stored);
      const currentMonth = new Date().getMonth();
      
      // Reset if different month
      if (data.month !== currentMonth) {
        await AsyncStorage.setItem(DATA_USAGE_KEY, JSON.stringify({
          month: currentMonth,
          bytes: 0,
        }));
        return { bytes: 0, formatted: '0 B' };
      }

      return {
        bytes: data.bytes || 0,
        formatted: this.formatBytes(data.bytes || 0),
      };
    } catch (error) {
 logger.error('Error getting data usage:', error);
      return { bytes: 0, formatted: '0 B' };
    }
  }

  /**
   * Check if sync is available (online and not WiFi-only restricted)
   */
  async canSync(): Promise<{ canSync: boolean; reason?: string }> {
    const netInfo = await NetInfo.fetch();
    
    if (!netInfo.isConnected) {
      return { canSync: false, reason: 'No internet connection' };
    }

    const settings = await this.getSettings();
    if (settings.syncOnWifiOnly && netInfo.type !== 'wifi') {
      return { canSync: false, reason: 'WiFi required (check settings)' };
    }

    return { canSync: true };
  }

  // Private helper methods

  private async updateLastSyncTime(): Promise<void> {
    try {
      await AsyncStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
    } catch (error) {
 logger.error('Error updating last sync time:', error);
    }
  }

  private async trackDataUsage(result: SyncResult): Promise<void> {
    try {
      // Approximate data usage based on sync counts
      const estimatedBytes = 
        (result.syncedCount || 0) * 1024 +  // ~1KB per synced item
        (result.pulledCount || 0) * 2048;   // ~2KB per pulled item

      const stored = await AsyncStorage.getItem(DATA_USAGE_KEY);
      const currentMonth = new Date().getMonth();
      
      let data = stored ? JSON.parse(stored) : { month: currentMonth, bytes: 0 };
      
      // Reset if different month
      if (data.month !== currentMonth) {
        data = { month: currentMonth, bytes: 0 };
      }
      
      data.bytes += estimatedBytes;
      
      await AsyncStorage.setItem(DATA_USAGE_KEY, JSON.stringify(data));
    } catch (error) {
 logger.error('Error tracking data usage:', error);
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private async getCurrentUser(): Promise<{ id: string } | null> {
    // This would come from your auth store
    // Placeholder implementation
    return null;
  }
}

// Singleton instance
export const manualSync = new ManualSync();
export default manualSync;
