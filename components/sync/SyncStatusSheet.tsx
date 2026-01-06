import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, RefreshCw, AlertTriangle, Trash2 } from 'lucide-react-native';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useSyncQueue } from '@/hooks/useSyncQueue';
import { useRealtimeStatus } from '@/hooks/useRealtime';
import { backgroundSync } from '@/lib/sync/backgroundSync';
import { syncQueue } from '@/lib/sync/syncQueue';
import { SyncStatus } from './SyncStatusIndicator';

interface SyncStatusSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function SyncStatusSheet({ visible, onClose }: SyncStatusSheetProps) {
  const { isOnline, connectionType } = useNetworkStatus();
  const {
    pendingCount,
    failedCount,
    isSyncing,
    queueLength,
    failedOperations,
    sync,
    retryFailed,
    clearFailed,
  } = useSyncQueue();
  const { isConnected: realtimeConnected, subscriptionCount } = useRealtimeStatus();
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (visible) {
      loadLastSync();
    }
  }, [visible]);

  const loadLastSync = async () => {
    const time = await backgroundSync.getLastSyncTime();
    setLastSync(time ? new Date(time) : null);
  };

  const getStatusColor = (): string => {
    if (!isOnline) return '#6b7280';
    if (failedCount > 0) return '#ef4444';
    if (isSyncing) return '#3b82f6';
    if (pendingCount > 0) return '#f59e0b';
    return '#22c55e';
  };

  const getStatusText = (): string => {
    if (!isOnline) return 'Offline';
    if (failedCount > 0) return 'Sync Error';
    if (isSyncing) return 'Syncing';
    if (pendingCount > 0) return 'Pending';
    return 'All Synced';
  };

  const getTimeAgo = (date: Date | null): string => {
    if (!date) return 'Never';
    
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const handleSyncNow = async () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Cannot sync while offline');
      return;
    }

    setSyncing(true);
    try {
      await sync();
      await loadLastSync();
      Alert.alert('Success', 'Sync completed successfully');
    } catch (error) {
      Alert.alert('Error', 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleRetryFailed = async () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Cannot retry while offline');
      return;
    }

    setSyncing(true);
    try {
      const result = await retryFailed();
      await loadLastSync();
      
      Alert.alert(
        'Retry Complete',
        `✅ ${result.synced} succeeded\n${result.failed > 0 ? `❌ ${result.failed} still failed` : ''}`
      );
    } finally {
      setSyncing(false);
    }
  };

  const handleClearFailed = () => {
    Alert.alert(
      'Clear Failed Operations?',
      `This will permanently remove ${failedCount} failed operation(s). This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            const cleared = await clearFailed();
            Alert.alert('Cleared', `Removed ${cleared} failed operation(s)`);
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <SafeAreaView edges={['bottom']}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Sync Status</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {/* Status Overview */}
              <View style={styles.statusCard}>
                <View style={styles.statusRow}>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
                  <Text style={styles.statusLabel}>{getStatusText()}</Text>
                </View>
                
                <Text style={styles.statusTime}>
                  Last synced: {getTimeAgo(lastSync)}
                </Text>
              </View>

              {/* Offline Message */}
              {!isOnline && (
                <View style={[styles.messageCard, styles.messageOffline]}>
                  <AlertTriangle size={20} color="#f59e0b" />
                  <Text style={styles.messageText}>
                    You're offline. Changes will sync when you're back online.
                  </Text>
                </View>
              )}

              {/* Error Message */}
              {failedCount > 0 && (
                <View style={[styles.messageCard, styles.messageError]}>
                  <AlertTriangle size={20} color="#ef4444" />
                  <Text style={styles.messageText}>
                    {failedCount} change{failedCount > 1 ? 's' : ''} failed to sync
                  </Text>
                </View>
              )}

              {/* Stats */}
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{queueLength}</Text>
                  <Text style={styles.statLabel}>Total Queue</Text>
                </View>

                <View style={styles.statItem}>
                  <Text style={[styles.statValue, pendingCount > 0 && styles.statValueWarning]}>
                    {pendingCount}
                  </Text>
                  <Text style={styles.statLabel}>Pending</Text>
                </View>

                <View style={styles.statItem}>
                  <Text style={[styles.statValue, failedCount > 0 && styles.statValueError]}>
                    {failedCount}
                  </Text>
                  <Text style={styles.statLabel}>Failed</Text>
                </View>
              </View>

              {/* Connection Info */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Connection</Text>
                
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Network:</Text>
                  <Text style={styles.infoValue}>
                    {isOnline ? `= ${connectionType}` : '=4 Offline'}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Real-time:</Text>
                  <Text style={styles.infoValue}>
                    {realtimeConnected
                      ? `= Connected (${subscriptionCount})`
                      : '=4 Disconnected'}
                  </Text>
                </View>
              </View>

              {/* Failed Operations */}
              {failedOperations.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Failed Operations</Text>
                  
                  {failedOperations.slice(0, 5).map((op: { id: string; operation: string; table: string; error?: string }) => (
                    <View key={op.id} style={styles.failedItem}>
                      <Text style={styles.failedItemTitle}>
                        {op.operation} • {op.table}
                      </Text>
                      <Text style={styles.failedItemError}>
                        {op.error || 'Unknown error'}
                      </Text>
                      <Text style={styles.failedItemAttempts}>
                        Attempts: {op.attempts}
                      </Text>
                    </View>
                  ))}

                  {failedOperations.length > 5 && (
                    <Text style={styles.moreText}>
                      +{failedOperations.length - 5} more
                    </Text>
                  )}
                </View>
              )}

              {/* Actions */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButtonPrimary]}
                  onPress={handleSyncNow}
                  disabled={!isOnline || syncing}
                >
                  <RefreshCw size={18} color="#fff" />
                  <Text style={styles.actionButtonText}>
                    {syncing ? 'Syncing...' : 'Sync Now'}
                  </Text>
                </TouchableOpacity>

                {failedCount > 0 && (
                  <>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.actionButtonSecondary]}
                      onPress={handleRetryFailed}
                      disabled={!isOnline || syncing}
                    >
                      <RefreshCw size={18} color="#3b82f6" />
                      <Text style={[styles.actionButtonText, styles.actionButtonTextSecondary]}>
                        Retry Failed
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionButton, styles.actionButtonDanger]}
                      onPress={handleClearFailed}
                    >
                      <Trash2 size={18} color="#ef4444" />
                      <Text style={[styles.actionButtonText, styles.actionButtonTextDanger]}>
                        Clear Failed
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>

              <View style={styles.bottomSpacer} />
            </ScrollView>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    paddingHorizontal: 20,
  },
  statusCard: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  statusTime: {
    fontSize: 13,
    color: '#94a3b8',
  },
  messageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 10,
  },
  messageOffline: {
    backgroundColor: '#451a03',
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  messageError: {
    backgroundColor: '#7f1d1d',
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
  },
  messageText: {
    flex: 1,
    fontSize: 13,
    color: '#f1f5f9',
    lineHeight: 18,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  statValueWarning: {
    color: '#f59e0b',
  },
  statValueError: {
    color: '#ef4444',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  infoLabel: {
    fontSize: 14,
    color: '#94a3b8',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#f1f5f9',
  },
  failedItem: {
    backgroundColor: '#1e293b',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
  },
  failedItemTitle: {
    fontSize: 13,
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
  moreText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
  },
  actions: {
    marginTop: 20,
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonPrimary: {
    backgroundColor: '#3b82f6',
  },
  actionButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  actionButtonDanger: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  actionButtonTextSecondary: {
    color: '#3b82f6',
  },
  actionButtonTextDanger: {
    color: '#ef4444',
  },
  bottomSpacer: {
    height: 20,
  },
});

export default SyncStatusSheet;

