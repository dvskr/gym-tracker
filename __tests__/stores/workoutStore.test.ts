import { useWorkoutStore, WorkoutSet, WorkoutExercise } from '@/stores/workoutStore';

// Mock the dependencies
jest.mock('@/lib/notifications/restTimerNotifications', () => ({
  restTimerNotificationService: {
    scheduleRestComplete: jest.fn(),
    cancelRestTimer: jest.fn(),
    cancelRestNotification: jest.fn(),
    scheduleWarning: jest.fn(),
  },
}));

jest.mock('@/lib/notifications/engagementNotifications', () => ({
  engagementNotificationService: {
    cancelInactivityReminder: jest.fn(),
    scheduleInactivityReminder: jest.fn(),
  },
}));

jest.mock('@/lib/notifications/achievementNotifications', () => ({
  achievementNotificationService: {
    notifyPR: jest.fn(),
  },
}));

jest.mock('@/lib/notifications/smartTiming', () => ({
  smartTimingService: {
    recordWorkoutCompletion: jest.fn(),
  },
}));

jest.mock('@/lib/ai/cacheInvalidation', () => ({
  invalidateCoachContextAfterWorkout: jest.fn(),
  invalidateCoachContextAfterPR: jest.fn(),
}));

jest.mock('@/lib/utils/streakCalculation', () => ({
  calculateStreak: jest.fn().mockResolvedValue(1),
  getWorkoutCount: jest.fn().mockResolvedValue(1),
}));

jest.mock('@/lib/utils/prDetection', () => ({
  checkForPR: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/lib/utils/celebrations', () => ({
  celebratePR: jest.fn(),
}));

jest.mock('@/stores/settingsStore', () => ({
  useSettingsStore: {
    getState: () => ({
      restTimerDefault: 90,
      prCelebrations: true,
      autoFillSets: false, // Disable auto-fill for predictable tests
    }),
  },
}));

