import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
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

  const getStatusEmoji = () => {
    if (!status) return '💪';
    switch (status.overall) {
      case 'recovered':
        return '💪';
      case 'moderate':
        return '😊';
      case 'fatigued':
        return '😴';
      case 'overtrained':
        return '😴';
    }
  };

  const getStatusTitle = () => {
    if (!status) return 'Loading';
    const isRestDay = status.suggestedAction === 'rest' || status.overall === 'overtrained';
    
    if (isRestDay) {
      return 'Rest Day';
    }
    return 'Ready to Train';
  };

  const getStatusMessage = () => {
    if (!status) return '';
    
    const isRestDay = status.suggestedAction === 'rest' || status.overall === 'overtrained';
    
    if (isRestDay) {
      if (status.consecutiveDays >= 2) {
        return `You've trained ${status.consecutiveDays} days in a row. Recovery is when muscles grow!`;
      }
      return 'Your body needs recovery. Rest is part of the training!';
    }
    
    return status.recommendation || 'You\'re well rested and ready to go.';
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
    <View style={styles.container}>
      {/* Simple label */}
      <Text style={styles.label}>Your Status</Text>
      
      {/* Status with friendly emoji */}
      <View style={styles.statusRow}>
        <Text style={styles.emoji}>{getStatusEmoji()}</Text>
        <Text style={styles.statusTitle}>{getStatusTitle()}</Text>
      </View>
      
      {/* Helpful message - positive framing */}
      <Text style={styles.message}>{getStatusMessage()}</Text>
      
      {/* Stats row - inline, with units */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{status.consecutiveDays}</Text>
          <Text style={styles.statLabel}>days straight</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{status.workoutsThisWeek}</Text>
          <Text style={styles.statLabel}>
            {status.workoutsThisWeek === 1 ? 'workout' : 'workouts'} this week
          </Text>
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
        <Pressable
          style={styles.expandButton}
          onPress={() => setExpanded(!expanded)}
        >
          <Text style={styles.expandText}>
            {expanded ? 'Hide' : 'Show'} muscle breakdown
          </Text>
          <ChevronRight
            size={16}
            color="#64748b"
            style={{
              transform: [{ rotate: expanded ? '90deg' : '0deg' }],
            }}
          />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    backgroundColor: '#111827',
    marginHorizontal: 8,
    marginTop: 24,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#111827',
    marginHorizontal: 8,
    marginTop: 24,
    marginBottom: 32,
    borderRadius: 16,
    padding: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  emoji: {
    fontSize: 28,
    marginRight: 8,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  message: {
    fontSize: 14,
    color: '#9ca3af',
    lineHeight: 20,
    marginTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
  },
  stat: {
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#1f2937',
    marginHorizontal: 16,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  muscleSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
  },
  muscleSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
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
    backgroundColor: '#1f2937',
    borderRadius: 8,
    padding: 10,
    minWidth: '48%',
  },
  muscleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  muscleInfo: {
    flex: 1,
  },
  muscleName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f3f4f6',
    textTransform: 'capitalize',
  },
  muscleDays: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 12,
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
    color: '#9ca3af',
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  expandText: {
    fontSize: 12,
    color: '#6b7280',
    marginRight: 4,
  },
});

