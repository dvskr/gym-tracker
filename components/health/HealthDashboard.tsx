import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Heart,
  Moon,
  Footprints,
  Scale,
  RefreshCw,
  TrendingUp,
  ChevronRight,
} from 'lucide-react-native';
import { healthService } from '@/lib/health/healthService';
import { useHealthConnect } from '@/hooks/useHealthConnect';
import { useSettingsStore } from '@/stores/settingsStore';

interface HealthSummary {
  steps: number | null;
  sleepMinutes: number | null;
  sleepScore: number | null;
  restingHeartRate: number | null;
  lastWeight: { value: number; unit: string; date: Date } | null;
}

export function HealthDashboard() {
  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { isAvailable, hasPermissions } = useHealthConnect();
  const { healthSyncEnabled } = useSettingsStore();
  const router = useRouter();

  const fetchHealthData = async () => {
    if (!hasPermissions) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const [steps, sleep, heartRate, weights] = await Promise.all([
        healthService.getTodaySteps().catch(() => null),
        healthService.getLastNightSleep().catch(() => null),
        healthService.getRestingHeartRate().catch(() => null),
        healthService
          .getWeightHistory(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date())
          .catch(() => []),
      ]);

      // Get user's preferred weight unit
      const { weightUnit } = useSettingsStore.getState();

      setSummary({
        steps: steps || null,
        sleepMinutes: sleep?.totalMinutes || null,
        sleepScore: sleep ? healthService.calculateSleepScore(sleep) : null,
        restingHeartRate: heartRate || null,
        lastWeight:
          weights.length > 0
            ? {
                value: weightUnit === 'lbs' 
                  ? weights[weights.length - 1].weightKg * 2.20462
                  : weights[weights.length - 1].weightKg,
                unit: weightUnit,
                date: weights[weights.length - 1].date,
              }
            : null,
      });

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching health data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (hasPermissions && healthSyncEnabled) {
      fetchHealthData();
    } else {
      setIsLoading(false);
    }
  }, [hasPermissions, healthSyncEnabled]);

  // Don't show on unsupported devices
  if (!isAvailable) {
    return null;
  }

  // Show connect prompt if not connected
  if (!hasPermissions || !healthSyncEnabled) {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.connectCard}
          onPress={() => router.push('/settings/health')}
          activeOpacity={0.7}
        >
          <Heart size={32} color="#ef4444" fill="#ef4444" />
          <Text style={styles.connectTitle}>Connect Health Data</Text>
          <Text style={styles.connectText}>
            Track steps, sleep, heart rate and more on your home screen
          </Text>
          <View style={styles.connectButton}>
            <Text style={styles.connectButtonText}>Connect Now</Text>
            <ChevronRight size={16} color="#3b82f6" />
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  // Show loading skeleton
  if (isLoading && !summary) {
    return <HealthDashboardSkeleton />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Today's Health</Text>
        <Pressable onPress={fetchHealthData} style={styles.refreshButton}>
          <RefreshCw size={16} color="#64748b" />
        </Pressable>
      </View>

      <View style={styles.grid}>
        {/* Steps Card */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push('/settings/health')}
          activeOpacity={0.7}
        >
          <Footprints size={20} color="#22c55e" />
          <Text style={styles.value}>
            {summary?.steps !== null ? summary.steps.toLocaleString() : '--'}
          </Text>
          <Text style={styles.label}>Steps</Text>
          {summary?.steps !== null && summary.steps >= 10000 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Goal! 🎉</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Sleep Card */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push('/settings/health')}
          activeOpacity={0.7}
        >
          <Moon size={20} color="#8b5cf6" />
          <Text style={styles.value}>
            {summary?.sleepMinutes
              ? `${Math.floor(summary.sleepMinutes / 60)}h ${summary.sleepMinutes % 60}m`
              : '--'}
          </Text>
          <Text style={styles.label}>Sleep</Text>
          {summary?.sleepScore && (
            <View
              style={[
                styles.scoreBadge,
                {
                  backgroundColor:
                    summary.sleepScore >= 80
                      ? '#22c55e'
                      : summary.sleepScore >= 60
                      ? '#3b82f6'
                      : '#f59e0b',
                },
              ]}
            >
              <Text style={styles.scoreBadgeText}>{summary.sleepScore}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Heart Rate Card */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push('/settings/health')}
          activeOpacity={0.7}
        >
          <Heart size={20} color="#ef4444" />
          <Text style={styles.value}>
            {summary?.restingHeartRate ? `${summary.restingHeartRate}` : '--'}
          </Text>
          <Text style={styles.label}>Resting HR</Text>
          {summary?.restingHeartRate && (
            <Text style={styles.subtext}>bpm</Text>
          )}
        </TouchableOpacity>

        {/* Weight Card */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push('/settings/health')}
          activeOpacity={0.7}
        >
          <Scale size={20} color="#3b82f6" />
          <Text style={styles.value}>
            {summary?.lastWeight ? summary.lastWeight.value.toFixed(1) : '--'}
          </Text>
          <Text style={styles.label}>
            Weight ({summary?.lastWeight?.unit || 'kg'})
          </Text>
          {summary?.lastWeight && (
            <Text style={styles.subtext}>
              {new Date(summary.lastWeight.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {lastUpdated && (
        <Text style={styles.timestamp}>
          Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      )}
    </View>
  );
}

function HealthDashboardSkeleton() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.skeleton, { width: 140, height: 20 }]} />
      </View>

      <View style={styles.grid}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.card}>
            <View style={[styles.skeleton, { width: 20, height: 20, borderRadius: 10 }]} />
            <View style={[styles.skeleton, { width: 60, height: 28, marginTop: 8 }]} />
            <View style={[styles.skeleton, { width: 40, height: 14, marginTop: 4 }]} />
          </View>
        ))}
      </View>
    </View>
  );
}

