import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Trophy, Clock, Dumbbell, TrendingUp, Star, Flame } from 'lucide-react-native';
import { Button, Card } from '@/components/ui';
import { supabase } from '@/lib/supabase';

export default function WorkoutCompleteScreen() {
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();
  
  // Workout data
  const [workout, setWorkout] = useState<any>(null);
  const [workoutName, setWorkoutName] = useState('');
  const [rating, setRating] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  // Animations
  const [scaleAnim] = useState(new Animated.Value(0));
  const [fadeAnim] = useState(new Animated.Value(0));

  // Fetch workout details
  useEffect(() => {
    if (workoutId) {
      fetchWorkoutDetails();
    }
  }, [workoutId]);

  // Run animations on mount
  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const fetchWorkoutDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('workouts')
        .select(`
          *,
          workout_exercises (
            id,
            exercise_id
          )
        `)
        .eq('id', workoutId)
        .single();

      if (!error && data) {
        setWorkout(data);
        setWorkoutName(data.name || 'Morning Workout');
        setRating(data.rating || 0);
      }
    } catch (error) {
      console.error('Failed to fetch workout:', error);
    }
  };

  // Format duration
  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);

    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins} min`;
  };

  // Handle star rating
  const handleRating = useCallback((value: number) => {
    setRating(value === rating ? 0 : value);
  }, [rating]);

  // Handle save workout
  const handleSaveWorkout = async () => {
    if (!workoutId) {
      router.replace('/(tabs)');
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('workouts')
        .update({
          name: workoutName.trim() || 'Workout',
          rating: rating || null,
        })
        .eq('id', workoutId);

      if (error) throw error;

      // Navigate to home
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Failed to save workout:', error);
      Alert.alert('Error', 'Failed to save workout details. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Get exercise count
  const exerciseCount = workout?.workout_exercises?.length || 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Trophy Animation */}
        <Animated.View
          style={[
            styles.trophyContainer,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          <View style={styles.trophyCircle}>
            <Trophy size={56} color="#fbbf24" />
          </View>
          <View style={styles.confetti}>
            <Text style={styles.confettiEmoji}>🎉</Text>
          </View>
        </Animated.View>

        {/* Congratulations Text */}
        <Animated.View style={[styles.textContainer, { opacity: fadeAnim }]}>
          <Text style={styles.title}>Workout Complete!</Text>
          <Text style={styles.subtitle}>Amazing work! You crushed it 💪</Text>
        </Animated.View>

        {/* Stats Cards */}
        <Animated.View style={[styles.statsContainer, { opacity: fadeAnim }]}>
          <View style={styles.statsRow}>
            <Card style={styles.statCard}>
              <Clock size={22} color="#3b82f6" />
              <Text style={styles.statValue}>
                {workout ? formatDuration(workout.duration_seconds || 0) : '--'}
              </Text>
              <Text style={styles.statLabel}>Duration</Text>
            </Card>

            <Card style={styles.statCard}>
              <Dumbbell size={22} color="#22c55e" />
              <Text style={styles.statValue}>{exerciseCount}</Text>
              <Text style={styles.statLabel}>Exercises</Text>
            </Card>
          </View>

          <View style={styles.statsRow}>
            <Card style={styles.statCard}>
              <Flame size={22} color="#f97316" />
              <Text style={styles.statValue}>{workout?.total_sets || 0}</Text>
              <Text style={styles.statLabel}>Sets</Text>
            </Card>

            <Card style={styles.statCard}>
              <TrendingUp size={22} color="#a855f7" />
              <Text style={styles.statValue}>
                {workout ? (workout.total_volume || 0).toLocaleString() : '0'}
              </Text>
              <Text style={styles.statLabel}>Volume (lbs)</Text>
            </Card>
          </View>
        </Animated.View>

        {/* Workout Name Input */}
        <Animated.View style={[styles.inputSection, { opacity: fadeAnim }]}>
          <Text style={styles.inputLabel}>Workout Name</Text>
          <TextInput
            style={styles.nameInput}
            value={workoutName}
            onChangeText={setWorkoutName}
            placeholder="Name your workout..."
            placeholderTextColor="#64748b"
            maxLength={50}
          />
        </Animated.View>

        {/* Star Rating */}
        <Animated.View style={[styles.ratingSection, { opacity: fadeAnim }]}>
          <Text style={styles.inputLabel}>How was your workout?</Text>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => handleRating(star)}
                activeOpacity={0.7}
                style={styles.starButton}
              >
                <Star
                  size={36}
                  color={star <= rating ? '#fbbf24' : '#334155'}
                  fill={star <= rating ? '#fbbf24' : 'transparent'}
                />
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.ratingText}>
            {rating === 0 && 'Tap to rate'}
            {rating === 1 && 'Could be better'}
            {rating === 2 && 'It was okay'}
            {rating === 3 && 'Good workout'}
            {rating === 4 && 'Great workout!'}
            {rating === 5 && 'Best workout ever! 🔥'}
          </Text>
        </Animated.View>

        {/* Save Button */}
        <Animated.View style={[styles.actions, { opacity: fadeAnim }]}>
          <Button
            title={isSaving ? 'Saving...' : 'Save Workout'}
            variant="primary"
            size="lg"
            fullWidth
            onPress={handleSaveWorkout}
            disabled={isSaving}
          />

          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => router.replace('/(tabs)')}
            disabled={isSaving}
          >
            <Text style={styles.skipText}>Skip & Go Home</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    padding: 24,
    paddingTop: 40,
  },

  trophyContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },

  trophyCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#fbbf24',
  },

  confetti: {
    position: 'absolute',
    top: -10,
    right: '30%',
  },

  confettiEmoji: {
    fontSize: 32,
  },

  textContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },

  title: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },

  subtitle: {
    color: '#94a3b8',
    fontSize: 16,
  },

  statsContainer: {
    marginBottom: 32,
    gap: 12,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },

  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    gap: 8,
  },

  statValue: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
  },

  statLabel: {
    color: '#64748b',
    fontSize: 12,
  },

  inputSection: {
    marginBottom: 24,
  },

  inputLabel: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },

  nameInput: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#ffffff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },

  ratingSection: {
    alignItems: 'center',
    marginBottom: 32,
  },

  starsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    marginBottom: 12,
  },

  starButton: {
    padding: 4,
  },

  ratingText: {
    color: '#94a3b8',
    fontSize: 14,
  },

  actions: {
    gap: 16,
    marginBottom: 24,
  },

  skipButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },

  skipText: {
    color: '#64748b',
    fontSize: 14,
  },
});
