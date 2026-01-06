import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/utils/logger';
import { syncQueue, SyncResult } from '../lib/sync/syncQueue';
import { useNetworkStatus } from './useNetworkStatus';

export interface UseSyncQueueResult {
  // Status
  pendingCount: number;
  failedCount: number;
  isSyncing: boolean;
  isOnline: boolean;
  
  // Queue info
  queueLength: number;
  failedOperations: Array<{
    id: string;
    operation: string;
    table: string;
    error?: string;
    [key: string]: unknown;
  }>;
  
  // Actions
  sync: () => Promise<SyncResult>;
  retryFailed: () => Promise<SyncResult>;
  clearFailed: () => Promise<number>;
  clearCompleted: () => Promise<void>;
  
  // Last sync result
  lastSyncResult: SyncResult | null;
}

/**
 * Hook for monitoring and controlling the sync queue
 * 
 * Provides real-time status of pending/failed operations
 * and methods to manually trigger sync operations
 */
export function useSyncQueue(): UseSyncQueueResult {
  const { isOnline } = useNetworkStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [queueLength, setQueueLength] = useState(0);
  const [failedOperations, setFailedOperations] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);

  // Update status periodically
  useEffect(() => {
    const updateStatus = async () => {
      const status = await syncQueue.getStatus();
      setQueueLength(status.queueLength);
      setIsSyncing(status.isSyncing);
      
      // Calculate pending and failed counts
      const pending = status.operations.filter(op => op.attempts === 0).length;
      const failed = status.operations.filter(op => op.attempts >= 3).length;
      
      setPendingCount(pending);
      setFailedCount(failed);
      setFailedOperations(status.operations.filter(op => op.attempts >= 3));
    };

    // Update immediately
    updateStatus();

    // Then update every 2 seconds
    const interval = setInterval(updateStatus, 2000);

    return () => clearInterval(interval);
  }, []);

  // Manual sync
  const sync = useCallback(async (): Promise<SyncResult> => {
    if (!isOnline) {
      return {
        success: false,
        synced: 0,
        failed: 0,
        errors: [{ operation: {} as any, error: 'Device is offline' }],
      };
    }

    setIsSyncing(true);
    try {
      const result = await syncQueue.syncAll();
      setLastSyncResult(result);
      return result;
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline]);

  // Retry failed operations
  const retryFailed = useCallback(async (): Promise<SyncResult> => {
    if (!isOnline) {
      return {
        success: false,
        synced: 0,
        failed: 0,
        errors: [{ operation: {} as any, error: 'Device is offline' }],
      };
    }

    setIsSyncing(true);
    try {
      const result = await syncQueue.retryFailedOperations();
      setLastSyncResult(result);
      return result;
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline]);

  // Clear failed operations
  const clearFailed = useCallback(async (): Promise<number> => {
    return await syncQueue.clearFailedOperations();
  }, []);

  // Clear completed operations (if we add this method)
  const clearCompleted = useCallback(async (): Promise<void> => {
    // Note: Current implementation auto-removes completed operations
    // This is a placeholder if you want to implement batch clearing
 logger.log('Completed operations are auto-removed');
  }, []);

  return {
    // Status
    pendingCount,
    failedCount,
    isSyncing,
    isOnline,
    queueLength,
    failedOperations,
    
    // Actions
    sync,
    retryFailed,
    clearFailed,
    clearCompleted,
    
    // Last result
    lastSyncResult,
  };
}

/**
 * Simplified hook that just returns pending count
 * Useful for displaying sync badge/indicator
 */
export function usePendingSyncCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const updateCount = async () => {
      const status = await syncQueue.getStatus();
      setCount(status.queueLength);
    };

    updateCount();
    const interval = setInterval(updateCount, 3000);

    return () => clearInterval(interval);
  }, []);

  return count;
}

/**
 * Hook that triggers sync when component mounts
 * Useful for screens that should always have fresh data
 */
export function useSyncOnMount() {
  const { isOnline } = useNetworkStatus();

  useEffect(() => {
    if (isOnline) {
      syncQueue.syncAll();
    }
  }, [isOnline]);
}

/**
 * Hook that syncs a specific table when component mounts
 */
export function useSyncTable(table: string) {
  const { isOnline } = useNetworkStatus();
  const [isSyncing, setIsSyncing] = useState(false);

  const syncTable = useCallback(async () => {
    if (!isOnline) return;
    
    setIsSyncing(true);
    try {
      await syncQueue.syncTable(table);
    } finally {
      setIsSyncing(false);
    }
  }, [table, isOnline]);

  // Sync on mount
  useEffect(() => {
    syncTable();
  }, [syncTable]);

  return { isSyncing, syncTable };
}

export default useSyncQueue;

