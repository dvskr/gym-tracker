import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/utils/logger';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Smartphone, Monitor, Trash2, CheckCircle, Clock } from 'lucide-react-native';
import { deviceManager, DeviceInfo } from '@/lib/sync/deviceManager';
import { SettingsHeader } from '@/components/SettingsHeader';
import { useBackNavigation } from '@/lib/hooks/useBackNavigation';

export default function DevicesScreen() {
  useBackNavigation(); // Enable Android back gesture support

  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    setLoading(true);
    try {
      const devicesData = await deviceManager.getDevices();
      setDevices(devicesData);
    } catch (error: unknown) {
 logger.error('Error loading devices:', error);
      Alert.alert('Error', 'Failed to load devices');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDevice = (device: DeviceInfo) => {
    Alert.alert(
      'Remove Device?',
      `Remove "${device.name}"?\n\nYou will be signed out on that device.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setRemoving(device.id);
            try {
              await deviceManager.removeDevice(device.id);
              await loadDevices();
              Alert.alert('Removed', 'Device removed successfully');
            } catch (error: unknown) {
 logger.error('Error removing device:', error);
              Alert.alert('Error', 'Failed to remove device');
            } finally {
              setRemoving(null);
            }
          },
        },
      ]
    );
  };

  const handleRemoveAllOthers = () => {
    const otherDevices = devices.filter((d) => !d.isCurrent);

    if (otherDevices.length === 0) {
      Alert.alert('No Other Devices', 'This is the only device signed in');
      return;
    }

    Alert.alert(
      'Sign Out All Other Devices?',
      `This will sign you out from ${otherDevices.length} device(s).\n\nYou will need to sign in again on those devices.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const count = await deviceManager.removeAllOtherDevices();
              await loadDevices();
              Alert.alert('Success', `Signed out from ${count} device(s)`);
            } catch (error: unknown) {
 logger.error('Error removing devices:', error);
              Alert.alert('Error', 'Failed to sign out from other devices');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'ios':
        return <Smartphone size={24} color="#3b82f6" />;
      case 'android':
        return <Smartphone size={24} color="#22c55e" />;
      case 'web':
        return <Monitor size={24} color="#f59e0b" />;
      default:
        return <Smartphone size={24} color="#64748b" />;
    }
  };

  if (loading && devices.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
      <SettingsHeader title="Your Devices" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading devices...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SettingsHeader title="Your Devices" />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header Info */}
        <View style={styles.header}>
          <Text style={styles.headerText}>
            These are the devices currently signed into your account
          </Text>
        </View>

        {/* Devices List */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>DEVICES ({devices.length})</Text>

          <View style={styles.devicesList}>
            {devices.map((device) => (
              <View key={device.id} style={styles.deviceCard}>
                <View style={styles.deviceHeader}>
                  <View style={styles.deviceIcon}>{getPlatformIcon(device.platform)}</View>

                  <View style={styles.deviceInfo}>
                    <View style={styles.deviceNameRow}>
                      <Text style={styles.deviceName}>{device.name}</Text>
                      {device.isCurrent && (
                        <View style={styles.currentBadge}>
                          <CheckCircle size={14} color="#22c55e" />
                          <Text style={styles.currentBadgeText}>This device</Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.devicePlatform}>
                      {device.platform.charAt(0).toUpperCase() + device.platform.slice(1)} • v
                      {device.appVersion}
                    </Text>

                    <View style={styles.deviceLastActive}>
                      <Clock size={14} color="#64748b" />
                      <Text style={styles.deviceLastActiveText}>
                        {device.isCurrent
                          ? 'Active now'
                          : `Last active: ${deviceManager.formatLastActive(device.lastActive)}`}
                      </Text>
                    </View>
                  </View>
                </View>

                {!device.isCurrent && (
                  <TouchableOpacity
                    style={[styles.removeButton, removing === device.id && styles.removeButtonDisabled]}
                    onPress={() => handleRemoveDevice(device)}
                    disabled={removing === device.id}
                  >
                    {removing === device.id ? (
                      <ActivityIndicator size="small" color="#ef4444" />
                    ) : (
                      <>
                        <Trash2 size={16} color="#ef4444" />
                        <Text style={styles.removeButtonText}>Remove</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Sign Out All Others */}
        {devices.filter((d) => !d.isCurrent).length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.signOutAllButton, loading && styles.signOutAllButtonDisabled]}
              onPress={handleRemoveAllOthers}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ef4444" />
              ) : (
                <>
                  <Trash2 size={20} color="#ef4444" />
                  <Text style={styles.signOutAllButtonText}>Sign Out All Other Devices</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.signOutAllNote}>
              This will sign you out from all devices except this one. You'll need to sign in again
              on those devices.
            </Text>
          </View>
        )}

        {/* Info Section */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>About Device Management</Text>
          <Text style={styles.infoText}>
            • Your account can be signed in on multiple devices{'\n'}
            • Data syncs automatically across all devices{'\n'}
            • Remove devices you no longer use for security{'\n'}
            • Device names are detected automatically
          </Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 16,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingTop: 24,
  },
  headerText: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
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
  devicesList: {
    gap: 12,
    paddingHorizontal: 16,
  },
  deviceCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
  },
  deviceHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  deviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f1f5f9',
    marginRight: 8,
  },
  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#064e3b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  currentBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#22c55e',
  },
  devicePlatform: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 6,
  },
  deviceLastActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deviceLastActiveText: {
    fontSize: 13,
    color: '#64748b',
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#7f1d1d',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  removeButtonDisabled: {
    opacity: 0.5,
  },
  removeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
  signOutAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7f1d1d',
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  signOutAllButtonDisabled: {
    opacity: 0.5,
  },
  signOutAllButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
  signOutAllNote: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 32,
    lineHeight: 18,
  },
  infoCard: {
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
    marginBottom: 8,
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



