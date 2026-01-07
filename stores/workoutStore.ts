import { create } from 'zustand';
import { logger } from '@/lib/utils/logger';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ExerciseDBExercise } from '@/types/database';
import { supabase } from '@/lib/supabase';
import { restTimerNotificationService } from '@/lib/notifications/restTimerNotifications';
import { engagementNotificationService } from '@/lib/notifications/engagementNotifications';
import { achievementNotificationService } from '@/lib/notifications/achievementNotifications';
import { smartTimingService } from '@/lib/notifications/smartTiming';
import { calculateStreak } from '@/lib/utils/streakCalculation';
import { getWorkoutCount } from '@/lib/utils/streakCalculation';
import { invalidateCoachContextAfterWorkout, invalidateCoachContextAfterPR } from '@/lib/ai/cacheInvalidation';
import { useSettingsStore } from './settingsStore';

/*
=============================================================================
REST TIMER INVESTIGATION REPORT
=============================================================================

✅ REST TIMER STATE EXISTS:
   - Interface: RestTimer (lines 53-58)
   - Fields: exerciseId, isRunning, remainingSeconds, totalSeconds
   - Initial state: lines 144-149
   - Per-exercise custom rest times: exerciseRestTimes object

✅ REST TIMER ACTIONS EXIST (all implemented):
   - startRestTimer(exerciseId, seconds?) - line 680
   - skipRestTimer() - line 706
   - tickRestTimer() - line 720
   - resetRestTimer() - line 754
   - extendRestTimer(seconds) - line 762
   - setExerciseRestTime(exerciseId, seconds) - line 769
   - getExerciseRestTime(exerciseId) - line 773

✅ REST TIMER UI COMPONENT EXISTS:
   - Location: components/workout/InlineRestTimer.tsx
   - Features: Countdown display, progress bar, extend/skip buttons, custom time selector
   - Rendered in: ExerciseCard.tsx (line 366)
   - Renders inline below exercise sets for active timer

✅ AUTO-START LOGIC EXISTS:
   - Location: app/workout/active.tsx (lines 143-147)
   - Triggered by: handleCompleteSet function
   - Condition: if (autoStartTimer) startRestTimer(exerciseId)
   - Only starts when completing a set (not when uncompleting)

✅ SETTINGS INTEGRATION EXISTS:
   - Store: settingsStore.ts
   - Field: autoStartTimer (boolean, default: true)
   - Field: restTimerDefault (number, default: 90 seconds)
   - Syncs to database profile table
   - Can be toggled in Profile tab

✅ NOTIFICATION INTEGRATION EXISTS:
   - Service: restTimerNotificationService
   - Schedules notification for rest completion
   - Provides haptic feedback at 10 seconds warning
   - Triggers completion haptics/vibration

CURRENT SET COMPLETION BEHAVIOR:
1. User taps checkmark on set
2. handleCompleteSet() called in active.tsx
3. Checks if completing (not uncompleting)
4. Calls workoutStore.completeSet(exerciseId, setId)
5. If autoStartTimer is enabled, calls startRestTimer(exerciseId)
6. InlineRestTimer renders below sets for that exercise
7. Timer counts down with progress bar
8. User can extend (+30s) or skip
9. On completion: haptic feedback + notification

CONCLUSION: AUTO-START REST TIMER IS FULLY IMPLEMENTED AND WORKING!
=============================================================================
*/

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
  isCompleted: boolean;
  completedAt: string | null;
  isPR: boolean;
  prType: 'max_weight' | 'max_reps' | 'max_volume' | null;
  // New measurement fields
  durationSeconds?: number | null;
  distanceMeters?: number | null;
  assistanceWeight?: number | null;
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
  exerciseId: string | null; // Which exercise the timer is for
  isRunning: boolean;
  remainingSeconds: number;
  totalSeconds: number;
}

// Default rest times per exercise (stored locally)
export interface ExerciseRestTimes {
  [exerciseId: string]: number; // seconds
}

interface WorkoutState {
  // State
  activeWorkout: ActiveWorkout | null;
  isWorkoutActive: boolean;
  restTimer: RestTimer;
  exerciseRestTimes: ExerciseRestTimes; // Custom rest times per exercise

