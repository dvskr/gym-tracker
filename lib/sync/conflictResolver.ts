import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/lib/utils/logger';
import { localDB } from '../storage/localDatabase';
import { syncQueue } from './syncQueue';

export type ConflictStrategy = 'server_wins' | 'client_wins' | 'latest_wins' | 'manual';

export interface Conflict {
  id: string;
  table: string;
  itemId: string;
  localData: any;
  serverData: any;
  localUpdatedAt: Date;
  serverUpdatedAt: Date;
  detectedAt: Date;
  resolvedAt?: Date;
  resolution?: 'local' | 'server' | 'merged';
  mergedData?: any;
}

export interface ConflictResolutionResult {
  data: any;
  resolution: 'local' | 'server' | 'merged' | 'deferred';
  conflict?: Conflict;
}

class ConflictResolver {
  private conflicts: Conflict[] = [];
  private strategy: ConflictStrategy = 'latest_wins';
  private readonly CONFLICTS_KEY = '@gym/conflicts';
  private readonly STRATEGY_KEY = '@gym/conflict_strategy';

  constructor() {
    this.loadStrategy();
    this.loadConflicts();
  }

  /**
   * Set conflict resolution strategy
   */
  async setStrategy(strategy: ConflictStrategy): Promise<void> {
    this.strategy = strategy;
    await AsyncStorage.setItem(this.STRATEGY_KEY, strategy);
    logger.log(`ðŸ”§ Conflict strategy set to: ${strategy}`);
  }

  /**
   * Get current strategy
   */
  getStrategy(): ConflictStrategy {
    return this.strategy;
  }

  /**
   * Detect if there's a conflict between local and server data
   * 
   * A conflict exists when:
   * 1. Both local and server versions exist
   * 2. Both have been modified since last sync
   * 3. They have different content
   */
  hasConflict(localData: any, serverData: any): boolean {
    if (!localData || !serverData) return false;

    // If local is not synced, it means local changes are pending
    if (localData._synced === false) {
      // Check if server has also changed
      const localTime = new Date(localData.updated_at || localData.created_at || 0).getTime();
      const serverTime = new Date(serverData.updated_at || serverData.created_at || 0).getTime();
      
      // If server is newer than local's original version, there's a conflict
      return serverTime > localTime;
    }

    return false;
  }

  /**
   * Resolve conflict based on current strategy
   */
  async resolve(
    local: any,
    server: any,
    table: string
  ): Promise<ConflictResolutionResult> {
    logger.log(`ðŸ” Resolving conflict for ${table}/${local.id || server.id} using strategy: ${this.strategy}`);

    const conflict: Conflict = {
      id: this.generateConflictId(),
      table,
      itemId: local.id || server.id,
      localData: local,
      serverData: server,
      localUpdatedAt: new Date(local.updated_at || local.created_at),
      serverUpdatedAt: new Date(server.updated_at || server.created_at),
      detectedAt: new Date(),
    };

    let result: ConflictResolutionResult;

    switch (this.strategy) {
      case 'server_wins':
        result = {
          data: { ...server, _synced: true },
          resolution: 'server',
        };
        logger.log('âœ… Server wins');
        break;

      case 'client_wins':
        result = {
          data: { ...local, _synced: false }, // Keep as unsynced to push to server
          resolution: 'local',
        };
        logger.log('âœ… Client wins');
        break;

      case 'latest_wins':
        const localTime = conflict.localUpdatedAt.getTime();
        const serverTime = conflict.serverUpdatedAt.getTime();
        
        if (localTime > serverTime) {
          result = {
            data: { ...local, _synced: false },
            resolution: 'local',
          };
          logger.log('âœ… Latest wins: Local (newer)');
        } else {
          result = {
            data: { ...server, _synced: true },
            resolution: 'server',
          };
          logger.log('âœ… Latest wins: Server (newer)');
        }
        break;

      case 'manual':
        // Store conflict for manual resolution
        this.conflicts.push(conflict);
        await this.saveConflicts();
        
        // Return server version temporarily (user will resolve later)
        result = {
          data: { ...server, _synced: true },
          resolution: 'deferred',
          conflict,
        };
        logger.log('â¸ï¸ Manual resolution required - using server temporarily');
        break;

      default:
        // Fallback to latest_wins
        result = {
          data: new Date(local.updated_at) > new Date(server.updated_at) ? local : server,
          resolution: new Date(local.updated_at) > new Date(server.updated_at) ? 'local' : 'server',
        };
    }

    return result;
  }

  /**
   * Smart merge for workouts (field-level merge)
   * Tries to merge compatible fields intelligently
   */
  mergeWorkout(local: any, server: any): any {
    const localTime = new Date(local.updated_at || 0).getTime();
    const serverTime = new Date(server.updated_at || 0).getTime();

    return {
      ...server,
      // Keep local name if user changed it and it's different
      name: local.name !== server.name && localTime > serverTime 
        ? local.name 
        : server.name,
      
      // Keep local notes if newer
      notes: localTime > serverTime ? local.notes : server.notes,
      
      // Keep local rating if set and newer
      rating: localTime > serverTime 
        ? (local.rating || server.rating)
        : server.rating,
      
      // Always use server for calculated fields (authoritative)
      total_volume: server.total_volume,
      total_sets: server.total_sets,
      total_reps: server.total_reps,
      duration_seconds: server.duration_seconds,
      
      // Use server timestamps (it's the source of truth)
      created_at: server.created_at,
      updated_at: server.updated_at,
      
      // Mark as synced
      _synced: true,
    };
  }

