import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/utils/logger';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RefreshCw, CheckCircle, AlertTriangle, Trash2, WifiOff } from 'lucide-react-native';
import { SyncStatusIndicator } from '@/components/sync/SyncStatusIndicator';
import { manualSync, SyncSettings } from '@/lib/sync/manualSync';
import { useSyncQueue } from '@/hooks/useSyncQueue';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { SettingsHeader } from '@/components/SettingsHeader';
import { useBackNavigation } from '@/lib/hooks/useBackNavigation';

export default function SyncSettingsScreen() {
  useBackNavigation(); // Enable Android back gesture support

  const { isOnline, connectionType } = useNetworkStatus();
  const { pendingCount, failedCount, failedOperations } = useSyncQueue();
  
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [pendingChanges, setPendingChanges] = useState({ workouts: 0, templates: 0, weightLog: 0, measurements: 0, total: 0 });
  const [dataUsage, setDataUsage] = useState('0 B');
  const [settings, setSettings] = useState<SyncSettings>({
    autoSync: true,
    syncOnWifiOnly: false,
    syncFrequency: 30000,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [lastSyncTime, pending, usage, syncSettings] = await Promise.all([
        manualSync.getLastSyncTime(),
        manualSync.getPendingChanges(),
        manualSync.getDataUsage(),
        manualSync.getSettings(),
      ]);

      setLastSync(lastSyncTime ? new Date(lastSyncTime) : null);
      setPendingChanges(pending);
      setDataUsage(usage.formatted);
      setSettings(syncSettings);
    } catch (error) {
 logger.error('Error loading sync data:', error);
    }
  };

  const handleSyncNow = async () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Cannot sync while offline');
      return;
    }

    const canSyncResult = await manualSync.canSync();
    if (!canSyncResult.canSync) {
      Alert.alert('Cannot Sync', canSyncResult.reason || 'Unknown error');
      return;
    }

    setSyncing(true);
    try {
      const result = await manualSync.syncNow();
      
      if (result.success) {
        await loadData();
        Alert.alert(
          'Sync Complete',
          `S& Synced ${result.syncedCount} changes\nx Pulled ${result.pulledCount} updates`
        );
      } else {
        Alert.alert('Sync Failed', result.error || 'Unknown error');
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleRetryAll = async () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Cannot retry while offline');
      return;
    }

    setSyncing(true);
    try {
      const result = await manualSync.retryAllFailed();
      await loadData();
      
      Alert.alert(
        'Retry Complete',
        `S& ${result.syncedCount} succeeded\n${result.failedCount || 0 > 0 ? `R ${result.failedCount} still failed` : ''}`
      );
    } finally {
      setSyncing(false);
    }
  };

  const handleDiscardAll = () => {
    Alert.alert(
      'Discard All Failed?',
      `This will permanently remove ${failedCount} failed operation(s). This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: async () => {
            const count = await manualSync.discardAllFailed();
            await loadData();
            Alert.alert('Discarded', `Removed ${count} failed operation(s)`);
          },
        },
      ]
    );
  };

  const handleRetryOperation = async (operationId: string) => {
    setSyncing(true);
    try {
      await manualSync.retryOperation(operationId);
      await loadData();
    } finally {
      setSyncing(false);
    }
  };

  const handleDiscardOperation = (operationId: string, operation: { operation: string; table: string }) => {
    Alert.alert(
      'Discard Operation?',
      `Discard ${operation.operation} on ${operation.table}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: async () => {
            await manualSync.discardOperation(operationId);
            await loadData();
          },
        },
      ]
    );
  };

  const handleToggleSetting = async (key: keyof SyncSettings, value: boolean | number | string) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await manualSync.updateSettings({ [key]: value });
  };

  const formatLastSync = (date: Date | null): string => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 0) return date.toLocaleTimeString();
    return date.toLocaleString();
  };

  const getFrequencyLabel = (freq: number): string => {
    if (freq === -1) return 'Manual only';
    if (freq === 30000) return '30 seconds';
    if (freq === 60000) return '1 minute';
    if (freq === 300000) return '5 minutes';
    return `${freq / 1000}s`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SettingsHeader title="Sync & Backup" />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Sync Status Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>SYNC STATUS</Text>
          
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <SyncStatusIndicator showLabel={true} size="large" />
            </View>

            <Text style={styles.lastSyncText}>
              Last synced: {formatLastSync(lastSync)}
            </Text>

            {!isOnline && (
              <View style={styles.offlineWarning}>
                <WifiOff size={16} color="#f59e0b" />
                <Text style={styles.offlineText}>
                  You're offline. Changes will sync when you're back online.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.syncButton, (!isOnline || syncing) && styles.syncButtonDisabled]}
              onPress={handleSyncNow}
              disabled={!isOnline || syncing}
            >
              {syncing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <RefreshCw size={20} color="#fff" />
              )}
              <Text style={styles.syncButtonText}>
                {syncing ? 'Syncing...' : 'Sync Now'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Pending Changes Section */}
        {pendingCount > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>PENDING CHANGES ({pendingCount})</Text>
            
            <View style={styles.pendingCard}>
              {pendingChanges.workouts > 0 && (
                <View style={styles.pendingItem}>
                  <Text style={styles.pendingText}>
                    {pendingChanges.workouts} workout{pendingChanges.workouts > 1 ? 's' : ''} waiting to sync
                  </Text>
                </View>
              )}
              
              {pendingChanges.templates > 0 && (
                <View style={styles.pendingItem}>
                  <Text style={styles.pendingText}>
                    {pendingChanges.templates} template{pendingChanges.templates > 1 ? 's' : ''} waiting to sync
                  </Text>
                </View>
              )}
              
              {pendingChanges.weightLog > 0 && (
                <View style={styles.pendingItem}>
                  <Text style={styles.pendingText}>
                    {pendingChanges.weightLog} weight log{pendingChanges.weightLog > 1 ? 's' : ''} waiting to sync
                  </Text>
                </View>
              )}

              {pendingChanges.measurements > 0 && (
                <View style={styles.pendingItem}>
                  <Text style={styles.pendingText}>
                    {pendingChanges.measurements} measurement{pendingChanges.measurements > 1 ? 's' : ''} waiting to sync
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Failed Changes Section */}
        {failedCount > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>FAILED CHANGES ({failedCount})</Text>
            
            <View style={styles.failedCard}>
              {failedOperations.slice(0, 5).map((op: { id: string; operation: string; table: string; error?: string }) => (
                <View key={op.id} style={styles.failedItem}>
                  <View style={styles.failedItemHeader}>
                    <AlertTriangle size={16} color="#ef4444" />
                    <Text style={styles.failedItemTitle}>
                      {op.operation} • {op.table}
                    </Text>
                  </View>
                  
                  {op.error && (
                    <Text style={styles.failedItemError}>
                      Error: {op.error}
                    </Text>
                  )}

                  <View style={styles.failedItemActions}>
                    <TouchableOpacity
                      style={[styles.failedActionButton, styles.failedActionRetry]}
                      onPress={() => handleRetryOperation(op.id)}
                    >
                      <Text style={styles.failedActionText}>Retry</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.failedActionButton, styles.failedActionDiscard]}
                      onPress={() => handleDiscardOperation(op.id, op)}
                    >
                      <Text style={[styles.failedActionText, styles.failedActionTextDiscard]}>
                        Discard
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {failedOperations.length > 5 && (
                <Text style={styles.moreText}>
                  +{failedOperations.length - 5} more failed operation(s)
                </Text>
              )}

              <View style={styles.failedBulkActions}>
                <TouchableOpacity
                  style={[styles.bulkActionButton, styles.bulkActionRetry]}
                  onPress={handleRetryAll}
                  disabled={!isOnline}
                >
                  <RefreshCw size={16} color="#3b82f6" />
                  <Text style={styles.bulkActionText}>Retry All</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.bulkActionButton, styles.bulkActionDiscard]}
                  onPress={handleDiscardAll}
                >
                  <Trash2 size={16} color="#ef4444" />
                  <Text style={[styles.bulkActionText, styles.bulkActionTextDiscard]}>
                    Discard All
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Sync Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>SYNC SETTINGS</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Auto-sync</Text>
              <Text style={styles.settingDescription}>
                Automatically sync changes in the background
              </Text>
            </View>
            <Switch
              value={settings.autoSync}
              onValueChange={(value) => handleToggleSetting('autoSync', value)}
              trackColor={{ false: '#334155', true: '#3b82f6' }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Sync on WiFi only</Text>
              <Text style={styles.settingDescription}>
                Only sync when connected to WiFi
              </Text>
            </View>
            <Switch
              value={settings.syncOnWifiOnly}
              onValueChange={(value) => handleToggleSetting('syncOnWifiOnly', value)}
              trackColor={{ false: '#334155', true: '#3b82f6' }}
              thumbColor="#fff"
            />
          </View>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => {
              // Show frequency picker
              Alert.alert('Sync Frequency', 'Choose sync interval:', [
                { text: '30 seconds', onPress: () => handleToggleSetting('syncFrequency', 30000) },
                { text: '1 minute', onPress: () => handleToggleSetting('syncFrequency', 60000) },
                { text: '5 minutes', onPress: () => handleToggleSetting('syncFrequency', 300000) },
                { text: 'Manual only', onPress: () => handleToggleSetting('syncFrequency', -1) },
                { text: 'Cancel', style: 'cancel' },
              ]);
            }}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Sync frequency</Text>
              <Text style={styles.settingDescription}>
                How often to check for changes
              </Text>
            </View>
            <Text style={styles.settingValue}>
              {getFrequencyLabel(settings.syncFrequency)}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Data Usage Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>DATA USAGE</Text>
          
          <View style={styles.dataUsageCard}>
            <View style={styles.dataUsageRow}>
              <Text style={styles.dataUsageLabel}>Total synced this month:</Text>
              <Text style={styles.dataUsageValue}>{dataUsage}</Text>
            </View>

            <View style={styles.dataUsageRow}>
              <Text style={styles.dataUsageLabel}>Network:</Text>
              <Text style={styles.dataUsageValue}>
                {isOnline ? connectionType : 'Offline'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  statusCard: {
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 12,
  },
  statusRow: {
    alignItems: 'center',
    marginBottom: 12,
  },
  lastSyncText: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 16,
  },
  offlineWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#451a03',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  offlineText: {
    flex: 1,
    fontSize: 13,
    color: '#f59e0b',
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  syncButtonDisabled: {
    backgroundColor: '#475569',
    opacity: 0.6,
  },
  syncButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  pendingCard: {
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  pendingItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  pendingText: {
    fontSize: 14,
    color: '#f1f5f9',
  },
  failedCard: {
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#7f1d1d',
    overflow: 'hidden',
  },
  failedItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  failedItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  failedItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  failedItemError: {
    fontSize: 13,
    color: '#ef4444',
    marginBottom: 12,
  },
  failedItemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  failedActionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  failedActionRetry: {
    backgroundColor: '#3b82f6',
  },
  failedActionDiscard: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  failedActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  failedActionTextDiscard: {
    color: '#ef4444',
  },
  moreText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    padding: 12,
  },
  failedBulkActions: {
    flexDirection: 'row',
    gap: 8,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  bulkActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  bulkActionRetry: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  bulkActionDiscard: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  bulkActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  bulkActionTextDiscard: {
    color: '#ef4444',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#f1f5f9',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: '#64748b',
  },
  settingValue: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  dataUsageCard: {
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
  },
  dataUsageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  dataUsageLabel: {
    fontSize: 14,
    color: '#94a3b8',
  },
  dataUsageValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  bottomSpacer: {
    height: 32,
  },
});

