import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { BellOff, ChevronRight } from 'lucide-react-native';
import { useNotificationPermissions } from '../../hooks/useNotificationPermissions';

interface NotificationPermissionBannerProps {
  onPress?: () => void;
}

/**
 * Compact banner shown in settings when notifications are disabled
 */
export function NotificationPermissionBanner({ onPress }: NotificationPermissionBannerProps) {
  const { status, isGranted, requestPermissions, openSettings } = useNotificationPermissions();

  // Don't show if notifications are enabled
  if (isGranted) {
    return null;
  }

  const handlePress = async () => {
    if (status === 'denied') {
      openSettings();
    } else {
      await requestPermissions();
    }
    onPress?.();
  };

  return (
    <Pressable style={styles.container} onPress={handlePress}>
      <View style={styles.iconContainer}>
        <BellOff size={24} color="#f59e0b" />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Notifications Disabled</Text>
        <Text style={styles.description}>
          {status === 'denied' 
            ? 'Enable in Settings to receive reminders'
            : 'Enable to get workout reminders and alerts'}
        </Text>
      </View>

      <ChevronRight size={20} color="#64748b" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderLeftWidth: 4,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#451a03',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 2,
  },
  description: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18,
  },
});
