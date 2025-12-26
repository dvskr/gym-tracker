import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Dumbbell,
  TrendingUp,
  Trash2,
  Star,
} from 'lucide-react-native';
import { format } from 'date-fns';
import { getWorkoutById, deleteWorkout, WorkoutDetail } from '@/lib/api/workouts';
import { Card, LoadingSpinner } from '@/components/ui';

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [workout, setWorkout] = useState<WorkoutDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch workout
  useEffect(() => {
    if (id) {
      fetchWorkout();
    }
  }, [id]);

  const fetchWorkout = async () => {
    try {
      const data = await getWorkoutById(id!);
      setWorkout(data);
    } catch (error) {
      console.error('Failed to fetch workout:', error);
      Alert.alert('Error', 'Failed to load workout');
    } finally {
      setIsLoading(false);
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

  // Handle delete
  const handleDelete = () => {
    Alert.alert(
      'Delete Workout',
      'Are you sure you want to delete this workout? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteWorkout(id!);
              router.back();
            } catch (error) {
              console.error('Failed to delete workout:', error);
              Alert.alert('Error', 'Failed to delete workout');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <LoadingSpinner fullScreen message="Loading workout..." />
      </SafeAreaView>
    );
  }

  if (!workout) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Workout not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {workout.name || 'Workout'}
          </Text>
          <Text style={styles.headerDate}>
            {format(new Date(workout.started_at), 'EEEE, MMMM d, yyyy')}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleDelete}
          disabled={isDeleting}
        >
          <Trash2 size={22} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Clock size={20} color="#3b82f6" />
            <Text style={styles.statValue}>
              {formatDuration(workout.duration_seconds)}
            </Text>
            <Text style={styles.statLabel}>Duration</Text>
          </Card>

          <Card style={styles.statCard}>
            <Dumbbell size={20} color="#22c55e" />
            <Text style={styles.statValue}>
              {workout.workout_exercises?.length || 0}
            </Text>
            <Text style={styles.statLabel}>Exercises</Text>
          </Card>

          <Card style={styles.statCard}>
            <TrendingUp size={20} color="#a855f7" />
            <Text style={styles.statValue}>
              {workout.total_volume.toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>Volume (lbs)</Text>
          </Card>

          <Card style={styles.statCard}>
            <Star size={20} color="#fbbf24" />
            <Text style={styles.statValue}>{workout.total_sets}</Text>
            <Text style={styles.statLabel}>Total Sets</Text>
          </Card>
        </View>

        {/* Rating */}
        {workout.rating && workout.rating > 0 && (
          <View style={styles.ratingSection}>
            <Text style={styles.sectionTitle}>Rating</Text>
            <View style={styles.ratingStars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={24}
                  color={star <= workout.rating! ? '#fbbf24' : '#334155'}
                  fill={star <= workout.rating! ? '#fbbf24' : 'transparent'}
                />
              ))}
            </View>
          </View>
        )}

        {/* Exercises */}
        <View style={styles.exercisesSection}>
          <Text style={styles.sectionTitle}>Exercises</Text>

          {workout.workout_exercises
            ?.sort((a, b) => a.order_index - b.order_index)
            .map((we, index) => (
              <Card key={we.id} style={styles.exerciseCard}>
                <View style={styles.exerciseHeader}>
                  <Text style={styles.exerciseNumber}>{index + 1}</Text>
                  <View style={styles.exerciseInfo}>
                    <Text style={styles.exerciseName}>
                      {we.exercises?.name || 'Unknown Exercise'}
                    </Text>
                    <Text style={styles.exerciseEquipment}>
                      {we.exercises?.equipment || ''}
                    </Text>
                  </View>
                </View>

                {/* Sets */}
                <View style={styles.setsContainer}>
                  <View style={styles.setsHeader}>
                    <Text style={styles.setHeaderText}>SET</Text>
                    <Text style={styles.setHeaderText}>WEIGHT</Text>
                    <Text style={styles.setHeaderText}>REPS</Text>
                  </View>

                  {we.workout_sets
                    ?.sort((a, b) => a.set_number - b.set_number)
                    .map((set) => (
                      <View key={set.id} style={styles.setRow}>
                        <Text style={styles.setNumber}>{set.set_number}</Text>
                        <Text style={styles.setValue}>
                          {set.weight || 0} {set.weight_unit}
                        </Text>
                        <Text style={styles.setValue}>{set.reps || 0}</Text>
                      </View>
                    ))}
                </View>

                {we.notes && (
                  <Text style={styles.exerciseNotes}>{we.notes}</Text>
                )}
              </Card>
            ))}
        </View>

        {/* Notes */}
        {workout.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Card style={styles.notesCard}>
              <Text style={styles.notesText}>{workout.notes}</Text>
            </Card>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },

  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },

  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },

  headerDate: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    padding: 16,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },

  statCard: {
    width: '47%',
    alignItems: 'center',
    padding: 16,
    gap: 8,
  },

  statValue: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
  },

  statLabel: {
    color: '#64748b',
    fontSize: 12,
  },

  ratingSection: {
    marginBottom: 24,
  },

  sectionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },

  ratingStars: {
    flexDirection: 'row',
    gap: 4,
  },

  exercisesSection: {
    marginBottom: 24,
  },

  exerciseCard: {
    padding: 16,
    marginBottom: 12,
  },

  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },

  exerciseNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 28,
  },

  exerciseInfo: {
    flex: 1,
  },

  exerciseName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },

  exerciseEquipment: {
    color: '#64748b',
    fontSize: 12,
    textTransform: 'capitalize',
  },

  setsContainer: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
  },

  setsHeader: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },

  setHeaderText: {
    flex: 1,
    color: '#64748b',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  setRow: {
    flexDirection: 'row',
    paddingVertical: 6,
  },

  setNumber: {
    flex: 1,
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
  },

  setValue: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  exerciseNotes: {
    color: '#94a3b8',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 12,
  },

  notesSection: {
    marginBottom: 24,
  },

  notesCard: {
    padding: 16,
  },

  notesText: {
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 20,
  },

  bottomSpacer: {
    height: 40,
  },

  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  errorText: {
    color: '#94a3b8',
    fontSize: 16,
    marginBottom: 16,
  },

  backButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },

  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