  /**
   * Smart merge for templates
   */
  mergeTemplate(local: any, server: any): any {
    const localTime = new Date(local.updated_at || 0).getTime();
    const serverTime = new Date(server.updated_at || 0).getTime();

    return {
      ...server,
      name: localTime > serverTime ? local.name : server.name,
      description: localTime > serverTime ? local.description : server.description,
      notes: localTime > serverTime ? local.notes : server.notes,
      
      // Use server's structural data
      template_exercises: server.template_exercises,
      target_muscles: server.target_muscles,
      estimated_duration: server.estimated_duration,
      
      // Server timestamps
      created_at: server.created_at,
      updated_at: server.updated_at,
      
      _synced: true,
    };
  }

  /**
   * Get pending conflicts awaiting manual resolution
   */
  getPendingConflicts(): Conflict[] {
    return this.conflicts.filter(c => !c.resolvedAt);
  }

  /**
   * Get all conflicts (including resolved)
   */
  getAllConflicts(): Conflict[] {
    return this.conflicts;
  }

  /**
   * Get conflicts for a specific table
   */
  getConflictsByTable(table: string): Conflict[] {
    return this.conflicts.filter(c => c.table === table && !c.resolvedAt);
  }

  /**
   * Manually resolve a conflict
   */
  async resolveManually(
    conflictId: string,
    resolution: 'local' | 'server' | 'merged',
    mergedData?: any
  ): Promise<void> {
    const conflict = this.conflicts.find(c => c.id === conflictId);
    if (!conflict) {
      throw new Error(`Conflict ${conflictId} not found`);
    }

    logger.log(`ðŸ‘¤ Manual resolution: ${resolution} for ${conflict.table}/${conflict.itemId}`);

    let winner: any;

    if (resolution === 'merged' && mergedData) {
      winner = mergedData;
    } else if (resolution === 'local') {
      winner = conflict.localData;
    } else {
      winner = conflict.serverData;
    }

    // Update local storage
    const storageKey = this.getStorageKeyForTable(conflict.table);
    const items = await localDB.getLocal(storageKey);
    const index = items.findIndex((item: any) => item.id === conflict.itemId);
    
    if (index >= 0) {
      items[index] = { ...winner, _synced: false };
      await localDB.saveLocally(storageKey, items);
    }

    // Push to server if local or merged
    if (resolution === 'local' || resolution === 'merged') {
      await syncQueue.addToSyncQueue({
        id: `manual-resolve-${conflict.itemId}-${Date.now()}`,
        table: conflict.table,
        operation: 'update',
        data: winner,
        timestamp: Date.now(),
        attempts: 0,
      });
    }

    // Mark conflict as resolved
    conflict.resolvedAt = new Date();
    conflict.resolution = resolution;
    conflict.mergedData = resolution === 'merged' ? mergedData : undefined;

    await this.saveConflicts();
    
    logger.log('âœ… Conflict resolved manually');
  }

  /**
   * Dismiss a conflict (use server version and don't prompt again)
   */
  async dismissConflict(conflictId: string): Promise<void> {
    const conflict = this.conflicts.find(c => c.id === conflictId);
    if (!conflict) return;

    conflict.resolvedAt = new Date();
    conflict.resolution = 'server';

    await this.saveConflicts();
  }

  /**
   * Clear all resolved conflicts
   */
  async clearResolvedConflicts(): Promise<number> {
    const before = this.conflicts.length;
    this.conflicts = this.conflicts.filter(c => !c.resolvedAt);
    await this.saveConflicts();
    
    const cleared = before - this.conflicts.length;
    logger.log(`ðŸ§¹ Cleared ${cleared} resolved conflict(s)`);
    return cleared;
  }

  /**
   * Clear all conflicts
   */
  async clearAllConflicts(): Promise<void> {
    this.conflicts = [];
    await AsyncStorage.removeItem(this.CONFLICTS_KEY);
    logger.log('ðŸ§¹ All conflicts cleared');
  }

  /**
   * Get conflict count
   */
  getConflictCount(): number {
    return this.getPendingConflicts().length;
  }

  // Private helper methods

  private generateConflictId(): string {
    return `conflict-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getStorageKeyForTable(table: string): string {
    const tableMap: Record<string, string> = {
      'workouts': '@gym/workouts',
      'workout_templates': '@gym/templates',
      'body_weight_log': '@gym/weight_log',
      'body_measurements': '@gym/measurements',
      'personal_records': '@gym/personal_records',
    };
    return tableMap[table] || `@gym/${table}`;
  }

  private async loadStrategy(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STRATEGY_KEY);
      if (stored) {
        this.strategy = stored as ConflictStrategy;
      }
    } catch (error) {
      logger.error('Error loading conflict strategy:', error);
    }
  }

  private async loadConflicts(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.CONFLICTS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.conflicts = parsed.map((c: any) => ({
          ...c,
          localUpdatedAt: new Date(c.localUpdatedAt),
          serverUpdatedAt: new Date(c.serverUpdatedAt),
          detectedAt: new Date(c.detectedAt),
          resolvedAt: c.resolvedAt ? new Date(c.resolvedAt) : undefined,
        }));
      }
    } catch (error) {
      logger.error('Error loading conflicts:', error);
    }
  }

  private async saveConflicts(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.CONFLICTS_KEY, JSON.stringify(this.conflicts));
    } catch (error) {
      logger.error('Error saving conflicts:', error);
    }
  }
}

// Singleton instance
export const conflictResolver = new ConflictResolver();
export default conflictResolver;

