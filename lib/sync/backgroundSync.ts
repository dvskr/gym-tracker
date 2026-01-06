import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/lib/utils/logger';
import NetInfo from '@react-native-community/netinfo';
import { syncQueue } from './syncQueue';
import { mergeWorkouts, mergeTemplates, mergeWeightLog, mergeMeasurements, mergePersonalRecords } from './dataMerger';
import { supabase } from '../supabase';

export interface SyncStats {
  lastSyncTime: number | null;
  itemsSynced: number;
  itemsPulled: number;
  errors: string[];
}

class BackgroundSync {
  private syncInterval: NodeJS.Timeout | null = null;
  private syncIntervalMs = 30000; // 30 seconds (can be changed)
  private readonly LAST_SYNC_KEY = '@gym/last_sync_time';
  private isSyncing = false;
  private isOnline = true;

  constructor() {
    // Monitor network state
    this.initNetworkMonitor();
  }

  /**
   * Initialize network state monitoring
   */
  private initNetworkMonitor(): void {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;

      // Just came online - sync immediately
      if (wasOffline && this.isOnline) {
 logger.log('x Network reconnected - syncing immediately...');
        this.sync();
      }
    });
  }

  /**
   * Start background sync
   * Called when app becomes active
   */
  start(): void {
    if (this.syncInterval) {
 logger.log('a Background sync already running');
      return;
    }

 logger.log('x Starting background sync...');

    // Initial sync
    this.sync();

    // Periodic sync every 30 seconds
    this.syncInterval = setInterval(() => {
      this.sync();
    }, this.syncIntervalMs);
  }

  /**
   * Stop background sync
   * Called when app goes to background
   */
  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
 logger.log(' Background sync stopped');
    }
  }

  /**
   * Perform full bidirectional sync
   * 1. Push local changes to server (via syncQueue)
   * 2. Pull server changes to local
   * 3. Merge data intelligently
   */
  async sync(): Promise<SyncStats> {
    // Don't sync if already syncing or offline
    if (this.isSyncing) {
 logger.log(' Sync already in progress, skipping...');
      return this.getEmptyStats();
    }

    if (!this.isOnline) {
 logger.log('x Offline - skipping sync');
      return this.getEmptyStats();
    }

    this.isSyncing = true;
    const stats: SyncStats = {
      lastSyncTime: Date.now(),
      itemsSynced: 0,
      itemsPulled: 0,
      errors: [],
    };

    try {
 logger.log('x Starting bidirectional sync...');

      // STEP 1: Push local changes (via sync queue)
      try {
        const pushResult = await syncQueue.syncAll();
        stats.itemsSynced = pushResult.synced;
 logger.log(`S& Pushed ${pushResult.synced} local change(s)`);
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        stats.errors.push(`Push failed: ${errorMsg}`);
 logger.error('R Push failed:', error);
      }

      // STEP 2: Pull latest data from server
      try {
        const pullCount = await this.pullLatestData();
        stats.itemsPulled = pullCount;
 logger.log(`S& Pulled ${pullCount} update(s) from server`);
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        stats.errors.push(`Pull failed: ${errorMsg}`);
 logger.error('R Pull failed:', error);
      }

      // STEP 3: Update last sync timestamp
      await this.updateLastSyncTime(stats.lastSyncTime);

 logger.log('S& Sync complete:', stats);
    } catch (error: unknown) {
 logger.error('R Sync error:', error);
      stats.errors.push(error instanceof Error ? error.message : String(error));
    } finally {
      this.isSyncing = false;
    }

    return stats;
  }

  /**
   * Pull latest data from server for multi-device sync
   * Fetches data updated since last sync
   */
  private async pullLatestData(): Promise<number> {
    const lastSync = await this.getLastSyncTime();
    const since = lastSync 
      ? new Date(lastSync).toISOString() 
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // Last 30 days

    let totalPulled = 0;

    try {
      // Get current user ID from Supabase session
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
 logger.log('No authenticated user, skipping pull');
        return 0;
      }

      // Pull workouts updated since last sync
      const { data: workouts, error: workoutsError } = await supabase
        .from('workouts')
        .select(`
          *,
          workout_exercises (
            *,
            workout_sets (*)
          )
        `)
        .eq('user_id', user.id)
        .gte('updated_at', since)
        .order('updated_at', { ascending: false });

      if (workoutsError) throw workoutsError;
      
      if (workouts && workouts.length > 0) {
        await mergeWorkouts(workouts);
        totalPulled += workouts.length;
 logger.log(`x Pulled ${workouts.length} workout(s)`);
      }

      // Pull templates updated since last sync
      const { data: templates, error: templatesError } = await supabase
        .from('workout_templates')
        .select(`
          *,
          template_exercises (*)
        `)
        .eq('user_id', user.id)
        .gte('updated_at', since)
        .order('updated_at', { ascending: false });

      if (templatesError) throw templatesError;

      if (templates && templates.length > 0) {
        await mergeTemplates(templates);
        totalPulled += templates.length;
 logger.log(`x Pulled ${templates.length} template(s)`);
      }

      // Pull weight log
      const { data: weightLog, error: weightError } = await supabase
        .from('body_weight_log')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', since)
        .order('logged_at', { ascending: false });

      if (weightError) throw weightError;

      if (weightLog && weightLog.length > 0) {
        await mergeWeightLog(weightLog);
        totalPulled += weightLog.length;
 logger.log(`x Pulled ${weightLog.length} weight log(s)`);
      }

      // Pull measurements
      const { data: measurements, error: measurementsError } = await supabase
        .from('body_measurements')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', since)
        .order('measured_at', { ascending: false });

      if (measurementsError) throw measurementsError;

      if (measurements && measurements.length > 0) {
        await mergeMeasurements(measurements);
        totalPulled += measurements.length;
 logger.log(`x Pulled ${measurements.length} measurement(s)`);
      }

      // Pull personal records
      const { data: prs, error: prsError } = await supabase
        .from('personal_records')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', since)
        .order('achieved_at', { ascending: false });

      if (prsError) throw prsError;

      if (prs && prs.length > 0) {
        await mergePersonalRecords(prs);
        totalPulled += prs.length;
 logger.log(`x Pulled ${prs.length} PR(s)`);
      }

    } catch (error: unknown) {
 logger.error('Error pulling data:', error);
      throw error;
    }

    return totalPulled;
  }

  /**
   * Force sync now (called manually or on network reconnect)
   */
  async syncNow(): Promise<SyncStats> {
    return await this.sync();
  }

  /**
   * Get last sync time
   */
  async getLastSyncTime(): Promise<number | null> {
    try {
      const lastSync = await AsyncStorage.getItem(this.LAST_SYNC_KEY);
      return lastSync ? parseInt(lastSync, 10) : null;
    } catch (error: unknown) {
 logger.error('Error getting last sync time:', error);
      return null;
    }
  }

  /**
   * Update last sync timestamp
   */
  private async updateLastSyncTime(timestamp: number): Promise<void> {
    try {
      await AsyncStorage.setItem(this.LAST_SYNC_KEY, timestamp.toString());
    } catch (error: unknown) {
 logger.error('Error updating last sync time:', error);
    }
  }

  /**
   * Get sync status
   */
  getStatus(): { isRunning: boolean; isSyncing: boolean; isOnline: boolean } {
    return {
      isRunning: this.syncInterval !== null,
      isSyncing: this.isSyncing,
      isOnline: this.isOnline,
    };
  }

  /**
   * Set sync interval (in milliseconds)
   */
  setSyncInterval(intervalMs: number): void {
    this.syncIntervalMs = intervalMs;
    
    // Restart with new interval if currently running
    if (this.syncInterval) {
      this.stop();
      this.start();
    }
  }

  /**
   * Get empty stats object
   */
  private getEmptyStats(): SyncStats {
    return {
      lastSyncTime: null,
      itemsSynced: 0,
      itemsPulled: 0,
      errors: [],
    };
  }
}

// Singleton instance
export const backgroundSync = new BackgroundSync();
export default backgroundSync;

