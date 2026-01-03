import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { logger } from '@/lib/utils/logger';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Keyboard,
  StyleSheet,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Plus, X, Clock } from 'lucide-react-native';
import {
  useWorkoutStore,
  useActiveWorkout,
  useIsWorkoutActive,
  useRestTimer,
  WorkoutSet,
} from '@/stores/workoutStore';
import { ExerciseCard } from '@/components/workout';
import { PRConfetti } from '@/components/workout/PRConfetti';
import { ExerciseSearch } from '@/components/exercise';
import { Button } from '@/components/ui';
import { ExerciseDBExercise } from '@/types/database';
import { successHaptic } from '@/lib/utils/haptics';
import { useUnits } from '@/hooks/useUnits';
import { useSettingsStore } from '@/stores/settingsStore';
import { useBackNavigation } from '@/lib/hooks/useBackNavigation';

export default function ActiveWorkoutScreen() {
  useBackNavigation(); // Enable Android back gesture support

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
    startRestTimer,
    tickRestTimer,
    getTotalVolume,
    getTotalSets,
    getWorkoutDuration,
  } = useWorkoutStore();

  const [showExerciseSearch, setShowExerciseSearch] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);

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

  // Handle completing a set - auto-start rest timer
  const handleCompleteSet = useCallback(
    async (exerciseId: string, setId: string) => {
      const exercise = activeWorkout?.exercises.find((e) => e.id === exerciseId);
      const set = exercise?.sets.find((s) => s.id === setId);

      if (!set || !exercise) return;

      // Check if we're completing (not uncompleting) BEFORE calling completeSet
      const isCompleting = !set.isCompleted;

      // Complete the set (toggles isCompleted)
      completeSet(exerciseId, setId);

      // If completing (not uncompleting), start rest timer
      if (isCompleting) {
        // Start rest timer only if auto-start is enabled
        if (autoStartTimer) {
          startRestTimer(exerciseId);
        }
      }
    },
    [activeWorkout, completeSet, startRestTimer]
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
            router.push('/(tabs)/workout'); // Always return to Workout tab after discarding
          },
        },
      ]
    );
  }, [discardWorkout]);

  // FlatList ref for scrolling (must be before early returns)
  const flatListRef = useRef<FlatList>(null);

  // Memoized render function for exercise cards (must be before early returns)
  const renderExerciseCard = useCallback(
    ({ item, index }: { item: any; index: number }) => {
      const totalExercises = activeWorkout?.exercises.length || 0;
      return (
        <ExerciseCard
          workoutExercise={item}
          index={index}
          totalExercises={totalExercises}
          onAddSet={() => addSet(item.id)}
          onUpdateSet={(setId, data) => updateSet(item.id, setId, data)}
          onCompleteSet={(setId) => handleCompleteSet(item.id, setId)}
          onDeleteSet={(setId) => deleteSet(item.id, setId)}
          onRemove={() => removeExercise(item.id)}
          onMoveUp={() => handleMoveUp(index)}
          onMoveDown={() => handleMoveDown(index)}
        />
      );
    },
    [
      activeWorkout?.exercises.length,
      addSet,
      updateSet,
      handleCompleteSet,
      deleteSet,
      removeExercise,
      handleMoveUp,
      handleMoveDown,
    ]
  );

  // Key extractor (must be before early returns)
  const keyExtractor = useCallback((item: any) => item.id, []);

  // List footer component (must be before early returns)
  const ListFooterComponent = useCallback(
    () => {
      const totalExercises = activeWorkout?.exercises.length || 0;
      return (
        <>
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
        </>
      );
    },
    [activeWorkout?.exercises.length]
  );

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
          <FlatList
            ref={flatListRef}
            data={activeWorkout.exercises}
            renderItem={renderExerciseCard}
            keyExtractor={keyExtractor}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            initialNumToRender={5}
            maxToRenderPerBatch={5}
            windowSize={5}
            removeClippedSubviews={false}
            ListFooterComponent={ListFooterComponent}
          />
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

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

      {/* PR Confetti (rendered above everything when triggered) */}
      <PRConfetti />
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
});
