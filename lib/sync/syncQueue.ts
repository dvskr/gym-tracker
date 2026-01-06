import { localDB, SyncOperation } from '../storage/localDatabase';
import { logger } from '@/lib/utils/logger';
import { supabase } from '../supabase';

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: Array<{ operation: SyncOperation; error: string }>;
}

class SyncQueue {
  private isSyncing = false;
  private syncInterval: NodeJS.Timeout | null = null;

  /**
   * Start automatic background sync
   * @param intervalMs - Sync interval in milliseconds (default: 30 seconds)
   */
  startAutoSync(intervalMs: number = 30000): void {
    if (this.syncInterval) {
 logger.log('Auto-sync already running');
      return;
    }

 logger.log('x Starting auto-sync...');
    
    // Sync immediately
    this.syncAll();

    // Then sync on interval
    this.syncInterval = setInterval(() => {
      this.syncAll();
    }, intervalMs);
  }

  /**
   * Stop automatic background sync
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
 logger.log(' Auto-sync stopped');
    }
  }

  /**
   * Sync all pending operations in the queue
   */
  async syncAll(): Promise<SyncResult> {
    if (this.isSyncing) {
 logger.log('Sync already in progress, skipping...');
      return { success: false, synced: 0, failed: 0, errors: [] };
    }

    this.isSyncing = true;
    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      errors: [],
    };

    try {
      const queue = await localDB.getSyncQueue();
      
      if (queue.length === 0) {
 logger.log('S& Sync queue is empty');
        return result;
      }

 logger.log(`x Syncing ${queue.length} operation(s)...`);

      // Process each operation
      for (const operation of queue) {
        try {
          await this.syncOperation(operation);
          await localDB.removeFromSyncQueue(operation.id);
          result.synced++;
        } catch (error) {
 logger.error(`Failed to sync operation ${operation.id}:`, error);
          
          // Increment attempt counter
          operation.attempts++;
          operation.error = error instanceof Error ? error.message : String(error);

          // Remove from queue if max attempts reached (5 attempts)
          if (operation.attempts >= 5) {
 logger.error(`Max attempts reached for operation ${operation.id}, removing from queue`);
            await localDB.removeFromSyncQueue(operation.id);
          } else {
            await localDB.updateSyncOperation(operation.id, {
              attempts: operation.attempts,
              error: operation.error,
            });
          }

          result.failed++;
          result.errors.push({
            operation,
            error: operation.error,
          });
        }
      }

 logger.log(`S& Sync complete: ${result.synced} synced, ${result.failed} failed`);
    } catch (error) {
 logger.error('Error during sync:', error);
      result.success = false;
    } finally {
      this.isSyncing = false;
    }

    return result;
  }

  /**
   * Sync a single operation
   */
  private async syncOperation(operation: SyncOperation): Promise<void> {
    const { table, operation: op, data } = operation;

 logger.log(`Syncing ${op} on ${table}...`);

    switch (op) {
      case 'create':
        await this.syncCreate(table, data);
        break;
      case 'update':
        await this.syncUpdate(table, data);
        break;
      case 'delete':
        await this.syncDelete(table, data.id);
        break;
      default:
        throw new Error(`Unknown operation: ${op}`);
    }
  }

  /**
   * Sync create operation
   */
  private async syncCreate(table: string, data: Record<string, unknown>): Promise<void> {
    // Remove local-only metadata before uploading
    const { _synced, _local_only, ...cleanData } = data;

    const { error } = await supabase.from(table).insert(cleanData);

    if (error) {
      throw new Error(`Failed to create in ${table}: ${error.message}`);
    }

 logger.log(`S& Created in ${table}: ${data.id}`);
  }

  /**
   * Sync update operation
   */
  private async syncUpdate(table: string, data: Record<string, unknown>): Promise<void> {
    const { id, _synced, _local_only, ...updates } = data;

    const { error } = await supabase
      .from(table)
      .update(updates)
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to update in ${table}: ${error.message}`);
    }

 logger.log(`S& Updated in ${table}: ${id}`);
  }

  /**
   * Sync delete operation
   */
  private async syncDelete(table: string, id: string): Promise<void> {
    const { error } = await supabase.from(table).delete().eq('id', id);

    if (error) {
      throw new Error(`Failed to delete from ${table}: ${error.message}`);
    }

 logger.log(`S& Deleted from ${table}: ${id}`);
  }

  /**
   * Force sync for a specific table
   */
  async syncTable(table: string): Promise<SyncResult> {
    const queue = await localDB.getSyncQueue();
    const tableOperations = queue.filter((op) => op.table === table);

    if (tableOperations.length === 0) {
      return { success: true, synced: 0, failed: 0, errors: [] };
    }

    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      errors: [],
    };

    for (const operation of tableOperations) {
      try {
        await this.syncOperation(operation);
        await localDB.removeFromSyncQueue(operation.id);
        result.synced++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          operation,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return result;
  }

  /**
   * Get sync queue status
   */
  async getStatus(): Promise<{
    queueLength: number;
    isSyncing: boolean;
    operations: SyncOperation[];
  }> {
    const operations = await localDB.getSyncQueue();
    return {
      queueLength: operations.length,
      isSyncing: this.isSyncing,
      operations,
    };
  }

  /**
   * Clear all failed operations from the queue
   */
  async clearFailedOperations(): Promise<number> {
    const queue = await localDB.getSyncQueue();
    const failed = queue.filter((op) => op.attempts >= 3);
    
    for (const operation of failed) {
      await localDB.removeFromSyncQueue(operation.id);
    }

    return failed.length;
  }

  /**
   * Retry all failed operations
   */
  async retryFailedOperations(): Promise<SyncResult> {
    const queue = await localDB.getSyncQueue();
    const failed = queue.filter((op) => op.attempts > 0);

    if (failed.length === 0) {
      return { success: true, synced: 0, failed: 0, errors: [] };
    }

 logger.log(`x Retrying ${failed.length} failed operation(s)...`);

    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      errors: [],
    };

    for (const operation of failed) {
      try {
        await this.syncOperation(operation);
        await localDB.removeFromSyncQueue(operation.id);
        result.synced++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          operation,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return result;
  }
}

// Singleton instance
export const syncQueue = new SyncQueue();
export default syncQueue;

