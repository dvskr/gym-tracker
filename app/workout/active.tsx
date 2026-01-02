import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Keyboard,
  StyleSheet,
  Alert,
  Modal,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Plus, X, Clock, Trophy } from 'lucide-react-native';
import {
  useWorkoutStore,
  useActiveWorkout,
  useIsWorkoutActive,
  useRestTimer,
  WorkoutSet,
} from '@/stores/workoutStore';
import { ExerciseCard } from '@/components/workout';
import { ExerciseSearch } from '@/components/exercise';
import { Button } from '@/components/ui';
import { ExerciseDBExercise } from '@/types/database';
import { successHaptic } from '@/lib/utils/haptics';
import { supabase } from '@/lib/supabase';
import {
  checkForPR,
  savePR,
  PRType,
  getPRTypeLabel,
  celebratePR,
} from '@/lib/utils/prDetection';
import { useUnits } from '@/hooks/useUnits';
import { useSettingsStore } from '@/stores/settingsStore';

// PR Toast duration in ms
const PR_TOAST_DURATION = 3000;

export default function ActiveWorkoutScreen() {
  const activeWorkout = useActiveWorkout();
  const isWorkoutActive = useIsWorkoutActive();
  const { autoStartTimer } = useSettingsStore();
  const restTimer = useRestTimer();
  const { weightUnit } = useUnits();

  const {
    startWorkout,
    endWorkout,
    discardWorkout,
    addExercise,
    removeExercise,
    reorderExercises,
    addSet,
    updateSet,
    completeSet,
    deleteSet,
    markSetAsPR,
    startRestTimer,
    tickRestTimer,
    getTotalVolume,
    getTotalSets,
    getWorkoutDuration,
  } = useWorkoutStore();

  const [showExerciseSearch, setShowExerciseSearch] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);

  // PR Toast state
  const [prToast, setPrToast] = useState<{
    visible: boolean;
    exerciseName: string;
    prType: PRType;
    value: number;
    weight: number;
    reps: number;
  } | null>(null);
  const prToastAnim = useRef(new Animated.Value(0)).current;
  const prToastTimeout = useRef<NodeJS.Timeout | null>(null);

  // NOTE: Removed auto-start useEffect that was causing bug
  // The useEffect was calling startWorkout() whenever isWorkoutActive became false,
  // which happened after endWorkout/discardWorkout, immediately restarting the workout.
  // Workouts should only be started explicitly via buttons/templates.

  // Redirect if no active workout
  useEffect(() => {
    if (!activeWorkout && !isWorkoutActive) {
      // No active workout, redirect back to workout tab
      const timer = setTimeout(() => {
        router.replace('/(tabs)/workout');
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeWorkout, isWorkoutActive]);

  // Elapsed time counter
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeWorkout) {
        setElapsedTime(getWorkoutDuration());
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeWorkout, getWorkoutDuration]);

  // Rest timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (restTimer.isRunning) {
      interval = setInterval(() => {
        tickRestTimer();
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [restTimer.isRunning, tickRestTimer]);

  // Format time (seconds to MM:SS or HH:MM:SS)
  const formatTime = useCallback((seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Handle adding exercise
  const handleAddExercise = useCallback(
    (exercise: ExerciseDBExercise) => {
      addExercise(exercise);
      setShowExerciseSearch(false);
    },
    [addExercise]
  );

  // Show PR toast
  const showPRToast = useCallback(
    (exerciseName: string, prType: PRType, value: number, weight: number, reps: number) => {
      // Clear any existing timeout
      if (prToastTimeout.current) {
        clearTimeout(prToastTimeout.current);
      }

      setPrToast({ visible: true, exerciseName, prType, value, weight, reps });
      celebratePR();

      // Animate in
      Animated.spring(prToastAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();

      // Auto-hide after duration
      prToastTimeout.current = setTimeout(() => {
        Animated.timing(prToastAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setPrToast(null);
        });
      }, PR_TOAST_DURATION);
    },
    [prToastAnim]
  );

  // Handle completing a set - auto-start rest timer and check for PRs
  const handleCompleteSet = useCallback(
    async (exerciseId: string, setId: string) => {
      const exercise = activeWorkout?.exercises.find((e) => e.id === exerciseId);
      const set = exercise?.sets.find((s) => s.id === setId);

      if (!set || !exercise) return;

      // Check if we're completing (not uncompleting) BEFORE calling completeSet
      const isCompleting = !set.isCompleted;

      // Complete the set (toggles isCompleted)
      completeSet(exerciseId, setId);

      // If completing (not uncompleting), start rest timer and check for PRs
      if (isCompleting) {
        // Start rest timer only if auto-start is enabled
        if (autoStartTimer) {
          startRestTimer(exerciseId);
        }

        // Check for PRs only if we have weight and reps
        if (!set.weight || !set.reps) return;
        
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user && exercise.exercise.id) {
            // First, get the exercise's Supabase ID
            const { data: exerciseData } = await supabase
              .from('exercises')
              .select('id')
              .eq('external_id', exercise.exercise.id)
              .single();

            if (exerciseData) {
              const prResults = await checkForPR(
                user.id,
                exerciseData.id,
                set.weight,
                set.reps,
                exercise.exercise.name
              );

              // If we have PRs, mark the first one and show toast
              if (prResults.length > 0) {
                // Prefer max_weight PR for display, otherwise use first PR
                const displayPR = prResults.find(pr => pr.prType === 'max_weight') || prResults[0];
                
                if (displayPR.prType) {
                  // Mark set as PR in store
                  markSetAsPR(exerciseId, setId, displayPR.prType);

                  // Save the PR to database
                  await savePR(
                    user.id,
                    exerciseData.id,
                    displayPR.prType,
                    displayPR.newRecord || 0,
                    set.weight,
                    set.reps
                  );

                  // Show celebration
                  showPRToast(
                    exercise.exercise.name,
                    displayPR.prType,
                    displayPR.newRecord || 0,
                    set.weight,
                    set.reps
                  );
                }
              }
            }
          }
        } catch (error) {
          console.error('Error checking for PR:', error);
          // Don't fail the set completion due to PR check error
        }
      }
    },
    [activeWorkout, completeSet, startRestTimer, markSetAsPR, showPRToast]
  );

  // Handle move exercise up
  const handleMoveUp = useCallback(
    (index: number) => {
      if (index > 0) {
        reorderExercises(index, index - 1);
      }
    },
    [reorderExercises]
  );

  // Handle move exercise down
  const handleMoveDown = useCallback(
    (index: number) => {
      if (activeWorkout && index < activeWorkout.exercises.length - 1) {
        reorderExercises(index, index + 1);
      }
    },
    [activeWorkout, reorderExercises]
  );

  // Handle finish workout
  const handleFinishWorkout = useCallback(async () => {
    const totalSets = getTotalSets();

    if (totalSets === 0) {
      Alert.alert(
        'No Sets Completed',
        'Complete at least one set before finishing your workout.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Finish Workout',
      'Are you sure you want to finish this workout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Finish',
          style: 'default',
          onPress: async () => {
            setIsFinishing(true);
            const result = await endWorkout();
            setIsFinishing(false);

            if (result.success) {
              successHaptic();
              router.replace({
                pathname: '/workout/complete',
                params: { workoutId: result.workoutId },
              });
            } else {
              Alert.alert('Error', result.error || 'Failed to save workout');
            }
          },
        },
      ]
    );
  }, [getTotalSets, endWorkout]);

  // Handle discard workout
  const handleDiscardWorkout = useCallback(() => {
    Alert.alert(
      'Discard Workout',
      'Are you sure? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            discardWorkout();
            router.back();
          },
        },
      ]
    );
  }, [discardWorkout]);

  if (!activeWorkout) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Redirecting...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalExercises = activeWorkout.exercises.length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.discardButton}
          onPress={handleDiscardWorkout}
        >
          <X size={24} color="#ef4444" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.workoutName}>{activeWorkout.name}</Text>
          <View style={styles.timerRow}>
            <Clock size={16} color="#3b82f6" />
            <Text style={styles.timerText}>{formatTime(elapsedTime)}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.finishButton}
          onPress={handleFinishWorkout}
          disabled={isFinishing}
        >
          <Text style={styles.finishButtonText}>
            {isFinishing ? 'Saving...' : 'Finish'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalExercises}</Text>
          <Text style={styles.statLabel}>Exercises</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{getTotalSets()}</Text>
          <Text style={styles.statLabel}>Sets</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {getTotalVolume().toLocaleString()}
          </Text>
          <Text style={styles.statLabel}>Volume ({weightUnit})</Text>
        </View>
      </View>

      {/* KeyboardAvoidingView for input fields */}
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {activeWorkout.exercises.map((workoutExercise, index) => (
              <ExerciseCard
                key={workoutExercise.id}
                workoutExercise={workoutExercise}
                index={index}
                totalExercises={totalExercises}
                onAddSet={() => addSet(workoutExercise.id)}
                onUpdateSet={(setId, data) =>
                  updateSet(workoutExercise.id, setId, data)
                }
                onCompleteSet={(setId) =>
                  handleCompleteSet(workoutExercise.id, setId)
                }
                onDeleteSet={(setId) => deleteSet(workoutExercise.id, setId)}
                onRemove={() => removeExercise(workoutExercise.id)}
                onMoveUp={() => handleMoveUp(index)}
                onMoveDown={() => handleMoveDown(index)}
              />
            ))}

            {/* Add Exercise Button */}
            <TouchableOpacity
              style={styles.addExerciseButton}
              onPress={() => setShowExerciseSearch(true)}
              activeOpacity={0.7}
            >
              <Plus size={24} color="#3b82f6" />
              <Text style={styles.addExerciseText}>Add Exercise</Text>
            </TouchableOpacity>

            {/* Empty State */}
            {totalExercises === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No exercises yet</Text>
                <Text style={styles.emptySubtitle}>
                  Tap "Add Exercise" to get started
                </Text>
              </View>
            )}

            {/* Bottom Spacing */}
            <View style={styles.bottomSpacer} />
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* PR Toast */}
      {prToast && (
        <Animated.View
          style={[
            styles.prToast,
            {
              opacity: prToastAnim,
              transform: [
                {
                  translateY: prToastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-100, 0],
                  }),
                },
                {
                  scale: prToastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.prToastContent}>
            <View style={styles.prToastIcon}>
              <Trophy size={24} color="#fbbf24" />
            </View>
            <View style={styles.prToastText}>
              <Text style={styles.prToastTitle}>🏆 NEW PR!</Text>
              <Text style={styles.prToastExercise} numberOfLines={1}>
                {prToast.exerciseName}
              </Text>
              <Text style={styles.prToastValue}>
                {prToast.prType === 'max_weight' && `${prToast.weight} ${weightUnit} × ${prToast.reps}`}
                {prToast.prType === 'max_reps' && `${prToast.reps} reps @ ${prToast.weight} ${weightUnit}`}
                {prToast.prType === 'max_volume' && `${(prToast.weight * prToast.reps).toLocaleString()} ${weightUnit} volume`}
              </Text>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Exercise Search Modal */}
      <Modal
        visible={showExerciseSearch}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowExerciseSearch(false)}
      >
        <ExerciseSearch
          onSelectExercise={handleAddExercise}
          onClose={() => setShowExerciseSearch(false)}
        />
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    color: '#94a3b8',
    fontSize: 16,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },

  discardButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },

  workoutName: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },

  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },

  timerText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },

  finishButton: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },

  finishButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },

  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 16,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },

  statItem: {
    alignItems: 'center',
    flex: 1,
  },

  statValue: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },

  statLabel: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },

  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#334155',
  },

  keyboardAvoid: {
    flex: 1,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    padding: 16,
  },

  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#334155',
    borderStyle: 'dashed',
    gap: 8,
    marginTop: 8,
  },

  addExerciseText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: 'bold',
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },

  emptyTitle: {
    color: '#94a3b8',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },

  emptySubtitle: {
    color: '#64748b',
    fontSize: 14,
  },

  bottomSpacer: {
    height: 100,
  },

  // PR Toast
  prToast: {
    position: 'absolute',
    top: 100,
    left: 16,
    right: 16,
    zIndex: 1000,
  },

  prToastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#422006',
    borderWidth: 2,
    borderColor: '#fbbf24',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  prToastIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  prToastText: {
    flex: 1,
  },

  prToastTitle: {
    color: '#fbbf24',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },

  prToastExercise: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 2,
    textTransform: 'capitalize',
  },

  prToastValue: {
    color: '#fef3c7',
    fontSize: 14,
    marginTop: 2,
  },
});
