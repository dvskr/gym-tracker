export interface AppNotification {
  id: string;
  type: 'pr' | 'achievement' | 'streak' | 'reminder' | 'system';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  data?: {
    achievementId?: string;
    achievementTitle?: string;
    achievementIcon?: string;
    achievementDescription?: string;
    [key: string]: unknown;
  };
  icon?: string;
}

export type NotificationType = AppNotification['type'];

export interface NotificationGroup {
  date: string;
  notifications: AppNotification[];
}

