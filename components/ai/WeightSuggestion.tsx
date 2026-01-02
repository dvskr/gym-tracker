import React, { useEffect, useState } from 'react';
import { logger } from '@/lib/utils/logger';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { TrendingUp, TrendingDown, Minus, X } from 'lucide-react-native';
import { progressiveOverloadService } from '@/lib/ai/progressiveOverload';
import { lightHaptic } from '@/lib/utils/haptics';

export interface ProgressionSuggestion {
  recommendation: 'increase_weight' | 'increase_reps' | 'maintain' | 'deload';
  suggestedWeight: number;
  suggestedReps: string | number;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
}

interface WeightSuggestionProps {
  exerciseId: string;
  exerciseName: string;
  setNumber: number;
  currentWeight: number;
  onApplyWeight: (weight: number) => void;
  onApplyReps: (reps: number) => void;
  units?: 'lbs' | 'kg';
  userId: string;
}

export function WeightSuggestion({ 
  exerciseId, 
  exerciseName,
  setNumber,
  currentWeight, 
  onApplyWeight,
  onApplyReps,
  units = 'lbs',
  userId,
}: WeightSuggestionProps) {
  const [suggestion, setSuggestion] = useState<ProgressionSuggestion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    async function loadSuggestion() {
      try {
        setIsLoading(true);
        const result = await progressiveOverloadService.getRecommendation(
          userId,
          exerciseId,
          exerciseName,
          setNumber
        );
        
        if (mounted) {
          // Only show suggestion if it's not just "maintain"
          if (result && result.progressType !== 'maintain') {
            setSuggestion({
              recommendation: result.progressType === 'weight' ? 'increase_weight' : 'increase_reps',
              suggestedWeight: result.weight,
              suggestedReps: result.reps,
              reason: result.reasoning,
              confidence: result.confidence,
            });
          }
          setIsLoading(false);
        }
      } catch (error) {
        logger.error('Failed to load weight suggestion:', error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    }
    
    loadSuggestion();
    
    return () => { mounted = false; };
  }, [exerciseId, userId, setNumber, exerciseName]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#3b82f6" />
        <Text style={styles.loadingText}>Analyzing...</Text>
      </View>
    );
  }

  if (!suggestion || dismissed) return null;

  const getIcon = () => {
    switch (suggestion.recommendation) {
      case 'increase_weight':
        return <TrendingUp size={14} color="#10b981" />;
      case 'deload':
        return <TrendingDown size={14} color="#f59e0b" />;
      case 'increase_reps':
        return <TrendingUp size={14} color="#3b82f6" />;
      default:
        return <Minus size={14} color="#6b7280" />;
    }
  };

  const getMessage = () => {
    switch (suggestion.recommendation) {
      case 'increase_weight':
        return `Ready for ${suggestion.suggestedWeight}${units}`;
      case 'increase_reps':
        return `Try ${suggestion.suggestedReps} reps`;
      case 'deload':
        return `Consider ${suggestion.suggestedWeight}${units}`;
      default:
        return null;
    }
  };

  const handleApply = () => {
    lightHaptic();
    if (suggestion.recommendation === 'increase_weight' || suggestion.recommendation === 'deload') {
      onApplyWeight(suggestion.suggestedWeight);
    } else if (suggestion.recommendation === 'increase_reps') {
      const reps = typeof suggestion.suggestedReps === 'string' 
        ? parseInt(suggestion.suggestedReps.split('-')[0]) 
        : suggestion.suggestedReps;
      onApplyReps(reps);
    }
  };

  const handleDismiss = () => {
    lightHaptic();
    setDismissed(true);
  };

  const message = getMessage();
  if (!message) return null;

  const iconColor = suggestion.recommendation === 'increase_weight' ? '#10b981' :
                   suggestion.recommendation === 'increase_reps' ? '#3b82f6' :
                   suggestion.recommendation === 'deload' ? '#f59e0b' : '#6b7280';

  return (
    <View style={[
      styles.container,
      suggestion.recommendation === 'increase_weight' && styles.containerGreen,
      suggestion.recommendation === 'increase_reps' && styles.containerBlue,
      suggestion.recommendation === 'deload' && styles.containerOrange,
    ]}>
      <View style={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: `${iconColor}20` }]}>
          {getIcon()}
        </View>
        <Text style={styles.message}>{message}</Text>
        <TouchableOpacity 
          onPress={handleApply}
          style={[styles.applyButton, { backgroundColor: iconColor }]}
          activeOpacity={0.8}
        >
          <Text style={styles.applyText}>Apply</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity 
        onPress={handleDismiss}
        style={styles.dismissButton}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <X size={14} color="#6b7280" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  containerGreen: {
    borderLeftColor: '#10b981',
  },
  containerBlue: {
    borderLeftColor: '#3b82f6',
  },
  containerOrange: {
    borderLeftColor: '#f59e0b',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    color: '#cbd5e1',
    fontSize: 13,
    flex: 1,
    fontWeight: '500',
  },
  applyButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  applyText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  dismissButton: {
    padding: 4,
    marginLeft: 8,
  },
});

