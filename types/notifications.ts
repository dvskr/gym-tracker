export interface AppNotification {
  id: string;
  type: 'pr' | 'achievement' | 'streak' | 'reminder' | 'system';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  data?: Record<string, any>;
  icon?: string;
}

export type NotificationType = AppNotification['type'];

export interface NotificationGroup {
  date: string;
  notifications: AppNotification[];
}
