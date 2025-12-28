import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import {
  Battery,
  BatteryMedium,
  BatteryLow,
  BatteryWarning,
  Activity,
  Calendar,
  ChevronRight,
} from 'lucide-react-native';
import { recoveryService, RecoveryStatus as RecoveryStatusType } from '@/lib/ai/recoveryService';
import { useAuthStore } from '@/stores/authStore';

export function RecoveryStatus() {
  const [status, setStatus] = useState<RecoveryStatusType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    fetchStatus();
  }, [user]);

  const fetchStatus = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const result = await recoveryService.getRecoveryStatus(user.id);
      setStatus(result);
    } catch (error) {
      console.error('Failed to fetch recovery status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = () => {
    if (!status) return '#94a3b8';
    switch (status.overall) {
      case 'recovered':
        return '#22c55e';
      case 'moderate':
        return '#f59e0b';
      case 'fatigued':
        return '#f97316';
      case 'overtrained':
        return '#ef4444';
    }
  };

  const getStatusLabel = () => {
    if (!status) return 'Loading';
    switch (status.overall) {
      case 'recovered':
        return 'Well Recovered';
      case 'moderate':
        return 'Moderate';
      case 'fatigued':
        return 'Fatigued';
      case 'overtrained':
        return 'Overtrained';
    }
  };

  const getStatusIcon = () => {
    if (!status) return <Activity size={20} color="#94a3b8" />;
    const color = getStatusColor();
    switch (status.overall) {
      case 'recovered':
        return <Battery size={20} color={color} />;
      case 'moderate':
        return <BatteryMedium size={20} color={color} />;
      case 'fatigued':
        return <BatteryLow size={20} color={color} />;
      case 'overtrained':
        return <BatteryWarning size={20} color={color} />;
    }
  };

  const getActionLabel = () => {
    if (!status) return '';
    switch (status.suggestedAction) {
      case 'train_hard':
        return 'Train Hard';
      case 'train_light':
        return 'Train Light';
      case 'active_recovery':
        return 'Active Recovery';
      case 'rest':
        return 'Rest Day';
    }
  };

  const getMuscleStatusColor = (muscleStatus: 'fresh' | 'recovering' | 'fatigued') => {
    switch (muscleStatus) {
      case 'fresh':
        return '#22c55e';
      case 'recovering':
        return '#f59e0b';
      case 'fatigued':
        return '#ef4444';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#3b82f6" />
      </View>
    );
  }

  if (!status) return null;

  return (
    <Pressable
      style={[styles.container, { borderLeftColor: getStatusColor() }]}
      onPress={() => setExpanded(!expanded)}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {getStatusIcon()}
          <View style={styles.headerText}>
            <Text style={styles.title}>Recovery Status</Text>
            <Text style={[styles.statusLabel, { color: getStatusColor() }]}>
              {getStatusLabel()}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Text style={[styles.score, { color: getStatusColor() }]}>
            {status.score}
          </Text>
          <Text style={styles.scoreLabel}>score</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${status.score}%`,
                backgroundColor: getStatusColor(),
              },
            ]}
          />
        </View>
      </View>

      {/* Recommendation */}
      <Text style={styles.recommendation}>{status.recommendation}</Text>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Calendar size={14} color="#64748b" />
          <Text style={styles.statValue}>{status.consecutiveDays}</Text>
          <Text style={styles.statLabel}>consecutive</Text>
        </View>
        <View style={styles.stat}>
          <Activity size={14} color="#64748b" />
          <Text style={styles.statValue}>{status.workoutsThisWeek}</Text>
          <Text style={styles.statLabel}>this week</Text>
        </View>
        <View style={styles.stat}>
          <View
            style={[
              styles.actionBadge,
              { backgroundColor: `${getStatusColor()}20` },
            ]}
          >
            <Text style={[styles.actionText, { color: getStatusColor() }]}>
              {getActionLabel()}
            </Text>
          </View>
        </View>
      </View>

      {/* Muscle Groups (Expanded) */}
      {expanded && status.muscleGroups.length > 0 && (
        <View style={styles.muscleSection}>
          <Text style={styles.muscleSectionTitle}>Muscle Recovery</Text>
          <View style={styles.muscleGrid}>
            {status.muscleGroups.map((muscle) => (
              <View key={muscle.muscle} style={styles.muscleItem}>
                <View
                  style={[
                    styles.muscleDot,
                    { backgroundColor: getMuscleStatusColor(muscle.status) },
                  ]}
                />
                <View style={styles.muscleInfo}>
                  <Text style={styles.muscleName}>{muscle.muscle}</Text>
                  <Text style={styles.muscleDays}>
                    {muscle.daysSinceTraining.toFixed(1)}d ago
                  </Text>
                </View>
              </View>
            ))}
          </View>
          
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#22c55e' }]} />
              <Text style={styles.legendText}>Fresh</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
              <Text style={styles.legendText}>Recovering</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
              <Text style={styles.legendText}>Fatigued</Text>
            </View>
          </View>
        </View>
      )}

      {/* Expand Indicator */}
      {status.muscleGroups.length > 0 && (
        <View style={styles.expandRow}>
          <Text style={styles.expandText}>
            {expanded ? 'Hide' : 'Show'} muscle breakdown
          </Text>
          <ChevronRight
            size={14}
            color="#64748b"
            style={{
              transform: [{ rotate: expanded ? '90deg' : '0deg' }],
            }}
          />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerText: {
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#cbd5e1',
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerRight: {
    alignItems: 'center',
  },
  score: {
    fontSize: 28,
    fontWeight: '700',
  },
  scoreLabel: {
    fontSize: 11,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressBarContainer: {
    marginVertical: 4,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#0f172a',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  recommendation: {
    fontSize: 14,
    color: '#e2e8f0',
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 8,
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  statLabel: {
    fontSize: 10,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  muscleSection: {
    marginTop: 8,
    gap: 12,
  },
  muscleSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  muscleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  muscleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 8,
    paddingHorizontal: 12,
    minWidth: '45%',
  },
  muscleDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  muscleInfo: {
    flex: 1,
  },
  muscleName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f1f5f9',
    textTransform: 'capitalize',
  },
  muscleDays: {
    fontSize: 11,
    color: '#64748b',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  expandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  expandText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
});

