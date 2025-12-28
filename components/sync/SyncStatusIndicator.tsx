import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
} from 'react-native';
import { CheckCircle, RefreshCw, Clock, WifiOff, AlertCircle } from 'lucide-react-native';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useSyncQueue } from '@/hooks/useSyncQueue';
import { backgroundSync } from '@/lib/sync/backgroundSync';

export interface SyncStatus {
  state: 'synced' | 'syncing' | 'pending' | 'offline' | 'error';
  pendingCount: number;
  failedCount: number;
  lastSyncTime: Date | null;
  errorMessage?: string;
}

interface SyncStatusIndicatorProps {
  onPress?: () => void;
  showLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export function SyncStatusIndicator({
  onPress,
  showLabel = true,
  size = 'medium',
}: SyncStatusIndicatorProps) {
  const { isOnline } = useNetworkStatus();
  const { pendingCount, failedCount, isSyncing } = useSyncQueue();
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    loadLastSync();
    
    // Update last sync time periodically
    const interval = setInterval(loadLastSync, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadLastSync = async () => {
    const time = await backgroundSync.getLastSyncTime();
    setLastSync(time ? new Date(time) : null);
  };

  const getStatus = (): SyncStatus => {
    if (!isOnline) {
      return {
        state: 'offline',
        pendingCount,
        failedCount,
        lastSyncTime: lastSync,
      };
    }
    if (failedCount > 0) {
      return {
        state: 'error',
        pendingCount,
        failedCount,
        lastSyncTime: lastSync,
        errorMessage: `${failedCount} change${failedCount > 1 ? 's' : ''} failed to sync`,
      };
    }
    if (isSyncing) {
      return {
        state: 'syncing',
        pendingCount,
        failedCount,
        lastSyncTime: lastSync,
      };
    }
    if (pendingCount > 0) {
      return {
        state: 'pending',
        pendingCount,
        failedCount,
        lastSyncTime: lastSync,
      };
    }
    return {
      state: 'synced',
      pendingCount: 0,
      failedCount: 0,
      lastSyncTime: lastSync,
    };
  };

  const status = getStatus();
  const sizeStyle = size === 'small' ? styles.small : size === 'large' ? styles.large : styles.medium;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.container, sizeStyle]}
      android_ripple={{ color: '#334155' }}
    >
      <StatusIcon status={status.state} size={size} />
      {showLabel && <StatusText status={status} size={size} />}
      {status.pendingCount > 0 && showLabel && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{status.pendingCount}</Text>
        </View>
      )}
    </Pressable>
  );
}

interface StatusIconProps {
  status: SyncStatus['state'];
  size: 'small' | 'medium' | 'large';
}

function StatusIcon({ status, size }: StatusIconProps) {
  const [spinAnim] = useState(new Animated.Value(0));
  const iconSize = size === 'small' ? 14 : size === 'large' ? 20 : 16;

  useEffect(() => {
    if (status === 'syncing') {
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      spinAnim.setValue(0);
    }
  }, [status, spinAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  switch (status) {
    case 'synced':
      return <CheckCircle size={iconSize} color="#22c55e" />;
    
    case 'syncing':
      return (
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <RefreshCw size={iconSize} color="#3b82f6" />
        </Animated.View>
      );
    
    case 'pending':
      return <Clock size={iconSize} color="#f59e0b" />;
    
    case 'offline':
      return <WifiOff size={iconSize} color="#6b7280" />;
    
    case 'error':
      return <AlertCircle size={iconSize} color="#ef4444" />;
    
    default:
      return null;
  }
}

interface StatusTextProps {
  status: SyncStatus;
  size: 'small' | 'medium' | 'large';
}

function StatusText({ status, size }: StatusTextProps) {
  const textStyle = size === 'small' ? styles.textSmall : size === 'large' ? styles.textLarge : styles.textMedium;

  const getText = () => {
    switch (status.state) {
      case 'synced':
        return 'Synced';
      case 'syncing':
        return 'Syncing...';
      case 'pending':
        return `${status.pendingCount} pending`;
      case 'offline':
        return 'Offline';
      case 'error':
        return 'Error';
      default:
        return '';
    }
  };

  const colorStyle = status.state === 'error' ? styles.errorText : null;

  return (
    <Text style={[styles.text, textStyle, colorStyle]}>
      {getText()}
    </Text>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#1e293b',
  },
  small: {
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  medium: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  large: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  text: {
    marginLeft: 6,
    color: '#94a3b8',
    fontWeight: '500',
  },
  textSmall: {
    fontSize: 11,
  },
  textMedium: {
    fontSize: 12,
  },
  textLarge: {
    fontSize: 14,
  },
  errorText: {
    color: '#ef4444',
  },
  badge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginLeft: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
});

export default SyncStatusIndicator;

