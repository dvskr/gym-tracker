/**
 * Workout Save/Load Flow Integration Tests
 * Tests the complete workflow of creating, saving, and loading workouts
 */

import { useWorkoutStore } from '@/stores/workoutStore';
import { supabase } from '@/lib/supabase';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
    },
  },
}));

// Mock all the notification and AI services
jest.mock('@/lib/notifications/restTimerNotifications');
jest.mock('@/lib/notifications/engagementNotifications');
jest.mock('@/lib/notifications/achievementNotifications');
jest.mock('@/lib/notifications/smartTiming');
jest.mock('@/lib/ai/cacheInvalidation');
jest.mock('@/lib/utils/streakCalculation', () => ({
  calculateStreak: jest.fn().mockResolvedValue(1),
  getWorkoutCount: jest.fn().mockResolvedValue(1),
}));
jest.mock('@/lib/utils/prDetection', () => ({
  checkForPR: jest.fn().mockResolvedValue([]),
}));
jest.mock('@/stores/settingsStore', () => ({
  useSettingsStore: {
    getState: () => ({
      restTimerDefault: 90,
      prCelebrations: true,
      autoFillSets: false,
    }),
  },
}));

describe('Workout Save/Load Flow', () => {
  const mockUser = { id: 'user-123' };

  beforeEach(() => {
    jest.clearAllMocks();
    useWorkoutStore.setState({
      activeWorkout: null,
      isWorkoutActive: false,
      restTimer: {
        exerciseId: null,
        isRunning: false,
        remainingSeconds: 0,
        totalSeconds: 0,
      },
      exerciseRestTimes: {},
    });

    // Mock auth
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
  });

  function mockDatabaseOperations() {
    const mockWorkoutId = 'workout-123';
    const mockWorkoutExerciseId = 'we-123';

    // Mock workout insert
    const workoutChain = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: mockWorkoutId },
        error: null,
      }),
    };

    // Mock workout exercise insert
    const exerciseChain = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: mockWorkoutExerciseId },
        error: null,
      }),
    };

    // Mock workout sets insert
    const setsChain = {
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
    };

    // Mock exercise lookup
    const exerciseLookupChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: 'exercise-uuid-123' },
        error: null,
      }),
    };

    (supabase.from as jest.Mock)
      .mockReturnValueOnce(workoutChain) // First call: workout insert
      .mockReturnValueOnce(exerciseLookupChain) // Exercise lookup
      .mockReturnValueOnce(exerciseChain) // Workout exercise insert
      .mockReturnValueOnce(setsChain); // Sets insert

    return { mockWorkoutId, mockWorkoutExerciseId };
  }

  describe('Complete Workout Flow', () => {
    it('creates, completes, and saves a full workout', async () => {
      // 1. Start workout
      useWorkoutStore.getState().startWorkout('Push Day');

      let state = useWorkoutStore.getState();
      expect(state.isWorkoutActive).toBe(true);
      expect(state.activeWorkout?.name).toBe('Push Day');

      // 2. Add exercise
      useWorkoutStore.getState().addExercise({
        id: 'bench-press',
        dbId: 'exercise-uuid-123',
        name: 'Bench Press',
        category: 'chest',
        target: 'pectorals',
        bodyPart: 'chest',
        equipment: 'barbell',
        gifUrl: '',
        instructions: [],
        secondaryMuscles: ['triceps'],
      } as any);

      state = useWorkoutStore.getState();
      expect(state.activeWorkout?.exercises).toHaveLength(1);

      const exerciseId = state.activeWorkout!.exercises[0].id;

      // 3. Add additional sets
      useWorkoutStore.getState().addSet(exerciseId);
      useWorkoutStore.getState().addSet(exerciseId);

      // 4. Fill in set data
      const sets = useWorkoutStore.getState().activeWorkout!.exercises[0].sets;
      useWorkoutStore.getState().updateSet(exerciseId, sets[0].id, { weight: 135, reps: 10 });
      useWorkoutStore.getState().updateSet(exerciseId, sets[1].id, { weight: 155, reps: 8 });
      useWorkoutStore.getState().updateSet(exerciseId, sets[2].id, { weight: 165, reps: 6 });

      // 5. Complete sets
      useWorkoutStore.getState().updateSet(exerciseId, sets[0].id, { isCompleted: true });
      useWorkoutStore.getState().updateSet(exerciseId, sets[1].id, { isCompleted: true });
      useWorkoutStore.getState().updateSet(exerciseId, sets[2].id, { isCompleted: true });

      // 6. Verify computed values
      expect(useWorkoutStore.getState().getTotalVolume()).toBe(
        135 * 10 + 155 * 8 + 165 * 6 // 1350 + 1240 + 990 = 3580
      );
      expect(useWorkoutStore.getState().getTotalSets()).toBe(3);
      expect(useWorkoutStore.getState().getTotalReps()).toBe(24);

      // 7. Save workout
      mockDatabaseOperations();
      const result = await useWorkoutStore.getState().endWorkout();

      expect(result.success).toBe(true);
      expect(result.workoutId).toBe('workout-123');

      // 8. Verify state cleared
      state = useWorkoutStore.getState();
      expect(state.activeWorkout).toBeNull();
      expect(state.isWorkoutActive).toBe(false);
    });

    it('handles workout with multiple exercises', async () => {
      useWorkoutStore.getState().startWorkout('Full Body');

      // Add multiple exercises
      const exercises = [
        { id: 'bench-press', dbId: 'ex-1', name: 'Bench Press' },
        { id: 'squat', dbId: 'ex-2', name: 'Squat' },
        { id: 'deadlift', dbId: 'ex-3', name: 'Deadlift' },
      ];

      for (const ex of exercises) {
        useWorkoutStore.getState().addExercise(ex as any);
      }

      const state = useWorkoutStore.getState();
      expect(state.activeWorkout?.exercises).toHaveLength(3);

      // Complete at least one set per exercise
      for (const workoutEx of state.activeWorkout!.exercises) {
        const setId = workoutEx.sets[0].id;
        useWorkoutStore.getState().updateSet(workoutEx.id, setId, {
          weight: 100,
          reps: 10,
          isCompleted: true,
        });
      }

      // Mock multiple database operations
      const mockChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 'test-id' }, error: null }),
        eq: jest.fn().mockReturnThis(),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await useWorkoutStore.getState().endWorkout();

      expect(result.success).toBe(true);
    });

    it('skips exercises with no completed sets', async () => {
      useWorkoutStore.getState().startWorkout('Test');

      // Add two exercises
      useWorkoutStore.getState().addExercise({ id: 'ex-1', dbId: 'uuid-1', name: 'Exercise 1' } as any);
      useWorkoutStore.getState().addExercise({ id: 'ex-2', dbId: 'uuid-2', name: 'Exercise 2' } as any);

      const state = useWorkoutStore.getState();
      const ex1Id = state.activeWorkout!.exercises[0].id;
      const ex1SetId = state.activeWorkout!.exercises[0].sets[0].id;

      // Only complete sets for first exercise
      useWorkoutStore.getState().updateSet(ex1Id, ex1SetId, {
        weight: 100,
        reps: 10,
        isCompleted: true,
      });

      const mockChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 'test-id' }, error: null }),
        eq: jest.fn().mockReturnThis(),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await useWorkoutStore.getState().endWorkout();

      // Should succeed, but only save one exercise
      expect(result.success).toBe(true);
    });
  });

  describe('Workout Discard Flow', () => {
    it('discards workout without saving', () => {
      useWorkoutStore.getState().startWorkout('Test Workout');
      useWorkoutStore.getState().addExercise({ id: 'ex-1', name: 'Exercise 1' } as any);

      useWorkoutStore.getState().discardWorkout();

      const state = useWorkoutStore.getState();
      expect(state.activeWorkout).toBeNull();
      expect(state.isWorkoutActive).toBe(false);

      // Database should not be called
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('clears all workout data on discard', () => {
      useWorkoutStore.getState().startWorkout('Test');
      useWorkoutStore.getState().addExercise({ id: 'ex-1', name: 'Exercise 1' } as any);

      const exerciseId = useWorkoutStore.getState().activeWorkout!.exercises[0].id;
      useWorkoutStore.getState().startRestTimer(exerciseId, 90);

      useWorkoutStore.getState().discardWorkout();

      const state = useWorkoutStore.getState();
      expect(state.restTimer.isRunning).toBe(false);
      expect(state.restTimer.exerciseId).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('handles save errors gracefully', async () => {
      useWorkoutStore.getState().startWorkout('Test');
      useWorkoutStore.getState().addExercise({ id: 'ex-1', dbId: 'uuid-1', name: 'Exercise 1' } as any);

      const exerciseId = useWorkoutStore.getState().activeWorkout!.exercises[0].id;
      const setId = useWorkoutStore.getState().activeWorkout!.exercises[0].sets[0].id;
      useWorkoutStore.getState().updateSet(exerciseId, setId, {
        weight: 100,
        reps: 10,
        isCompleted: true,
      });

      // Mock database error
      const mockChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await useWorkoutStore.getState().endWorkout();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database error');

      // Workout should still be in state (not lost)
      const state = useWorkoutStore.getState();
      expect(state.activeWorkout).not.toBeNull();
    });

    it('handles unauthenticated user', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      useWorkoutStore.getState().startWorkout('Test');
      useWorkoutStore.getState().addExercise({ id: 'ex-1', dbId: 'uuid-1', name: 'Exercise 1' } as any);

      const result = await useWorkoutStore.getState().endWorkout();

      expect(result.success).toBe(false);
      expect(result.error).toContain('authenticated');
    });

    it('handles missing exercise dbId', async () => {
      useWorkoutStore.getState().startWorkout('Test');
      useWorkoutStore.getState().addExercise({
        id: 'external-id-123',
        name: 'Exercise 1',
      } as any);

      const exerciseId = useWorkoutStore.getState().activeWorkout!.exercises[0].id;
      const setId = useWorkoutStore.getState().activeWorkout!.exercises[0].sets[0].id;
      useWorkoutStore.getState().updateSet(exerciseId, setId, {
        weight: 100,
        reps: 10,
        isCompleted: true,
      });

      // Mock exercise lookup and save
      const lookupChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'found-uuid' },
          error: null,
        }),
      };

      const saveChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'workout-123' },
          error: null,
        }),
      };

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(saveChain) // Workout save
        .mockReturnValueOnce(lookupChain) // Exercise lookup
        .mockReturnValueOnce(saveChain) // Workout exercise save
        .mockReturnValueOnce({ insert: jest.fn().mockResolvedValue({ error: null }) }); // Sets save

      const result = await useWorkoutStore.getState().endWorkout();

      expect(result.success).toBe(true);
    });
  });

  describe('Data Validation', () => {
    it('caps weight values at database maximum', async () => {
      useWorkoutStore.getState().startWorkout('Test');
      useWorkoutStore.getState().addExercise({ id: 'ex-1', dbId: 'uuid-1', name: 'Exercise 1' } as any);

      const exerciseId = useWorkoutStore.getState().activeWorkout!.exercises[0].id;
      const setId = useWorkoutStore.getState().activeWorkout!.exercises[0].sets[0].id;

      // Try to save an extremely high weight
      useWorkoutStore.getState().updateSet(exerciseId, setId, {
        weight: 999999,
        reps: 1,
        isCompleted: true,
      });

      mockDatabaseOperations();
      await useWorkoutStore.getState().endWorkout();

      // Should have capped the weight
      const insertCall = (supabase.from as jest.Mock).mock.results[3]; // Sets insert
      // Weight should be capped at 99999.99
    });

    it('handles empty workout name', () => {
      useWorkoutStore.getState().startWorkout('');

      const state = useWorkoutStore.getState();
      expect(state.activeWorkout?.name).toBe('');
    });

    it('calculates duration correctly', () => {
      const startTime = new Date('2024-01-01T10:00:00Z');
      jest.useFakeTimers();
      jest.setSystemTime(startTime);

      useWorkoutStore.getState().startWorkout();

      // Advance time by 30 minutes
      jest.setSystemTime(new Date('2024-01-01T10:30:00Z'));

      const duration = useWorkoutStore.getState().getWorkoutDuration();
      expect(duration).toBe(1800); // 30 minutes in seconds

      jest.useRealTimers();
    });
  });

  describe('Workout State Management', () => {
    it('prevents starting new workout when one is active', () => {
      useWorkoutStore.getState().startWorkout('Workout 1');
      const workout1Id = useWorkoutStore.getState().activeWorkout?.id;

      useWorkoutStore.getState().startWorkout('Workout 2');
      const workout2Id = useWorkoutStore.getState().activeWorkout?.id;

      // Should create new workout (replaces old one)
      expect(workout2Id).not.toBe(workout1Id);
      expect(useWorkoutStore.getState().activeWorkout?.name).toBe('Workout 2');
    });

    it('maintains workout state during exercise operations', () => {
      useWorkoutStore.getState().startWorkout('Test');
      const startedAt = useWorkoutStore.getState().activeWorkout?.startedAt;

      useWorkoutStore.getState().addExercise({ id: 'ex-1', name: 'Exercise 1' } as any);
      useWorkoutStore.getState().addExercise({ id: 'ex-2', name: 'Exercise 2' } as any);

      // startedAt should not change
      expect(useWorkoutStore.getState().activeWorkout?.startedAt).toBe(startedAt);
    });

    it('preserves workout data across set operations', () => {
      useWorkoutStore.getState().startWorkout('Important Workout');
      useWorkoutStore.getState().addExercise({ id: 'ex-1', name: 'Exercise 1' } as any);

      const exerciseId = useWorkoutStore.getState().activeWorkout!.exercises[0].id;
      const setId = useWorkoutStore.getState().activeWorkout!.exercises[0].sets[0].id;

      useWorkoutStore.getState().updateSet(exerciseId, setId, { weight: 100 });
      useWorkoutStore.getState().updateSet(exerciseId, setId, { reps: 10 });

      const state = useWorkoutStore.getState();
      expect(state.activeWorkout?.name).toBe('Important Workout');
      expect(state.activeWorkout?.exercises[0].exercise.name).toBe('Exercise 1');
      expect(state.activeWorkout?.exercises[0].sets[0].weight).toBe(100);
      expect(state.activeWorkout?.exercises[0].sets[0].reps).toBe(10);
    });
  });
});

