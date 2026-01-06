import { healthService } from './healthService';
import { logger } from '@/lib/utils/logger';
import type { WorkoutData, WeightData } from './healthService';
import { supabase } from '../supabase';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAuthStore } from '@/stores/authStore';

export interface SyncResult {
  success: boolean;
  workoutsSynced: number;
  weightsSynced: number;
  weightsImported: number;
  errors: string[];
}

class HealthSyncService {
  private lastSyncTime: Date | null = null;
  private isSyncing: boolean = false;
  private readonly SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

  /**
   * Run sync when app opens (debounced)
   */
  async syncOnAppOpen(): Promise<SyncResult | null> {
    // Check if health sync is enabled
    const { healthSyncEnabled } = useSettingsStore.getState();
    if (!healthSyncEnabled) {
 logger.log(' Health sync disabled');
      return null;
    }

    // Check if already syncing
    if (this.isSyncing) {
 logger.log(' Sync already in progress');
      return null;
    }

    // Check if recently synced (debounce)
    if (this.lastSyncTime && Date.now() - this.lastSyncTime.getTime() < this.SYNC_INTERVAL) {
      const remainingMs = this.SYNC_INTERVAL - (Date.now() - this.lastSyncTime.getTime());
      const remainingMin = Math.ceil(remainingMs / 60000);
 logger.log(` Recently synced, next sync in ${remainingMin}min`);
      return null;
    }

    return await this.performSync();
  }

  /**
   * Force sync (ignores debounce)
   */
  async forceSync(): Promise<SyncResult> {
    return await this.performSync(true);
  }

