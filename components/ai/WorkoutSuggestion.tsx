import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { workoutSuggestionService, WorkoutSuggestion as WorkoutSuggestionType } from '@/lib/ai/workoutSuggestions';
import { useAuthStore } from '@/stores/authStore';

export function WorkoutSuggestion() {
  const [suggestion, setSuggestion] = useState<WorkoutSuggestionType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { user } = useAuthStore();

  const fetchSuggestion = async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      const result = await workoutSuggestionService.getSuggestion(user.id);
      setSuggestion(result);
    } catch (err) {
      console.error('Error fetching suggestion:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSuggestion();
    }
  }, [user]);

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

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="small" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!suggestion) return null;

  return (
    <View style={styles.container}>
      {/* Simple label */}
      <Text style={styles.label}>Today</Text>
      
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
              {ex.sets} × {ex.reps}
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
  loadingContent: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
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
});

