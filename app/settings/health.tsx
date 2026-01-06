import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Heart,
  Activity,
  Moon,
  Scale,
  ExternalLink,
  Footprints,
  Zap,
  CheckCircle,
  XCircle,
  AlertCircle,
  Dumbbell,
} from 'lucide-react-native';
import { useHealthConnect } from '@/hooks/useHealthConnect';
import { useSettingsStore } from '@/stores/settingsStore';
import { SettingsHeader } from '@/components/SettingsHeader';
import { healthSyncService } from '@/lib/health/healthSync';
import type { SyncResult } from '@/lib/health/healthSync';
import { useBackNavigation } from '@/lib/hooks/useBackNavigation';

export default function HealthSettingsScreen() {
  useBackNavigation(); // Enable Android back gesture support

  // ============================================
  // iOS: Show "Coming Soon" Message
  // ============================================
  if (Platform.OS === 'ios') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <SettingsHeader title="Health Integration" />
        <View style={styles.comingSoonContainer}>
          <View style={styles.comingSoonIcon}>
            <Heart size={64} color="#3b82f6" />
          </View>
          <Text style={styles.comingSoonTitle}>Apple Health Integration</Text>
          <Text style={styles.comingSoonSubtitle}>Coming Soon!</Text>
          <Text style={styles.comingSoonMessage}>
            We're working on Apple Health integration to sync your workouts, heart rate, steps, and body measurements.
          </Text>
          <Text style={styles.comingSoonReassurance}>
            Don't worry - all your workouts and progress are being saved in the app and synced to the cloud.
          </Text>
          <View style={styles.comingSoonFeatures}>
            <View style={styles.featureRow}>
              <CheckCircle size={20} color="#22c55e" />
              <Text style={styles.featureText}>Workouts saved in app</Text>
            </View>
            <View style={styles.featureRow}>
              <CheckCircle size={20} color="#22c55e" />
              <Text style={styles.featureText}>Cloud sync enabled</Text>
            </View>
            <View style={styles.featureRow}>
              <CheckCircle size={20} color="#22c55e" />
              <Text style={styles.featureText}>Progress tracking active</Text>
            </View>
            <View style={styles.featureRow}>
              <AlertCircle size={20} color="#f59e0b" />
              <Text style={[styles.featureText, { color: '#f59e0b' }]}>Apple Health sync pending</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ============================================
  // Android: Full Health Connect Integration
  // ============================================

  const { isAvailable, hasPermissions, isLoading, permissions, requestPermissions, openSettings } =
    useHealthConnect();
  const {
    healthSyncEnabled,
    healthAutoSync,
    syncWeight,
    syncBodyMeasurements,
    readHeartRate,
    readSteps,
    readSleep,
    setHealthSyncEnabled,
    setHealthAutoSync,
    setSyncWeight,
    setSyncBodyMeasurements,
    updateSettings,
  } = useSettingsStore();

  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    const granted = await requestPermissions();

    if (granted) {
      setHealthSyncEnabled(true);
      Alert.alert('Success', 'Health permissions granted! Your data will now sync.');
    } else {
      Alert.alert(
        'Permissions Denied',
        'Health permissions are required to sync your workouts and body data.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: openSettings },
        ]
      );
    }

    setIsConnecting(false);
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect Health',
      `This will stop syncing with ${Platform.OS === 'ios' ? 'Apple Health' : 'Health Connect'}. To fully revoke access, you must do it in the Health app settings.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => {
            setHealthSyncEnabled(false);
            Alert.alert(
              'Disconnected',
              `To fully revoke permissions, open ${Platform.OS === 'ios' ? 'Apple Health' : 'Health Connect'} settings.`
            );
          },
        },
      ]
    );
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);

    try {
      const result: SyncResult | null = await healthSyncService.forceSync();

      if (result) {
        const message = [
          `✅ Workouts synced: ${result.workoutsSynced}`,
          `✅ Weights synced: ${result.weightsSynced}`,
          `✅ Weights imported: ${result.weightsImported}`,
        ].join('\n');

        if (result.errors.length > 0) {
          Alert.alert('Sync Completed with Errors', `${message}\n\n ${result.errors.length} error(s) occurred`);
        } else {
          Alert.alert('Sync Complete', message);
        }
      }
    } catch (error: unknown) {
      Alert.alert('Sync Failed', 'An error occurred while syncing health data.');
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
      <SettingsHeader title="Health Settings" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Checking health features...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAvailable) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
      <SettingsHeader title="Health Settings" />
        <View style={styles.unavailableContainer}>
          <AlertCircle size={48} color="#f59e0b" />
          <Text style={styles.unavailableTitle}>Health Connect Not Available</Text>
          <Text style={styles.unavailableText}>
            {Platform.OS === 'android'
              ? 'Health Connect is not available on this device. Please install it from the Google Play Store.'
              : 'Apple HealthKit is not available on this device.'}
          </Text>
          {Platform.OS === 'android' && (
            <TouchableOpacity
              style={styles.installButton}
              onPress={() =>
                Linking.openURL('market://details?id=com.google.android.apps.healthdata')
              }
            >
              <Text style={styles.installButtonText}>Get Health Connect</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SettingsHeader title="Health Settings" />

      <ScrollView style={styles.scrollView}>
        {/* Connection Status */}
        <View style={styles.section}>
          <View style={[styles.statusCard, hasPermissions && styles.statusCardConnected]}>
            {hasPermissions ? (
              <>
                <CheckCircle size={40} color="#22c55e" />
                <Text style={styles.statusTitle}>Connected</Text>
                <Text style={styles.statusText}>
                  Syncing with {Platform.OS === 'ios' ? 'Apple Health' : 'Health Connect'}
                </Text>
              </>
            ) : (
              <>
                <Heart size={40} color="#ef4444" />
                <Text style={styles.statusTitle}>Not Connected</Text>
                <Text style={styles.statusText}>
                  Connect to sync workouts and view health data
                </Text>
                <TouchableOpacity
                  style={styles.connectButton}
                  onPress={handleConnect}
                  disabled={isConnecting}
                >
                  <Text style={styles.connectButtonText}>
                    {isConnecting ? 'Connecting...' : 'Connect Now'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {hasPermissions && (
          <>
            {/* Master Toggle */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>SYNC SETTINGS</Text>

              <View style={styles.settingsList}>
                <SettingsRow
                  icon={<Activity size={20} color="#3b82f6" />}
                  title="Enable Health Sync"
                  subtitle="Master toggle for all health features"
                  value={healthSyncEnabled}
                  onValueChange={setHealthSyncEnabled}
                />
              </View>

              {/* Manual Sync Button */}
              <TouchableOpacity
                style={[styles.syncButton, isSyncing && styles.syncButtonDisabled]}
                onPress={handleSyncNow}
                disabled={isSyncing || !healthSyncEnabled}
              >
                <Activity size={18} color={isSyncing || !healthSyncEnabled ? '#64748b' : '#3b82f6'} />
                <Text style={[styles.syncButtonText, isSyncing && styles.syncButtonTextDisabled]}>
                  {isSyncing ? 'Syncing...' : 'Sync Now'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Sync Options */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>SYNC OPTIONS</Text>

              <View style={styles.settingsList}>
                <SettingsRow
                  icon={<Zap size={20} color={healthAutoSync ? '#3b82f6' : '#64748b'} />}
                  title="Auto-Sync Workouts"
                  subtitle={
                    healthAutoSync
                      ? 'Workouts sync automatically'
                      : 'Manually sync each workout'
                  }
                  value={healthAutoSync}
                  onValueChange={setHealthAutoSync}
                  disabled={!healthSyncEnabled}
                />

                <View style={styles.divider} />

                <SettingsRow
                  icon={<Scale size={20} color={syncWeight ? '#3b82f6' : '#64748b'} />}
                  title="Sync Weight"
                  subtitle={syncWeight ? 'Weight entries sync automatically' : 'Weight sync disabled'}
                  value={syncWeight}
                  onValueChange={setSyncWeight}
                  disabled={!healthSyncEnabled}
                />

                <View style={styles.divider} />

                <SettingsRow
                  icon={<Activity size={20} color={syncBodyMeasurements ? '#3b82f6' : '#64748b'} />}
                  title="Sync Body Measurements"
                  subtitle={
                    syncBodyMeasurements
                      ? 'Measurements sync automatically'
                      : 'Measurements sync disabled'
                  }
                  value={syncBodyMeasurements}
                  onValueChange={setSyncBodyMeasurements}
                  disabled={!healthSyncEnabled}
                />
              </View>
            </View>

            {/* Data We Read */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>DATA WE READ</Text>

              <View style={styles.settingsList}>
                <SettingsRow
                  icon={<Heart size={20} color={readHeartRate ? '#ef4444' : '#64748b'} />}
                  title="Heart Rate"
                  subtitle="View workout heart rate and resting HR"
                  value={readHeartRate !== undefined ? readHeartRate : true}
                  onValueChange={(v) => updateSettings({ readHeartRate: v })}
                  disabled={!healthSyncEnabled}
                />

                <View style={styles.divider} />

                <SettingsRow
                  icon={<Footprints size={20} color={readSteps ? '#22c55e' : '#64748b'} />}
                  title="Steps"
                  subtitle="Display daily step count on home screen"
                  value={readSteps !== undefined ? readSteps : true}
                  onValueChange={(v) => updateSettings({ readSteps: v })}
                  disabled={!healthSyncEnabled}
                />

                <View style={styles.divider} />

                <SettingsRow
                  icon={<Moon size={20} color={readSleep ? '#8b5cf6' : '#64748b'} />}
                  title="Sleep"
                  subtitle="View sleep data for recovery insights"
                  value={readSleep !== undefined ? readSleep : true}
                  onValueChange={(v) => updateSettings({ readSleep: v })}
                  disabled={!healthSyncEnabled}
                />
              </View>
            </View>

            {/* What Gets Synced */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>WHAT GETS SYNCED</Text>
              <MeasurementSyncInfo />
            </View>

            {/* Permissions Detail */}
            {permissions && (
              <View style={styles.section}>
                <Text style={styles.sectionHeader}>PERMISSIONS STATUS</Text>

                <View style={styles.permissionsList}>
                  <Text style={styles.permissionsSubtitle}>Read Permissions</Text>
                  {Object.entries(permissions.read).map(([key, granted]) => (
                    <PermissionRow key={`read-${key}`} name={key} granted={granted} />
                  ))}

                  <Text style={[styles.permissionsSubtitle, { marginTop: 16 }]}>
                    Write Permissions
                  </Text>
                  {Object.entries(permissions.write).map(([key, granted]) => (
                    <PermissionRow key={`write-${key}`} name={key} granted={granted} />
                  ))}
                </View>

                <TouchableOpacity style={styles.manageButton} onPress={openSettings}>
                  <ExternalLink size={18} color="#3b82f6" />
                  <Text style={styles.manageButtonText}>
                    Manage in {Platform.OS === 'ios' ? 'Apple Health' : 'Health Connect'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Disconnect */}
            <View style={styles.section}>
              <TouchableOpacity style={styles.disconnectButton} onPress={handleDisconnect}>
                <Text style={styles.disconnectButtonText}>Disconnect Health</Text>
              </TouchableOpacity>
              <Text style={styles.note}>
                To fully revoke access, open{' '}
                {Platform.OS === 'ios' ? 'Apple Health' : 'Health Connect'} settings and remove this
                app.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

interface SettingsRowProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

function SettingsRow({ icon, title, subtitle, value, onValueChange, disabled }: SettingsRowProps) {
  return (
    <View style={[styles.settingsRow, disabled && styles.settingsRowDisabled]}>
      <View style={styles.settingsRowIcon}>{icon}</View>
      <View style={styles.settingsRowContent}>
        <Text style={[styles.settingsRowTitle, disabled && styles.textDisabled]}>{title}</Text>
        <Text style={[styles.settingsRowSubtitle, disabled && styles.textDisabled]}>
          {subtitle}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: '#334155', true: '#3b82f6' }}
        thumbColor="#fff"
      />
    </View>
  );
}

interface PermissionRowProps {
  name: string;
  granted: boolean;
}

function PermissionRow({ name, granted }: PermissionRowProps) {
  return (
    <View style={styles.permissionRow}>
      <Text style={styles.permissionName}>{name}</Text>
      {granted ? (
        <CheckCircle size={16} color="#22c55e" />
      ) : (
        <XCircle size={16} color="#ef4444" />
      )}
    </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 16,
  },
  unavailableContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  unavailableTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f1f5f9',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  unavailableText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  installButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  installButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  statusCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#334155',
  },
  statusCardConnected: {
    borderColor: '#22c55e',
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f1f5f9',
    marginTop: 12,
  },
  statusText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  connectButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 20,
  },
  connectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  settingsList: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  settingsRowDisabled: {
    opacity: 0.5,
  },
  settingsRowIcon: {
    marginRight: 12,
  },
  settingsRowContent: {
    flex: 1,
  },
  settingsRowTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 4,
  },
  settingsRowSubtitle: {
    fontSize: 13,
    color: '#64748b',
  },
  textDisabled: {
    color: '#475569',
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginLeft: 48,
  },
  permissionsList: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
  },
  permissionsSubtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  permissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  permissionName: {
    fontSize: 14,
    color: '#f1f5f9',
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1e293b',
    padding: 14,
    borderRadius: 10,
    marginTop: 12,
  },
  manageButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
  },
  disconnectButton: {
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderColor: '#ef4444',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  disconnectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
  note: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
  },
  
  // iOS Coming Soon Styles
  comingSoonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  comingSoonIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  comingSoonTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f1f5f9',
    textAlign: 'center',
    marginBottom: 8,
  },
  comingSoonSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3b82f6',
    textAlign: 'center',
    marginBottom: 16,
  },
  comingSoonMessage: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 12,
  },
  comingSoonReassurance: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  comingSoonFeatures: {
    width: '100%',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 15,
    color: '#f1f5f9',
  },
  
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderColor: '#3b82f6',
    padding: 14,
    borderRadius: 10,
    marginTop: 12,
  },
  syncButtonDisabled: {
    borderColor: '#334155',
    opacity: 0.5,
  },
  syncButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
  },
  syncButtonTextDisabled: {
    color: '#64748b',
  },
});


