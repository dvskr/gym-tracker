import { logger } from '@/lib/utils/logger';
/**
 * Manual Sync Integration Examples
 * Shows how to add pull-to-refresh, header buttons, and manual sync triggers
 */

import React, { useState } from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { RefreshCw } from 'lucide-react-native';
import { manualSync } from '@/lib/sync/manualSync';
import { router } from 'expo-router';

// ============================================================================
// EXAMPLE 1: Pull-to-Refresh on Workouts Screen
// ============================================================================

export function WorkoutsScreenWithRefresh() {
  const [workouts, setWorkouts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadWorkouts = async () => {
    const data = await localDB.getLocalWorkouts();
    setWorkouts(data);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // S& Sync data
      await manualSync.syncNow();
      
      // S& Reload from local storage
      await loadWorkouts();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <FlatList
      data={workouts}
      renderItem={({ item }) => <WorkoutCard workout={item} />}
      // S& Pull-to-refresh control
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor="#3b82f6"
          title="Syncing..."
        />
      }
    />
  );
}

// ============================================================================
// EXAMPLE 2: Sync Button in Header
// ============================================================================

export function HeaderWithSyncButton() {
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await manualSync.syncNow();
    } finally {
      setSyncing(false);
    }
  };

  return {
    // In your screen options:
    headerRight: () => (
      <TouchableOpacity
        onPress={handleSync}
        disabled={syncing}
        style={{ marginRight: 16 }}
      >
        <RefreshCw
          size={20}
          color={syncing ? '#64748b' : '#f1f5f9'}
          style={syncing ? styles.spinning : undefined}
        />
      </TouchableOpacity>
    ),
  };
}

// Add to screen:
export function WorkoutsScreen() {
  return (
    <Stack.Screen
      options={{
        title: 'Workouts',
        ...HeaderWithSyncButton(),
      }}
    />
  );
}

// ============================================================================
// EXAMPLE 3: Templates Screen with Pull-to-Refresh
// ============================================================================

export function TemplatesScreen() {
  const [templates, setTemplates] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadTemplates = async () => {
    const data = await localDB.getLocalTemplates();
    setTemplates(data);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await manualSync.syncNow();
      await loadTemplates();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <FlatList
      data={templates}
      renderItem={({ item }) => <TemplateCard template={item} />}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      }
    />
  );
}

// ============================================================================
// EXAMPLE 4: Manual Sync with Progress Indicator
// ============================================================================

