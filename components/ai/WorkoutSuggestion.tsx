import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/utils/logger';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { RefreshCw } from 'lucide-react-native';
import { workoutSuggestionService, WorkoutSuggestion as WorkoutSuggestionType } from '@/lib/ai/workoutSuggestions';
import { getCachedData, setCacheData } from '@/lib/ai/prefetch';
import { useAuthStore } from '@/stores/authStore';
import { WorkoutSuggestionSkeleton } from './WorkoutSuggestionSkeleton';
import { AIFeedback } from './AIFeedback';

export function WorkoutSuggestion() {
  const { user } = useAuthStore();
  const router = useRouter();
  
  // Try to get cached data immediately
  const [suggestion, setSuggestion] = useState<WorkoutSuggestionType | null>(() => {
    if (!user) return null;
    return getCachedData<WorkoutSuggestionType>(user.id, 'suggestion');
  });
  
  const [isLoading, setIsLoading] = useState(!suggestion);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestion = useCallback(async (forceRefresh = false) => {
    if (!user) return;
    
    try {
      if (forceRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      
      const result = await workoutSuggestionService.getSuggestion(user.id, forceRefresh);
      setSuggestion(result);
      
      // Cache the result
      setCacheData(user.id, 'suggestion', result);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to get suggestion';
      setError(errorMessage);
      logger.error('Error fetching suggestion:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    // Only fetch if we don't have cached data
    if (user && !suggestion) {
      fetchSuggestion();
    }
  }, [user, suggestion, fetchSuggestion]);

  const handleRefresh = () => {
    fetchSuggestion(true);
  };

  const startSuggestedWorkout = () => {
    if (!suggestion) return;

    // Navigate to start workout with suggested name
    router.push({
      pathname: '/workout/start',
      params: {
        suggestedName: suggestion.type,
        suggestedExercises: JSON.stringify(suggestion.exercises),
      },
    } as any);
  };

  // Helper to clean markdown from exercise names
  const cleanExerciseName = (name: string) => {
    return name.replace(/\*\*/g, '').trim();
  };

  if (!user) return null;

  // Error state with retry
  if (error && !suggestion) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => fetchSuggestion()} style={styles.retryButton}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (isLoading) {
    return <WorkoutSuggestionSkeleton />;
  }

  if (!suggestion) return null;

  return (
    <View style={styles.container}>
      {/* Header with label and refresh */}
      <View style={styles.header}>
        <Text style={styles.label}>Today</Text>
        <TouchableOpacity 
          onPress={handleRefresh} 
          disabled={isRefreshing}
          style={styles.refreshButton}
        >
          <RefreshCw 
            size={18} 
            color={isRefreshing ? '#475569' : '#60a5fa'} 
            style={isRefreshing ? { opacity: 0.5 } : undefined}
          />
        </TouchableOpacity>
      </View>
      
      {/* Workout title - clean, no extra text */}
      <Text style={styles.workoutTitle}>
        {suggestion.type}
      </Text>
      
      {/* Subtitle */}
      <Text style={styles.subtitle}>
        {suggestion.reason || 'Based on your training history'}
      </Text>
      
      {/* Exercise list - clean, no numbered circles */}
      <View style={styles.exercises}>
        {suggestion.exercises.slice(0, 5).map((ex, i) => (
          <View key={i} style={styles.exerciseRow}>
            <Text style={styles.exerciseName} numberOfLines={1}>
              {cleanExerciseName(ex.name)}
            </Text>
            <Text style={styles.exerciseSets}>
              {ex.sets} Ã— {ex.reps}
            </Text>
          </View>
        ))}
      </View>
      
      {/* Clean button */}
      <Pressable
        onPress={startSuggestedWorkout}
        style={({ pressed }) => [
          styles.startButton,
          pressed && styles.startButtonPressed
        ]}
      >
        <Text style={styles.startButtonText}>Start Workout</Text>
      </Pressable>

      {/* Feedback */}
      <View style={styles.feedbackContainer}>
        <AIFeedback 
          feature="workout_suggestion" 
          context={{ 
            workoutType: suggestion.type,
            exerciseCount: suggestion.exercises.length
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e293b',
    marginHorizontal: 0,
    borderRadius: 16,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  workoutTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
    marginBottom: 20,
  },
  exercises: {
    gap: 12,
    marginBottom: 24,
  },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseName: {
    flex: 1,
    fontSize: 15,
    color: '#cbd5e1',
    fontWeight: '500',
  },
  exerciseSets: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
    marginLeft: 12,
  },
  startButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  startButtonPressed: {
    backgroundColor: '#2563eb',
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  feedbackContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    alignItems: 'center',
  },
});

