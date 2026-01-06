import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/utils/logger';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Sparkles, TrendingUp, Target } from 'lucide-react-native';
import { progressiveOverloadService, SetRecommendation } from '@/lib/ai/progressiveOverload';
import { useAuthStore } from '@/stores/authStore';

interface WeightRecommendationProps {
  exerciseId: string;
  exerciseName: string;
  setNumber: number;
  targetReps?: number;
  onApply: (weight: number, reps: number) => void;
  compact?: boolean;
}

export function WeightRecommendation({
  exerciseId,
  exerciseName,
  setNumber,
  targetReps,
  onApply,
  compact = false,
}: WeightRecommendationProps) {
  const [recommendation, setRecommendation] = useState<SetRecommendation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);
  const { user } = useAuthStore();

  const fetchRecommendation = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const rec = await progressiveOverloadService.getRecommendation(
        user.id,
        exerciseId,
        exerciseName,
        setNumber,
        targetReps
      );
      setRecommendation(rec);
    } catch (error: unknown) {
 logger.error('Failed to get recommendation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendation();
  }, [exerciseId, setNumber]);

  if (isLoading) {
    return (
      <View style={[styles.container, compact && styles.containerCompact]}>
        <ActivityIndicator size="small" color="#f59e0b" />
      </View>
    );
  }

  if (!recommendation || recommendation.weight === 0) {
    return null;
  }

  const handleApply = () => {
    onApply(recommendation.weight, recommendation.reps);
  };

  const getProgressIcon = () => {
    switch (recommendation.progressType) {
      case 'weight':
        return <TrendingUp size={14} color="#22c55e" />;
      case 'reps':
        return <Target size={14} color="#3b82f6" />;
      default:
        return <Sparkles size={14} color="#f59e0b" />;
    }
  };

  const getConfidenceColor = () => {
    switch (recommendation.confidence) {
      case 'high':
        return '#22c55e';
      case 'medium':
        return '#f59e0b';
      default:
        return '#94a3b8';
    }
  };

  if (compact) {
    return (
      <Pressable 
        style={[styles.container, styles.containerCompact]}
        onPress={handleApply}
      >
        {getProgressIcon()}
        <Text style={styles.textCompact}>
          {recommendation.weight} × {recommendation.reps}
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.container}>
      <Pressable 
        style={[styles.badge, { borderColor: getConfidenceColor() }]}
        onPress={() => setShowReasoning(!showReasoning)}
        onLongPress={handleApply}
      >
        <View style={styles.badgeContent}>
          {getProgressIcon()}
          <Text style={styles.recommendText}>
            Try {recommendation.weight}lbs × {recommendation.reps}
          </Text>
          <View style={[styles.confidenceDot, { backgroundColor: getConfidenceColor() }]} />
        </View>
        <Text style={styles.applyHint}>Long press to apply</Text>
      </Pressable>

      {showReasoning && (
        <View style={styles.reasoningBox}>
          <Text style={styles.reasoningText}>{recommendation.reasoning}</Text>
          <Pressable style={styles.applyButton} onPress={handleApply}>
            <Text style={styles.applyButtonText}>Apply ✅</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// Simpler badge version for inline use
export function WeightRecommendationBadge({
  exerciseId,
  exerciseName,
  setNumber,
  targetReps,
  onApply,
}: WeightRecommendationProps) {
  const [recommendation, setRecommendation] = useState<SetRecommendation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    async function fetch() {
      if (!user) return;
      
      setIsLoading(true);
      try {
        const rec = await progressiveOverloadService.getRecommendation(
          user.id,
          exerciseId,
          exerciseName,
          setNumber,
          targetReps
        );
        setRecommendation(rec);
      } catch (error: unknown) {
 logger.error('Failed to get recommendation:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetch();
  }, [exerciseId, setNumber]);

  if (isLoading) {
    return (
      <View style={styles.inlineBadge}>
        <ActivityIndicator size="small" color="#f59e0b" />
      </View>
    );
  }

  if (!recommendation || recommendation.weight === 0) {
    return null;
  }

  return (
    <Pressable 
      style={styles.inlineBadge}
      onPress={() => onApply(recommendation.weight, recommendation.reps)}
    >
      <Sparkles size={12} color="#f59e0b" />
      <Text style={styles.inlineBadgeText}>
        {recommendation.weight} × {recommendation.reps}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  containerCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f59e0b15',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  textCompact: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f59e0b',
  },
  badge: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    borderWidth: 1.5,
    padding: 10,
    paddingVertical: 8,
  },
  badgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  recommendText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  confidenceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  applyHint: {
    fontSize: 11,
    color: '#64748b',
    fontStyle: 'italic',
  },
  reasoningBox: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
    gap: 10,
  },
  reasoningText: {
    fontSize: 13,
    color: '#cbd5e1',
    lineHeight: 18,
  },
  applyButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  inlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f59e0b20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#f59e0b40',
  },
  inlineBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f59e0b',
  },
});



