/**
 * Memoized selectors for Zustand stores
 * These prevent unnecessary re-renders by providing stable references
 */

import { useWorkoutStore, WorkoutExercise, WorkoutSet, ActiveWorkout } from './workoutStore';
import { useExerciseStore } from './exerciseStore';
import { useAuthStore } from './authStore';
import { useSettingsStore } from './settingsStore';
import { shallow } from 'zustand/shallow';

// ============================================
// Workout Store Selectors
// ============================================

/**
 * Get active workout (memoized)
 */
export const useActiveWorkout = () =>
  useWorkoutStore((state) => state.activeWorkout);

/**
 * Check if workout is active
 */
export const useIsWorkoutActive = () =>
  useWorkoutStore((state) => state.isWorkoutActive);

/**
 * Get current workout exercises (with shallow compare)
 */
export const useWorkoutExercises = () =>
  useWorkoutStore(
    (state) => state.activeWorkout?.exercises ?? [],
    shallow
  );

/**
 * Get workout name
 */
export const useWorkoutName = () =>
  useWorkoutStore((state) => state.activeWorkout?.name ?? 'Workout');

/**
 * Get rest timer state (with shallow compare)
 */
export const useRestTimer = () =>
  useWorkoutStore(
    (state) => state.restTimer,
    shallow
  );

/**
 * Check if rest timer is running
 */
export const useIsRestTimerRunning = () =>
  useWorkoutStore((state) => state.restTimer.isRunning);

/**
 * Get specific exercise by ID
 */
export const useWorkoutExercise = (exerciseId: string): WorkoutExercise | undefined =>
  useWorkoutStore(
    (state) => state.activeWorkout?.exercises.find(e => e.id === exerciseId),
    shallow
  );

/**
 * Get sets for a specific exercise
 */
export const useExerciseSets = (exerciseId: string): WorkoutSet[] =>
  useWorkoutStore(
    (state) => state.activeWorkout?.exercises.find(e => e.id === exerciseId)?.sets ?? [],
    shallow
  );

/**
 * Get workout actions (stable references)
 */
export const useWorkoutActions = () =>
  useWorkoutStore(
    (state) => ({
      startWorkout: state.startWorkout,
      endWorkout: state.endWorkout,
      discardWorkout: state.discardWorkout,
      addExercise: state.addExercise,
      addExerciseWithSets: state.addExerciseWithSets,
      removeExercise: state.removeExercise,
      reorderExercises: state.reorderExercises,
      updateExerciseNotes: state.updateExerciseNotes,
    }),
    shallow
  );

/**
 * Get set actions (stable references)
 */
export const useSetActions = () =>
  useWorkoutStore(
    (state) => ({
      addSet: state.addSet,
      updateSet: state.updateSet,
      completeSet: state.completeSet,
      deleteSet: state.deleteSet,
      duplicateSet: state.duplicateSet,
    }),
    shallow
  );

/**
 * Get rest timer actions (stable references)
 */
export const useRestTimerActions = () =>
  useWorkoutStore(
    (state) => ({
      startRestTimer: state.startRestTimer,
      skipRestTimer: state.skipRestTimer,
      tickRestTimer: state.tickRestTimer,
      resetRestTimer: state.resetRestTimer,
      extendRestTimer: state.extendRestTimer,
      setExerciseRestTime: state.setExerciseRestTime,
      getExerciseRestTime: state.getExerciseRestTime,
    }),
    shallow
  );

/**
 * Get computed workout stats (stable)
 */
export const useWorkoutStats = () =>
  useWorkoutStore(
    (state) => ({
      getTotalVolume: state.getTotalVolume,
      getTotalSets: state.getTotalSets,
      getTotalReps: state.getTotalReps,
      getWorkoutDuration: state.getWorkoutDuration,
    }),
    shallow
  );

// ============================================
// Exercise Store Selectors
// ============================================

/**
 * Get all exercises (memoized)
 */
export const useExercises = () =>
  useExerciseStore((state) => state.exercises, shallow);

/**
 * Get exercise loading state
 */
export const useExerciseLoading = () =>
  useExerciseStore((state) => state.isLoading);

/**
 * Get current search query
 */
export const useExerciseSearchQuery = () =>
  useExerciseStore((state) => state.searchQuery);

