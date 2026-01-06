import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/utils/logger';
import { localDB } from '../lib/storage/localDatabase';
import { useNetworkStatus } from './useNetworkStatus';

export interface UseOfflineFirstOptions {
  cacheTime?: number; // Time in milliseconds before cache is considered stale
  refetchOnMount?: boolean;
  refetchOnReconnect?: boolean;
  syncOnChange?: boolean;
}

export interface UseOfflineFirstResult<T> {
  data: T[];
  isLoading: boolean;
  isRefreshing: boolean;
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: number | null;
  error: Error | null;
  refresh: () => Promise<void>;
  refetchFromCloud: () => Promise<void>;
  addItem: (item: T) => Promise<void>;
  updateItem: (id: string, updates: Partial<T>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
}

/**
 * Offline-first data hook
 * 
 * Pattern:
 * 1. Load from local storage immediately (instant UI)
 * 2. If online, fetch from cloud in background
 * 3. Merge cloud data with local data
 * 4. Update local storage with merged data
 * 5. Queue any local changes for sync
 */
export function useOfflineFirst<T extends { id: string; _synced?: boolean }>(
  storageKey: string,
  fetchFromCloud: () => Promise<T[]>,
  options: UseOfflineFirstOptions = {}
): UseOfflineFirstResult<T> {
  const {
    cacheTime = 5 * 60 * 1000, // 5 minutes default
    refetchOnMount = true,
    refetchOnReconnect = true,
    syncOnChange = true,
  } = options;

  const { isOnline } = useNetworkStatus();
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [wasOffline, setWasOffline] = useState(!isOnline);

  // Load data from local storage first (immediate)
  const loadFromLocal = useCallback(async () => {
    try {
      const localData = await localDB.getLocal(storageKey);
      setData(localData);
      
      // Get last sync time
      const lastSync = await localDB.getLastSyncTime(storageKey);
      setLastSyncTime(lastSync);
      
      return localData;
    } catch (err: unknown) {
 logger.error(`Error loading from local storage (${storageKey}):`, err);
      setError(err as Error);
      return [];
    }
  }, [storageKey]);

  // Fetch from cloud and merge with local
  const refetchFromCloud = useCallback(async () => {
    if (!isOnline) {
 logger.log('Offline - skipping cloud fetch');
      return;
    }

    try {
      setIsRefreshing(true);
      setError(null);

      // Fetch fresh data from cloud
      const cloudData = await fetchFromCloud();
      
      // Get current local data
      const localData = await localDB.getLocal(storageKey);
      
      // Merge (cloud takes precedence for synced items)
      const merged = localDB.mergeData(localData, cloudData);
      
      // Update state
      setData(merged);
      
      // Save merged data to local storage
      await localDB.saveLocally(storageKey, merged);
      
      // Update last sync time
      const now = Date.now();
      await localDB.setLastSyncTime(storageKey, now);
      setLastSyncTime(now);
      
 logger.log(`S& Synced ${storageKey}: ${cloudData.length} items from cloud`);
    } catch (err: unknown) {
 logger.error(`Error fetching from cloud (${storageKey}):`, err);
      setError(err as Error);
      // Keep local data on error
    } finally {
      setIsRefreshing(false);
    }
  }, [isOnline, storageKey, fetchFromCloud]);

  // Combined refresh (local + cloud if online)
  const refresh = useCallback(async () => {
    await loadFromLocal();
    if (isOnline) {
      await refetchFromCloud();
    }
  }, [loadFromLocal, refetchFromCloud, isOnline]);

  // Initial load
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      setIsLoading(true);
      
      // Always load local first
      await loadFromLocal();
      
      // Then fetch from cloud if online and should refetch on mount
      if (mounted && isOnline && refetchOnMount) {
        // Check cache age
        const lastSync = await localDB.getLastSyncTime(storageKey);
        const cacheAge = lastSync ? Date.now() - lastSync : Infinity;
        
        if (cacheAge > cacheTime) {
          await refetchFromCloud();
        }
      }
      
      if (mounted) {
        setIsLoading(false);
      }
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, [storageKey]); // Only run on mount

  // Handle reconnection
  useEffect(() => {
    if (isOnline && wasOffline && refetchOnReconnect) {
 logger.log('x Reconnected - syncing data...');
      refetchFromCloud();
    }
    setWasOffline(!isOnline);
  }, [isOnline, wasOffline, refetchOnReconnect, refetchFromCloud]);

  // Add item (write local first, sync later)
  const addItem = useCallback(
    async (item: T) => {
      try {
        // Add to local immediately
        const currentData = await localDB.getLocal(storageKey);
        const newData = [...currentData, { ...item, _synced: false }];
        await localDB.saveLocally(storageKey, newData);
        setData(newData);

        // Add to sync queue if sync is enabled
        if (syncOnChange) {
          await localDB.addToSyncQueue({
            id: `${storageKey}-${item.id}-${Date.now()}`,
            table: storageKey,
            operation: 'create',
            data: item,
            timestamp: Date.now(),
            attempts: 0,
          });
        }
      } catch (err: unknown) {
 logger.error('Error adding item:', err);
        setError(err as Error);
      }
    },
    [storageKey, syncOnChange]
  );

  // Update item (write local first, sync later)
  const updateItem = useCallback(
    async (id: string, updates: Partial<T>) => {
      try {
        const currentData = await localDB.getLocal(storageKey);
        const index = currentData.findIndex((item: T) => item.id === id);
        
        if (index >= 0) {
          currentData[index] = { ...currentData[index], ...updates, _synced: false };
          await localDB.saveLocally(storageKey, currentData);
          setData(currentData);

          if (syncOnChange) {
            await localDB.addToSyncQueue({
              id: `${storageKey}-${id}-${Date.now()}`,
              table: storageKey,
              operation: 'update',
              data: currentData[index],
              timestamp: Date.now(),
              attempts: 0,
            });
          }
        }
      } catch (err: unknown) {
 logger.error('Error updating item:', err);
        setError(err as Error);
      }
    },
    [storageKey, syncOnChange]
  );

  // Delete item (write local first, sync later)
  const deleteItem = useCallback(
    async (id: string) => {
      try {
        const currentData = await localDB.getLocal(storageKey);
        const filtered = currentData.filter((item: T) => item.id !== id);
        await localDB.saveLocally(storageKey, filtered);
        setData(filtered);

        if (syncOnChange) {
          await localDB.addToSyncQueue({
            id: `${storageKey}-delete-${id}-${Date.now()}`,
            table: storageKey,
            operation: 'delete',
            data: { id },
            timestamp: Date.now(),
            attempts: 0,
          });
        }
      } catch (err: unknown) {
 logger.error('Error deleting item:', err);
        setError(err as Error);
      }
    },
    [storageKey, syncOnChange]
  );

  return {
    data,
    isLoading,
    isRefreshing,
    isOnline,
    isSyncing,
    lastSyncTime,
    error,
    refresh,
    refetchFromCloud,
    addItem,
    updateItem,
    deleteItem,
  };
}

export default useOfflineFirst;

