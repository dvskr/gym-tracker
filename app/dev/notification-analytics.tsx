import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/utils/logger';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarChart3, TrendingUp, Eye, XCircle } from 'lucide-react-native';
import { notificationAnalyticsService, NotificationSummary } from '@/lib/notifications/notificationAnalytics';
import { Button } from '@/components/ui';
import { SettingsHeader } from '@/components/SettingsHeader';
import { useBackNavigation } from '@/lib/hooks/useBackNavigation';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color }) => (
  <View style={styles.statCard}>
    <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
      {icon}
    </View>
    <View style={styles.statContent}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  </View>
);

interface TypeRowProps {
  type: string;
  stats: {
    sent: number;
    opened: number;
    dismissed: number;
    openRate: number;
    dismissRate: number;
  };
}

const TypeRow: React.FC<TypeRowProps> = ({ type, stats }) => {
  const getTypeName = (t: string): string => {
    const names: Record<string, string> = {
      'workout_reminder': 'Workout Reminders',
      'rest_complete': 'Rest Timer',
      'pr_notification': 'Personal Records',
      'achievement': 'Achievements',
      'streak_reminder': 'Streak Reminders',
      'streak_celebration': 'Streak Celebrations',
      'inactivity_reminder': 'Inactivity',
      'test': 'Test Notifications',
    };
    return names[t] || t.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getOpenRateColor = (rate: number): string => {
    if (rate >= 70) return '#22c55e'; // green
    if (rate >= 40) return '#f59e0b'; // orange
    return '#ef4444'; // red
  };

  return (
    <View style={styles.typeRow}>
      <View style={styles.typeHeader}>
        <Text style={styles.typeName}>{getTypeName(type)}</Text>
        <View style={styles.typeMetrics}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Sent</Text>
            <Text style={styles.metricValue}>{stats.sent}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Opened</Text>
            <Text style={styles.metricValue}>{stats.opened}</Text>
          </View>
          {stats.dismissed > 0 && (
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Dismissed</Text>
              <Text style={styles.metricValue}>{stats.dismissed}</Text>
            </View>
          )}
        </View>
      </View>
      
      <View style={styles.typeStats}>
        <View style={styles.progressBarContainer}>
          <Text style={styles.progressLabel}>Open Rate</Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill,
                { 
                  width: `${stats.openRate}%`,
                  backgroundColor: getOpenRateColor(stats.openRate),
                }
              ]}
            />
          </View>
          <Text style={[styles.progressValue, { color: getOpenRateColor(stats.openRate) }]}>
            {stats.openRate.toFixed(1)}%
          </Text>
        </View>
      </View>
    </View>
  );
};

export default function NotificationAnalyticsScreen() {
  useBackNavigation(); // Enable Android back gesture support

  const [summary, setSummary] = useState<NotificationSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    try {
      setIsLoading(true);
      const data = await notificationAnalyticsService.getSummary();
      setSummary(data);
    } catch (error) {
 logger.error('Failed to load analytics:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    await loadAnalytics();
  }

  async function handleClearAnalytics() {
    await notificationAnalyticsService.clearAnalytics();
    await loadAnalytics();
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <SettingsHeader title="Notification Analytics" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!summary || summary.totalSent === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <SettingsHeader title="Notification Analytics" />
        <View style={styles.emptyContainer}>
          <BarChart3 size={64} color="#64748b" />
          <Text style={styles.emptyTitle}>No Data Yet</Text>
          <Text style={styles.emptyText}>
            Notification analytics will appear here once you start receiving notifications.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SettingsHeader title="Notification Analytics" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#3b82f6"
          />
        }
      >
        {/* Overall Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>OVERALL PERFORMANCE</Text>
          
          <View style={styles.statsGrid}>
            <StatCard
              icon={<TrendingUp size={24} color="#3b82f6" />}
              label="Total Sent"
              value={summary.totalSent}
              color="#3b82f6"
            />
            <StatCard
              icon={<Eye size={24} color="#22c55e" />}
              label="Total Opened"
              value={summary.totalOpened}
              color="#22c55e"
            />
            <StatCard
              icon={<XCircle size={24} color="#ef4444" />}
              label="Dismissed"
              value={summary.totalDismissed}
              color="#ef4444"
            />
            <StatCard
              icon={<BarChart3 size={24} color="#f59e0b" />}
              label="Open Rate"
              value={`${summary.openRate.toFixed(1)}%`}
              color="#f59e0b"
            />
          </View>
        </View>

        {/* By Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BY NOTIFICATION TYPE</Text>
          
          {Object.entries(summary.byType)
            .sort((a, b) => b[1].sent - a[1].sent)
            .map(([type, stats]) => (
              <TypeRow key={type} type={type} stats={stats} />
            ))}
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Button
            title="Clear Analytics Data"
            variant="secondary"
            onPress={handleClearAnalytics}
          />
          <Text style={styles.hint}>
            This will remove all local analytics data. Server data will remain.
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
    color: '#94a3b8',
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f1f5f9',
    marginTop: 20,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: 150,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  statLabel: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
  },
  typeRow: {
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
  },
  typeHeader: {
    marginBottom: 12,
  },
  typeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 12,
  },
  typeMetrics: {
    flexDirection: 'row',
    gap: 16,
  },
  metric: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  typeStats: {
    gap: 12,
  },
  progressBarContainer: {
    gap: 8,
  },
  progressLabel: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#334155',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },
  hint: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 12,
    marginHorizontal: 16,
  },
  bottomSpacer: {
    height: 32,
  },
});

