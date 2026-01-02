import { create } from 'zustand';
import { logger } from '@/lib/utils/logger';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppNotification } from '@/types/notifications';

interface NotificationStore {
  notifications: AppNotification[];
  unreadCount: number;
  
  addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
  getUnreadCount: () => number;
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,

      addNotification: (notification) => {
        const newNotification: AppNotification = {
          ...notification,
          id: `${Date.now()}-${Math.random()}`,
          timestamp: new Date().toISOString(),
          read: false,
        };

        set((state) => {
          // Keep last 100 notifications
          const updatedNotifications = [newNotification, ...state.notifications].slice(0, 100);
          
          return {
            notifications: updatedNotifications,
            unreadCount: state.unreadCount + 1,
          };
        });

        logger.log('�x� Added notification:', newNotification.title);
      },

      markAsRead: (id) => {
        set((state) => {
          const notification = state.notifications.find(n => n.id === id);
          if (!notification || notification.read) return state;

          return {
            notifications: state.notifications.map(n =>
              n.id === id ? { ...n, read: true } : n
            ),
            unreadCount: Math.max(0, state.unreadCount - 1),
          };
        });
      },

      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map(n => ({ ...n, read: true })),
          unreadCount: 0,
        }));

        logger.log('�S& Marked all notifications as read');
      },

      deleteNotification: (id) => {
        set((state) => {
          const notification = state.notifications.find(n => n.id === id);
          const wasUnread = notification && !notification.read;

          return {
            notifications: state.notifications.filter(n => n.id !== id),
            unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
          };
        });
      },

      clearAll: () => {
        set({ notifications: [], unreadCount: 0 });
        logger.log('�x️ Cleared all notifications');
      },

      getUnreadCount: () => {
        return get().unreadCount;
      },
    }),
    {
      name: 'notification-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