  // Workout Actions
  startWorkout: (name?: string, templateId?: string | null) => void;
  endWorkout: () => Promise<{ success: boolean; workoutId?: string; error?: string }>;
  discardWorkout: () => void;

  // Exercise Actions
  addExercise: (exercise: ExerciseDBExercise) => void;
  addExerciseWithSets: (
    exercise: ExerciseDBExercise,
    prefillSets: Array<{ weight?: number; reps?: number }>,
    targetSets?: number
  ) => void;
  removeExercise: (exerciseId: string) => void;
  reorderExercises: (fromIndex: number, toIndex: number) => void;
  updateExerciseNotes: (exerciseId: string, notes: string) => void;

  // Set Actions
  addSet: (exerciseId: string) => void;
  updateSet: (exerciseId: string, setId: string, data: Partial<WorkoutSet>) => void;
  completeSet: (exerciseId: string, setId: string) => Promise<void>;
  deleteSet: (exerciseId: string, setId: string) => void;
  duplicateSet: (exerciseId: string, setId: string) => void;
  markSetAsPR: (exerciseId: string, setId: string, prType: 'max_weight' | 'max_reps' | 'max_volume') => void;
  getWorkoutPRs: () => Array<{ exerciseId: string; exerciseName: string; setId: string; prType: string; weight: number; reps: number }>;