export function HealthInsights() {
  const { hasPermissions } = useHealthConnect();
  const [recommendation, setRecommendation] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchRecommendation() {
      if (!hasPermissions) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const rec = await healthService.getRecoveryRecommendation();
      setRecommendation(rec);
      setIsLoading(false);
    }

    fetchRecommendation();
  }, [hasPermissions]);

  if (!hasPermissions || isLoading) {
    return null;
  }

  if (!recommendation || recommendation.sleepScore === 0) {
    return null;
  }

  const getInsightStyle = () => {
    switch (recommendation.recommendation) {
      case 'intense':
        return {
          backgroundColor: '#22c55e20',
          borderColor: '#22c55e',
          icon: '💪',
          color: '#22c55e',
        };
      case 'moderate':
        return {
          backgroundColor: '#3b82f620',
          borderColor: '#3b82f6',
          icon: '👍',
          color: '#3b82f6',
        };
      case 'light':
        return {
          backgroundColor: '#f59e0b20',
          borderColor: '#f59e0b',
          icon: '🚶',
          color: '#f59e0b',
        };
      case 'rest':
        return {
          backgroundColor: '#ef444420',
          borderColor: '#ef4444',
          icon: '😴',
          color: '#ef4444',
        };
      default:
        return {
          backgroundColor: '#64748b20',
          borderColor: '#64748b',
          icon: 'ℹ️',
          color: '#64748b',
        };
    }
  };

  const style = getInsightStyle();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TrendingUp size={18} color="#64748b" />
        <Text style={styles.insightTitle}>Health Insight</Text>
      </View>

      <View
        style={[
          styles.insightCard,
          { backgroundColor: style.backgroundColor, borderColor: style.borderColor },
        ]}
      >
        <Text style={styles.insightIcon}>{style.icon}</Text>
        <View style={styles.insightContent}>
          <Text style={[styles.insightLabel, { color: style.color }]}>
            {recommendation.recommendation.charAt(0).toUpperCase() +
              recommendation.recommendation.slice(1)}{' '}
            Workout
          </Text>
          <Text style={styles.insightReason}>{recommendation.reason}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  refreshButton: {
    padding: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: '47.5%',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    position: 'relative',
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f1f5f9',
    marginTop: 8,
  },
  label: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  subtext: {
    fontSize: 10,
    color: '#475569',
    marginTop: 2,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#22c55e',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  scoreBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  scoreBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  timestamp: {
    fontSize: 11,
    color: '#475569',
    textAlign: 'center',
    marginTop: 8,
  },
  connectCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#334155',
    borderStyle: 'dashed',
  },
  connectTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f1f5f9',
    marginTop: 12,
  },
  connectText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  connectButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3b82f6',
  },
  skeleton: {
    backgroundColor: '#334155',
    borderRadius: 4,
  },
  insightTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f1f5f9',
    marginLeft: 8,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  insightIcon: {
    fontSize: 28,
  },
  insightContent: {
    flex: 1,
  },
  insightLabel: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  insightReason: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18,
  },
});