export function ManualSyncWithProgress() {
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState('');

  const handleSync = async () => {
    setSyncing(true);
    
    try {
      setProgress('Checking network...');
      const canSync = await manualSync.canSync();
      
      if (!canSync.canSync) {
        Alert.alert('Cannot Sync', canSync.reason);
        return;
      }

      setProgress('Syncing changes...');
      const result = await manualSync.syncNow();
      
      if (result.success) {
        setProgress('Complete!');
        Alert.alert(
          'Sync Complete',
          `S& ${result.syncedCount} synced\nx ${result.pulledCount} pulled`
        );
      } else {
        Alert.alert('Sync Failed', result.error);
      }
    } finally {
      setSyncing(false);
      setTimeout(() => setProgress(''), 2000);
    }
  };

  return (
    <View>
      <TouchableOpacity onPress={handleSync} disabled={syncing}>
        <Text>{syncing ? progress : 'Sync Now'}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ============================================================================
// EXAMPLE 5: Settings Screen Link
// ============================================================================

export function ProfileScreenWithSyncLink() {
  return (
    <ScrollView>
      {/* Other settings */}
      
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>DATA & SYNC</Text>
        
        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => router.push('/settings/sync')}
        >
          <Text style={styles.settingLabel}>Sync & Backup</Text>
          <View style={styles.settingValue}>
            <Text style={styles.settingValueText}>Configure</Text>
            <ChevronRight size={20} color="#64748b" />
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ============================================================================
// EXAMPLE 6: Sync on Screen Focus
// ============================================================================

export function SyncOnFocusScreen() {
  const [data, setData] = useState([]);

  useFocusEffect(
    useCallback(() => {
      // S& Sync when screen comes into focus
      const syncOnFocus = async () => {
        const result = await manualSync.syncNow();
        if (result.success) {
          await loadData();
        }
      };

      syncOnFocus();
    }, [])
  );

  const loadData = async () => {
    const data = await localDB.getLocalWorkouts();
    setData(data);
  };

  return <View>{/* Your UI */}</View>;
}

// ============================================================================
// EXAMPLE 7: Periodic Manual Sync
// ============================================================================

export function PeriodicSyncScreen() {
  useEffect(() => {
    // S& Sync every 5 minutes
    const interval = setInterval(async () => {
      const settings = await manualSync.getSettings();
      if (settings.autoSync) {
        await manualSync.syncNow();
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return <View>{/* Your UI */}</View>;
}

// ============================================================================
// EXAMPLE 8: Sync Before Important Action
// ============================================================================

export function SyncBeforeAction() {
  const handleStartWorkout = async () => {
    // S& Sync before starting workout to get latest templates
    await manualSync.syncNow();
    
    // Then start workout
    router.push('/workout/start');
  };

  return (
    <TouchableOpacity onPress={handleStartWorkout}>
      <Text>Start Workout</Text>
    </TouchableOpacity>
  );
}

// ============================================================================
// EXAMPLE 9: Sync Status Widget
// ============================================================================

export function SyncStatusWidget() {
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    loadSyncStatus();
    const interval = setInterval(loadSyncStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadSyncStatus = async () => {
    const time = await manualSync.getLastSyncTime();
    const pending = await manualSync.getPendingChanges();
    setLastSync(time ? new Date(time) : null);
    setPendingCount(pending.total);
  };

  return (
    <View style={styles.widget}>
      <Text style={styles.widgetTitle}>Sync Status</Text>
      <Text style={styles.widgetText}>
        Last sync: {lastSync ? formatDistanceToNow(lastSync) : 'Never'}
      </Text>
      {pendingCount > 0 && (
        <Text style={styles.widgetPending}>
          {pendingCount} pending changes
        </Text>
      )}
    </View>
  );
}

// ============================================================================
// EXAMPLE 10: Retry Failed with Notification
// ============================================================================

export function RetryFailedButton() {
  const { failedCount } = useSyncQueue();

  const handleRetry = async () => {
    if (failedCount === 0) {
      Alert.alert('No Failed Changes', 'All changes have been synced successfully');
      return;
    }

    const result = await manualSync.retryAllFailed();
    
    if (result.syncedCount && result.syncedCount > 0) {
      Alert.alert(
        'Success',
        `${result.syncedCount} change(s) synced successfully!`,
        [{ text: 'OK' }]
      );
    }

    if (result.failedCount && result.failedCount > 0) {
      Alert.alert(
        'Some Failed',
        `${result.failedCount} change(s) still failed to sync`,
        [
          { text: 'OK' },
          {
            text: 'View Details',
            onPress: () => router.push('/settings/sync'),
          },
        ]
      );
    }
  };

  if (failedCount === 0) return null;

  return (
    <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
      <AlertTriangle size={16} color="#f59e0b" />
      <Text style={styles.retryText}>
        {failedCount} Failed - Tap to Retry
      </Text>
    </TouchableOpacity>
  );
}

// ============================================================================
// EXAMPLE 11: Sync Settings Toggle
// ============================================================================

export function QuickSyncToggle() {
  const [autoSync, setAutoSync] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const settings = await manualSync.getSettings();
    setAutoSync(settings.autoSync);
  };

  const handleToggle = async (value: boolean) => {
    setAutoSync(value);
    await manualSync.updateSettings({ autoSync: value });
    
    if (value) {
      Alert.alert('Auto-sync Enabled', 'Changes will sync automatically');
    } else {
      Alert.alert('Auto-sync Disabled', 'You will need to sync manually');
    }
  };

  return (
    <View style={styles.toggleRow}>
      <Text>Auto-sync</Text>
      <Switch value={autoSync} onValueChange={handleToggle} />
    </View>
  );
}

// ============================================================================
// EXAMPLE 12: Sync on App Foreground
// ============================================================================

export function SyncOnAppForeground() {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        // S& App came to foreground - sync
 logger.log('App active - syncing...');
        await manualSync.syncNow();
      }
    });

    return () => subscription.remove();
  }, []);

  return null;
}

const styles = StyleSheet.create({
  spinning: {
    // Add animation if needed
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1e293b',
  },
  settingLabel: {
    fontSize: 16,
    color: '#f1f5f9',
  },
  settingValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  settingValueText: {
    fontSize: 14,
    color: '#3b82f6',
  },
  widget: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    margin: 16,
  },
  widgetTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 8,
  },
  widgetText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  widgetPending: {
    fontSize: 13,
    color: '#f59e0b',
    marginTop: 4,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#451a03',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#f59e0b',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
});

// ============================================================================
// Key Benefits:
// ============================================================================
//
// 1. S& Pull-to-refresh on any screen
// 2. S& Manual sync button in headers
// 3. S& Automatic sync on app foreground
// 4. S& Sync before important actions
// 5. S& Retry failed operations easily
// 6. S& Full control over sync settings
// 7. S& Data usage tracking
// 8. S& WiFi-only option
//
// ============================================================================
