import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  Trophy, 
  Bell, 
  Flame,
  Info,
  CheckCheck,
  Trash2,
  BellOff,
} from 'lucide-react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { useNotificationStore } from '../stores/notificationStore';
import { AppNotification } from '../types/notifications';
import { SettingsHeader } from '../components/SettingsHeader';
import { useBackNavigation } from '@/lib/hooks/useBackNavigation';
import { lightHaptic } from '@/lib/utils/haptics';

export default function NotificationsScreen() {
  useBackNavigation();

  const router = useRouter();
  const {
    notifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useNotificationStore();

  const unreadCount = notifications.filter(n => !n.read).length;

  const formatTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getNotificationIcon = (notification: AppNotification) => {
    // For achievements, show the actual emoji
    if (notification.type === 'achievement' && notification.data?.achievementIcon) {
      return (
        <Text style={styles.emojiIcon}>{notification.data.achievementIcon}</Text>
      );
    }

    // Fallback icons for other types
    switch (notification.type) {
      case 'achievement':
        return <Trophy size={24} color="#fbbf24" />;
      case 'pr':
        return <Trophy size={24} color="#f59e0b" />;
      case 'streak':
        return <Flame size={24} color="#ef4444" />;
      case 'reminder':
        return <Bell size={24} color="#60a5fa" />;
      default:
        return <Info size={24} color="#94a3b8" />;
    }
  };

  const getIconBackground = (type: string) => {
    switch (type) {
      case 'achievement':
        return '#78350f'; // Amber/brown
      case 'pr':
        return '#7c2d12'; // Orange/brown
      case 'streak':
        return '#7f1d1d'; // Red
      case 'reminder':
        return '#1e3a8a'; // Blue
      default:
        return '#334155'; // Gray
    }
  };

  const handleNotificationPress = (notification: AppNotification) => {
    lightHaptic();

    if (!notification.read) {
      markAsRead(notification.id);
    }

    // Navigate based on type
    if (notification.type === 'achievement') {
      router.push('/(tabs)/progress');
    }
  };

  const handleMarkAllRead = () => {
    lightHaptic();
    markAllAsRead();
  };

  const handleClearAll = () => {
    lightHaptic();
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to delete all notifications? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            clearAll();
            lightHaptic();
          },
        },
      ]
    );
  };

  const handleDelete = (id: string) => {
    lightHaptic();
    deleteNotification(id);
  };

  const renderRightActions = (id: string) => {
    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => handleDelete(id)}
        activeOpacity={0.7}
      >
        <Trash2 size={20} color="#fff" />
        <Text style={styles.deleteText}>Delete</Text>
      </TouchableOpacity>
    );
  };

  const renderNotification = ({ item }: { item: AppNotification }) => {
    // Get the display title - for achievements, show the achievement name
    const displayTitle = item.type === 'achievement' && item.data?.achievementTitle
      ? item.data.achievementTitle
      : item.title;

    // Get the display message - for achievements, show the description
    const displayMessage = item.type === 'achievement' && item.data?.achievementDescription
      ? item.data.achievementDescription
      : item.message;

    return (
      <Swipeable
        renderRightActions={() => renderRightActions(item.id)}
        overshootRight={false}
      >
        <TouchableOpacity
          style={[
            styles.notificationCard,
            !item.read && styles.notificationUnread,
          ]}
          onPress={() => handleNotificationPress(item)}
          activeOpacity={0.7}
        >
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: getIconBackground(item.type) }]}>
            {getNotificationIcon(item)}
          </View>

          {/* Content */}
          <View style={styles.contentContainer}>
            {/* Title Row */}
            <View style={styles.titleRow}>
              <Text style={styles.notificationTitle} numberOfLines={1}>
                {displayTitle}
              </Text>
              {!item.read && <View style={styles.unreadDot} />}
            </View>

            {/* Description */}
            <Text style={styles.notificationMessage} numberOfLines={2}>
              {displayMessage}
            </Text>

            {/* Timestamp */}
            <Text style={styles.timestamp}>{formatTimeAgo(item.timestamp)}</Text>
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <BellOff size={48} color="#4b5563" />
      </View>
      <Text style={styles.emptyTitle}>No Notifications</Text>
      <Text style={styles.emptyMessage}>
        You're all caught up! Achievements, PRs, and reminders will appear here.
      </Text>
    </View>
  );

  const renderHeader = () => {
    if (unreadCount === 0) return null;

    return (
      <View style={styles.unreadBanner}>
        <Text style={styles.unreadBannerText}>
          {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
        </Text>
        <TouchableOpacity onPress={handleMarkAllRead} activeOpacity={0.7}>
          <Text style={styles.markAllText}>Mark all read</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SettingsHeader
        title="Notifications"
        rightButton={
          notifications.length > 0 ? (
            <TouchableOpacity onPress={handleClearAll} style={styles.headerButton}>
              <Trash2 size={20} color="#ef4444" />
            </TouchableOpacity>
          ) : undefined
        }
      />

      {renderHeader()}

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          notifications.length === 0 && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  headerButton: {
    padding: 8,
    marginRight: -8,
  },

  // Unread Banner
  unreadBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  unreadBannerText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  markAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#60a5fa',
  },

  // List
  listContent: {
    padding: 16,
  },
  listContentEmpty: {
    flex: 1,
  },
  separator: {
    height: 12,
  },

  // Notification Card
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  notificationUnread: {
    backgroundColor: '#1e3a5f',
    borderColor: '#3b82f6',
  },

  // Icon
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  emojiIcon: {
    fontSize: 28,
  },

  // Content
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f1f5f9',
    flex: 1,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3b82f6',
    marginLeft: 8,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
    marginBottom: 6,
  },
  timestamp: {
    fontSize: 12,
    color: '#64748b',
  },

  // Delete Action
  deleteAction: {
    backgroundColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginLeft: 8,
    borderRadius: 16,
  },
  deleteText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
});
