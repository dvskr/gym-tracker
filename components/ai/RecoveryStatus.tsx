import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/utils/logger';
import { View, Text, StyleSheet, Pressable, TouchableOpacity } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { ChevronRight, RefreshCw } from 'lucide-react-native';
import { recoveryService, RecoveryStatus as RecoveryStatusType } from '@/lib/ai/recoveryService';
import { getCachedData, setCacheData } from '@/lib/ai/prefetch';
import { useAuthStore } from '@/stores/authStore';
import { RecoveryStatusSkeleton } from './RecoveryStatusSkeleton';
import { AIFeedback } from './AIFeedback';

export function RecoveryStatus() {
  const { user } = useAuthStore();
  
  // Try to get cached data immediately
  const [status, setStatus] = useState<RecoveryStatusType | null>(() => {
    if (!user) return null;
    return getCachedData<RecoveryStatusType>(user.id, 'recovery');
  });
  
  const [hasFetched, setHasFetched] = useState(() => {
    // If we got cached data, we've already fetched
    if (!user) return false;
    const cached = getCachedData<RecoveryStatusType>(user.id, 'recovery');
    return cached !== null && cached !== undefined;
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const fetchStatus = useCallback(async (forceRefresh = false) => {
    if (!user) {
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    try {
      if (forceRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const result = await recoveryService.getRecoveryStatus(user.id);
      setStatus(result);
      setHasFetched(true);
      
      // Cache the result
      setCacheData(user.id, 'recovery', result);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch recovery status';
      setError(errorMessage);
      setHasFetched(true);
 logger.error('Failed to fetch recovery status:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    // Only fetch if we haven't fetched before
    if (user && !hasFetched) {
      fetchStatus();
    }
  }, [user, hasFetched, fetchStatus]);

  const handleRefresh = () => {
    fetchStatus(true);
  };

  const getStatusColor = () => {
    if (!status) return '#6b7280';
    switch (status.overall) {
      case 'recovered':
        return '#10b981';
      case 'moderate':
        return '#60a5fa';
      case 'fatigued':
        return '#f59e0b';
      case 'overtrained':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStatusEmoji = () => {
    if (!status) return '💪';
    switch (status.overall) {
      case 'recovered':
        return '💪';
      case 'moderate':
        return '💪';
      case 'fatigued':
        return '⚠️';
      case 'overtrained':
        return '😴';
    }
  };

  const getStatusTitle = () => {
    if (!status) return 'Loading';
    switch (status.overall) {
      case 'recovered':
        return 'Ready to Train';
      case 'moderate':
        return 'Good to Go';
      case 'fatigued':
        return 'Take It Easy';
      case 'overtrained':
        return 'Rest Day';
      default:
        return 'Unknown';
    }
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
    return <RecoveryStatusSkeleton />;
  }

  // Error state with retry
  if (error && !status) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => fetchStatus()} style={styles.retryButton}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!status) return null;

  return (
    <View style={styles.container}>
      {/* Header with label and refresh */}
      <View style={styles.header}>
        <Text style={styles.label}>YOUR STATUS</Text>
        <TouchableOpacity 
          onPress={handleRefresh} 
          disabled={isRefreshing}
          style={styles.refreshButton}
        >
          <RefreshCw 
            size={16} 
            color={isRefreshing ? '#475569' : '#60a5fa'} 
            style={isRefreshing ? { opacity: 0.5 } : undefined}
          />
        </TouchableOpacity>
      </View>
      
      {/* Main Content with Recovery Ring */}
      <View style={styles.mainContent}>
        {/* Recovery Ring */}
        <View style={styles.ringContainer}>
          <Svg width={80} height={80}>
            {/* Background circle */}
            <Circle
              cx={40}
              cy={40}
              r={35}
              stroke="#334155"
              strokeWidth={6}
              fill="transparent"
            />
            {/* Progress circle */}
            <Circle
              cx={40}
              cy={40}
              r={35}
              stroke={getStatusColor()}
              strokeWidth={6}
              fill="transparent"
              strokeDasharray={`${Math.max(0, Math.min(100, status.score)) / 100 * 220} 220`}
              strokeLinecap="round"
              transform="rotate(-90 40 40)"
            />
          </Svg>
          <View style={styles.ringCenter}>
            <Text style={styles.scoreText}>{Math.round(status.score)}</Text>
          </View>
        </View>

        {/* Status Info */}
        <View style={styles.statusInfo}>
          <View style={styles.statusTitleRow}>
            <Text style={styles.emoji}>{getStatusEmoji()}</Text>
            <Text style={[styles.statusTitle, { color: getStatusColor() }]}>
              {getStatusTitle()}
            </Text>
          </View>
          <Text style={styles.message}>{getStatusMessage()}</Text>
        </View>
      </View>
      
      {/* Suggested Focus - NEW */}
      {status.suggestedFocus && status.suggestedFocus !== 'Rest Day' && (
        <View style={styles.suggestedFocusContainer}>
          <Text style={styles.suggestedFocusLabel}>SUGGESTED TODAY</Text>
          <Text style={styles.suggestedFocusValue}>{status.suggestedFocus}</Text>
          {status.readyToTrain && status.readyToTrain.length > 0 && (
            <Text style={styles.readyMuscles}>
              Ready: {status.readyToTrain.slice(0, 4).join(', ')}
              {status.readyToTrain.length > 4 && ` +${status.readyToTrain.length - 4} more`}
            </Text>
          )}
        </View>
      )}

      {/* Stats row - inline, with units */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{status.consecutiveDays}</Text>
          <Text style={styles.statLabel}>days straight</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {Math.min(status.workoutsThisWeek, 14)}
          </Text>
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

      {/* Feedback */}
      <View style={styles.feedbackContainer}>
        <AIFeedback 
          feature="recovery" 
          context={{ 
            status: status.overall,
            score: status.score
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e293b',
    marginHorizontal: 8,
    marginTop: 24,
    marginBottom: 32,
    borderRadius: 12,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  refreshButton: {
    padding: 6,
  },
  errorContainer: {
    backgroundColor: '#451a1a',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  retryText: {
    color: '#60a5fa',
    fontWeight: '600',
    fontSize: 14,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mainContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  ringContainer: {
    position: 'relative',
    width: 80,
    height: 80,
    marginRight: 16,
  },
  ringCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    color: '#f1f5f9',
    fontSize: 24,
    fontWeight: '700',
  },
  statusInfo: {
    flex: 1,
  },
  statusTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  emoji: {
    fontSize: 24,
    marginRight: 8,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  message: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#334155',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  suggestedFocusContainer: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    alignItems: 'center',
  },
  suggestedFocusLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  suggestedFocusValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#60a5fa',
  },
  readyMuscles: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'center',
  },
  muscleSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
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
    backgroundColor: '#0f172a',
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
  feedbackContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    alignItems: 'center',
  },
});