describe('workoutStore', () => {
  beforeEach(() => {
    // Reset store state before each test
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
  });

  describe('startWorkout', () => {
    it('starts a new workout with default name', () => {
      const { startWorkout } = useWorkoutStore.getState();
      
      startWorkout();
      
      const state = useWorkoutStore.getState();
      expect(state.isWorkoutActive).toBe(true);
      expect(state.activeWorkout).not.toBeNull();
      expect(state.activeWorkout?.name).toBe('New Workout');
      expect(state.activeWorkout?.exercises).toHaveLength(0);
    });

    it('starts a workout with custom name', () => {
      const { startWorkout } = useWorkoutStore.getState();
      
      startWorkout('Push Day');
      
      const state = useWorkoutStore.getState();
      expect(state.activeWorkout?.name).toBe('Push Day');
    });

    it('starts a workout with template ID', () => {
      const { startWorkout } = useWorkoutStore.getState();
      
      startWorkout('Template Workout', 'template-123');
      
      const state = useWorkoutStore.getState();
      expect(state.activeWorkout?.templateId).toBe('template-123');
    });

    it('generates unique workout ID', () => {
      const { startWorkout } = useWorkoutStore.getState();
      
      startWorkout();
      const workout1Id = useWorkoutStore.getState().activeWorkout?.id;
      
      useWorkoutStore.getState().discardWorkout();
      
      startWorkout();
      const workout2Id = useWorkoutStore.getState().activeWorkout?.id;
      
      expect(workout1Id).not.toBe(workout2Id);
    });

    it('sets startedAt timestamp', () => {
      const beforeStart = new Date().toISOString();
      
      useWorkoutStore.getState().startWorkout();
      
      const state = useWorkoutStore.getState();
      const afterStart = new Date().toISOString();
      
      expect(state.activeWorkout?.startedAt).toBeDefined();
      expect(state.activeWorkout!.startedAt >= beforeStart).toBe(true);
      expect(state.activeWorkout!.startedAt <= afterStart).toBe(true);
    });
  });

  describe('addExercise', () => {
    beforeEach(() => {
      useWorkoutStore.getState().startWorkout();
    });

    it('adds an exercise to active workout', () => {
      const { addExercise } = useWorkoutStore.getState();
      
      addExercise({
        id: 'exercise-1',
        name: 'Bench Press',
        category: 'chest',
        equipment: 'barbell',
        target: 'pectorals',
        bodyPart: 'chest',
        gifUrl: '',
        instructions: [],
        secondaryMuscles: ['triceps'],
      } as any);
      
      const state = useWorkoutStore.getState();
      expect(state.activeWorkout?.exercises).toHaveLength(1);
      expect(state.activeWorkout?.exercises[0].exercise.name).toBe('Bench Press');
    });

    it('creates default sets when adding exercise', () => {
      const { addExercise } = useWorkoutStore.getState();
      
      addExercise({
        id: 'exercise-1',
        name: 'Squat',
      } as any);
      
      const state = useWorkoutStore.getState();
      const exercise = state.activeWorkout?.exercises[0];
      expect(exercise?.sets).toHaveLength(1); // Default 1 set (changed from 3)
      expect(exercise?.sets[0].setNumber).toBe(1);
    });

    it('sets correct order index for multiple exercises', () => {
      const { addExercise } = useWorkoutStore.getState();
      
      addExercise({ id: 'exercise-1', name: 'Exercise 1' } as any);
      addExercise({ id: 'exercise-2', name: 'Exercise 2' } as any);
      addExercise({ id: 'exercise-3', name: 'Exercise 3' } as any);
      
      const state = useWorkoutStore.getState();
      expect(state.activeWorkout?.exercises[0].orderIndex).toBe(0);
      expect(state.activeWorkout?.exercises[1].orderIndex).toBe(1);
      expect(state.activeWorkout?.exercises[2].orderIndex).toBe(2);
    });

    it('initializes exercise with empty notes', () => {
      useWorkoutStore.getState().addExercise({ id: 'ex-1', name: 'Test' } as any);
      
      const state = useWorkoutStore.getState();
      expect(state.activeWorkout?.exercises[0].notes).toBe('');
    });

    it('generates unique exercise IDs', () => {
      const { addExercise } = useWorkoutStore.getState();
      
      addExercise({ id: 'exercise-1', name: 'Exercise 1' } as any);
      addExercise({ id: 'exercise-1', name: 'Exercise 1' } as any);
      
      const state = useWorkoutStore.getState();
      const id1 = state.activeWorkout?.exercises[0].id;
      const id2 = state.activeWorkout?.exercises[1].id;
      
      expect(id1).not.toBe(id2);
    });
  });

  describe('addExerciseWithSets', () => {
    beforeEach(() => {
      useWorkoutStore.getState().startWorkout();
    });

    it('adds exercise with prefilled sets', () => {
      const { addExerciseWithSets } = useWorkoutStore.getState();
      
      addExerciseWithSets(
        { id: 'exercise-1', name: 'Bench Press' } as any,
        [{ weight: 135, reps: 10 }, { weight: 155, reps: 8 }]
      );
      
      const state = useWorkoutStore.getState();
      const exercise = state.activeWorkout?.exercises[0];
      
      expect(exercise?.sets).toHaveLength(2);
      expect(exercise?.sets[0].weight).toBe(135);
      expect(exercise?.sets[0].reps).toBe(10);
      expect(exercise?.sets[1].weight).toBe(155);
      expect(exercise?.sets[1].reps).toBe(8);
    });

    it('creates target number of sets', () => {
      const { addExerciseWithSets } = useWorkoutStore.getState();
      
      addExerciseWithSets(
        { id: 'exercise-1', name: 'Test' } as any,
        [{ weight: 100, reps: 10 }],
        5 // Target 5 sets
      );
      
      const state = useWorkoutStore.getState();
      expect(state.activeWorkout?.exercises[0].sets).toHaveLength(5);
    });

    it('fills remaining sets with last prefill data', () => {
      const { addExerciseWithSets } = useWorkoutStore.getState();
      
      addExerciseWithSets(
        { id: 'exercise-1', name: 'Test' } as any,
        [{ weight: 100, reps: 10 }],
        3 // Want 3 sets, but only 1 prefill
      );
      
      const state = useWorkoutStore.getState();
      const sets = state.activeWorkout?.exercises[0].sets;
      
      expect(sets).toHaveLength(3);
      expect(sets?.[1].weight).toBe(100);
      expect(sets?.[2].weight).toBe(100);
    });

    it('marks all sets as not completed initially', () => {
      const { addExerciseWithSets } = useWorkoutStore.getState();
      
      addExerciseWithSets(
        { id: 'exercise-1', name: 'Test' } as any,
        [{ weight: 100, reps: 10 }]
      );
      
      const state = useWorkoutStore.getState();
      const sets = state.activeWorkout?.exercises[0].sets;
      
      expect(sets?.every(s => !s.isCompleted)).toBe(true);
    });
  });

  describe('removeExercise', () => {
    beforeEach(() => {
      useWorkoutStore.getState().startWorkout();
      useWorkoutStore.getState().addExercise({ id: 'exercise-1', name: 'Exercise 1' } as any);
      useWorkoutStore.getState().addExercise({ id: 'exercise-2', name: 'Exercise 2' } as any);
      useWorkoutStore.getState().addExercise({ id: 'exercise-3', name: 'Exercise 3' } as any);
    });

    it('removes exercise by id', () => {
      const state = useWorkoutStore.getState();
      const exerciseId = state.activeWorkout!.exercises[1].id;
      
      useWorkoutStore.getState().removeExercise(exerciseId);
      
      const newState = useWorkoutStore.getState();
      expect(newState.activeWorkout?.exercises).toHaveLength(2);
      expect(newState.activeWorkout?.exercises.find(e => e.id === exerciseId)).toBeUndefined();
    });

    it('reorders remaining exercises', () => {
      const state = useWorkoutStore.getState();
      const firstExerciseId = state.activeWorkout!.exercises[0].id;
      
      useWorkoutStore.getState().removeExercise(firstExerciseId);
      
      const newState = useWorkoutStore.getState();
      expect(newState.activeWorkout?.exercises[0].orderIndex).toBe(0);
      expect(newState.activeWorkout?.exercises[1].orderIndex).toBe(1);
    });

    it('handles removing last exercise', () => {
      const state = useWorkoutStore.getState();
      
      useWorkoutStore.getState().removeExercise(state.activeWorkout!.exercises[0].id);
      useWorkoutStore.getState().removeExercise(state.activeWorkout!.exercises[0].id);
      useWorkoutStore.getState().removeExercise(state.activeWorkout!.exercises[0].id);
      
      const newState = useWorkoutStore.getState();
      expect(newState.activeWorkout?.exercises).toHaveLength(0);
    });
  });

  describe('set operations', () => {
    let exerciseId: string;

    beforeEach(() => {
      useWorkoutStore.getState().startWorkout();
      useWorkoutStore.getState().addExercise({ id: 'exercise-1', name: 'Test Exercise' } as any);
      exerciseId = useWorkoutStore.getState().activeWorkout!.exercises[0].id;
    });

    describe('addSet', () => {
      it('adds a new set to exercise', () => {
        const { addSet } = useWorkoutStore.getState();
        
        addSet(exerciseId);
        
        const state = useWorkoutStore.getState();
        const exercise = state.activeWorkout!.exercises[0];
        expect(exercise.sets).toHaveLength(2); // 1 default + 1 new
      });

      it('sets correct set number', () => {
        const { addSet } = useWorkoutStore.getState();
        
        addSet(exerciseId);
        addSet(exerciseId);
        
        const state = useWorkoutStore.getState();
        const exercise = state.activeWorkout!.exercises[0];
        expect(exercise.sets[0].setNumber).toBe(1);
        expect(exercise.sets[1].setNumber).toBe(2);
        expect(exercise.sets[2].setNumber).toBe(3);
      });

      it('new sets are not completed by default', () => {
        useWorkoutStore.getState().addSet(exerciseId);
        
        const state = useWorkoutStore.getState();
        const lastSet = state.activeWorkout!.exercises[0].sets[1];
        
        expect(lastSet.isCompleted).toBe(false);
        expect(lastSet.completedAt).toBeNull();
      });

      it('new sets have no PR markers', () => {
        useWorkoutStore.getState().addSet(exerciseId);
        
        const state = useWorkoutStore.getState();
        const lastSet = state.activeWorkout!.exercises[0].sets[1];
        
        expect(lastSet.isPR).toBe(false);
        expect(lastSet.prType).toBeNull();
      });
    });

    describe('updateSet', () => {
      it('updates set weight', () => {
        const state = useWorkoutStore.getState();
        const setId = state.activeWorkout!.exercises[0].sets[0].id;
        
        useWorkoutStore.getState().updateSet(exerciseId, setId, { weight: 135 });
        
        const newState = useWorkoutStore.getState();
        expect(newState.activeWorkout!.exercises[0].sets[0].weight).toBe(135);
      });

      it('updates set reps', () => {
        const state = useWorkoutStore.getState();
        const setId = state.activeWorkout!.exercises[0].sets[0].id;
        
        useWorkoutStore.getState().updateSet(exerciseId, setId, { reps: 10 });
        
        const newState = useWorkoutStore.getState();
        expect(newState.activeWorkout!.exercises[0].sets[0].reps).toBe(10);
      });

      it('updates multiple properties at once', () => {
        const state = useWorkoutStore.getState();
        const setId = state.activeWorkout!.exercises[0].sets[0].id;
        
        useWorkoutStore.getState().updateSet(exerciseId, setId, { 
          weight: 225, 
          reps: 5,
          setType: 'warmup',
        });
        
        const newState = useWorkoutStore.getState();
        const updatedSet = newState.activeWorkout!.exercises[0].sets[0];
        expect(updatedSet.weight).toBe(225);
        expect(updatedSet.reps).toBe(5);
        expect(updatedSet.setType).toBe('warmup');
      });

      it('only updates specified set', () => {
        // Add more sets
        useWorkoutStore.getState().addSet(exerciseId);
        useWorkoutStore.getState().addSet(exerciseId);
        
        const state = useWorkoutStore.getState();
        const setId = state.activeWorkout!.exercises[0].sets[1].id;
        
        useWorkoutStore.getState().updateSet(exerciseId, setId, { weight: 999 });
        
        const newState = useWorkoutStore.getState();
        const sets = newState.activeWorkout!.exercises[0].sets;
        
        expect(sets[0].weight).toBeNull();
        expect(sets[1].weight).toBe(999);
        expect(sets[2].weight).toBeNull();
      });

      it('preserves other set properties', () => {
        const state = useWorkoutStore.getState();
        const setId = state.activeWorkout!.exercises[0].sets[0].id;
        
        useWorkoutStore.getState().updateSet(exerciseId, setId, { 
          weight: 100,
          reps: 10,
          isCompleted: true,
        });
        
        useWorkoutStore.getState().updateSet(exerciseId, setId, { weight: 105 });
        
        const newState = useWorkoutStore.getState();
        const set = newState.activeWorkout!.exercises[0].sets[0];
        
        expect(set.weight).toBe(105);
        expect(set.reps).toBe(10);
        expect(set.isCompleted).toBe(true);
      });
    });

    describe('deleteSet', () => {
      beforeEach(() => {
        // Add more sets for testing
        useWorkoutStore.getState().addSet(exerciseId);
        useWorkoutStore.getState().addSet(exerciseId);
      });

      it('removes set from exercise', () => {
        const state = useWorkoutStore.getState();
        const setId = state.activeWorkout!.exercises[0].sets[0].id;
        
        useWorkoutStore.getState().deleteSet(exerciseId, setId);
        
        const newState = useWorkoutStore.getState();
        expect(newState.activeWorkout!.exercises[0].sets).toHaveLength(2);
      });

      it('renumbers remaining sets', () => {
        const state = useWorkoutStore.getState();
        const setId = state.activeWorkout!.exercises[0].sets[0].id;
        
        useWorkoutStore.getState().deleteSet(exerciseId, setId);
        
        const newState = useWorkoutStore.getState();
        const sets = newState.activeWorkout!.exercises[0].sets;
        expect(sets[0].setNumber).toBe(1);
        expect(sets[1].setNumber).toBe(2);
      });

      it('can delete middle set', () => {
        const state = useWorkoutStore.getState();
        const sets = state.activeWorkout!.exercises[0].sets;
        const middleSetId = sets[1].id;
        
        useWorkoutStore.getState().deleteSet(exerciseId, middleSetId);
        
        const newState = useWorkoutStore.getState();
        expect(newState.activeWorkout!.exercises[0].sets).toHaveLength(2);
        expect(newState.activeWorkout!.exercises[0].sets.find(s => s.id === middleSetId)).toBeUndefined();
      });
    });

    describe('duplicateSet', () => {
      it('creates a copy of the set', () => {
        const state = useWorkoutStore.getState();
        const setId = state.activeWorkout!.exercises[0].sets[0].id;
        
        // Update the set first
        useWorkoutStore.getState().updateSet(exerciseId, setId, { weight: 135, reps: 10 });
        
        useWorkoutStore.getState().duplicateSet(exerciseId, setId);
        
        const newState = useWorkoutStore.getState();
        const sets = newState.activeWorkout!.exercises[0].sets;
        
        expect(sets).toHaveLength(2);
        expect(sets[1].weight).toBe(135);
        expect(sets[1].reps).toBe(10);
      });

      it('generates new ID for duplicated set', () => {
        const state = useWorkoutStore.getState();
        const setId = state.activeWorkout!.exercises[0].sets[0].id;
        
        useWorkoutStore.getState().duplicateSet(exerciseId, setId);
        
        const newState = useWorkoutStore.getState();
        const sets = newState.activeWorkout!.exercises[0].sets;
        
        expect(sets[0].id).not.toBe(sets[1].id);
      });

      it('resets completion status for duplicated set', () => {
        const state = useWorkoutStore.getState();
        const setId = state.activeWorkout!.exercises[0].sets[0].id;
        
        useWorkoutStore.getState().updateSet(exerciseId, setId, { 
          isCompleted: true,
          completedAt: new Date().toISOString(),
        });
        
        useWorkoutStore.getState().duplicateSet(exerciseId, setId);
        
        const newState = useWorkoutStore.getState();
        const duplicatedSet = newState.activeWorkout!.exercises[0].sets[1];
        
        expect(duplicatedSet.isCompleted).toBe(false);
        expect(duplicatedSet.completedAt).toBeNull();
      });

      it('resets PR status for duplicated set', () => {
        const state = useWorkoutStore.getState();
        const setId = state.activeWorkout!.exercises[0].sets[0].id;
        
        useWorkoutStore.getState().updateSet(exerciseId, setId, { 
          isPR: true,
          prType: 'max_weight',
        });
        
        useWorkoutStore.getState().duplicateSet(exerciseId, setId);
        
        const newState = useWorkoutStore.getState();
        const duplicatedSet = newState.activeWorkout!.exercises[0].sets[1];
        
        expect(duplicatedSet.isPR).toBe(false);
        expect(duplicatedSet.prType).toBeNull();
      });
    });
  });

  describe('computed values', () => {
    beforeEach(() => {
      useWorkoutStore.getState().startWorkout();
      useWorkoutStore.getState().addExercise({ id: 'exercise-1', name: 'Exercise 1' } as any);
      
      const state = useWorkoutStore.getState();
      const exerciseId = state.activeWorkout!.exercises[0].id;
      
      // Add sets
      useWorkoutStore.getState().addSet(exerciseId);
      useWorkoutStore.getState().addSet(exerciseId);
      
      const sets = useWorkoutStore.getState().activeWorkout!.exercises[0].sets;
      
      // Update sets with data
      useWorkoutStore.getState().updateSet(exerciseId, sets[0].id, { weight: 100, reps: 10, isCompleted: true });
      useWorkoutStore.getState().updateSet(exerciseId, sets[1].id, { weight: 100, reps: 8, isCompleted: true });
      useWorkoutStore.getState().updateSet(exerciseId, sets[2].id, { weight: 90, reps: 6, isCompleted: false });
    });

    it('calculates total volume', () => {
      const { getTotalVolume } = useWorkoutStore.getState();
      // Only completed sets: (100×10) + (100×8) = 1800
      expect(getTotalVolume()).toBe(1800);
    });

    it('calculates total completed sets', () => {
      const { getTotalSets } = useWorkoutStore.getState();
      expect(getTotalSets()).toBe(2);
    });

    it('calculates total reps', () => {
      const { getTotalReps } = useWorkoutStore.getState();
      // Only completed sets: 10 + 8 = 18
      expect(getTotalReps()).toBe(18);
    });

    it('excludes incomplete sets from calculations', () => {
      const { getTotalVolume, getTotalSets, getTotalReps } = useWorkoutStore.getState();
      
      expect(getTotalVolume()).toBe(1800); // Not including the 90×6 = 540
      expect(getTotalSets()).toBe(2); // Not including the 3rd set
      expect(getTotalReps()).toBe(18); // Not including the 6 reps
    });
  });

  describe('rest timer', () => {
    beforeEach(() => {
      useWorkoutStore.getState().startWorkout();
      useWorkoutStore.getState().addExercise({ id: 'exercise-1', name: 'Exercise 1' } as any);
    });

    it('starts rest timer', () => {
      const state = useWorkoutStore.getState();
      const exerciseId = state.activeWorkout!.exercises[0].id;
      
      useWorkoutStore.getState().startRestTimer(exerciseId, 90);
      
      const newState = useWorkoutStore.getState();
      expect(newState.restTimer.isRunning).toBe(true);
      expect(newState.restTimer.exerciseId).toBe(exerciseId);
      expect(newState.restTimer.remainingSeconds).toBe(90);
      expect(newState.restTimer.totalSeconds).toBe(90);
    });

    it('uses default time if not specified', () => {
      const state = useWorkoutStore.getState();
      const exerciseId = state.activeWorkout!.exercises[0].id;
      
      useWorkoutStore.getState().startRestTimer(exerciseId);
      
      const newState = useWorkoutStore.getState();
      expect(newState.restTimer.remainingSeconds).toBe(90); // Default from settings
    });

    it('skips rest timer', () => {
      const state = useWorkoutStore.getState();
      const exerciseId = state.activeWorkout!.exercises[0].id;
      
      useWorkoutStore.getState().startRestTimer(exerciseId, 90);
      useWorkoutStore.getState().skipRestTimer();
      
      const newState = useWorkoutStore.getState();
      expect(newState.restTimer.isRunning).toBe(false);
      expect(newState.restTimer.remainingSeconds).toBe(0);
    });

    it('extends rest timer', () => {
      const state = useWorkoutStore.getState();
      const exerciseId = state.activeWorkout!.exercises[0].id;
      
      useWorkoutStore.getState().startRestTimer(exerciseId, 90);
      useWorkoutStore.getState().extendRestTimer(30);
      
      const newState = useWorkoutStore.getState();
      expect(newState.restTimer.remainingSeconds).toBe(120);
      expect(newState.restTimer.totalSeconds).toBe(120);
    });

    it('ticks timer down', () => {
      const state = useWorkoutStore.getState();
      const exerciseId = state.activeWorkout!.exercises[0].id;
      
      useWorkoutStore.getState().startRestTimer(exerciseId, 90);
      useWorkoutStore.getState().tickRestTimer();
      
      const newState = useWorkoutStore.getState();
      expect(newState.restTimer.remainingSeconds).toBe(89);
    });

    it('stops timer when reaching zero', () => {
      const state = useWorkoutStore.getState();
      const exerciseId = state.activeWorkout!.exercises[0].id;
      
      useWorkoutStore.getState().startRestTimer(exerciseId, 1);
      useWorkoutStore.getState().tickRestTimer();
      
      const newState = useWorkoutStore.getState();
      expect(newState.restTimer.isRunning).toBe(false);
      expect(newState.restTimer.remainingSeconds).toBe(0);
    });

    it('sets custom rest time for exercise', () => {
      const state = useWorkoutStore.getState();
      const exerciseId = state.activeWorkout!.exercises[0].id;
      
      useWorkoutStore.getState().setExerciseRestTime(exerciseId, 120);
      
      const newState = useWorkoutStore.getState();
      expect(newState.exerciseRestTimes[exerciseId]).toBe(120);
    });

    it('gets custom rest time for exercise', () => {
      const state = useWorkoutStore.getState();
      const exerciseId = state.activeWorkout!.exercises[0].id;
      
      useWorkoutStore.getState().setExerciseRestTime(exerciseId, 120);
      
      const restTime = useWorkoutStore.getState().getExerciseRestTime(exerciseId);
      expect(restTime).toBe(120);
    });

    it('returns default time if no custom time set', () => {
      const state = useWorkoutStore.getState();
      const exerciseId = state.activeWorkout!.exercises[0].id;
      
      const restTime = useWorkoutStore.getState().getExerciseRestTime(exerciseId);
      expect(restTime).toBe(90); // Default from settings
    });
  });

  describe('discardWorkout', () => {
    it('clears active workout', () => {
      useWorkoutStore.getState().startWorkout();
      useWorkoutStore.getState().addExercise({ id: 'exercise-1', name: 'Exercise 1' } as any);
      
      useWorkoutStore.getState().discardWorkout();
      
      const state = useWorkoutStore.getState();
      expect(state.activeWorkout).toBeNull();
      expect(state.isWorkoutActive).toBe(false);
    });

    it('clears rest timer', () => {
      useWorkoutStore.getState().startWorkout();
      useWorkoutStore.getState().addExercise({ id: 'exercise-1', name: 'Exercise 1' } as any);
      
      const exerciseId = useWorkoutStore.getState().activeWorkout!.exercises[0].id;
      useWorkoutStore.getState().startRestTimer(exerciseId, 90);
      
      useWorkoutStore.getState().discardWorkout();
      
      const state = useWorkoutStore.getState();
      expect(state.restTimer.isRunning).toBe(false);
      expect(state.restTimer.exerciseId).toBeNull();
    });
  });

  describe('updateExerciseNotes', () => {
    beforeEach(() => {
      useWorkoutStore.getState().startWorkout();
      useWorkoutStore.getState().addExercise({ id: 'exercise-1', name: 'Exercise 1' } as any);
    });

    it('updates exercise notes', () => {
      const state = useWorkoutStore.getState();
      const exerciseId = state.activeWorkout!.exercises[0].id;
      
      useWorkoutStore.getState().updateExerciseNotes(exerciseId, 'Focus on form');
      
      const newState = useWorkoutStore.getState();
      expect(newState.activeWorkout!.exercises[0].notes).toBe('Focus on form');
    });

    it('can clear notes', () => {
      const state = useWorkoutStore.getState();
      const exerciseId = state.activeWorkout!.exercises[0].id;
      
      useWorkoutStore.getState().updateExerciseNotes(exerciseId, 'Initial notes');
      useWorkoutStore.getState().updateExerciseNotes(exerciseId, '');
      
      const newState = useWorkoutStore.getState();
      expect(newState.activeWorkout!.exercises[0].notes).toBe('');
    });
  });

  describe('reorderExercises', () => {
    beforeEach(() => {
      useWorkoutStore.getState().startWorkout();
      useWorkoutStore.getState().addExercise({ id: 'exercise-1', name: 'Exercise 1' } as any);
      useWorkoutStore.getState().addExercise({ id: 'exercise-2', name: 'Exercise 2' } as any);
      useWorkoutStore.getState().addExercise({ id: 'exercise-3', name: 'Exercise 3' } as any);
    });

    it('moves exercise from one position to another', () => {
      useWorkoutStore.getState().reorderExercises(0, 2);
      
      const state = useWorkoutStore.getState();
      const exercises = state.activeWorkout!.exercises;
      
      expect(exercises[0].exercise.name).toBe('Exercise 2');
      expect(exercises[1].exercise.name).toBe('Exercise 3');
      expect(exercises[2].exercise.name).toBe('Exercise 1');
    });

    it('updates order indices after reordering', () => {
      useWorkoutStore.getState().reorderExercises(0, 2);
      
      const state = useWorkoutStore.getState();
      const exercises = state.activeWorkout!.exercises;
      
      expect(exercises[0].orderIndex).toBe(0);
      expect(exercises[1].orderIndex).toBe(1);
      expect(exercises[2].orderIndex).toBe(2);
    });

    it('handles moving exercise down', () => {
      useWorkoutStore.getState().reorderExercises(0, 1);
      
      const state = useWorkoutStore.getState();
      const exercises = state.activeWorkout!.exercises;
      
      expect(exercises[0].exercise.name).toBe('Exercise 2');
      expect(exercises[1].exercise.name).toBe('Exercise 1');
    });

    it('handles moving exercise up', () => {
      useWorkoutStore.getState().reorderExercises(2, 0);
      
      const state = useWorkoutStore.getState();
      const exercises = state.activeWorkout!.exercises;
      
      expect(exercises[0].exercise.name).toBe('Exercise 3');
      expect(exercises[1].exercise.name).toBe('Exercise 1');
      expect(exercises[2].exercise.name).toBe('Exercise 2');
    });
  });

  describe('markSetAsPR', () => {
    let exerciseId: string;
    let setId: string;

    beforeEach(() => {
      useWorkoutStore.getState().startWorkout();
      useWorkoutStore.getState().addExercise({ id: 'exercise-1', name: 'Test' } as any);
      
      const state = useWorkoutStore.getState();
      exerciseId = state.activeWorkout!.exercises[0].id;
      setId = state.activeWorkout!.exercises[0].sets[0].id;
    });

    it('marks set as max weight PR', () => {
      useWorkoutStore.getState().markSetAsPR(exerciseId, setId, 'max_weight');
      
      const state = useWorkoutStore.getState();
      const set = state.activeWorkout!.exercises[0].sets[0];
      
      expect(set.isPR).toBe(true);
      expect(set.prType).toBe('max_weight');
    });

    it('marks set as max reps PR', () => {
      useWorkoutStore.getState().markSetAsPR(exerciseId, setId, 'max_reps');
      
      const state = useWorkoutStore.getState();
      const set = state.activeWorkout!.exercises[0].sets[0];
      
      expect(set.isPR).toBe(true);
      expect(set.prType).toBe('max_reps');
    });

    it('marks set as max volume PR', () => {
      useWorkoutStore.getState().markSetAsPR(exerciseId, setId, 'max_volume');
      
      const state = useWorkoutStore.getState();
      const set = state.activeWorkout!.exercises[0].sets[0];
      
      expect(set.isPR).toBe(true);
      expect(set.prType).toBe('max_volume');
    });
  });

  describe('getWorkoutPRs', () => {
    it('returns all PRs from active workout', () => {
      useWorkoutStore.getState().startWorkout();
      useWorkoutStore.getState().addExercise({ id: 'exercise-1', name: 'Bench Press' } as any);
      
      const state = useWorkoutStore.getState();
      const exerciseId = state.activeWorkout!.exercises[0].id;
      const setId = state.activeWorkout!.exercises[0].sets[0].id;
      
      useWorkoutStore.getState().updateSet(exerciseId, setId, { weight: 225, reps: 5 });
      useWorkoutStore.getState().markSetAsPR(exerciseId, setId, 'max_weight');
      
      const prs = useWorkoutStore.getState().getWorkoutPRs();
      
      expect(prs).toHaveLength(1);
      expect(prs[0].exerciseName).toBe('Bench Press');
      expect(prs[0].prType).toBe('max_weight');
      expect(prs[0].weight).toBe(225);
      expect(prs[0].reps).toBe(5);
    });

    it('returns empty array when no PRs', () => {
      useWorkoutStore.getState().startWorkout();
      useWorkoutStore.getState().addExercise({ id: 'exercise-1', name: 'Test' } as any);
      
      const prs = useWorkoutStore.getState().getWorkoutPRs();
      expect(prs).toHaveLength(0);
    });

    it('returns empty array when no active workout', () => {
      const prs = useWorkoutStore.getState().getWorkoutPRs();
      expect(prs).toHaveLength(0);
    });
  });
});
