import { localDB } from '../storage/localDatabase';
import { logger } from '@/lib/utils/logger';
import { conflictResolver } from './conflictResolver';

/**
 * Data Merger - Intelligently merges server data with local data
 * Now with conflict detection and resolution
 * 
 * Conflict Resolution Strategy:
 * 1. If item only exists on server �  Add to local
 * 2. If item only exists locally �  Keep (will sync via queue)
 * 3. If item exists in both:
 *    - Check for conflicts using conflictResolver
 *    - Resolve based on configured strategy
 *    - Handle manual conflicts if needed
 */

interface TimestampedItem {
  id: string;
  created_at?: string;
  updated_at?: string;
  _synced?: boolean;
  _local_only?: boolean;
}

/**
 * Generic merge function with conflict resolution
 * Merges server items with local items, detecting and resolving conflicts
 */
async function mergeItems<T extends TimestampedItem>(
  localItems: T[],
  serverItems: T[],
  tableName: string
): Promise<T[]> {
  const merged = new Map<string, T>();

  // Add all local items first
  localItems.forEach(item => {
    merged.set(item.id, item);
  });

  // Merge server items with conflict detection
  for (const serverItem of serverItems) {
    const localItem = merged.get(serverItem.id);

    if (!localItem) {
      // New from server - add it
      merged.set(serverItem.id, { ...serverItem, _synced: true } as T);
    } else {
      // Exists locally - check for conflicts
      if (conflictResolver.hasConflict(localItem, serverItem)) {
        // Conflict detected! Use conflict resolver
 logger.log(`a Conflict detected for ${tableName}/${serverItem.id}`);
        
        const resolution = await conflictResolver.resolve(
          localItem,
          serverItem,
          tableName
        );
        
        merged.set(serverItem.id, resolution.data as T);
      } else {
        // No conflict - use standard logic
        const shouldUseServer = shouldPreferServer(localItem, serverItem);
        
        if (shouldUseServer) {
          merged.set(serverItem.id, { ...serverItem, _synced: true } as T);
        }
        // Otherwise keep local (it's newer or has pending changes)
      }
    }
  }

  return Array.from(merged.values());
}

/**
 * Decide if server version should be preferred over local
 */
function shouldPreferServer<T extends TimestampedItem>(
  local: T,
  server: T
): boolean {
  // If local has unsaved changes, prefer local
  if (local._synced === false || local._local_only === true) {
    return false;
  }

  // Compare timestamps
  const localTime = new Date(local.updated_at || local.created_at || 0).getTime();
  const serverTime = new Date(server.updated_at || server.created_at || 0).getTime();

  // Server wins if it's newer
  return serverTime > localTime;
}

/**
 * Merge workouts from server with local workouts
 * Now with conflict detection
 */
export async function mergeWorkouts(serverWorkouts: any[]): Promise<void> {
 logger.log(`x Merging ${serverWorkouts.length} workout(s)...`);

  try {
    // Get local workouts
    const localWorkouts = await localDB.getLocalWorkouts();

    // Merge with conflict detection
    const merged = await mergeItems(localWorkouts, serverWorkouts, 'workouts');

    // Save back to local storage
    await localDB.saveLocally('@gym/workouts', merged);

 logger.log(`S& Merged workouts: ${merged.length} total`);
  } catch (error) {
 logger.error('Error merging workouts:', error);
    throw error;
  }
}

/**
 * Merge templates from server with local templates
 */
export async function mergeTemplates(serverTemplates: any[]): Promise<void> {
 logger.log(`x Merging ${serverTemplates.length} template(s)...`);

  try {
    const localTemplates = await localDB.getLocalTemplates();
    const merged = await mergeItems(localTemplates, serverTemplates, 'workout_templates');
    await localDB.saveLocally('@gym/templates', merged);

 logger.log(`S& Merged templates: ${merged.length} total`);
  } catch (error) {
 logger.error('Error merging templates:', error);
    throw error;
  }
}

/**
 * Merge weight log from server with local weight log
 */
export async function mergeWeightLog(serverWeightLog: any[]): Promise<void> {
 logger.log(`x Merging ${serverWeightLog.length} weight log(s)...`);

  try {
    const localWeightLog = await localDB.getLocalWeights();
    const merged = await mergeItems(localWeightLog, serverWeightLog, 'body_weight_log');
    await localDB.saveLocally('@gym/weight_log', merged);

 logger.log(`S& Merged weight log: ${merged.length} total`);
  } catch (error) {
 logger.error('Error merging weight log:', error);
    throw error;
  }
}

/**
 * Merge measurements from server with local measurements
 */
export async function mergeMeasurements(serverMeasurements: any[]): Promise<void> {
 logger.log(`x Merging ${serverMeasurements.length} measurement(s)...`);

  try {
    const localMeasurements = await localDB.getLocalMeasurements();
    const merged = await mergeItems(localMeasurements, serverMeasurements, 'body_measurements');
    await localDB.saveLocally('@gym/measurements', merged);

 logger.log(`S& Merged measurements: ${merged.length} total`);
  } catch (error) {
 logger.error('Error merging measurements:', error);
    throw error;
  }
}

/**
 * Merge personal records from server with local records
 */
export async function mergePersonalRecords(serverRecords: any[]): Promise<void> {
 logger.log(`x Merging ${serverRecords.length} personal record(s)...`);

  try {
    const localRecords = await localDB.getLocalPersonalRecords();
    const merged = await mergeItems(localRecords, serverRecords, 'personal_records');
    await localDB.saveLocally('@gym/personal_records', merged);

 logger.log(`S& Merged personal records: ${merged.length} total`);
  } catch (error) {
 logger.error('Error merging personal records:', error);
    throw error;
  }
}

