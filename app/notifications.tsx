import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { 
  Trophy, 
  Award, 
  Flame, 
  Bell, 
  Info, 
  BellOff, 
  Trash2,
  CheckCheck,
} from 'lucide-react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { useNotificationStore } from '../stores/notificationStore';
import { AppNotification } from '../types/notifications';

export default function NotificationsScreen() {
  const router = useRouter();
  const { 
    notifications, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification,
    clearAll,
  } = useNotificationStore();

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to delete all notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All', 
          style: 'destructive',
          onPress: clearAll,
        },
      ]
    );
  };

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'pr':
        return <Trophy size={20} color="#f59e0b" />;
      case 'achievement':
        return <Award size={20} color="#8b5cf6" />;
      case 'streak':
        return <Flame size={20} color="#ef4444" />;
      case 'reminder':
        return <Bell size={20} color="#3b82f6" />;
      default:
        return <Info size={20} color="#6b7280" />;
    }
  };

  const getBackgroundColor = (type: AppNotification['type']) => {
    switch (type) {
      case 'pr':
        return '#451a03';
      case 'achievement':
        return '#3730a3';
      case 'streak':
        return '#7f1d1d';
      case 'reminder':
        return '#1e3a8a';
      default:
        return '#1f2937';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const renderRightActions = (id: string) => {
    return (
      <Pressable 
        style={styles.deleteAction}
        onPress={() => deleteNotification(id)}
      >
        <Trash2 size={20} color="#fff" />
        <Text style={styles.deleteText}>Delete</Text>
      </Pressable>
    );
  };

  const renderNotification = ({ item }: { item: AppNotification }) => (
    <Swipeable
      renderRightActions={() => renderRightActions(item.id)}
      overshootRight={false}
    >
      <Pressable
        style={[
          styles.notificationItem,
          !item.read && styles.unread,
        ]}
        onPress={() => !item.read && markAsRead(item.id)}
      >
        <View style={[styles.iconContainer, { backgroundColor: getBackgroundColor(item.type) }]}>
          {getIcon(item.type)}
        </View>
        
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.notificationTitle} numberOfLines={1}>
              {item.title}
            </Text>
            {!item.read && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.message} numberOfLines={2}>
            {item.message}
          </Text>
          <Text style={styles.time}>{formatTime(item.timestamp)}</Text>
        </View>
      </Pressable>
    </Swipeable>
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          title: 'Notifications',
          headerShown: true,
          headerStyle: { backgroundColor: '#1e293b' },
          headerTintColor: '#f1f5f9',
          headerTitleStyle: { fontWeight: '600' },
        }}
      />

      <View style={styles.header}>
        <Text style={styles.title}>
          Notifications
          {unreadCount > 0 && (
            <Text style={styles.unreadCount}> ({unreadCount} unread)</Text>
          )}
        </Text>
        
        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <Pressable onPress={markAllAsRead} style={styles.headerButton}>
              <CheckCheck size={20} color="#3b82f6" />
              <Text style={styles.markAllReadText}>Mark all read</Text>
            </Pressable>
          )}
          
          {notifications.length > 0 && (
            <Pressable onPress={handleClearAll} style={styles.headerButton}>
              <Trash2 size={18} color="#ef4444" />
            </Pressable>
          )}
        </View>
      </View>

      {notifications.length === 0 ? (
        <View style={styles.empty}>
          <BellOff size={64} color="#475569" />
          <Text style={styles.emptyTitle}>No notifications yet</Text>
          <Text style={styles.emptyText}>
            You'll see your PRs, achievements, and reminders here
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotification}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  unreadCount: {
    fontSize: 16,
    fontWeight: '400',
    color: '#94a3b8',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#1e293b',
  },
  markAllReadText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3b82f6',
  },
  listContent: {
    paddingBottom: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#0f172a',
  },
  unread: {
    backgroundColor: '#1e293b',
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notificationTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
    marginLeft: 8,
  },
  message: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
    marginBottom: 6,
  },
  time: {
    fontSize: 12,
    color: '#64748b',
  },
  deleteAction: {
    backgroundColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
  },
  deleteText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f1f5f9',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
});

