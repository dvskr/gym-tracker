import { logger } from '@/lib/utils/logger';
/**
 * Background Sync Usage Examples
 * 
 * The background sync system handles bidirectional synchronization:
 * - PUSH: Local changes �  Supabase (via sync queue)
 * - PULL: Supabase changes �  Local (for multi-device support)
 */

import { backgroundSync, SyncStats } from '@/lib/sync/backgroundSync';
import { batchMerge, mergeWithStats, MergeStats } from '@/lib/sync/dataMerger';
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, AppState } from 'react-native';

// ============================================================================
// EXAMPLE 1: Background sync is AUTOMATIC (already integrated in _layout.tsx)
// ============================================================================

// No setup needed! Background sync starts automatically when app loads.
// It syncs every 30 seconds and when:
// - App becomes active
// - Network reconnects
// - User manually triggers sync

// ============================================================================
// EXAMPLE 2: Manual sync trigger with feedback
// ============================================================================

export function ManualSyncButton() {
  const [syncing, setSyncing] = useState(false);
  const [lastStats, setLastStats] = useState<SyncStats | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const stats = await backgroundSync.syncNow();
      setLastStats(stats);
      
      Alert.alert(
        'Sync Complete',
        `�S& Synced: ${stats.itemsSynced}\n` +
        `�x� Pulled: ${stats.itemsPulled}\n` +
        `${stats.errors.length > 0 ? `�a���� Errors: ${stats.errors.length}` : ''}`
      );
    } catch (error) {
      Alert.alert('Sync Failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <View>
      <TouchableOpacity onPress={handleSync} disabled={syncing}>
        <Text>{syncing ? 'Syncing...' : 'Sync Now'}</Text>
      </TouchableOpacity>
      
      {lastStats && (
        <Text>
          Last sync: {new Date(lastStats.lastSyncTime || 0).toLocaleTimeString()}
        </Text>
      )}
    </View>
  );
}

// ============================================================================
// EXAMPLE 3: Display sync status
// ============================================================================

