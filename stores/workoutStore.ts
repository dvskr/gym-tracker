import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ExerciseDBExercise } from '@/types/database';
import { supabase } from '@/lib/supabase';

// ============================================
// Types
// ============================================

export interface WorkoutSet {
  id: string;
  setNumber: number;
  weight: number | null;
  weightUnit: 'lbs' | 'kg';
  reps: number | null;
  setType: 'normal' | 'warmup' | 'dropset' | 'failure';
  rpe: number | null;
  isCompleted: boolean;
  completedAt: string | null;
}

export interface WorkoutExercise {
  id: string;
  exercise: ExerciseDBExercise;
  orderIndex: number;
  notes: string;
  sets: WorkoutSet[];
}

export interface ActiveWorkout {
  id: string;
  name: string;
  startedAt: string;
  templateId: string | null;
  exercises: WorkoutExercise[];
}

export interface RestTimer {
  isRunning: boolean;
  remainingSeconds: number;
  totalSeconds: number;
}

interface WorkoutState {
  // State
  activeWorkout: ActiveWorkout | null;
  isWorkoutActive: boolean;
  restTimer: RestTimer;

  // Workout Actions
  startWorkout: (name?: string, templateId?: string | null) => void;
  endWorkout: () => Promise<{ success: boolean; workoutId?: string; error?: string }>;
  discardWorkout: () => void;

  // Exercise Actions
  addExercise: (exercise: ExerciseDBExercise) => void;
  removeExercise: (exerciseId: string) => void;
  reorderExercises: (fromIndex: number, toIndex: number) => void;
  updateExerciseNotes: (exerciseId: string, notes: string) => void;

  // Set Actions
  addSet: (exerciseId: string) => void;
  updateSet: (exerciseId: string, setId: string, data: Partial<WorkoutSet>) => void;
  completeSet: (exerciseId: string, setId: string) => void;
  deleteSet: (exerciseId: string, setId: string) => void;
  duplicateSet: (exerciseId: string, setId: string) => void;

  // Rest Timer Actions
  startRestTimer: (seconds: number) => void;
  skipRestTimer: () => void;
  tickRestTimer: () => void;
  resetRestTimer: () => void;

  // Computed
  getTotalVolume: () => number;
  getTotalSets: () => number;
  getTotalReps: () => number;
  getWorkoutDuration: () => number;
}

// ============================================
// Helpers
// ============================================

const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const createDefaultSet = (setNumber: number): WorkoutSet => ({
  id: generateId(),
  setNumber,
  weight: null,
  weightUnit: 'lbs',
  reps: null,
  setType: 'normal',
  rpe: null,
  isCompleted: false,
  completedAt: null,
});