  // Rest Timer Actions
  startRestTimer: (exerciseId: string, seconds?: number) => void;
  skipRestTimer: () => void;
  tickRestTimer: () => void;
  resetRestTimer: () => void;
  extendRestTimer: (seconds: number) => void;
  setExerciseRestTime: (exerciseId: string, seconds: number) => void;
  getExerciseRestTime: (exerciseId: string) => number;

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
  isCompleted: false,
  completedAt: null,
  isPR: false,
  prType: null,
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
        exerciseId: null,
        isRunning: false,
        remainingSeconds: 0,
        totalSeconds: 0,
      },
      exerciseRestTimes: {}, // Custom rest times per exercise

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

          // OPTIMIZATION: Process all exercises in parallel
          const exercisePromises = activeWorkout.exercises.map(async (exercise) => {
            // Skip exercises with no completed sets
            const completedSets = exercise.sets.filter((s) => s.isCompleted);
            if (completedSets.length === 0) {
              return null;
            }

            // Use dbId if available (already exists in DB), otherwise look up by external_id
            let exerciseId: string;
            
            if (exercise.exercise.dbId) {
              exerciseId = exercise.exercise.dbId;
            } else {
              // Legacy path: look up by external_id
              const { data: existingExercise } = await supabase
                .from('exercises')
                .select('id')
                .eq('external_id', exercise.exercise.id)
                .single();

              if (existingExercise) {
                exerciseId = existingExercise.id;
              } else {
                // Create exercise in DB (only for custom exercises)
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
                    is_custom: true,
                    created_by: user.id,
                  })
                  .select()
                  .single();

                if (exerciseError) throw exerciseError;
                exerciseId = newExercise.id;
              }
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
            const setsToInsert = completedSets.map((s) => ({
              workout_exercise_id: workoutExercise.id,
              set_number: s.setNumber,
              weight: Math.min(s.weight || 0, 99999.99),
              weight_unit: s.weightUnit,
              reps: Math.min(s.reps || 0, 9999),
              set_type: s.setType,
              is_completed: true,
              completed_at: s.completedAt,
              is_pr: s.isPR,
              pr_type: s.prType,
            }));

            logger.log(`[WorkoutStore] Inserting ${setsToInsert.length} sets, ${setsToInsert.filter(s => s.is_pr).length} are PRs`);

            const { error: setsError } = await supabase
              .from('workout_sets')
              .insert(setsToInsert);

            if (setsError) throw setsError;
            
            return { exerciseId: exercise.id, dbExerciseId: exerciseId };
          });

          // Wait for all exercises to be saved in parallel
          const exerciseResults = await Promise.all(exercisePromises);
          
          // Create a map of exercise IDs to database IDs for PR saving
          const exerciseIdMap = new Map<string, string>();
          exerciseResults.forEach(result => {
            if (result) {
              exerciseIdMap.set(result.exerciseId, result.dbExerciseId);
            }
          });

          // Save PRs to personal_records table
          const workoutPRs = get().getWorkoutPRs();
          logger.log(`[WorkoutStore] Found ${workoutPRs.length} PRs before clearing state`);
          
          if (workoutPRs.length > 0) {
            logger.log(`[WorkoutStore] Saving ${workoutPRs.length} PR(s) to personal_records table`);
            
            // OPTIMIZATION: Process all PRs in parallel
            const prPromises = workoutPRs.map(async (pr) => {
              // Get the database UUID for the exercise
              let dbExerciseId: string | null = exerciseIdMap.get(pr.exerciseId) || null;
              
              // Fallback if not in map
              if (!dbExerciseId) {
                const exercise = activeWorkout.exercises.find(e => e.id === pr.exerciseId);
                if (exercise) {
                  if (exercise.exercise.dbId) {
                    dbExerciseId = exercise.exercise.dbId;
                  } else {
                    const { data: dbExercise } = await supabase
                      .from('exercises')
                      .select('id')
                      .eq('external_id', exercise.exercise.id)
                      .single();
                    dbExerciseId = dbExercise?.id || null;
                  }
                }
              }
              
              if (!dbExerciseId) {
                logger.warn(`[WorkoutStore] Could not find database ID for PR exercise: ${pr.exerciseName}`);
                return;
              }
              
              // Calculate the PR value based on type
              let value: number;
              if (pr.prType === 'max_weight') {
                value = pr.weight;
              } else if (pr.prType === 'max_reps') {
                value = pr.reps;
              } else if (pr.prType === 'max_volume') {
                value = pr.weight * pr.reps;
              } else {
                value = 0;
              }
              
              // Check if PR already exists for this exercise and type
              const { data: existingPR } = await supabase
                .from('personal_records')
                .select('*')
                .eq('user_id', user.id)
                .eq('exercise_id', dbExerciseId)
                .eq('record_type', pr.prType)
                .single();
              
              if (existingPR) {
                // Update existing PR if new value is better
                if (value > existingPR.value) {
                  const { error: updateError } = await supabase
                    .from('personal_records')
                    .update({
                      value,
                      weight: pr.weight,
                      reps: pr.reps,
                      workout_id: workout.id,
                      achieved_at: new Date().toISOString(),
                    })
                    .eq('id', existingPR.id);
                  
                  if (updateError) {
                    logger.error('[WorkoutStore] Error updating PR:', updateError);
                  } else {
                    logger.log(`[WorkoutStore] Updated PR: ${pr.exerciseName} - ${pr.prType} = ${value}`);
                  }
                }
              } else {
                // Insert new PR
                const { error: insertError } = await supabase
                  .from('personal_records')
                  .insert({
                    user_id: user.id,
                    exercise_id: dbExerciseId,
                    record_type: pr.prType,
                    value,
                    weight: pr.weight,
                    reps: pr.reps,
                    workout_id: workout.id,
                    achieved_at: new Date().toISOString(),
                  });
                
                if (insertError) {
                  logger.error('[WorkoutStore] Error inserting PR:', insertError);
                } else {
                  logger.log(`[WorkoutStore] Inserted PR: ${pr.exerciseName} - ${pr.prType} = ${value}`);
                }
              }
            });
            
            // Wait for all PRs to be saved in parallel
            await Promise.all(prPromises);
          }

          // Don't celebrate here - celebration will happen on the complete screen
          // The complete screen will check for PRs and trigger celebration when mounted
          logger.log('[WorkoutStore] Workout saved with PRs - celebration will happen on complete screen');

          // Clear active workout
logger.log('[WorkoutStore] endWorkout: clearing state...');
          set({
            activeWorkout: null,
            isWorkoutActive: false,
            restTimer: { exerciseId: null, isRunning: false, remainingSeconds: 0, totalSeconds: 0 },
          });
