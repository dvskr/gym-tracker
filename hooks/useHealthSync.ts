import { useState, useEffect } from 'react';
import { healthSyncService } from '@/lib/health/healthSync';

export function useHealthSync() {
  const [syncStatus, setSyncStatus] = useState(healthSyncService.getSyncStatus());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Poll sync status
  useEffect(() => {
    const interval = setInterval(() => {
      setSyncStatus(healthSyncService.getSyncStatus());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const syncNow = async () => {
    setIsRefreshing(true);
    try {
      const result = await healthSyncService.forceSync();
      return result;
    } finally {
      setIsRefreshing(false);
    }
  };

  return {
    ...syncStatus,
    isRefreshing,
    syncNow,
  };
}

