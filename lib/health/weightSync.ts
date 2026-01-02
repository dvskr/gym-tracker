import { healthService, WeightData } from './healthService';
import { logger } from '@/lib/utils/logger';
import { supabase } from '../supabase';
import { useSettingsStore } from '@/stores/settingsStore';
import { convertWeight } from '../utils/unitConversion';

/**
 * Log weight to database and sync to health platform
 */
export async function logWeightAndSync(
  userId: string,
  weight: number,
  unit: 'lbs' | 'kg',
  date?: Date,
  bodyFatPercent?: number,
  notes?: string
): Promise<boolean> {
  try {
    // Convert to kg for health platform
    const weightKg = unit === 'lbs' ? weight * 0.453592 : weight;
    const logDate = date || new Date();
    const dateStr = logDate.toISOString().split('T')[0];

    logger.log(`�a��� Logging weight: ${weight} ${unit} (${weightKg.toFixed(2)} kg)`);

    // 1. Save to Supabase
    const { error } = await supabase.from('body_weight_log').upsert(
      {
        user_id: userId,
        logged_at: dateStr,
        weight,
        weight_unit: unit,
        body_fat_percentage: bodyFatPercent || null,
        notes: notes || null,
      },
      {
        onConflict: 'user_id,logged_at',
      }
    );

    if (error) throw error;

    logger.log('�S& Weight saved to database');

    // 2. Sync to health platform if enabled
    const { healthSyncEnabled, syncWeight } = useSettingsStore.getState();

    if (healthSyncEnabled && syncWeight) {
      const synced = await healthService.saveWeight({
        date: logDate,
        weightKg,
        bodyFatPercent,
      });

      if (synced) {
        // Mark as synced in database
        await supabase
          .from('body_weight_log')
          .update({ health_synced: true, health_synced_at: new Date().toISOString() })
          .eq('user_id', userId)
          .eq('logged_at', dateStr);

        logger.log('�S& Weight synced to health platform');
      } else {
        logger.warn('�a���� Weight saved but health sync failed');
      }
    } else {
      logger.log('����� Health sync disabled for weight');
    }

    return true;
  } catch (error) {
    logger.error('�R Error logging weight:', error);
    return false;
  }
}

/**
 * Import weight history from health platform
 */
export async function importWeightFromHealth(
  userId: string,
  daysBack: number = 30
): Promise<{ imported: number; skipped: number; errors: number }> {
  try {
    logger.log(`�x� Importing weight data from health platform (last ${daysBack} days)...`);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Fetch from health platform
    const healthWeights = await healthService.getWeightHistory(startDate, endDate);

    if (healthWeights.length === 0) {
      logger.log('����� No weight data found in health platform');
      return { imported: 0, skipped: 0, errors: 0 };
    }

    logger.log(`�x` Found ${healthWeights.length} weight entries in health platform`);

    // Get existing weights from database
    const { data: existingWeights } = await supabase
      .from('body_weight_log')
      .select('logged_at')
      .eq('user_id', userId)
      .gte('logged_at', startDate.toISOString().split('T')[0])
      .lte('logged_at', endDate.toISOString().split('T')[0]);

    const existingDates = new Set(existingWeights?.map((w) => w.logged_at) || []);

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    // Import new weights
    for (const entry of healthWeights) {
      const dateStr = entry.date.toISOString().split('T')[0];

      if (existingDates.has(dateStr)) {
        skipped++;
        continue;
      }

      try {
        // Get user's preferred unit
        const { weightUnit } = useSettingsStore.getState();

        // Convert to user's preferred unit
        const weight = weightUnit === 'lbs' ? entry.weightKg * 2.20462 : entry.weightKg;

        // Insert into database
        const { error } = await supabase.from('body_weight_log').insert({
          user_id: userId,
          logged_at: dateStr,
          weight,
          weight_unit: weightUnit,
          body_fat_percentage: entry.bodyFatPercent || null,
          health_synced: true,
          health_synced_at: new Date().toISOString(),
          notes: 'Imported from Health',
        });

        if (error) {
          logger.error(`�R Failed to import weight for ${dateStr}:`, error);
          errors++;
        } else {
          imported++;
        }
      } catch (error) {
        logger.error(`�R Error processing weight entry for ${dateStr}:`, error);
        errors++;
      }
    }

    logger.log(`�S& Import complete: ${imported} imported, ${skipped} skipped, ${errors} errors`);

    return { imported, skipped, errors };
  } catch (error) {
    logger.error('�R Error importing weight from health:', error);
    return { imported: 0, skipped: 0, errors: 0 };
  }
}

/**
 * Sync unsynced weight entries to health platform
 */
export async function syncUnsyncedWeights(userId: string): Promise<{
  synced: number;
  failed: number;
}> {
  try {
    logger.log('�x� Syncing unsynced weight entries to health platform...');

    // Get unsynced weights
    const { data: unsyncedWeights, error } = await supabase
      .from('body_weight_log')
      .select('*')
      .eq('user_id', userId)
      .or('health_synced.is.null,health_synced.eq.false')
      .order('logged_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    if (!unsyncedWeights || unsyncedWeights.length === 0) {
      logger.log('����� No unsynced weight entries found');
      return { synced: 0, failed: 0 };
    }

    logger.log(`�x` Found ${unsyncedWeights.length} unsynced weight entries`);

    let synced = 0;
    let failed = 0;

    for (const entry of unsyncedWeights) {
      try {
        // Convert to kg
        const weightKg =
          entry.weight_unit === 'lbs' ? entry.weight * 0.453592 : entry.weight;

        // Sync to health
        const success = await healthService.saveWeight({
          date: new Date(entry.logged_at),
          weightKg,
          bodyFatPercent: entry.body_fat_percentage || undefined,
        });

        if (success) {
          // Mark as synced
          await supabase
            .from('body_weight_log')
            .update({
              health_synced: true,
              health_synced_at: new Date().toISOString(),
            })
            .eq('user_id', userId)
            .eq('logged_at', entry.logged_at);

          synced++;
        } else {
          failed++;
        }
      } catch (error) {
        logger.error(`�R Failed to sync weight for ${entry.logged_at}:`, error);
        failed++;
      }
    }

    logger.log(`�S& Sync complete: ${synced} synced, ${failed} failed`);

    return { synced, failed };
  } catch (error) {
    logger.error('�R Error syncing unsynced weights:', error);
    return { synced: 0, failed: 0 };
  }
}

/**
 * Get latest weight from health platform
 */
export async function getLatestHealthWeight(): Promise<{
  weight: number;
  unit: 'lbs' | 'kg';
  date: Date;
  bodyFatPercent?: number;
} | null> {
  try {
    const latest = await healthService.getLatestWeight();

    if (!latest) {
      return null;
    }

    // Get user's preferred unit
    const { weightUnit } = useSettingsStore.getState();

    // Convert to user's preferred unit
    const weight = weightUnit === 'lbs' ? latest.weightKg * 2.20462 : latest.weightKg;

    return {
      weight,
      unit: weightUnit,
      date: latest.date,
      bodyFatPercent: latest.bodyFatPercent,
    };
  } catch (error) {
    logger.error('�R Error getting latest health weight:', error);
    return null;
  }
}

/**
 * Check if weight should auto-sync
 */
export function shouldSyncWeight(): boolean {
  const { healthSyncEnabled, syncWeight } = useSettingsStore.getState();
  const hasPermissions = healthService.getHasPermissions();

  return healthSyncEnabled && syncWeight && hasPermissions;
}

