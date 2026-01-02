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
import { Stack, router } from 'expo-router';
import {
  Download,
  Upload,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Clock,
  HardDrive,
} from 'lucide-react-native';
import * as Sharing from 'expo-sharing';
import { backupService, Backup, BackupData, RestoreProgress } from '@/lib/backup/backupService';
import { RestoreConfirmModal } from '@/components/modals/RestoreConfirmModal';
import { RestoreProgressModal } from '@/components/modals/RestoreProgressModal';

export default function BackupScreen() {
  const { isOnline, connectionType } = useNetworkStatus();
  const { pendingCount, failedCount, failedOperations } = useSyncQueue();
  
  const [loading, setLoading] = useState(false);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [lastBackupTime, setLastBackupTime] = useState<Date | null>(null);
  const [totalBackupSize, setTotalBackupSize] = useState(0);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [autoBackupFrequency, setAutoBackupFrequency] = useState<'daily' | 'weekly' | 'monthly'>(
    'weekly'
  );

  // Restore modal states
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [showRestoreProgress, setShowRestoreProgress] = useState(false);
  const [selectedBackupData, setSelectedBackupData] = useState<BackupData | null>(null);
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);
  const [restoreProgress, setRestoreProgress] = useState<RestoreProgress>({
    current: '',
    completed: [],
    total: 0,
    currentCount: 0,
    currentTotal: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [backupsList, lastBackup, autoSettings] = await Promise.all([
        backupService.listBackups(),
        backupService.getLastBackupTime(),
        backupService.getAutoBackupSettings(),
      ]);

      setBackups(backupsList);
      setLastBackupTime(lastBackup ? new Date(lastBackup) : null);
      setTotalBackupSize(backupsList.reduce((sum, b) => sum + b.size, 0));
      setAutoBackupEnabled(autoSettings.enabled);
      setAutoBackupFrequency(autoSettings.frequency);
    } catch (error) {
      logger.error('Error loading backup data:', error);
      Alert.alert('Error', 'Failed to load backup data');
    }
  };

  const handleCreateBackup = async () => {
    Alert.alert(
      'Create Backup',
      'This will backup all your workouts, templates, and body tracking data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create',
          onPress: async () => {
            setLoading(true);
            try {
              const { backup, data } = await backupService.createBackup();
              await backupService.saveToCloud(backup, data);
              await loadData();
              Alert.alert(
                'Backup Created',
                `Backup saved successfully!\nSize: ${formatBytes(backup.size)}`
              );
            } catch (error) {
              logger.error('Error creating backup:', error);
              Alert.alert('Error', 'Failed to create backup: ' + (error as Error).message);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleDownloadBackup = async (backup: Backup) => {
    setLoading(true);
    try {
      const { backup: newBackup, data } = await backupService.createBackup();
      const filePath = await backupService.saveLocally(newBackup, data);

      Alert.alert('Download Complete', 'Backup saved to device', [
        { text: 'OK' },
        {
          text: 'Share',
          onPress: async () => {
            if (await Sharing.isAvailableAsync()) {
              await Sharing.shareAsync(filePath);
            }
          },
        },
      ]);
    } catch (error) {
      logger.error('Error downloading backup:', error);
      Alert.alert('Error', 'Failed to download backup');
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreBackup = async (backup: Backup) => {
    setLoading(true);
    try {
      // Download backup data first
      const backupData = await backupService.downloadBackup(backup.id);
      
      // Show confirmation modal with backup data
      setSelectedBackup(backup);
      setSelectedBackupData(backupData);
      setShowRestoreConfirm(true);
    } catch (error) {
      logger.error('Error downloading backup:', error);
      Alert.alert('Error', 'Failed to download backup');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmRestore = async (overwriteMode: boolean) => {
    if (!selectedBackupData || !selectedBackup) return;

    // Hide confirm modal, show progress modal
    setShowRestoreConfirm(false);
    setShowRestoreProgress(true);

    // Reset progress
    setRestoreProgress({
      current: '',
      completed: [],
      total: 0,
      currentCount: 0,
      currentTotal: 0,
    });

    try {
      const result = await backupService.restoreBackup(
        selectedBackupData,
        (progress) => {
          setRestoreProgress(progress);
        },
        overwriteMode
      );

      // Hide progress modal
      setShowRestoreProgress(false);

      if (result.success) {
        Alert.alert(
          'Restore Complete!',
          `âœ… Restored ${result.itemsRestored} items\nðŸ“Š Tables: ${result.tablesRestored.join(', ')}`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Refresh app data
                router.replace('/(tabs)');
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Restore Completed with Errors',
          `âœ… ${result.itemsRestored} items restored\nâŒ ${result.errors.length} errors\n\n${result.errors.join('\n')}`,
          [
            {
              text: 'View Details',
              onPress: () => logger.log('Errors:', result.errors),
            },
            { text: 'OK' },
          ]
        );
      }
    } catch (error) {
      setShowRestoreProgress(false);
      logger.error('Error restoring backup:', error);
      Alert.alert('Error', 'Failed to restore backup: ' + (error as Error).message);
    }
  };

  const handleDeleteBackup = async (backup: Backup) => {
    Alert.alert(
      'Delete Backup?',
      `Delete backup from ${formatDate(backup.createdAt)}?\n\nThis cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await backupService.deleteBackup(backup.id);
              await loadData();
              Alert.alert('Deleted', 'Backup deleted successfully');
            } catch (error) {
              logger.error('Error deleting backup:', error);
              Alert.alert('Error', 'Failed to delete backup');
            }
          },
        },
      ]
    );
  };

  const handleCleanupOld = async () => {
    Alert.alert(
      'Cleanup Old Backups',
      'This will keep only the 5 most recent backups and delete the rest.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Cleanup',
          onPress: async () => {
            setLoading(true);
            try {
              const count = await backupService.cleanupOldBackups(5);
              await loadData();
              Alert.alert('Cleanup Complete', `Deleted ${count} old backup(s)`);
            } catch (error) {
              logger.error('Error cleaning up backups:', error);
              Alert.alert('Error', 'Failed to cleanup backups');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleToggleAutoBackup = async (value: boolean) => {
    setAutoBackupEnabled(value);
    await backupService.updateAutoBackupSettings({
      enabled: value,
      frequency: autoBackupFrequency,
    });
  };

  const handleChangeFrequency = () => {
    Alert.alert('Auto-backup Frequency', 'Choose how often to create backups:', [
      {
        text: 'Daily',
        onPress: async () => {
          setAutoBackupFrequency('daily');
          await backupService.updateAutoBackupSettings({
            enabled: autoBackupEnabled,
            frequency: 'daily',
          });
        },
      },
      {
        text: 'Weekly',
        onPress: async () => {
          setAutoBackupFrequency('weekly');
          await backupService.updateAutoBackupSettings({
            enabled: autoBackupEnabled,
            frequency: 'weekly',
          });
        },
      },
      {
        text: 'Monthly',
        onPress: async () => {
          setAutoBackupFrequency('monthly');
          await backupService.updateAutoBackupSettings({
            enabled: autoBackupEnabled,
            frequency: 'monthly',
          });
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatRelativeTime = (date: Date | null): string => {
    if (!date) return 'Never';

    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return formatDate(date);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          title: 'Backup & Restore',
          headerShown: true,
          headerStyle: { backgroundColor: '#1e293b' },
          headerTintColor: '#f1f5f9',
        }}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Status Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>BACKUP STATUS</Text>

          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <View style={styles.statusItem}>
                <Clock size={20} color="#64748b" />
                <Text style={styles.statusLabel}>Last Backup</Text>
                <Text style={styles.statusValue}>{formatRelativeTime(lastBackupTime)}</Text>
              </View>

              <View style={styles.statusDivider} />

              <View style={styles.statusItem}>
                <HardDrive size={20} color="#64748b" />
                <Text style={styles.statusLabel}>Total Size</Text>
                <Text style={styles.statusValue}>{formatBytes(totalBackupSize)}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.createButton, loading && styles.createButtonDisabled]}
              onPress={handleCreateBackup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Upload size={20} color="#fff" />
              )}
              <Text style={styles.createButtonText}>
                {loading ? 'Creating Backup...' : 'Create Backup Now'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Auto-backup Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>AUTO-BACKUP</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Automatic Backups</Text>
              <Text style={styles.settingDescription}>
                Create backups automatically in the background
              </Text>
            </View>
            <Switch
              value={autoBackupEnabled}
              onValueChange={handleToggleAutoBackup}
              trackColor={{ false: '#334155', true: '#3b82f6' }}
              thumbColor="#fff"
            />
          </View>

          {autoBackupEnabled && (
            <TouchableOpacity style={styles.settingItem} onPress={handleChangeFrequency}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Frequency</Text>
                <Text style={styles.settingDescription}>How often to create backups</Text>
              </View>
              <Text style={styles.settingValue}>
                {autoBackupFrequency.charAt(0).toUpperCase() + autoBackupFrequency.slice(1)}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Available Backups Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeader}>AVAILABLE BACKUPS ({backups.length})</Text>
            {backups.length > 5 && (
              <TouchableOpacity onPress={handleCleanupOld}>
                <Text style={styles.cleanupText}>Cleanup Old</Text>
              </TouchableOpacity>
            )}
          </View>

          {backups.length === 0 ? (
            <View style={styles.emptyState}>
              <AlertTriangle size={48} color="#64748b" />
              <Text style={styles.emptyStateText}>No backups yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Create your first backup to protect your data
              </Text>
            </View>
          ) : (
            <View style={styles.backupsList}>
              {backups.map((backup) => (
                <View key={backup.id} style={styles.backupCard}>
                  <View style={styles.backupHeader}>
                    <View style={styles.backupInfo}>
                      <Text style={styles.backupDate}>{formatDate(backup.createdAt)}</Text>
                      <Text style={styles.backupSize}>{formatBytes(backup.size)}</Text>
                    </View>
                    {backup.isAutomatic && (
                      <View style={styles.autoBadge}>
                        <Text style={styles.autoBadgeText}>Auto</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.backupActions}>
                    <TouchableOpacity
                      style={[styles.backupAction, styles.backupActionRestore]}
                      onPress={() => handleRestoreBackup(backup)}
                    >
                      <Download size={16} color="#3b82f6" />
                      <Text style={styles.backupActionText}>Restore</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.backupAction, styles.backupActionDownload]}
                      onPress={() => handleDownloadBackup(backup)}
                    >
                      <HardDrive size={16} color="#64748b" />
                      <Text style={[styles.backupActionText, styles.backupActionTextSecondary]}>
                        Download
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.backupAction, styles.backupActionDelete]}
                      onPress={() => handleDeleteBackup(backup)}
                    >
                      <Trash2 size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Info Section */}
        <View style={styles.section}>
          <View style={styles.infoCard}>
            <CheckCircle size={20} color="#22c55e" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>What's included in backups?</Text>
              <Text style={styles.infoText}>
                â€¢ All workout history and sets{'\n'}
                â€¢ Workout templates{'\n'}
                â€¢ Body weight and measurements{'\n'}
                â€¢ Personal records{'\n'}
                â€¢ Custom exercises{'\n'}
                â€¢ App settings
              </Text>
            </View>
          </View>

          <View style={[styles.infoCard, styles.infoCardWarning]}>
            <AlertTriangle size={20} color="#f59e0b" />
            <View style={styles.infoTextContainer}>
              <Text style={[styles.infoTitle, styles.infoTitleWarning]}>Important Notes</Text>
              <Text style={styles.infoText}>
                â€¢ Backups are stored securely in the cloud{'\n'}
                â€¢ Restoring will overwrite current data{'\n'}
                â€¢ Keep backups for data safety{'\n'}
                â€¢ Download backups for offline storage
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Restore Confirmation Modal */}
      <RestoreConfirmModal
        visible={showRestoreConfirm}
        onClose={() => setShowRestoreConfirm(false)}
        onConfirm={handleConfirmRestore}
        backupData={selectedBackupData}
        loading={false}
      />

      {/* Restore Progress Modal */}
      <RestoreProgressModal
        visible={showRestoreProgress}
        progress={restoreProgress}
      />
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
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  cleanupText: {
    fontSize: 13,
    color: '#3b82f6',
    fontWeight: '600',
  },
  statusCard: {
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 12,
  },
  statusRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  statusItem: {
    flex: 1,
    alignItems: 'center',
  },
  statusDivider: {
    width: 1,
    backgroundColor: '#334155',
    marginHorizontal: 16,
  },
  statusLabel: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 8,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f1f5f9',
    marginTop: 4,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  createButtonDisabled: {
    backgroundColor: '#475569',
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f1f5f9',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
    textAlign: 'center',
  },
  backupsList: {
    gap: 12,
    paddingHorizontal: 16,
  },
  backupCard: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
  },
  backupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  backupInfo: {
    flex: 1,
  },
  backupDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 4,
  },
  backupSize: {
    fontSize: 13,
    color: '#64748b',
  },
  autoBadge: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  autoBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  backupActions: {
    flexDirection: 'row',
    gap: 8,
  },
  backupAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  backupActionRestore: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  backupActionDownload: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#334155',
  },
  backupActionDelete: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ef4444',
    flex: 0,
    paddingHorizontal: 12,
  },
  backupActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  backupActionTextSecondary: {
    color: '#94a3b8',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#22c55e',
  },
  infoCardWarning: {
    borderLeftColor: '#f59e0b',
  },
  infoTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22c55e',
    marginBottom: 8,
  },
  infoTitleWarning: {
    color: '#f59e0b',
  },
  infoText: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 20,
  },
  bottomSpacer: {
    height: 32,
  },
});