// ============================================
// Store
// ============================================

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set, get) => ({
      // Initial State
      activeWorkout: null,
      isWorkoutActive: false,
      restTimer: {
        isRunning: false,
        remainingSeconds: 0,
        totalSeconds: 0,
      },

      // ==========================================
      // Workout Actions
      // ==========================================

      startWorkout: (name = 'New Workout', templateId = null) => {
        const workout: ActiveWorkout = {
          id: generateId(),
          name,
          startedAt: new Date().toISOString(),
          templateId,
          exercises: [],
        };

        set({
          activeWorkout: workout,
          isWorkoutActive: true,
        });
      },

      endWorkout: async () => {
        const { activeWorkout } = get();

        if (!activeWorkout) {
          return { success: false, error: 'No active workout' };
        }

        // Calculate totals
        const totalVolume = get().getTotalVolume();
        const totalSets = get().getTotalSets();
        const totalReps = get().getTotalReps();
        const durationSeconds = get().getWorkoutDuration();

        try {
          // Get current user
          const { data: { user } } = await supabase.auth.getUser();
          
          if (!user) {
            return { success: false, error: 'User not authenticated' };
          }

          // Insert workout
          const { data: workout, error: workoutError } = await supabase
            .from('workouts')
            .insert({
              user_id: user.id,
              name: activeWorkout.name,
              started_at: activeWorkout.startedAt,
              ended_at: new Date().toISOString(),
              duration_seconds: durationSeconds,
              total_volume: totalVolume,
              total_sets: totalSets,
              total_reps: totalReps,
              template_id: activeWorkout.templateId,
            })
            .select()
            .single();

          if (workoutError) throw workoutError;

          // Insert workout exercises
          for (const exercise of activeWorkout.exercises) {
            // First, check if exercise exists in DB or create it
            let exerciseId: string;
            
            const { data: existingExercise } = await supabase
              .from('exercises')
              .select('id')
              .eq('external_id', exercise.exercise.id)
              .single();

            if (existingExercise) {
              exerciseId = existingExercise.id;
            } else {
              // Create exercise in DB
              const { data: newExercise, error: exerciseError } = await supabase
                .from('exercises')
                .insert({
                  external_id: exercise.exercise.id,
                  name: exercise.exercise.name,
                  primary_muscles: [exercise.exercise.target],
                  secondary_muscles: exercise.exercise.secondaryMuscles,
                  equipment: exercise.exercise.equipment,
                  category: exercise.exercise.bodyPart,
                  gif_url: exercise.exercise.gifUrl,
                  instructions: exercise.exercise.instructions,
                  is_custom: false,
                })
                .select()
                .single();

              if (exerciseError) throw exerciseError;
              exerciseId = newExercise.id;
            }

            // Insert workout exercise
            const { data: workoutExercise, error: weError } = await supabase
              .from('workout_exercises')
              .insert({
                workout_id: workout.id,
                exercise_id: exerciseId,
                order_index: exercise.orderIndex,
                notes: exercise.notes || null,
              })
              .select()
              .single();

            if (weError) throw weError;

            // Insert sets
            const completedSets = exercise.sets.filter((s) => s.isCompleted);
            
            if (completedSets.length > 0) {
              const setsToInsert = completedSets.map((s) => ({
                workout_exercise_id: workoutExercise.id,
                set_number: s.setNumber,
                weight: s.weight,
                weight_unit: s.weightUnit,
                reps: s.reps,
                set_type: s.setType,
                rpe: s.rpe,
                is_completed: true,
                completed_at: s.completedAt,
              }));

              const { error: setsError } = await supabase
                .from('workout_sets')
                .insert(setsToInsert);

              if (setsError) throw setsError;
            }
          }

          // Clear active workout
          set({
            activeWorkout: null,
            isWorkoutActive: false,
            restTimer: { isRunning: false, remainingSeconds: 0, totalSeconds: 0 },
          });

          return { success: true, workoutId: workout.id };
        } catch (error) {
          console.error('Failed to save workout:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to save workout',
          };
        }
      },

      discardWorkout: () => {
        set({
          activeWorkout: null,
          isWorkoutActive: false,
          restTimer: { isRunning: false, remainingSeconds: 0, totalSeconds: 0 },
        });
      },

      // ==========================================
      // Exercise Actions
      // ==========================================

      addExercise: (exercise: ExerciseDBExercise) => {
        set((state) => {
          if (!state.activeWorkout) return state;

          const newExercise: WorkoutExercise = {
            id: generateId(),
            exercise,
            orderIndex: state.activeWorkout.exercises.length,
            notes: '',
            sets: [createDefaultSet(1)],
          };

          return {
            activeWorkout: {
              ...state.activeWorkout,
              exercises: [...state.activeWorkout.exercises, newExercise],
            },
          };
        });
      },

      removeExercise: (exerciseId: string) => {
        set((state) => {
          if (!state.activeWorkout) return state;

          const exercises = state.activeWorkout.exercises
            .filter((e) => e.id !== exerciseId)
            .map((e, index) => ({ ...e, orderIndex: index }));

          return {
            activeWorkout: {
              ...state.activeWorkout,
              exercises,
            },
          };
        });
      },

      reorderExercises: (fromIndex: number, toIndex: number) => {
        set((state) => {
          if (!state.activeWorkout) return state;

          const exercises = [...state.activeWorkout.exercises];
          const [removed] = exercises.splice(fromIndex, 1);
          exercises.splice(toIndex, 0, removed);

          // Update order indices
          const reorderedExercises = exercises.map((e, index) => ({
            ...e,
            orderIndex: index,
          }));

          return {
            activeWorkout: {
              ...state.activeWorkout,
              exercises: reorderedExercises,
            },
          };
        });
      },

      updateExerciseNotes: (exerciseId: string, notes: string) => {
        set((state) => {
          if (!state.activeWorkout) return state;

          const exercises = state.activeWorkout.exercises.map((e) =>
            e.id === exerciseId ? { ...e, notes } : e
          );

          return {
            activeWorkout: {
              ...state.activeWorkout,
              exercises,
            },
          };
        });
      },

      // ==========================================
      // Set Actions
      // ==========================================

      addSet: (exerciseId: string) => {
        set((state) => {
          if (!state.activeWorkout) return state;

          const exercises = state.activeWorkout.exercises.map((e) => {
            if (e.id !== exerciseId) return e;

            const newSetNumber = e.sets.length + 1;
            const lastSet = e.sets[e.sets.length - 1];

            // Copy weight/reps from last set if available
            const newSet: WorkoutSet = {
              ...createDefaultSet(newSetNumber),
              weight: lastSet?.weight ?? null,
              weightUnit: lastSet?.weightUnit ?? 'lbs',
              reps: lastSet?.reps ?? null,
            };

            return {
              ...e,
              sets: [...e.sets, newSet],
            };
          });

          return {
            activeWorkout: {
              ...state.activeWorkout,
              exercises,
            },
          };
        });
      },

      updateSet: (exerciseId: string, setId: string, data: Partial<WorkoutSet>) => {
        set((state) => {
          if (!state.activeWorkout) return state;

          const exercises = state.activeWorkout.exercises.map((e) => {
            if (e.id !== exerciseId) return e;

            const sets = e.sets.map((s) =>
              s.id === setId ? { ...s, ...data } : s
            );

            return { ...e, sets };
          });

          return {
            activeWorkout: {
              ...state.activeWorkout,
              exercises,
            },
          };
        });
      },

      completeSet: (exerciseId: string, setId: string) => {
        set((state) => {
          if (!state.activeWorkout) return state;

          const exercises = state.activeWorkout.exercises.map((e) => {
            if (e.id !== exerciseId) return e;

            const sets = e.sets.map((s) =>
              s.id === setId
                ? {
                    ...s,
                    isCompleted: !s.isCompleted,
                    completedAt: !s.isCompleted ? new Date().toISOString() : null,
                  }
                : s
            );

            return { ...e, sets };
          });

          return {
            activeWorkout: {
              ...state.activeWorkout,
              exercises,
            },
          };
        });
      },

      deleteSet: (exerciseId: string, setId: string) => {
        set((state) => {
          if (!state.activeWorkout) return state;

          const exercises = state.activeWorkout.exercises.map((e) => {
            if (e.id !== exerciseId) return e;

            const sets = e.sets
              .filter((s) => s.id !== setId)
              .map((s, index) => ({ ...s, setNumber: index + 1 }));

            return { ...e, sets };
          });

          return {
            activeWorkout: {
              ...state.activeWorkout,
              exercises,
            },
          };
        });
      },

      duplicateSet: (exerciseId: string, setId: string) => {
        set((state) => {
          if (!state.activeWorkout) return state;

          const exercises = state.activeWorkout.exercises.map((e) => {
            if (e.id !== exerciseId) return e;

            const setIndex = e.sets.findIndex((s) => s.id === setId);
            if (setIndex === -1) return e;

            const setToDuplicate = e.sets[setIndex];
            const newSet: WorkoutSet = {
              ...setToDuplicate,
              id: generateId(),
              setNumber: e.sets.length + 1,
              isCompleted: false,
              completedAt: null,
            };

            return {
              ...e,
              sets: [...e.sets, newSet],
            };
          });

          return {
            activeWorkout: {
              ...state.activeWorkout,
              exercises,
            },
          };
        });
      },

      // ==========================================
      // Rest Timer Actions
      // ==========================================

      startRestTimer: (seconds: number) => {
        set({
          restTimer: {
            isRunning: true,
            remainingSeconds: seconds,
            totalSeconds: seconds,
          },
        });
      },

      skipRestTimer: () => {
        set({
          restTimer: {
            isRunning: false,
            remainingSeconds: 0,
            totalSeconds: 0,
          },
        });
      },

      tickRestTimer: () => {
        set((state) => {
          if (!state.restTimer.isRunning) return state;

          const newRemaining = state.restTimer.remainingSeconds - 1;

          if (newRemaining <= 0) {
            return {
              restTimer: {
                isRunning: false,
                remainingSeconds: 0,
                totalSeconds: state.restTimer.totalSeconds,
              },
            };
          }

          return {
            restTimer: {
              ...state.restTimer,
              remainingSeconds: newRemaining,
            },
          };
        });
      },

      resetRestTimer: () => {
        set((state) => ({
          restTimer: {
            isRunning: true,
            remainingSeconds: state.restTimer.totalSeconds,
            totalSeconds: state.restTimer.totalSeconds,
          },
        }));
      },

      // ==========================================
      // Computed Values
      // ==========================================

      getTotalVolume: () => {
        const { activeWorkout } = get();
        if (!activeWorkout) return 0;

        return activeWorkout.exercises.reduce((total, exercise) => {
          const exerciseVolume = exercise.sets
            .filter((s) => s.isCompleted && s.weight && s.reps)
            .reduce((sum, s) => sum + (s.weight || 0) * (s.reps || 0), 0);
          return total + exerciseVolume;
        }, 0);
      },

      getTotalSets: () => {
        const { activeWorkout } = get();
        if (!activeWorkout) return 0;

        return activeWorkout.exercises.reduce((total, exercise) => {
          return total + exercise.sets.filter((s) => s.isCompleted).length;
        }, 0);
      },

      getTotalReps: () => {
        const { activeWorkout } = get();
        if (!activeWorkout) return 0;

        return activeWorkout.exercises.reduce((total, exercise) => {
          const exerciseReps = exercise.sets
            .filter((s) => s.isCompleted)
            .reduce((sum, s) => sum + (s.reps || 0), 0);
          return total + exerciseReps;
        }, 0);
      },

      getWorkoutDuration: () => {
        const { activeWorkout } = get();
        if (!activeWorkout) return 0;

        const startTime = new Date(activeWorkout.startedAt).getTime();
        const now = Date.now();
        return Math.floor((now - startTime) / 1000);
      },
    }),
    {
      name: 'workout-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Persist active workout to recover from app crashes
      partialize: (state) => ({
        activeWorkout: state.activeWorkout,
        isWorkoutActive: state.isWorkoutActive,
      }),
    }
  )
);

// Selector hooks
export const useActiveWorkout = () => useWorkoutStore((state) => state.activeWorkout);
export const useIsWorkoutActive = () => useWorkoutStore((state) => state.isWorkoutActive);
export const useRestTimer = () => useWorkoutStore((state) => state.restTimer);

