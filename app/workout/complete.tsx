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
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  Trophy,
  Clock,
  Dumbbell,
  TrendingUp,
  Star,
  Flame,
  ChevronDown,
  ChevronUp,
  Repeat,
  Award,
  Trash2,
} from 'lucide-react-native';
import { Button, Card } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { successHaptic, lightHaptic } from '@/lib/utils/haptics';
import { createTemplateFromWorkout } from '@/lib/api/templates';
import { useAuthStore } from '@/stores/authStore';
import { WorkoutAnalysis } from '@/components/ai';

// ============================================
// Types
// ============================================

interface WorkoutExerciseDetail {
  id: string;
  exercise_id: string;
  exercises: {
    name: string;
    primary_muscles: string[];
  };
  workout_sets: {
    set_number: number;
    weight: number;
    reps: number;
    is_completed: boolean;
    is_pr: boolean;
    pr_type: string | null;
  }[];
}

interface WorkoutDetail {
  id: string;
  name: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  total_volume: number;
  total_sets: number;
  total_reps: number;
  rating: number | null;
  workout_exercises: WorkoutExerciseDetail[];
}

interface PersonalRecord {
  exerciseName: string;
  weight: number;
  reps: number;
  prType: string;
}

// ============================================
// Component
// ============================================

export default function WorkoutCompleteScreen() {
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();
  const { user } = useAuthStore();

  // Workout data
  const [workout, setWorkout] = useState<WorkoutDetail | null>(null);
  const [workoutName, setWorkoutName] = useState('');
  const [rating, setRating] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedExercises, setExpandedExercises] = useState(false);
  const [personalRecords, setPersonalRecords] = useState<PersonalRecord[]>([]);

  // Template modal state
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');

  // Animations
  const [scaleAnim] = useState(new Animated.Value(0));
  const [fadeAnim] = useState(new Animated.Value(0));
  const [prAnim] = useState(new Animated.Value(0));

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

    // Delayed PR animation
    setTimeout(() => {
      Animated.spring(prAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }, 600);
  }, []);

  const fetchWorkoutDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('workouts')
        .select(`
          *,
          workout_exercises (
            id,
            exercise_id,
            exercises (
              name,
              primary_muscles
            ),
            workout_sets (
              set_number,
              weight,
              reps,
              is_completed,
              is_pr,
              pr_type
            )
          )
        `)
        .eq('id', workoutId)
        .single();

      if (!error && data) {
        setWorkout(data as WorkoutDetail);
        setWorkoutName(data.name || getDefaultWorkoutName());
        setRating(data.rating || 0);

        // Extract PRs from the workout sets
        detectPersonalRecords(data as WorkoutDetail);
      }
    } catch (error) {
      console.error('Failed to fetch workout:', error);
    }
  };

  // Generate default workout name based on date/time
  const getDefaultWorkoutName = (): string => {
    const now = new Date();
    const hour = now.getHours();

    if (hour < 12) return 'Morning Workout';
    if (hour < 17) return 'Afternoon Workout';
    return 'Evening Workout';
  };

  // Extract PRs from workout sets (they were marked during the workout)
  const detectPersonalRecords = (workoutData: WorkoutDetail) => {
    const prs: PersonalRecord[] = [];

    workoutData.workout_exercises?.forEach((exercise) => {
      const prSets = exercise.workout_sets?.filter((s) => s.is_pr && s.pr_type) || [];
      
      prSets.forEach((set) => {
        // Check if we already have a PR for this exercise/type combo
        const existingPR = prs.find(
          (pr) => pr.exerciseName === exercise.exercises?.name && pr.prType === set.pr_type
        );
        
        if (!existingPR) {
          prs.push({
            exerciseName: exercise.exercises?.name || 'Exercise',
            weight: set.weight,
            reps: set.reps,
            prType: set.pr_type || 'max_weight',
          });
        }
      });
    });

    setPersonalRecords(prs);
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
    lightHaptic();
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

      successHaptic();
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Failed to save workout:', error);
      Alert.alert('Error', 'Failed to save workout details. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle save as template - open modal
  const handleSaveAsTemplate = () => {
    if (!workout || !user?.id) return;
    setTemplateName(workoutName || 'My Template');
    setShowTemplateModal(true);
  };

  // Confirm save as template
  const handleConfirmSaveTemplate = async () => {
    if (!workout || !user?.id) return;

    if (!templateName.trim()) {
      Alert.alert('Error', 'Please enter a template name');
      return;
    }

    setIsSaving(true);
    setShowTemplateModal(false);

    try {
      // Build exercises data from workout
      const workoutExercises = workout.workout_exercises.map((we) => ({
        exercise_id: we.exercise_id,
        sets: we.workout_sets
          .filter((s) => s.is_completed)
          .map((s) => ({
            weight: s.weight || 0,
            reps: s.reps || 0,
          })),
      }));

      const template = await createTemplateFromWorkout(
        user.id,
        templateName.trim(),
        workoutExercises
      );

      successHaptic();
      Alert.alert(
        'Template Created!',
        `"${templateName}" has been saved as a template.`,
        [
          { text: 'View Template', onPress: () => router.push(`/template/${template.id}`) },
          { text: 'OK', style: 'cancel' },
        ]
      );
    } catch (error) {
      console.error('Failed to create template:', error);
      Alert.alert('Error', 'Failed to create template. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle discard workout
  const handleDiscard = () => {
    Alert.alert(
      'Discard Workout',
      'Are you sure you want to delete this workout? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (workoutId) {
                await supabase.from('workouts').delete().eq('id', workoutId);
              }
              router.replace('/(tabs)');
            } catch (error) {
              console.error('Failed to delete workout:', error);
              Alert.alert('Error', 'Failed to delete workout.');
            }
          },
        },
      ]
    );
  };

  // Calculate totals
  const exerciseCount = workout?.workout_exercises?.length || 0;
  const totalReps = workout?.total_reps || 0;

  // Get best set for an exercise
  const getBestSet = (exercise: WorkoutExerciseDetail): string => {
    const completedSets = exercise.workout_sets?.filter((s) => s.is_completed) || [];
    if (completedSets.length === 0) return '-';

    const best = completedSets.reduce((max, set) => {
      const volume = (set.weight || 0) * (set.reps || 0);
      const maxVolume = (max.weight || 0) * (max.reps || 0);
      return volume > maxVolume ? set : max;
    });

    return `${best.weight || 0} × ${best.reps || 0}`;
  };

  const getRatingText = (value: number): string => {
    switch (value) {
      case 0: return 'Tap to rate';
      case 1: return 'Could be better';
      case 2: return 'It was okay';
      case 3: return 'Good workout';
      case 4: return 'Great workout!';
      case 5: return 'Best workout ever! 🔥';
      default: return '';
    }
  };

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
          <View style={styles.confettiLeft}>
            <Text style={styles.confettiEmoji}>🎉</Text>
          </View>
          <View style={styles.confettiRight}>
            <Text style={styles.confettiEmoji}>🎊</Text>
          </View>
        </Animated.View>

        {/* Congratulations Text */}
        <Animated.View style={[styles.textContainer, { opacity: fadeAnim }]}>
          <Text style={styles.title}>Workout Complete!</Text>
          <Text style={styles.subtitle}>Amazing work! You crushed it 💪</Text>
        </Animated.View>

        {/* PR Callout */}
        {personalRecords.length > 0 && (
          <Animated.View
            style={[
              styles.prContainer,
              { transform: [{ scale: prAnim }], opacity: prAnim },
            ]}
          >
            <View style={styles.prHeader}>
              <Award size={24} color="#fbbf24" />
              <Text style={styles.prTitle}>
                {personalRecords.length === 1 ? 'New Personal Record!' : `${personalRecords.length} New PRs!`}
              </Text>
            </View>
            {personalRecords.map((pr, index) => (
              <View key={index} style={styles.prItem}>
                <View style={styles.prItemLeft}>
                  <Text style={styles.prExercise}>{pr.exerciseName}</Text>
                  <Text style={styles.prType}>
                    {pr.prType === 'max_weight' && 'Max Weight'}
                    {pr.prType === 'max_reps' && 'Max Reps'}
                    {pr.prType === 'max_volume' && 'Max Volume'}
                  </Text>
                </View>
                <Text style={styles.prValue}>
                  {pr.prType === 'max_weight' && `${pr.weight} lbs`}
                  {pr.prType === 'max_reps' && `${pr.reps} reps`}
                  {pr.prType === 'max_volume' && `${(pr.weight * pr.reps).toLocaleString()} lbs`}
                </Text>
              </View>
            ))}
          </Animated.View>
        )}

        {/* Stats Grid */}
        <Animated.View style={[styles.statsGrid, { opacity: fadeAnim }]}>
          <View style={styles.statsCard}>
            <View style={styles.statsHeader}>
              <Text style={styles.statsHeaderText}>WORKOUT SUMMARY</Text>
            </View>

            <View style={styles.statRow}>
              <View style={styles.statLeft}>
                <Clock size={18} color="#3b82f6" />
                <Text style={styles.statLabel}>Duration</Text>
              </View>
              <Text style={styles.statValue}>
                {workout ? formatDuration(workout.duration_seconds || 0) : '--'}
              </Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statRow}>
              <View style={styles.statLeft}>
                <TrendingUp size={18} color="#22c55e" />
                <Text style={styles.statLabel}>Volume</Text>
              </View>
              <Text style={styles.statValue}>
                {workout ? (workout.total_volume || 0).toLocaleString() : '0'} lbs
              </Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statRow}>
              <View style={styles.statLeft}>
                <Dumbbell size={18} color="#a855f7" />
                <Text style={styles.statLabel}>Exercises</Text>
              </View>
              <Text style={styles.statValue}>{exerciseCount}</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statRow}>
              <View style={styles.statLeft}>
                <Flame size={18} color="#f97316" />
                <Text style={styles.statLabel}>Sets</Text>
              </View>
              <Text style={styles.statValue}>{workout?.total_sets || 0}</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statRow}>
              <View style={styles.statLeft}>
                <Repeat size={18} color="#06b6d4" />
                <Text style={styles.statLabel}>Total Reps</Text>
              </View>
              <Text style={styles.statValue}>{totalReps}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Exercise Breakdown */}
        {workout?.workout_exercises && workout.workout_exercises.length > 0 && (
          <Animated.View style={[styles.breakdownContainer, { opacity: fadeAnim }]}>
            <TouchableOpacity
              style={styles.breakdownHeader}
              onPress={() => setExpandedExercises(!expandedExercises)}
              activeOpacity={0.7}
            >
              <Text style={styles.breakdownTitle}>Exercise Breakdown</Text>
              {expandedExercises ? (
                <ChevronUp size={20} color="#64748b" />
              ) : (
                <ChevronDown size={20} color="#64748b" />
              )}
            </TouchableOpacity>

            {expandedExercises && (
              <View style={styles.exerciseList}>
                {workout.workout_exercises.map((exercise) => {
                  const completedSets = exercise.workout_sets?.filter(
                    (s) => s.is_completed
                  ).length || 0;

                  return (
                    <View key={exercise.id} style={styles.exerciseItem}>
                      <View style={styles.exerciseInfo}>
                        <Text style={styles.exerciseName} numberOfLines={1}>
                          {exercise.exercises?.name || 'Exercise'}
                        </Text>
                        <Text style={styles.exerciseMeta}>
                          {completedSets} sets • Best: {getBestSet(exercise)}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </Animated.View>
        )}

        {/* AI Workout Analysis */}
        {workout && (
          <Animated.View style={{ opacity: fadeAnim }}>
            <WorkoutAnalysis workout={workout} />
          </Animated.View>
        )}

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
          <Text style={styles.ratingText}>{getRatingText(rating)}</Text>
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View style={[styles.actions, { opacity: fadeAnim }]}>
          <Button
            title={isSaving ? 'Saving...' : 'Save Workout'}
            variant="primary"
            size="lg"
            fullWidth={true}
            onPress={handleSaveWorkout}
            disabled={isSaving}
          />

          {/* Save as Template button */}
          <Button
            title="Save as Template"
            variant="secondary"
            size="lg"
            fullWidth={true}
            onPress={handleSaveAsTemplate}
            disabled={isSaving}
            style={styles.saveTemplateButton}
          />

          <TouchableOpacity
            style={styles.discardButton}
            onPress={handleDiscard}
            disabled={isSaving}
          >
            <Trash2 size={16} color="#ef4444" />
            <Text style={styles.discardText}>Discard Workout</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {/* Save as Template Modal */}
      <Modal
        visible={showTemplateModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTemplateModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowTemplateModal(false)}
          />
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Save as Template</Text>
            <Text style={styles.modalSubtitle}>
              Enter a name for this template
            </Text>

            <TextInput
              style={styles.modalInput}
              value={templateName}
              onChangeText={setTemplateName}
              placeholder="Template name"
              placeholderTextColor="#64748b"
              autoFocus={true}
              selectTextOnFocus={true}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowTemplateModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handleConfirmSaveTemplate}
              >
                <Text style={styles.modalSaveText}>Save Template</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ============================================
// Styles
// ============================================

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
    paddingTop: 32,
  },

  // Trophy
  trophyContainer: {
    alignItems: 'center',
    marginBottom: 20,
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

  confettiLeft: {
    position: 'absolute',
    top: -5,
    left: '25%',
  },

  confettiRight: {
    position: 'absolute',
    top: -5,
    right: '25%',
  },

  confettiEmoji: {
    fontSize: 28,
  },

  // Text
  textContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },

  title: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },

  subtitle: {
    color: '#94a3b8',
    fontSize: 16,
  },

  // PR Callout
  prContainer: {
    backgroundColor: '#422006',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },

  prHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },

  prTitle: {
    color: '#fbbf24',
    fontSize: 16,
    fontWeight: 'bold',
  },

  prItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(251, 191, 36, 0.2)',
  },

  prItemLeft: {
    flex: 1,
  },

  prExercise: {
    color: '#fef3c7',
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },

  prType: {
    color: '#d97706',
    fontSize: 11,
    marginTop: 2,
  },

  prValue: {
    color: '#fbbf24',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Stats Grid
  statsGrid: {
    marginBottom: 24,
  },

  statsCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    overflow: 'hidden',
  },

  statsHeader: {
    backgroundColor: '#0f172a',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },

  statsHeaderText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
  },

  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },

  statLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  statLabel: {
    color: '#94a3b8',
    fontSize: 15,
  },

  statValue: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: 'bold',
  },

  statDivider: {
    height: 1,
    backgroundColor: '#334155',
    marginHorizontal: 16,
  },

  // Exercise Breakdown
  breakdownContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginBottom: 24,
    overflow: 'hidden',
  },

  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },

  breakdownTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },

  exerciseList: {
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },

  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },

  exerciseInfo: {
    flex: 1,
  },

  exerciseName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'capitalize',
    marginBottom: 2,
  },

  exerciseMeta: {
    color: '#64748b',
    fontSize: 12,
  },

  // Input Section
  inputSection: {
    marginBottom: 24,
  },

  inputLabel: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: 'bold',
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

  // Rating Section
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

  // Actions
  actions: {
    gap: 12,
    marginBottom: 24,
  },

  saveTemplateButton: {
    marginTop: 4,
  },

  discardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },

  discardText: {
    color: '#ef4444',
    fontSize: 14,
  },

  // Template Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },

  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    zIndex: 1,
  },

  modalTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },

  modalSubtitle: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },

  modalInput: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },

  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },

  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#334155',
    alignItems: 'center',
  },

  modalCancelText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: 'bold',
  },

  modalSaveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },

  modalSaveText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