logger.log('[WorkoutStore] State after endWorkout:', {
            activeWorkout: get().activeWorkout,
            isWorkoutActive: get().isWorkoutActive,
          });

          // Trigger engagement notifications in background
          triggerEngagementNotifications(user.id, workout.ended_at ?? new Date().toISOString());

          // Invalidate AI cache so coach sees latest workout
          invalidateCoachContextAfterWorkout(user.id);

          return { success: true, workoutId: workout.id };
        } catch (error: unknown) {
logger.error('Failed to save workout:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to save workout',
          };
        }
      },

      discardWorkout: () => {
 logger.log('[WorkoutStore] discardWorkout called');
        // Clear state
        set({
          activeWorkout: null,
          isWorkoutActive: false,
          restTimer: { exerciseId: null, isRunning: false, remainingSeconds: 0, totalSeconds: 0 },
        });
 logger.log('[WorkoutStore] State after discard:', {
          activeWorkout: get().activeWorkout,
          isWorkoutActive: get().isWorkoutActive,
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

      /**
       * Add exercise with pre-filled sets from previous workout or template
       * @param exercise - The exercise to add
       * @param prefillSets - Array of set data to pre-fill (from previous workout)
       * @param targetSets - Number of sets to create (from template), defaults to prefillSets length or 3
       */
      addExerciseWithSets: (
        exercise: ExerciseDBExercise,
        prefillSets: Array<{ weight?: number; reps?: number }>,
        targetSets?: number
      ) => {
        set((state) => {
          if (!state.activeWorkout) return state;

          // Determine how many sets to create
          const numSets = targetSets || prefillSets.length || 3;

          // Create sets with pre-filled data
          const sets: WorkoutSet[] = [];
          for (let i = 0; i < numSets; i++) {
            // Get prefill data for this set (fallback to last available if set doesn't exist)
            const prefillData = prefillSets[i] || prefillSets[prefillSets.length - 1] || {};

            sets.push({
              id: generateId(),
              setNumber: i + 1,
              weight: prefillData.weight ?? null,
              weightUnit: 'lbs',
              reps: prefillData.reps ?? null,
              setType: 'normal',
              isCompleted: false,
              completedAt: null,
              isPR: false,
              prType: null,
            });
          }

          const newExercise: WorkoutExercise = {
            id: generateId(),
            exercise,
            orderIndex: state.activeWorkout.exercises.length,
            notes: '',
            sets,
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
            
            // Check if auto-fill is enabled
            const { autoFillSets } = useSettingsStore.getState();

            // Copy weight/reps from last set if available AND autoFillSets is enabled
            const newSet: WorkoutSet = {
              ...createDefaultSet(newSetNumber),
              weight: (autoFillSets && lastSet?.weight) ? lastSet.weight : null,
              weightUnit: lastSet?.weightUnit ?? 'lbs',
              reps: (autoFillSets && lastSet?.reps) ? lastSet.reps : null,
              isPR: false,
              prType: null,
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
        logger.log(`[WorkoutStore] updateSet called: exerciseId=${exerciseId}, setId=${setId}, data=${JSON.stringify(data)}`);
        
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

      completeSet: async (exerciseId: string, setId: string) => {
        logger.log(`[WorkoutStore] completeSet called for exercise ${exerciseId}, set ${setId}`);
        
        const state = get();
        if (!state.activeWorkout) return;

        // Find the exercise and set
        const exercise = state.activeWorkout.exercises.find(e => e.id === exerciseId);
        const targetSet = exercise?.sets.find(s => s.id === setId);
        
        if (!exercise || !targetSet) return;

        const wasCompleted = targetSet.isCompleted;
        const isNowCompleting = !wasCompleted;

        // Toggle the set completion
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

        // If completing (not uncompleting), check for PRs
        // Re-fetch the set to get the LATEST values (in case reps/weight just updated)
        const latestState = get();
        const latestExercise = latestState.activeWorkout?.exercises.find(e => e.id === exerciseId);
        const latestSet = latestExercise?.sets.find(s => s.id === setId);
        
        logger.log(`[WorkoutStore] PR check decision: isNowCompleting=${isNowCompleting}, weight=${latestSet?.weight}, reps=${latestSet?.reps}`);
        
        if (isNowCompleting && latestExercise && latestSet && latestSet.weight && latestSet.reps) {
          // Import at top of file if not already
          const { checkForPR } = await import('@/lib/utils/prDetection');
          const { celebratePR } = await import('@/lib/utils/celebrations');
          const { data: { user } } = await supabase.auth.getUser();
          
          if (user) {
            // Get the database UUID for this exercise
            // exercise.exercise.id is the external_id, we need the database UUID
            let dbExerciseId = latestExercise.exercise.dbId || latestExercise.exercise.id;
            
            // If we don't have dbId and id looks like an external ID (not a UUID), look it up
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dbExerciseId);
            
            if (!isUUID) {
              // Need to look up the database UUID from external_id
              const { data: dbExercise } = await supabase
                .from('exercises')
                .select('id')
                .eq('external_id', latestExercise.exercise.id)
                .single();
              
              if (dbExercise) {
                dbExerciseId = dbExercise.id;
              } else {
                logger.warn(`[PR Check] Could not find database UUID for exercise ${latestExercise.exercise.name} (external_id: ${latestExercise.exercise.id})`);
                return; // Skip PR check if we can't find the database ID
              }
            }
            
            const prChecks = await checkForPR(
              user.id,
              dbExerciseId,
              latestSet.weight,
              latestSet.reps,
              latestExercise.exercise.name
            );

            if (prChecks.length > 0) {
              // Mark set with first PR type (usually max_weight is most significant)
              const primaryPR = prChecks[0];
              
              // Update the set with PR badge
              set((state) => {
                if (!state.activeWorkout) return state;

                const exercises = state.activeWorkout.exercises.map((e) => {
                  if (e.id !== exerciseId) return e;

                  const sets = e.sets.map((s) =>
                    s.id === setId ? { ...s, isPR: true, prType: primaryPR.prType } : s
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

              // Don't celebrate here - wait until workout is saved
              // The celebration will happen in endWorkout if workout is saved
            }
          }
        }
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
              isPR: false, // Reset PR status for duplicated set
              prType: null,
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

      markSetAsPR: (exerciseId: string, setId: string, prType: 'max_weight' | 'max_reps' | 'max_volume') => {
        set((state) => {
          if (!state.activeWorkout) return state;

          const exercises = state.activeWorkout.exercises.map((e) => {
            if (e.id !== exerciseId) return e;

            const sets = e.sets.map((s) =>
              s.id === setId ? { ...s, isPR: true, prType } : s
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

        // Don't celebrate here - celebration happens when workout is saved
      },

      getWorkoutPRs: () => {
        const { activeWorkout } = get();
        if (!activeWorkout) return [];

        const prs: Array<{
          exerciseId: string;
          exerciseName: string;
          setId: string;
          prType: string;
          weight: number;
          reps: number;
        }> = [];

        activeWorkout.exercises.forEach((exercise) => {
          exercise.sets.forEach((set) => {
            if (set.isPR && set.prType) {
              prs.push({
                exerciseId: exercise.id,
                exerciseName: exercise.exercise.name,
                setId: set.id,
                prType: set.prType,
                weight: set.weight || 0,
                reps: set.reps || 0,
              });
            }
          });
        });

        return prs;
      },

      // ==========================================
      // Rest Timer Actions
      // ==========================================

      startRestTimer: (exerciseId: string, seconds?: number) => {
        const { exerciseRestTimes, activeWorkout } = get();
        // Use settings from settingsStore
        const settings = useSettingsStore.getState();
        const defaultSeconds = settings.restTimerDefault; // Use setting instead of hardcoded 90
        const duration = seconds ?? exerciseRestTimes[exerciseId] ?? defaultSeconds;
        
        // Get next exercise name for notification
        const exerciseIndex = activeWorkout?.exercises.findIndex(e => e.id === exerciseId);
        const nextExercise = exerciseIndex !== undefined && exerciseIndex < (activeWorkout?.exercises.length ?? 0) - 1
          ? activeWorkout?.exercises[exerciseIndex + 1]?.exercise.name
          : undefined;
        
        set({
          restTimer: {
            exerciseId,
            isRunning: true,
            remainingSeconds: duration,
            totalSeconds: duration,
          },
        });

        // Schedule notification for rest completion
        restTimerNotificationService.scheduleRestComplete(duration, nextExercise);
      },

      skipRestTimer: () => {
        // Cancel the notification when skipping
        restTimerNotificationService.cancelRestNotification();
        
        set({
          restTimer: {
            exerciseId: null,
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

          // Trigger warning haptic at 10 seconds
          if (newRemaining === 10) {
            restTimerNotificationService.triggerWarning();
          }

          // Timer complete
          if (newRemaining <= 0) {
            // Trigger completion haptics
            restTimerNotificationService.triggerRestComplete();
            
            return {
              restTimer: {
                ...state.restTimer,
                isRunning: false,
                remainingSeconds: 0,
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
            ...state.restTimer,
            isRunning: true,
            remainingSeconds: state.restTimer.totalSeconds,
          },
        }));
      },

      extendRestTimer: (seconds: number) => {
        set((state) => ({
          restTimer: {
            ...state.restTimer,
            remainingSeconds: state.restTimer.remainingSeconds + seconds,
            totalSeconds: state.restTimer.totalSeconds + seconds,
          },
        }));
      },

      setExerciseRestTime: (exerciseId: string, seconds: number) => {
        set((state) => ({
          exerciseRestTimes: {
            ...state.exerciseRestTimes,
            [exerciseId]: seconds,
          },
        }));
      },

      getExerciseRestTime: (exerciseId: string) => {
        const { exerciseRestTimes } = get();
        return exerciseRestTimes[exerciseId] ?? 90; // Default 90 seconds
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
      // Only persist workout state, not timers
      partialize: (state) => ({
        activeWorkout: state.activeWorkout,
        isWorkoutActive: state.isWorkoutActive,
      }),
    }
  )
);

// Selector hooks for optimized component subscriptions
export const useActiveWorkout = () => useWorkoutStore((state) => state.activeWorkout);
export const useIsWorkoutActive = () => useWorkoutStore((state) => state.isWorkoutActive);
export const useRestTimer = () => useWorkoutStore((state) => state.restTimer);

/**
 * Trigger engagement notifications after workout completion
 * Runs in background without blocking
 */
async function triggerEngagementNotifications(userId: string, workoutEndedAt: string) {
  // Run in background - don't block UI
  setTimeout(async () => {
    try {
      // Calculate streak
      const streakData = await calculateStreak(userId);
      
      // Celebrate milestone streaks
      await engagementNotificationService.celebrateStreak(streakData.currentStreak);
      
      // Reschedule inactivity reminders (resets the clock)
      await engagementNotificationService.scheduleInactivityReminders(workoutEndedAt);
      
      // Reschedule weekly summary (ensures it's always scheduled for next Sunday)
      await engagementNotificationService.scheduleWeeklySummary();
      
      // Get workout stats for achievements
      const workoutCount = await getWorkoutCount(userId);
      
      // Get total stats from Supabase
      const { data: stats } = await supabase
        .from('workouts')
        .select('total_volume, total_sets, total_reps')
        .eq('user_id', userId);
      
      const totalVolume = stats?.reduce((sum, w) => sum + (w.total_volume || 0), 0) || 0;
      const totalSets = stats?.reduce((sum, w) => sum + (w.total_sets || 0), 0) || 0;
      const totalReps = stats?.reduce((sum, w) => sum + (w.total_reps || 0), 0) || 0;
      
      // Check for achievements
      await achievementNotificationService.checkWorkoutAchievements({
        totalWorkouts: workoutCount,
        totalSets,
        totalVolume,
        totalReps,
        streak: streakData.currentStreak,
        userId,
      });
      
      // Record workout time for smart timing suggestions (using ended_at as start approximation)
      const workoutEndDate = new Date(workoutEndedAt);
      await smartTimingService.recordWorkoutTime(
        workoutEndDate,
        60 // Default duration in minutes since we don't have the exact start time here
      );
      
logger.log('S& Engagement notifications triggered');
    } catch (error: unknown) {
logger.error('Failed to trigger engagement notifications:', error);
    }
  }, 1000); // Small delay to let workout save settle
}


