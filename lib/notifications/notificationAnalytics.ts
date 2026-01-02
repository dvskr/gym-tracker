import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/lib/utils/logger';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export interface NotificationEvent {
  type: 'sent' | 'received' | 'opened' | 'dismissed';
  notificationType: string;
  timestamp: string;
  data?: Record<string, any>;
}

export interface NotificationSummary {
  totalSent: number;
  totalOpened: number;
  totalDismissed: number;
  openRate: number;
  dismissRate: number;
  byType: Record<string, {
    sent: number;
    opened: number;
    dismissed: number;
    openRate: number;
    dismissRate: number;
  }>;
}

class NotificationAnalyticsService {
  private readonly STORAGE_KEY = '@gym/notification_analytics';
  private readonly MAX_EVENTS = 100;

  /**
   * Track a notification event
   */
  async trackEvent(event: NotificationEvent): Promise<void> {
    try {
      // Store locally
      const events = await this.getEvents();
      events.push(event);
      
      // Keep last 100 events
      const trimmed = events.slice(-this.MAX_EVENTS);
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(trimmed));
      
      logger.log(`�x` Tracked ${event.type} event for ${event.notificationType}`);
      
      // Sync to server (async, don't wait)
      this.syncToServer(event).catch(error => {
        logger.warn('Failed to sync notification event:', error);
      });
    } catch (error) {
      logger.error('Failed to track notification event:', error);
    }
  }

  /**
   * Get open rate for a specific notification type
   */
  async getOpenRate(notificationType: string): Promise<number> {
    const events = await this.getEvents();
    
    const sent = events.filter(
      e => e.type === 'sent' && e.notificationType === notificationType
    ).length;
    
    const opened = events.filter(
      e => e.type === 'opened' && e.notificationType === notificationType
    ).length;
    
    return sent > 0 ? (opened / sent) * 100 : 0;
  }

  /**
   * Get dismiss rate for a specific notification type
   */
  async getDismissRate(notificationType: string): Promise<number> {
    const events = await this.getEvents();
    
    const sent = events.filter(
      e => e.type === 'sent' && e.notificationType === notificationType
    ).length;
    
    const dismissed = events.filter(
      e => e.type === 'dismissed' && e.notificationType === notificationType
    ).length;
    
    return sent > 0 ? (dismissed / sent) * 100 : 0;
  }

  /**
   * Get comprehensive analytics summary
   */
  async getSummary(): Promise<NotificationSummary> {
    const events = await this.getEvents();
    
    const summary: NotificationSummary = {
      totalSent: 0,
      totalOpened: 0,
      totalDismissed: 0,
      openRate: 0,
      dismissRate: 0,
      byType: {},
    };

    // Count by type
    for (const event of events) {
      if (!summary.byType[event.notificationType]) {
        summary.byType[event.notificationType] = {
          sent: 0,
          opened: 0,
          dismissed: 0,
          openRate: 0,
          dismissRate: 0,
        };
      }
      
      const typeStats = summary.byType[event.notificationType];
      
      if (event.type === 'sent') {
        summary.totalSent++;
        typeStats.sent++;
      } else if (event.type === 'opened') {
        summary.totalOpened++;
        typeStats.opened++;
      } else if (event.type === 'dismissed') {
        summary.totalDismissed++;
        typeStats.dismissed++;
      }
    }

    // Calculate overall rates
    summary.openRate = summary.totalSent > 0 
      ? (summary.totalOpened / summary.totalSent) * 100 
      : 0;
    
    summary.dismissRate = summary.totalSent > 0
      ? (summary.totalDismissed / summary.totalSent) * 100
      : 0;
    
    // Calculate rates by type
    for (const type of Object.keys(summary.byType)) {
      const { sent, opened, dismissed } = summary.byType[type];
      summary.byType[type].openRate = sent > 0 ? (opened / sent) * 100 : 0;
      summary.byType[type].dismissRate = sent > 0 ? (dismissed / sent) * 100 : 0;
    }

    return summary;
  }

  /**
   * Get events for a specific notification type
   */
  async getEventsByType(notificationType: string): Promise<NotificationEvent[]> {
    const events = await this.getEvents();
    return events.filter(e => e.notificationType === notificationType);
  }

  /**
   * Get recent events (last N)
   */
  async getRecentEvents(count: number = 10): Promise<NotificationEvent[]> {
    const events = await this.getEvents();
    return events.slice(-count).reverse();
  }

  /**
   * Get events from last N days
   */
  async getEventsFromLastDays(days: number): Promise<NotificationEvent[]> {
    const events = await this.getEvents();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return events.filter(e => {
      const eventDate = new Date(e.timestamp);
      return eventDate >= cutoffDate;
    });
  }

  /**
   * Get most effective notification type
   */
  async getMostEffectiveType(): Promise<{
    type: string;
    openRate: number;
  } | null> {
    const summary = await this.getSummary();
    
    let bestType: string | null = null;
    let bestRate = 0;
    
    for (const [type, stats] of Object.entries(summary.byType)) {
      if (stats.sent >= 3 && stats.openRate > bestRate) {
        bestType = type;
        bestRate = stats.openRate;
      }
    }
    
    return bestType ? { type: bestType, openRate: bestRate } : null;
  }

  /**
   * Clear all analytics data
   */
  async clearAnalytics(): Promise<void> {
    await AsyncStorage.removeItem(this.STORAGE_KEY);
    logger.log('�x️ Notification analytics cleared');
  }

  /**
   * Get all events from storage
   */
  private async getEvents(): Promise<NotificationEvent[]> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      logger.error('Failed to get notification events:', error);
      return [];
    }
  }

  /**
   * Sync event to Supabase for server-side analytics
   */
  private async syncToServer(event: NotificationEvent): Promise<void> {
    try {
      const userId = useAuthStore.getState().user?.id;
      
      if (!userId) {
        // User not logged in, skip sync
        return;
      }

      await supabase.from('notification_events').insert({
        user_id: userId,
        event_type: event.type,
        notification_type: event.notificationType,
        event_data: event.data || null,
        created_at: event.timestamp,
      });
      
      logger.log('�S& Synced notification event to server');
    } catch (error) {
      // Silent fail - analytics shouldn't break the app
      logger.warn('Failed to sync notification event to server:', error);
    }
  }
}

export const notificationAnalyticsService = new NotificationAnalyticsService();

