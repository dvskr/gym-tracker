import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  Animated,
  Vibration,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Plus, X, Clock, Pause, Play, RotateCcw } from 'lucide-react-native';
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

// Default rest time in seconds
const DEFAULT_REST_TIME = 90;

export default function ActiveWorkoutScreen() {
  const activeWorkout = useActiveWorkout();
  const isWorkoutActive = useIsWorkoutActive();
  const restTimer = useRestTimer();

  const {
    startWorkout,
    endWorkout,
    discardWorkout,
    addExercise,
    removeExercise,
    addSet,
    updateSet,
    completeSet,
    deleteSet,
    startRestTimer,
    skipRestTimer,
    tickRestTimer,
    resetRestTimer,
    getTotalVolume,
    getTotalSets,
    getWorkoutDuration,
  } = useWorkoutStore();

  const [showExerciseSearch, setShowExerciseSearch] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);

  // Animation for rest timer
  const timerScale = useRef(new Animated.Value(1)).current;

  // Start workout if not active
  useEffect(() => {
    if (!isWorkoutActive) {
      startWorkout();
    }
  }, [isWorkoutActive, startWorkout]);

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

  // Vibrate when rest timer ends
  useEffect(() => {
    if (restTimer.remainingSeconds === 0 && restTimer.totalSeconds > 0) {
      if (Platform.OS !== 'web') {
        Vibration.vibrate([0, 200, 100, 200, 100, 200]);
      }
      // Pulse animation
      Animated.sequence([
        Animated.timing(timerScale, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(timerScale, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [restTimer.remainingSeconds, restTimer.totalSeconds, timerScale]);

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
    (exerciseId: string, setId: string) => {
      const exercise = activeWorkout?.exercises.find((e) => e.id === exerciseId);
      const set = exercise?.sets.find((s) => s.id === setId);

      completeSet(exerciseId, setId);

      // Start rest timer if completing (not uncompleting)
      if (set && !set.isCompleted) {
        startRestTimer(DEFAULT_REST_TIME);
      }
    },
    [activeWorkout, completeSet, startRestTimer]
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

  // Rest timer progress
  const restProgress = restTimer.totalSeconds > 0
    ? restTimer.remainingSeconds / restTimer.totalSeconds
    : 0;

  if (!activeWorkout) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Starting workout...</Text>
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
          <Text style={styles.statValue}>{activeWorkout.exercises.length}</Text>
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
          <Text style={styles.statLabel}>Volume (lbs)</Text>
        </View>
      </View>

      {/* Exercise List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeWorkout.exercises.map((workoutExercise) => (
          <ExerciseCard
            key={workoutExercise.id}
            workoutExercise={workoutExercise}
            onAddSet={() => addSet(workoutExercise.id)}
            onUpdateSet={(setId, data) =>
              updateSet(workoutExercise.id, setId, data)
            }
            onCompleteSet={(setId) =>
              handleCompleteSet(workoutExercise.id, setId)
            }
            onDeleteSet={(setId) => deleteSet(workoutExercise.id, setId)}
            onRemove={() => removeExercise(workoutExercise.id)}
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
        {activeWorkout.exercises.length === 0 && (
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

      {/* Rest Timer Overlay */}
      {restTimer.isRunning && (
        <Animated.View
          style={[
            styles.restTimerOverlay,
            { transform: [{ scale: timerScale }] },
          ]}
        >
          <View style={styles.restTimerContent}>
            <Text style={styles.restTimerLabel}>Rest Timer</Text>
            <Text style={styles.restTimerTime}>
              {formatTime(restTimer.remainingSeconds)}
            </Text>

            {/* Progress Bar */}
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  { width: `${restProgress * 100}%` },
                ]}
              />
            </View>

            {/* Timer Controls */}
            <View style={styles.restTimerControls}>
              <TouchableOpacity
                style={styles.timerControlButton}
                onPress={resetRestTimer}
              >
                <RotateCcw size={20} color="#ffffff" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.skipButton}
                onPress={skipRestTimer}
              >
                <Text style={styles.skipButtonText}>Skip</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.timerControlButton}
                onPress={() => startRestTimer(restTimer.remainingSeconds + 30)}
              >
                <Text style={styles.addTimeText}>+30s</Text>
              </TouchableOpacity>
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
    fontWeight: '700',
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
    fontWeight: '600',
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
    fontWeight: '700',
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
    fontWeight: '700',
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
    fontWeight: '600',
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },

  emptyTitle: {
    color: '#94a3b8',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },

  emptySubtitle: {
    color: '#64748b',
    fontSize: 14,
  },

  bottomSpacer: {
    height: 100,
  },

  // Rest Timer Overlay
  restTimerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 20,
  },

  restTimerContent: {
    alignItems: 'center',
  },

  restTimerLabel: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },

  restTimerTime: {
    color: '#ffffff',
    fontSize: 56,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  progressBarContainer: {
    width: '100%',
    height: 6,
    backgroundColor: '#334155',
    borderRadius: 3,
    marginTop: 16,
    marginBottom: 20,
    overflow: 'hidden',
  },

  progressBar: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 3,
  },

  restTimerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },

  timerControlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },

  addTimeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },

  skipButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },

  skipButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