  /**
   * Perform the actual sync operation
   */
  private async performSync(force: boolean = false): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      workoutsSynced: 0,
      weightsSynced: 0,
      weightsImported: 0,
      errors: [],
    };

    try {
      this.isSyncing = true;
 logger.log('x Starting health sync...');

      // 1. Sync unprocessed workouts to health
      const workoutsResult = await this.syncUnprocessedWorkouts();
      result.workoutsSynced = workoutsResult.synced;
      result.errors.push(...workoutsResult.errors);

      // 2. Sync unprocessed weight entries to health
      const weightsResult = await this.syncUnprocessedWeights();
      result.weightsSynced = weightsResult.synced;
      result.errors.push(...weightsResult.errors);

      // 3. Import new weight entries from health
      const importResult = await this.importWeightFromHealth();
      result.weightsImported = importResult.imported;
      result.errors.push(...importResult.errors);

      // Update last sync time
      this.lastSyncTime = new Date();

      result.success = result.errors.length === 0;

 logger.log(
        `S& Health sync complete: ${result.workoutsSynced} workouts, ${result.weightsSynced} weights synced, ${result.weightsImported} weights imported`
      );

      if (result.errors.length > 0) {
 logger.warn(`a Sync completed with ${result.errors.length} error(s)`);
      }

      return result;
    } catch (error: unknown) {
 logger.error('R Health sync failed:', error);
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      return result;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync workouts that haven't been synced to health
   */
  private async syncUnprocessedWorkouts(): Promise<{ synced: number; errors: string[] }> {
    const result = { synced: 0, errors: [] as string[] };

    try {
      const { healthAutoSync } = useSettingsStore.getState();
      if (!healthAutoSync) {
 logger.log(' Auto-sync workouts disabled');
        return result;
      }

      const user = useAuthStore.getState().user;
      if (!user) {
        result.errors.push('User not authenticated');
        return result;
      }

 logger.log('x Syncing unprocessed workouts...');

      const { data: unsynced, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('user_id', user.id)
        .or('health_synced.is.null,health_synced.eq.false')
        .not('ended_at', 'is', null)
        .order('started_at', { ascending: false })
        .limit(50); // Limit to recent 50

      if (error) {
        result.errors.push(`Failed to fetch workouts: ${error.message}`);
        return result;
      }

      if (!unsynced || unsynced.length === 0) {
 logger.log(' No workouts to sync');
        return result;
      }

 logger.log(`Found ${unsynced.length} workout(s) to sync`);

      for (const workout of unsynced) {
        try {
          const workoutData: WorkoutData = {
            id: workout.id,
            name: workout.name || 'Workout',
            startTime: new Date(workout.started_at),
            endTime: new Date(workout.ended_at),
            durationMinutes: Math.round((workout.duration_seconds || 0) / 60),
            caloriesBurned: workout.calories_burned || undefined,
            exerciseType: 'strength', // Could be enhanced with actual exercise type
            notes: workout.notes || undefined,
          };

          const success = await healthService.saveWorkout(workoutData);

          if (success) {
            // Mark as synced
            const { error: updateError } = await supabase
              .from('workouts')
              .update({
                health_synced: true,
                health_synced_at: new Date().toISOString(),
              })
              .eq('id', workout.id);

            if (updateError) {
              result.errors.push(`Failed to update workout ${workout.id}: ${updateError.message}`);
            } else {
              result.synced++;
            }
          } else {
            result.errors.push(`Failed to sync workout ${workout.id}`);
          }
        } catch (error: unknown) {
          result.errors.push(
            `Error syncing workout ${workout.id}: ${error instanceof Error ? error.message : 'Unknown'}`
          );
        }
      }

 logger.log(`S& Synced ${result.synced}/${unsynced.length} workout(s)`);
    } catch (error: unknown) {
      result.errors.push(
        `Workout sync error: ${error instanceof Error ? error.message : 'Unknown'}`
      );
    }

    return result;
  }

  /**
   * Sync weight entries that haven't been synced to health
   */
  private async syncUnprocessedWeights(): Promise<{ synced: number; errors: string[] }> {
    const result = { synced: 0, errors: [] as string[] };

    try {
      const { syncWeight } = useSettingsStore.getState();
      if (!syncWeight) {
 logger.log(' Weight sync disabled');
        return result;
      }

      const user = useAuthStore.getState().user;
      if (!user) {
        result.errors.push('User not authenticated');
        return result;
      }

 logger.log('a Syncing unprocessed weight entries...');

      const { data: unsynced, error } = await supabase
        .from('body_weight_log')
        .select('*')
        .eq('user_id', user.id)
        .or('health_synced.is.null,health_synced.eq.false')
        .order('logged_at', { ascending: false })
        .limit(30); // Limit to recent 30

      if (error) {
        result.errors.push(`Failed to fetch weights: ${error.message}`);
        return result;
      }

      if (!unsynced || unsynced.length === 0) {
 logger.log(' No weight entries to sync');
        return result;
      }

 logger.log(`Found ${unsynced.length} weight entry(s) to sync`);

      for (const entry of unsynced) {
        try {
          const weightKg =
            entry.weight_unit === 'lbs' ? entry.weight * 0.453592 : entry.weight;

          const weightData: WeightData = {
            date: new Date(entry.logged_at),
            weightKg,
            bodyFatPercent: entry.body_fat_percentage || undefined,
          };

          const success = await healthService.saveWeight(weightData);

          if (success) {
            // Mark as synced
            const { error: updateError } = await supabase
              .from('body_weight_log')
              .update({
                health_synced: true,
                health_synced_at: new Date().toISOString(),
              })
              .eq('id', entry.id);

            if (updateError) {
              result.errors.push(`Failed to update weight ${entry.id}: ${updateError.message}`);
            } else {
              result.synced++;
            }
          } else {
            result.errors.push(`Failed to sync weight ${entry.id}`);
          }
        } catch (error: unknown) {
          result.errors.push(
            `Error syncing weight ${entry.id}: ${error instanceof Error ? error.message : 'Unknown'}`
          );
        }
      }

 logger.log(`S& Synced ${result.synced}/${unsynced.length} weight entry(s)`);
    } catch (error: unknown) {
      result.errors.push(
        `Weight sync error: ${error instanceof Error ? error.message : 'Unknown'}`
      );
    }

    return result;
  }

  /**
   * Import weight entries from health that we don't have yet
   */
  private async importWeightFromHealth(): Promise<{ imported: number; errors: string[] }> {
    const result = { imported: 0, errors: [] as string[] };

    try {
      const { syncWeight } = useSettingsStore.getState();
      if (!syncWeight) {
 logger.log(' Weight import disabled');
        return result;
      }

      const user = useAuthStore.getState().user;
      if (!user) {
        result.errors.push('User not authenticated');
        return result;
      }

 logger.log('x Importing weight from health...');

      // Import last 7 days of weight from health
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const healthWeights = await healthService.getWeightHistory(sevenDaysAgo, new Date());

      if (healthWeights.length === 0) {
 logger.log(' No weight data in health to import');
        return result;
      }

 logger.log(`Found ${healthWeights.length} weight entry(s) in health`);

      // Get user's preferred weight unit
      const { weightUnit } = useSettingsStore.getState();

      for (const entry of healthWeights) {
        try {
          const dateStr = entry.date.toISOString().split('T')[0];

          // Check if we already have an entry for this date
          const { data: existing, error: checkError } = await supabase
            .from('body_weight_log')
            .select('id')
            .eq('user_id', user.id)
            .eq('logged_at', dateStr)
            .maybeSingle();

          if (checkError) {
            result.errors.push(`Error checking for existing weight: ${checkError.message}`);
            continue;
          }

          if (existing) {
            // Already have data for this date, skip
            continue;
          }

          // Import this entry
          const weight = weightUnit === 'lbs' ? entry.weightKg * 2.20462 : entry.weightKg;

          const { error: insertError } = await supabase.from('body_weight_log').insert({
            user_id: user.id,
            logged_at: dateStr,
            weight,
            weight_unit: weightUnit,
            body_fat_percentage: entry.bodyFatPercent || null,
            notes: 'Imported from Health',
            health_synced: true,
            health_synced_at: new Date().toISOString(),
          });

          if (insertError) {
            result.errors.push(`Failed to import weight for ${dateStr}: ${insertError.message}`);
          } else {
            result.imported++;
 logger.log(`S& Imported weight for ${dateStr}`);
          }
        } catch (error: unknown) {
          result.errors.push(
            `Error importing weight: ${error instanceof Error ? error.message : 'Unknown'}`
          );
        }
      }

 logger.log(`S& Imported ${result.imported} weight entry(s)`);
    } catch (error: unknown) {
      result.errors.push(
        `Weight import error: ${error instanceof Error ? error.message : 'Unknown'}`
      );
    }

    return result;
  }

  /**
   * Get sync status info
   */
  getSyncStatus(): {
    lastSyncTime: Date | null;
    isSyncing: boolean;
    canSync: boolean;
  } {
    const { healthSyncEnabled } = useSettingsStore.getState();

    return {
      lastSyncTime: this.lastSyncTime,
      isSyncing: this.isSyncing,
      canSync: healthSyncEnabled && !this.isSyncing,
    };
  }

  /**
   * Reset sync state (for testing)
   */
  reset(): void {
    this.lastSyncTime = null;
    this.isSyncing = false;
  }
}

export const healthSyncService = new HealthSyncService();


