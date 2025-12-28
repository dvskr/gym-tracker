import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Sparkles, RefreshCw, Dumbbell } from 'lucide-react-native';
import { workoutSuggestionService, WorkoutSuggestion as WorkoutSuggestionType } from '@/lib/ai/workoutSuggestions';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { Button } from '@/components/ui';

export function WorkoutSuggestion() {
  const [suggestion, setSuggestion] = useState<WorkoutSuggestionType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useAuthStore();
  const settings = useSettingsStore();

  // Check if AI is enabled (you can add this to settings store)
  const aiEnabled = true; // For now, always enabled (uses fallback if AI unavailable)

  const fetchSuggestion = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await workoutSuggestionService.getSuggestion(user.id);
      setSuggestion(result);
    } catch (err) {
      console.error('Error fetching suggestion:', err);
      setError('Could not get workout suggestion');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && aiEnabled) {
      fetchSuggestion();
    }
  }, [user, aiEnabled]);

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

  const customizeSuggestion = () => {
    if (!suggestion) return;

    // Navigate to template creation with suggested exercises
    router.push({
      pathname: '/templates/create',
      params: {
        name: suggestion.type,
        exercises: JSON.stringify(suggestion.exercises),
      },
    } as any);
  };

  if (!aiEnabled || !user) return null;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContent}>
          <View style={styles.loadingRow}>
            <Sparkles size={20} color="#f59e0b" />
            <Text style={styles.loadingText}>Getting workout suggestion...</Text>
          </View>
          <ActivityIndicator size="small" color="#3b82f6" style={styles.loadingSpinner} />
        </View>
      </View>
    );
  }

  if (error && !suggestion) {
    return null; // Silently fail - not critical
  }

  if (!suggestion) return null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Sparkles size={20} color="#f59e0b" />
          <Text style={styles.title}>AI Suggests for Today</Text>
        </View>
        <Pressable 
          onPress={fetchSuggestion}
          style={styles.refreshButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <RefreshCw size={16} color="#94a3b8" />
        </Pressable>
      </View>

      {/* Workout Type */}
      <View style={styles.workoutTypeContainer}>
        <Dumbbell size={24} color="#3b82f6" />
        <Text style={styles.workoutType}>{suggestion.type}</Text>
      </View>

      {/* Reason */}
      <Text style={styles.reason}>{suggestion.reason}</Text>

      {/* Exercises */}
      <View style={styles.exercises}>
        <Text style={styles.exercisesLabel}>Suggested Exercises:</Text>
        {suggestion.exercises.slice(0, 5).map((ex, i) => (
          <View key={i} style={styles.exerciseRow}>
            <View style={styles.exerciseNumberCircle}>
              <Text style={styles.exerciseNumber}>{i + 1}</Text>
            </View>
            <Text style={styles.exerciseName} numberOfLines={1}>
              {ex.name}
            </Text>
            <Text style={styles.exerciseSets}>
              {ex.sets} × {ex.reps}
            </Text>
          </View>
        ))}
      </View>

      {/* Confidence Badge */}
      {suggestion.confidence === 'high' && (
        <View style={styles.confidenceBadge}>
          <Sparkles size={12} color="#f59e0b" />
          <Text style={styles.confidenceText}>High confidence</Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          title="Start This Workout"
          onPress={startSuggestedWorkout}
          style={styles.primaryButton}
        />
        <Pressable onPress={customizeSuggestion} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Customize</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#f59e0b',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 15,
    color: '#94a3b8',
    fontWeight: '600',
  },
  loadingSpinner: {
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f59e0b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  refreshButton: {
    padding: 4,
  },
  workoutTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  workoutType: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  reason: {
    fontSize: 15,
    color: '#cbd5e1',
    lineHeight: 22,
    marginBottom: 20,
  },
  exercises: {
    gap: 10,
    marginBottom: 16,
  },
  exercisesLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
    gap: 12,
  },
  exerciseNumberCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  exerciseName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  exerciseSets: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#f59e0b20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 16,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f59e0b',
  },
  actions: {
    gap: 12,
  },
  primaryButton: {
    width: '100%',
  },
  secondaryButton: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#475569',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#cbd5e1',
  },
});