/**
 * Merge exercises cache (for API exercises)
 */
export async function mergeExercises(serverExercises: any[]): Promise<void> {
 logger.log(`x Caching ${serverExercises.length} exercise(s)...`);

  try {
    await localDB.cacheExercises(serverExercises);
 logger.log(`S& Cached ${serverExercises.length} exercises`);
  } catch (error) {
 logger.error('Error caching exercises:', error);
    throw error;
  }
}

/**
 * Advanced: Merge with conflict resolution callback
 * Allows custom logic for resolving conflicts
 */
export async function mergeWithConflictResolution<T extends TimestampedItem>(
  storageKey: string,
  serverItems: T[],
  onConflict?: (local: T, server: T) => T
): Promise<void> {
  try {
    const localItems = await localDB.getLocal(storageKey);
    const merged = new Map<string, T>();

    // Add local items
    localItems.forEach((item: T) => {
      merged.set(item.id, item);
    });

    // Merge server items with custom conflict resolution
    serverItems.forEach(serverItem => {
      const localItem = merged.get(serverItem.id);

      if (!localItem) {
        // New from server
        merged.set(serverItem.id, { ...serverItem, _synced: true });
      } else if (onConflict) {
        // Use custom conflict resolution
        const resolved = onConflict(localItem, serverItem);
        merged.set(serverItem.id, resolved);
      } else {
        // Use default logic
        const shouldUseServer = shouldPreferServer(localItem, serverItem);
        if (shouldUseServer) {
          merged.set(serverItem.id, { ...serverItem, _synced: true });
        }
      }
    });

    await localDB.saveLocally(storageKey, Array.from(merged.values()));
  } catch (error) {
 logger.error(`Error merging ${storageKey}:`, error);
    throw error;
  }
}

/**
 * Merge statistics (for analytics/insights)
 */
export interface MergeStats {
  total: number;
  fromServer: number;
  fromLocal: number;
  conflicts: number;
  serverWins: number;
  localWins: number;
}

export async function mergeWithStats<T extends TimestampedItem>(
  localItems: T[],
  serverItems: T[]
): Promise<{ merged: T[]; stats: MergeStats }> {
  const stats: MergeStats = {
    total: 0,
    fromServer: 0,
    fromLocal: 0,
    conflicts: 0,
    serverWins: 0,
    localWins: 0,
  };

  const merged = new Map<string, T>();
  const serverIds = new Set(serverItems.map(i => i.id));
  const localIds = new Set(localItems.map(i => i.id));

  // Process local items
  localItems.forEach(item => {
    merged.set(item.id, item);
    
    if (!serverIds.has(item.id)) {
      stats.fromLocal++;
    }
  });

  // Process server items
  serverItems.forEach(serverItem => {
    const localItem = merged.get(serverItem.id);

    if (!localItem) {
      // Only on server
      merged.set(serverItem.id, { ...serverItem, _synced: true });
      stats.fromServer++;
    } else if (localIds.has(serverItem.id)) {
      // Conflict - exists in both
      stats.conflicts++;
      
      const shouldUseServer = shouldPreferServer(localItem, serverItem);
      if (shouldUseServer) {
        merged.set(serverItem.id, { ...serverItem, _synced: true });
        stats.serverWins++;
      } else {
        stats.localWins++;
      }
    }
  });

  stats.total = merged.size;

  return {
    merged: Array.from(merged.values()),
    stats,
  };
}

/**
 * Batch merge multiple data types
 */
export interface BatchMergeResult {
  workouts: number;
  templates: number;
  weightLog: number;
  measurements: number;
  personalRecords: number;
  errors: string[];
}

export async function batchMerge(data: {
  workouts?: any[];
  templates?: any[];
  weightLog?: any[];
  measurements?: any[];
  personalRecords?: any[];
}): Promise<BatchMergeResult> {
  const result: BatchMergeResult = {
    workouts: 0,
    templates: 0,
    weightLog: 0,
    measurements: 0,
    personalRecords: 0,
    errors: [],
  };

  // Merge workouts
  if (data.workouts && data.workouts.length > 0) {
    try {
      await mergeWorkouts(data.workouts);
      result.workouts = data.workouts.length;
    } catch (error) {
      result.errors.push(`Workouts: ${error}`);
    }
  }

  // Merge templates
  if (data.templates && data.templates.length > 0) {
    try {
      await mergeTemplates(data.templates);
      result.templates = data.templates.length;
    } catch (error) {
      result.errors.push(`Templates: ${error}`);
    }
  }

  // Merge weight log
  if (data.weightLog && data.weightLog.length > 0) {
    try {
      await mergeWeightLog(data.weightLog);
      result.weightLog = data.weightLog.length;
    } catch (error) {
      result.errors.push(`Weight Log: ${error}`);
    }
  }

  // Merge measurements
  if (data.measurements && data.measurements.length > 0) {
    try {
      await mergeMeasurements(data.measurements);
      result.measurements = data.measurements.length;
    } catch (error) {
      result.errors.push(`Measurements: ${error}`);
    }
  }

  // Merge personal records
  if (data.personalRecords && data.personalRecords.length > 0) {
    try {
      await mergePersonalRecords(data.personalRecords);
      result.personalRecords = data.personalRecords.length;
    } catch (error) {
      result.errors.push(`Personal Records: ${error}`);
    }
  }

  return result;
}
