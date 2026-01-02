import React, { useEffect, useState } from 'react';
import { logger } from '@/lib/utils/logger';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { syncQueue } from '../sync/syncQueue';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

/**
 * Sync Provider - Manages background sync
 * Add this to your app root (_layout.tsx)
 */
export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { isOnline } = useNetworkStatus();

  useEffect(() => {
 logger.log('xa Starting offline-first sync system...');
    
    // Start auto-sync when app loads
    syncQueue.startAutoSync(30000); // Sync every 30 seconds

    return () => {
 logger.log(' Stopping sync system...');
      syncQueue.stopAutoSync();
    };
  }, []);

  // Trigger sync when coming back online
  useEffect(() => {
    if (isOnline) {
 logger.log('x Back online - triggering sync...');
      syncQueue.syncAll();
    }
  }, [isOnline]);

  return <>{children}</>;
}

/**
 * Offline Status Banner
 * Shows when user is offline and how many items are pending sync
 */
export function OfflineStatusBanner() {
  const { isOnline, connectionType } = useNetworkStatus();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const updateStatus = async () => {
      const status = await syncQueue.getStatus();
      setPendingCount(status.queueLength);
    };

    updateStatus();
    
    // Update every 5 seconds
    const interval = setInterval(updateStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <View style={[styles.banner, isOnline ? styles.bannerSyncing : styles.bannerOffline]}>
      <Text style={styles.bannerText}>
        {isOnline ? (
          pendingCount > 0 ? `⏳ Syncing ${pendingCount} item(s)...` : 'S& All synced'
        ) : (
          `�x� Offline${pendingCount > 0 ? ` • ${pendingCount} pending` : ''}`
        )}
      </Text>
    </View>
  );
}

/**
 * Sync Status Indicator
 * Shows detailed sync status with manual sync button
 */
export function SyncStatusIndicator() {
  const { isOnline } = useNetworkStatus();
  const [status, setStatus] = useState({
    queueLength: 0,
    isSyncing: false,
    operations: [],
  });
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const updateStatus = async () => {
      const s = await syncQueue.getStatus();
      setStatus(s);
    };

    updateStatus();
    const interval = setInterval(updateStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    if (!isOnline) {
      return;
    }

    setSyncing(true);
    try {
      await syncQueue.syncAll();
    } finally {
      setSyncing(false);
    }
  };

  if (status.queueLength === 0 && !status.isSyncing) {
    return (
      <View style={styles.indicator}>
        <View style={[styles.dot, styles.dotGreen]} />
        <Text style={styles.indicatorText}>Synced</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={styles.indicator}
      onPress={handleManualSync}
      disabled={!isOnline || syncing}
    >
      <View
        style={[
          styles.dot,
          isOnline ? styles.dotOrange : styles.dotRed,
        ]}
      />
      <Text style={styles.indicatorText}>
        {status.isSyncing || syncing
          ? 'Syncing...'
          : `${status.queueLength} pending`}
      </Text>
    </TouchableOpacity>
  );
}

/**
 * Debug Sync Panel
 * Shows detailed sync queue information (for development)
 */
export function DebugSyncPanel() {
  const [status, setStatus] = useState({
    queueLength: 0,
    isSyncing: false,
    operations: [],
  });

  useEffect(() => {
    const updateStatus = async () => {
      const s = await syncQueue.getStatus();
      setStatus(s);
    };

    updateStatus();
    const interval = setInterval(updateStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleClearFailed = async () => {
    const cleared = await syncQueue.clearFailedOperations();
 logger.log(`Cleared ${cleared} failed operations`);
  };

  const handleRetryFailed = async () => {
    const result = await syncQueue.retryFailedOperations();
 logger.log(`Retry result:`, result);
  };

  const handleSyncNow = async () => {
    await syncQueue.syncAll();
  };

  return (
    <View style={styles.debugPanel}>
      <Text style={styles.debugTitle}>Sync Debug Panel</Text>
      
      <View style={styles.debugRow}>
        <Text style={styles.debugLabel}>Queue Length:</Text>
        <Text style={styles.debugValue}>{status.queueLength}</Text>
      </View>

      <View style={styles.debugRow}>
        <Text style={styles.debugLabel}>Status:</Text>
        <Text style={styles.debugValue}>
          {status.isSyncing ? '�x Syncing' : '⏸��� Idle'}
        </Text>
      </View>

      <View style={styles.debugButtons}>
        <TouchableOpacity style={styles.debugButton} onPress={handleSyncNow}>
          <Text style={styles.debugButtonText}>Sync Now</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.debugButton} onPress={handleRetryFailed}>
          <Text style={styles.debugButtonText}>Retry Failed</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.debugButton, styles.debugButtonDanger]}
          onPress={handleClearFailed}
        >
          <Text style={styles.debugButtonText}>Clear Failed</Text>
        </TouchableOpacity>
      </View>

      {status.operations.length > 0 && (
        <View style={styles.operationsList}>
          <Text style={styles.debugSubtitle}>Pending Operations:</Text>
          {status.operations.slice(0, 5).map((op: any) => (
            <View key={op.id} style={styles.operation}>
              <Text style={styles.operationText}>
                {op.operation} • {op.table} • Attempts: {op.attempts}
              </Text>
              {op.error && (
                <Text style={styles.operationError}>Error: {op.error}</Text>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Banner styles
  banner: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  bannerOffline: {
    backgroundColor: '#f59e0b',
  },
  bannerSyncing: {
    backgroundColor: '#3b82f6',
  },
  bannerText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },

  // Indicator styles
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#1e293b',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  dotGreen: {
    backgroundColor: '#22c55e',
  },
  dotOrange: {
    backgroundColor: '#f59e0b',
  },
  dotRed: {
    backgroundColor: '#ef4444',
  },
  indicatorText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },

  // Debug panel styles
  debugPanel: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    margin: 16,
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 12,
  },
  debugSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f1f5f9',
    marginTop: 12,
    marginBottom: 8,
  },
  debugRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  debugLabel: {
    fontSize: 14,
    color: '#94a3b8',
  },
  debugValue: {
    fontSize: 14,
    color: '#f1f5f9',
    fontWeight: '500',
  },
  debugButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  debugButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  debugButtonDanger: {
    backgroundColor: '#ef4444',
  },
  debugButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  operationsList: {
    marginTop: 12,
  },
  operation: {
    backgroundColor: '#334155',
    padding: 8,
    borderRadius: 6,
    marginBottom: 6,
  },
  operationText: {
    fontSize: 12,
    color: '#f1f5f9',
  },
  operationError: {
    fontSize: 11,
    color: '#ef4444',
    marginTop: 4,
  },
});