export function SyncStatusDisplay() {
  const [status, setStatus] = useState({
    isRunning: false,
    isSyncing: false,
    isOnline: false,
  });
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

  useEffect(() => {
    const updateStatus = async () => {
      setStatus(backgroundSync.getStatus());
      const lastSync = await backgroundSync.getLastSyncTime();
      setLastSyncTime(lastSync);
    };

    updateStatus();
    const interval = setInterval(updateStatus, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <View>
      <Text>Status: {status.isRunning ? '�xx� Running' : '⏸��� Stopped'}</Text>
      <Text>Network: {status.isOnline ? '�xR� Online' : '�x� Offline'}</Text>
      <Text>Syncing: {status.isSyncing ? '⏳ Yes' : '�S& No'}</Text>
      {lastSyncTime && (
        <Text>
          Last sync: {new Date(lastSyncTime).toLocaleString()}
        </Text>
      )}
    </View>
  );
}

// ============================================================================
// EXAMPLE 4: Change sync interval
// ============================================================================

export function SyncIntervalSettings() {
  const intervals = [
    { label: '10 seconds', value: 10000 },
    { label: '30 seconds', value: 30000 },
    { label: '1 minute', value: 60000 },
    { label: '5 minutes', value: 300000 },
  ];

  const handleIntervalChange = (intervalMs: number) => {
    backgroundSync.setSyncInterval(intervalMs);
    Alert.alert('Sync Interval Updated', `Now syncing every ${intervalMs / 1000}s`);
  };

  return (
    <View>
      {intervals.map((interval) => (
        <TouchableOpacity
          key={interval.value}
          onPress={() => handleIntervalChange(interval.value)}
        >
          <Text>{interval.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ============================================================================
// EXAMPLE 5: Manual data merge with conflict tracking
// ============================================================================

export async function manualMergeWithTracking() {
  const localWorkouts = await getLocalWorkouts();
  const serverWorkouts = await fetchWorkoutsFromServer();

  const { merged, stats } = await mergeWithStats(localWorkouts, serverWorkouts);

  logger.log('Merge Statistics:');
  logger.log(`Total: ${stats.total}`);
  logger.log(`From Server: ${stats.fromServer}`);
  logger.log(`From Local: ${stats.fromLocal}`);
  logger.log(`Conflicts: ${stats.conflicts}`);
  logger.log(`Server Wins: ${stats.serverWins}`);
  logger.log(`Local Wins: ${stats.localWins}`);

  // Save merged data
  await saveWorkoutsLocally(merged);
}

// ============================================================================
// EXAMPLE 6: Batch merge multiple data types
// ============================================================================

export async function syncAllDataTypes() {
  const result = await batchMerge({
    workouts: await fetchWorkoutsFromServer(),
    templates: await fetchTemplatesFromServer(),
    weightLog: await fetchWeightLogFromServer(),
    measurements: await fetchMeasurementsFromServer(),
    personalRecords: await fetchPersonalRecordsFromServer(),
  });

  logger.log('Batch Merge Results:');
  logger.log(`Workouts: ${result.workouts}`);
  logger.log(`Templates: ${result.templates}`);
  logger.log(`Weight Log: ${result.weightLog}`);
  logger.log(`Measurements: ${result.measurements}`);
  logger.log(`Personal Records: ${result.personalRecords}`);
  
  if (result.errors.length > 0) {
    logger.error('Errors:', result.errors);
  }
}

// ============================================================================
// EXAMPLE 7: Custom app state handling
// ============================================================================

export function CustomAppStateHandler() {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        // App came to foreground
        logger.log('�x� App active - syncing...');
        backgroundSync.syncNow();
      } else if (nextAppState === 'background') {
        // App went to background
        logger.log('�x� App background - pausing sync...');
        // Sync is automatically stopped by _layout.tsx
      }
    });

    return () => subscription.remove();
  }, []);

  return null;
}

// ============================================================================
// EXAMPLE 8: Monitor network and sync on reconnect
// ============================================================================

export function NetworkAwareSyncMonitor() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const checkNetwork = async () => {
      const status = backgroundSync.getStatus();
      setIsOnline(status.isOnline);
    };

    checkNetwork();
    const interval = setInterval(checkNetwork, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <View>
      {!isOnline && (
        <View style={{ backgroundColor: '#f59e0b', padding: 8 }}>
          <Text style={{ color: '#fff' }}>
            �x� Offline - Will sync when reconnected
          </Text>
        </View>
      )}
    </View>
  );
}

// ============================================================================
// EXAMPLE 9: Sync on specific user action
// ============================================================================

export function SyncAfterWorkout() {
  const handleWorkoutComplete = async (workout: any) => {
    // Save workout locally (instant)
    await saveWorkoutLocally(workout);
    
    // Trigger immediate sync
    logger.log('�x�9️ Workout completed - syncing now...');
    await backgroundSync.syncNow();
  };

  return (
    <TouchableOpacity onPress={() => handleWorkoutComplete({ /* workout data */ })}>
      <Text>Complete Workout</Text>
    </TouchableOpacity>
  );
}

// ============================================================================
// EXAMPLE 10: Sync settings screen
// ============================================================================

export function SyncSettingsScreen() {
  const [status, setStatus] = useState({
    isRunning: false,
    isSyncing: false,
    isOnline: false,
  });
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    const updateStatus = async () => {
      setStatus(backgroundSync.getStatus());
      const lastSyncTime = await backgroundSync.getLastSyncTime();
      setLastSync(lastSyncTime ? new Date(lastSyncTime) : null);
    };

    updateStatus();
    const interval = setInterval(updateStatus, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    const stats = await backgroundSync.syncNow();
    Alert.alert(
      'Sync Complete',
      `Synced ${stats.itemsSynced} items\n` +
      `Pulled ${stats.itemsPulled} updates`
    );
  };

  const handleToggleAutoSync = () => {
    if (status.isRunning) {
      backgroundSync.stop();
      Alert.alert('Auto-sync disabled');
    } else {
      backgroundSync.start();
      Alert.alert('Auto-sync enabled');
    }
  };

  return (
    <View>
      <Text>SYNC STATUS</Text>
      
      <View>
        <Text>Auto-sync: {status.isRunning ? 'ON' : 'OFF'}</Text>
        <TouchableOpacity onPress={handleToggleAutoSync}>
          <Text>{status.isRunning ? 'Disable' : 'Enable'}</Text>
        </TouchableOpacity>
      </View>

      <View>
        <Text>Connection: {status.isOnline ? '�xx� Online' : '�x� Offline'}</Text>
      </View>

      <View>
        <Text>Status: {status.isSyncing ? '⏳ Syncing...' : '�S& Idle'}</Text>
      </View>

      {lastSync && (
        <View>
          <Text>Last sync: {lastSync.toLocaleString()}</Text>
        </View>
      )}

      <TouchableOpacity
        onPress={handleManualSync}
        disabled={status.isSyncing || !status.isOnline}
      >
        <Text>Sync Now</Text>
      </TouchableOpacity>
    </View>
  );
}

// ============================================================================
// Helper functions (you'd implement these based on your data layer)
// ============================================================================

async function getLocalWorkouts() {
  // Implementation
  return [];
}

async function fetchWorkoutsFromServer() {
  // Implementation
  return [];
}

async function saveWorkoutsLocally(workouts: any[]) {
  // Implementation
}

async function saveWorkoutLocally(workout: any) {
  // Implementation
}

async function fetchTemplatesFromServer() {
  return [];
}

async function fetchWeightLogFromServer() {
  return [];
}

async function fetchMeasurementsFromServer() {
  return [];
}

async function fetchPersonalRecordsFromServer() {
  return [];
}

// ============================================================================
// Key Benefits of Background Sync:
// ============================================================================
//
// 1. �S& Bidirectional sync (push local, pull server changes)
// 2. �S& Multi-device support (changes from other devices sync in)
// 3. �S& Automatic (no user intervention needed)
// 4. �S& Smart merging (timestamp-based conflict resolution)
// 5. �S& Battery efficient (stops when app is in background)
// 6. �S& Network aware (syncs when online, queues when offline)
// 7. �S& App lifecycle aware (syncs on app open/foreground)
//
// ============================================================================

