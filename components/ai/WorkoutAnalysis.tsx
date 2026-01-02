import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/utils/logger';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {
  Sparkles,
  Flame,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Check,
  ArrowRight,
  Lightbulb,
  Trophy,
  RefreshCw,
} from 'lucide-react-native';
import { workoutAnalysisService, WorkoutAnalysis as WorkoutAnalysisType } from '@/lib/ai/workoutAnalysis';
import { useAuthStore } from '@/stores/authStore';
import { AIFeedback } from './AIFeedback';

interface WorkoutAnalysisProps {
  workout: any;
}

export function WorkoutAnalysis({ workout }: WorkoutAnalysisProps) {
  const [analysis, setAnalysis] = useState<WorkoutAnalysisType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  const fetchAnalysis = useCallback(async (forceRefresh = false) => {
    if (!user) return;

    try {
      if (forceRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const result = await workoutAnalysisService.analyzeWorkout(workout, user.id, forceRefresh);
      setAnalysis(result);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to analyze workout';
      setError(errorMessage);
 logger.error('Failed to analyze workout:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [workout, user]);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  const handleRefresh = () => {
    fetchAnalysis(true);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Sparkles size={32} color="#f59e0b" />
        <Text style={styles.loadingTitle}>Analyzing your workout...</Text>
        <ActivityIndicator size="large" color="#3b82f6" style={styles.loader} />
        <Text style={styles.loadingSubtext}>Crunching the numbers</Text>
      </View>
    );
  }

  // Error state with retry
  if (error && !analysis) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => fetchAnalysis()} style={styles.retryButton}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!analysis) return null;

  const getVolumeIcon = () => {
    switch (analysis.volumeComparison) {
      case 'higher':
        return <TrendingUp size={18} color="#22c55e" />;
      case 'lower':
        return <TrendingDown size={18} color="#ef4444" />;
      case 'same':
        return <Minus size={18} color="#94a3b8" />;
      default:
        return <Sparkles size={18} color="#f59e0b" />;
    }
  };

  const getVolumeColor = () => {
    switch (analysis.volumeComparison) {
      case 'higher':
        return '#22c55e';
      case 'lower':
        return '#ef4444';
      default:
        return '#94a3b8';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Sparkles size={20} color="#f59e0b" />
        <Text style={styles.title}>AI Workout Analysis</Text>
      </View>

      {/* Summary */}
      <Text style={styles.summary}>{analysis.summary}</Text>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Flame size={20} color="#ef4444" />
          <Text style={styles.statValue}>{analysis.estimatedCalories}</Text>
          <Text style={styles.statLabel}>calories</Text>
        </View>

        <View style={styles.stat}>
          {getVolumeIcon()}
          <Text style={[styles.statValue, { color: getVolumeColor() }]}>
            {analysis.volumeComparison === 'higher'
              ? '� '
              : analysis.volumeComparison === 'lower'
              ? '� '
              : analysis.volumeComparison === 'same'
              ? '='
              : '—'}
          </Text>
          <Text style={styles.statLabel}>volume</Text>
        </View>

        <View style={styles.stat}>
          <Target size={20} color="#3b82f6" />
          <Text style={styles.statValue}>{analysis.musclesWorked.length}</Text>
          <Text style={styles.statLabel}>
            muscle{analysis.musclesWorked.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {analysis.personalRecordsAchieved !== undefined && analysis.personalRecordsAchieved > 0 && (
          <View style={styles.stat}>
            <Trophy size={20} color="#f59e0b" />
            <Text style={[styles.statValue, { color: '#f59e0b' }]}>
              {analysis.personalRecordsAchieved}
            </Text>
            <Text style={styles.statLabel}>PR{analysis.personalRecordsAchieved > 1 ? 's' : ''}</Text>
          </View>
        )}
      </View>

      {/* Highlights */}
      {analysis.highlights.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>�x� Highlights</Text>
          </View>
          <View style={styles.bulletList}>
            {analysis.highlights.map((highlight, index) => (
              <View key={index} style={styles.bulletRow}>
                <View style={styles.checkCircle}>
                  <Check size={12} color="#22c55e" />
                </View>
                <Text style={styles.bulletText}>{highlight}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Improvements */}
      {analysis.improvements.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>�x� Areas for Growth</Text>
          </View>
          <View style={styles.bulletList}>
            {analysis.improvements.map((improvement, index) => (
              <View key={index} style={styles.bulletRow}>
                <View style={styles.arrowCircle}>
                  <ArrowRight size={12} color="#f59e0b" />
                </View>
                <Text style={styles.bulletText}>{improvement}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Next Workout Tip */}
      <View style={styles.tipBox}>
        <View style={styles.tipIcon}>
          <Lightbulb size={18} color="#f59e0b" />
        </View>
        <View style={styles.tipContent}>
          <Text style={styles.tipLabel}>Next Workout Tip</Text>
          <Text style={styles.tipText}>{analysis.nextWorkoutTip}</Text>
        </View>
      </View>

      {/* Muscles Worked */}
      {analysis.musclesWorked.length > 0 && (
        <View style={styles.musclesSection}>
          <Text style={styles.musclesLabel}>Muscles Trained:</Text>
          <View style={styles.muscleTagsContainer}>
            {analysis.musclesWorked.map((muscle, index) => (
              <View key={index} style={styles.muscleTag}>
                <Text style={styles.muscleTagText}>{muscle}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Refresh Footer */}
      <View style={styles.footer}>
        <TouchableOpacity 
          onPress={handleRefresh} 
          disabled={isRefreshing}
          style={styles.refreshLink}
        >
          <RefreshCw 
            size={14} 
            color={isRefreshing ? '#475569' : '#60a5fa'} 
            style={isRefreshing ? { opacity: 0.5 } : undefined}
          />
          <Text style={[styles.refreshLinkText, isRefreshing && { opacity: 0.5 }]}>
            {isRefreshing ? 'Refreshing...' : 'Get fresh analysis'}
          </Text>
        </TouchableOpacity>
        
        {/* Feedback */}
        <AIFeedback 
          feature="analysis" 
          context={{ 
            workoutId: workout.id,
            totalVolume: analysis?.totalVolume
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    marginVertical: 20,
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f1f5f9',
    marginTop: 8,
  },
  loader: {
    marginVertical: 12,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#94a3b8',
  },
  container: {
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    marginVertical: 20,
    borderRadius: 16,
    padding: 20,
    gap: 20,
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f59e0b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f1f5f9',
    lineHeight: 24,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  statLabel: {
    fontSize: 11,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#cbd5e1',
  },
  bulletList: {
    gap: 10,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#22c55e20',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  arrowCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#f59e0b20',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: '#e2e8f0',
    lineHeight: 20,
  },
  tipBox: {
    flexDirection: 'row',
    backgroundColor: '#f59e0b20',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  tipIcon: {
    marginTop: 2,
  },
  tipContent: {
    flex: 1,
    gap: 4,
  },
  tipLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f59e0b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tipText: {
    fontSize: 14,
    color: '#f1f5f9',
    lineHeight: 20,
    fontWeight: '500',
  },
  musclesSection: {
    gap: 10,
  },
  musclesLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  muscleTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  muscleTag: {
    backgroundColor: '#3b82f620',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#3b82f640',
  },
  muscleTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
    textTransform: 'capitalize',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  refreshLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  refreshLinkText: {
    fontSize: 13,
    color: '#60a5fa',
    fontWeight: '500',
  },
});
