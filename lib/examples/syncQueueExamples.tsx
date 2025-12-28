import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useSyncQueue, usePendingSyncCount } from '@/hooks/useSyncQueue';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

/**
 * Example 1: Simple sync status badge
 * Shows pending sync count in a badge
 */
export function SyncBadge() {
  const pendingCount = usePendingSyncCount();

  if (pendingCount === 0) return null;

  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{pendingCount}</Text>
    </View>
  );
}

/**
 * Example 2: Full sync status panel
 * Shows detailed sync information with manual controls
 */
export function SyncStatusPanel() {
  const {
    pendingCount,
    failedCount,
    isSyncing,
    isOnline,
    queueLength,
    sync,
    retryFailed,
    clearFailed,
    lastSyncResult,
  } = useSyncQueue();

  const handleSync = async () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Cannot sync while offline');
      return;
    }

    const result = await sync();
    
    if (result.synced > 0 || result.failed > 0) {
      Alert.alert(
        'Sync Complete',
        `✅ ${result.synced} synced\n${result.failed > 0 ? `❌ ${result.failed} failed` : ''}`
      );
    } else {
      Alert.alert('Sync Complete', 'Nothing to sync');
    }
  };

  const handleRetryFailed = async () => {
    if (failedCount === 0) {
      Alert.alert('No Failed Operations', 'There are no failed operations to retry');
      return;
    }

    const result = await retryFailed();
    Alert.alert(
      'Retry Complete',
      `✅ ${result.synced} succeeded\n${result.failed > 0 ? `❌ ${result.failed} still failed` : ''}`
    );
  };

  const handleClearFailed = async () => {
    Alert.alert(
      'Clear Failed Operations?',
      `This will remove ${failedCount} failed operation(s) from the queue. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            const cleared = await clearFailed();
            Alert.alert('Cleared', `${cleared} failed operation(s) removed`);
          },
        },
      ]
    );
  };

  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Sync Status</Text>

      {/* Status Info */}
      <View style={styles.statusGrid}>
        <View style={styles.statusItem}>
          <Text style={styles.statusValue}>{queueLength}</Text>
          <Text style={styles.statusLabel}>In Queue</Text>
        </View>

        <View style={styles.statusItem}>
          <Text style={styles.statusValue}>{pendingCount}</Text>
          <Text style={styles.statusLabel}>Pending</Text>
        </View>

        <View style={styles.statusItem}>
          <Text style={[styles.statusValue, failedCount > 0 && styles.statusError]}>
            {failedCount}
          </Text>
          <Text style={styles.statusLabel}>Failed</Text>
        </View>

        <View style={styles.statusItem}>
          <Text style={[styles.statusValue, isOnline ? styles.statusSuccess : styles.statusError]}>
            {isOnline ? '🟢' : '🔴'}
          </Text>
          <Text style={styles.statusLabel}>{isOnline ? 'Online' : 'Offline'}</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.buttonPrimary, (!isOnline || isSyncing) && styles.buttonDisabled]}
          onPress={handleSync}
          disabled={!isOnline || isSyncing}
        >
          <Text style={styles.buttonText}>
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </Text>
        </TouchableOpacity>

        {failedCount > 0 && (
          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={handleRetryFailed}
            disabled={!isOnline || isSyncing}
          >
            <Text style={styles.buttonText}>Retry Failed</Text>
          </TouchableOpacity>
        )}
      </View>

      {failedCount > 0 && (
        <TouchableOpacity
          style={[styles.button, styles.buttonDanger]}
          onPress={handleClearFailed}
        >
          <Text style={styles.buttonText}>Clear Failed ({failedCount})</Text>
        </TouchableOpacity>
      )}

      {/* Last Sync Result */}
      {lastSyncResult && lastSyncResult.synced > 0 && (
        <View style={styles.lastSync}>
          <Text style={styles.lastSyncText}>
            Last sync: {lastSyncResult.synced} item(s)
          </Text>
        </View>
      )}
    </View>
  );
}

/**
 * Example 3: Inline sync indicator
 * Small, unobtrusive indicator for headers/toolbars
 */
export function InlineSyncIndicator() {
  const { isSyncing, pendingCount } = useSyncQueue();
  const { isOnline } = useNetworkStatus();

  if (!isOnline) {
    return (
      <View style={styles.inlineIndicator}>
        <View style={[styles.dot, styles.dotRed]} />
        <Text style={styles.inlineText}>Offline</Text>
      </View>
    );
  }

  if (isSyncing) {
    return (
      <View style={styles.inlineIndicator}>
        <View style={[styles.dot, styles.dotOrange]} />
        <Text style={styles.inlineText}>Syncing...</Text>
      </View>
    );
  }

  if (pendingCount > 0) {
    return (
      <View style={styles.inlineIndicator}>
        <View style={[styles.dot, styles.dotOrange]} />
        <Text style={styles.inlineText}>{pendingCount} pending</Text>
      </View>
    );
  }

  return (
    <View style={styles.inlineIndicator}>
      <View style={[styles.dot, styles.dotGreen]} />
      <Text style={styles.inlineText}>Synced</Text>
    </View>
  );
}

/**
 * Example 4: Settings screen sync section
 */
export function SyncSettingsSection() {
  const { pendingCount, failedCount, isOnline, sync, retryFailed } = useSyncQueue();
  const [syncing, setSyncing] = React.useState(false);

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const result = await sync();
      if (result.synced > 0) {
        Alert.alert('Success', `Synced ${result.synced} item(s)`);
      } else {
        Alert.alert('Info', 'Nothing to sync');
      }
    } finally {
      setSyncing(false);
    }
  };

  return (
    <View style={styles.settingsSection}>
      <Text style={styles.sectionHeader}>DATA SYNC</Text>

      <TouchableOpacity
        style={styles.settingsItem}
        onPress={handleManualSync}
        disabled={!isOnline || syncing}
      >
        <Text style={styles.settingsItemText}>Sync Now</Text>
        <Text style={styles.settingsItemValue}>
          {syncing ? '⏳' : isOnline ? '🔄' : '📵'}
        </Text>
      </TouchableOpacity>

      <View style={styles.settingsItem}>
        <Text style={styles.settingsItemText}>Connection Status</Text>
        <Text style={styles.settingsItemValue}>
          {isOnline ? '🟢 Online' : '🔴 Offline'}
        </Text>
      </View>

      <View style={styles.settingsItem}>
        <Text style={styles.settingsItemText}>Pending Sync</Text>
        <Text style={styles.settingsItemValue}>
          {pendingCount} {pendingCount === 1 ? 'item' : 'items'}
        </Text>
      </View>

      {failedCount > 0 && (
        <TouchableOpacity
          style={[styles.settingsItem, styles.settingsItemWarning]}
          onPress={() => retryFailed()}
          disabled={!isOnline}
        >
          <Text style={[styles.settingsItemText, styles.textWarning]}>
            ⚠️ {failedCount} Failed - Tap to Retry
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/**
 * Example 5: Full-page sync management screen
 */
export function SyncManagementScreen() {
  const {
    pendingCount,
    failedCount,
    queueLength,
    isSyncing,
    isOnline,
    failedOperations,
    sync,
    retryFailed,
    clearFailed,
  } = useSyncQueue();

  return (
    <ScrollView style={styles.screen}>
      <Text style={styles.screenTitle}>Sync Management</Text>

      {/* Summary Cards */}
      <View style={styles.cardRow}>
        <View style={[styles.card, styles.cardBlue]}>
          <Text style={styles.cardValue}>{queueLength}</Text>
          <Text style={styles.cardLabel}>Total Queue</Text>
        </View>

        <View style={[styles.card, styles.cardOrange]}>
          <Text style={styles.cardValue}>{pendingCount}</Text>
          <Text style={styles.cardLabel}>Pending</Text>
        </View>

        <View style={[styles.card, failedCount > 0 ? styles.cardRed : styles.cardGreen]}>
          <Text style={styles.cardValue}>{failedCount}</Text>
          <Text style={styles.cardLabel}>Failed</Text>
        </View>
      </View>

      {/* Connection Status */}
      <View style={styles.connectionCard}>
        <Text style={styles.connectionStatus}>
          {isOnline ? '🟢 Connected to Internet' : '🔴 No Internet Connection'}
        </Text>
        {!isOnline && (
          <Text style={styles.connectionNote}>
            Changes will sync automatically when you're back online
          </Text>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonPrimary]}
          onPress={() => sync()}
          disabled={!isOnline || isSyncing}
        >
          <Text style={styles.actionButtonText}>
            {isSyncing ? '⏳ Syncing...' : '🔄 Sync Now'}
          </Text>
        </TouchableOpacity>

        {failedCount > 0 && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonSecondary]}
              onPress={() => retryFailed()}
              disabled={!isOnline}
            >
              <Text style={styles.actionButtonText}>
                🔁 Retry Failed ({failedCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonDanger]}
              onPress={() => {
                Alert.alert(
                  'Clear Failed?',
                  'This will permanently remove failed operations',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Clear', style: 'destructive', onPress: () => clearFailed() },
                  ]
                );
              }}
            >
              <Text style={styles.actionButtonText}>🗑️ Clear Failed</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Failed Operations List */}
      {failedOperations.length > 0 && (
        <View style={styles.failedList}>
          <Text style={styles.failedListTitle}>Failed Operations</Text>
          {failedOperations.map((op) => (
            <View key={op.id} style={styles.failedItem}>
              <Text style={styles.failedItemTitle}>
                {op.operation} - {op.table}
              </Text>
              <Text style={styles.failedItemError}>
                {op.error || 'Unknown error'}
              </Text>
              <Text style={styles.failedItemAttempts}>
                Attempts: {op.attempts}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Badge styles
  badge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  // Panel styles
  panel: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    margin: 16,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 16,
  },
  statusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statusItem: {
    alignItems: 'center',
  },
  statusValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  statusLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  statusSuccess: {
    color: '#22c55e',
  },
  statusError: {
    color: '#ef4444',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#3b82f6',
  },
  buttonSecondary: {
    backgroundColor: '#6366f1',
  },
  buttonDanger: {
    backgroundColor: '#ef4444',
  },
  buttonDisabled: {
    backgroundColor: '#475569',
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  lastSync: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  lastSyncText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },

  // Inline indicator styles
  inlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#1e293b',
    borderRadius: 12,
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
  inlineText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },

  // Settings section styles
  settingsSection: {
    marginVertical: 16,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  settingsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  settingsItemWarning: {
    backgroundColor: '#451a03',
  },
  settingsItemText: {
    fontSize: 16,
    color: '#f1f5f9',
  },
  settingsItemValue: {
    fontSize: 16,
    color: '#94a3b8',
  },
  textWarning: {
    color: '#f59e0b',
  },

  // Screen styles
  screen: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f1f5f9',
    padding: 16,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  card: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cardBlue: {
    backgroundColor: '#1e3a8a',
  },
  cardOrange: {
    backgroundColor: '#92400e',
  },
  cardGreen: {
    backgroundColor: '#14532d',
  },
  cardRed: {
    backgroundColor: '#7f1d1d',
  },
  cardValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  cardLabel: {
    fontSize: 12,
    color: '#cbd5e1',
    marginTop: 4,
  },
  connectionCard: {
    backgroundColor: '#1e293b',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
  },
  connectionStatus: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  connectionNote: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
  },
  actions: {
    paddingHorizontal: 16,
    gap: 12,
  },
  actionButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonPrimary: {
    backgroundColor: '#3b82f6',
  },
  actionButtonSecondary: {
    backgroundColor: '#6366f1',
  },
  actionButtonDanger: {
    backgroundColor: '#ef4444',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  failedList: {
    padding: 16,
    marginTop: 16,
  },
  failedListTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 12,
  },
  failedItem: {
    backgroundColor: '#1e293b',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  failedItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 4,
  },
  failedItemError: {
    fontSize: 12,
    color: '#ef4444',
    marginBottom: 4,
  },
  failedItemAttempts: {
    fontSize: 11,
    color: '#64748b',
  },
});