/**
 * Get current filters (with shallow compare)
 */
export const useExerciseFilters = () =>
  useExerciseStore(
    (state) => ({
      selectedBodyPart: state.selectedBodyPart,
      selectedEquipment: state.selectedEquipment,
      activePreset: state.activePreset,
    }),
    shallow
  );

/**
 * Get favorite exercise IDs
 */
export const useFavoriteIds = () =>
  useExerciseStore((state) => state.favoriteIds, shallow);

/**
 * Get recently used exercise IDs
 */
export const useRecentlyUsedIds = () =>
  useExerciseStore((state) => state.recentlyUsedIds, shallow);

/**
 * Get exercise actions (stable references)
 */
export const useExerciseActions = () =>
  useExerciseStore(
    (state) => ({
      fetchExercises: state.fetchExercises,
      searchExercises: state.searchExercises,
      filterByBodyPart: state.filterByBodyPart,
      filterByEquipment: state.filterByEquipment,
      getFilteredExercises: state.getFilteredExercises,
      clearFilters: state.clearFilters,
      clearAllFilters: state.clearAllFilters,
      toggleFavorite: state.toggleFavorite,
      isFavorite: state.isFavorite,
      addToRecentlyUsed: state.addToRecentlyUsed,
    }),
    shallow
  );

// ============================================
// Auth Store Selectors
// ============================================

/**
 * Get current user
 */
export const useUser = () =>
  useAuthStore((state) => state.user);

/**
 * Get current session
 */
export const useSession = () =>
  useAuthStore((state) => state.session);

/**
 * Check if user is authenticated
 */
export const useIsAuthenticated = () =>
  useAuthStore((state) => !!state.session && !!state.user);

/**
 * Get auth loading state
 */
export const useAuthLoading = () =>
  useAuthStore((state) => state.isLoading);

/**
 * Check if auth is initialized
 */
export const useAuthInitialized = () =>
  useAuthStore((state) => state.isInitialized);

/**
 * Get auth actions (stable references)
 */
export const useAuthActions = () =>
  useAuthStore(
    (state) => ({
      initialize: state.initialize,
      signIn: state.signIn,
      signUp: state.signUp,
      signOut: state.signOut,
      resetPassword: state.resetPassword,
    }),
    shallow
  );

// ============================================
// Settings Store Selectors
// ============================================

/**
 * Get weight unit preference
 */
export const useWeightUnit = () =>
  useSettingsStore((state) => state.weightUnit);

/**
 * Get measurement unit preference
 */
export const useMeasurementUnit = () =>
  useSettingsStore((state) => state.measurementUnit);

/**
 * Get rest timer settings
 */
export const useRestTimerSettings = () =>
  useSettingsStore(
    (state) => ({
      restTimerDefault: state.restTimerDefault,
      autoStartTimer: state.autoStartTimer,
      restTimerSound: state.restTimerSound,
      restTimerVibration: state.restTimerVibration,
    }),
    shallow
  );

/**
 * Get notification settings
 */
export const useNotificationSettings = () =>
  useSettingsStore(
    (state) => ({
      notificationsEnabled: state.notificationsEnabled,
      reminderTime: state.reminderTime,
    }),
    shallow
  );

/**
 * Get all settings (with shallow compare)
 */
export const useSettings = () =>
  useSettingsStore(
    (state) => ({
      unitSystem: state.unitSystem,
      weightUnit: state.weightUnit,
      measurementUnit: state.measurementUnit,
      restTimerDefault: state.restTimerDefault,
      autoStartTimer: state.autoStartTimer,
      notificationsEnabled: state.notificationsEnabled,
    }),
    shallow
  );

/**
 * Get settings actions (stable references)
 */
export const useSettingsActions = () =>
  useSettingsStore(
    (state) => ({
      setUnitSystem: state.setUnitSystem,
      setWeightUnit: state.setWeightUnit,
      setMeasurementUnit: state.setMeasurementUnit,
      setRestTimerDefault: state.setRestTimerDefault,
      setAutoStartTimer: state.setAutoStartTimer,
      updateSettings: state.updateSettings,
      syncFromProfile: state.syncFromProfile,
      syncToProfile: state.syncToProfile,
    }),
    shallow
  );


