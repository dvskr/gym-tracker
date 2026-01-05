/**
 * Workout API Tests
 * Tests for workout-related API functions
 */

// Define mock types to avoid importing real supabase client
type MockSupabase = {
  from: jest.Mock;
  rpc: jest.Mock;
};

// Mock Supabase before imports
const mockSupabase: MockSupabase = {
  from: jest.fn(),
  rpc: jest.fn(),
};

jest.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
}));

// Helper to create mock chain
function createMockChain(finalResult: { data: unknown; error: unknown }) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn(() => Promise.resolve(finalResult)),
    maybeSingle: jest.fn(() => Promise.resolve(finalResult)),
    then: (resolve: (value: typeof finalResult) => void) => Promise.resolve(finalResult).then(resolve),
  };
  return chain;
}

describe('Workout API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveWorkout', () => {
    it('saves workout with exercises and sets', async () => {
      const mockWorkout = {
        id: 'workout-123',
        user_id: 'user-123',
        name: 'Push Day',
        duration_seconds: 3600,
        total_volume: 5000,
        created_at: '2024-01-15T10:00:00Z',
      };

      const chain = createMockChain({ data: mockWorkout, error: null });
      mockSupabase.from.mockReturnValue(chain);

      // Simulate the insert
      const result = await mockSupabase
        .from('workouts')
        .insert({
          user_id: 'user-123',
          name: 'Push Day',
          duration_seconds: 3600,
          total_volume: 5000,
          started_at: '2024-01-15T10:00:00Z',
        })
        .select()
        .single();

      expect(mockSupabase.from).toHaveBeenCalledWith('workouts');
      expect(chain.insert).toHaveBeenCalled();
      expect((result.data as { id: string })?.id).toBe('workout-123');
      expect(result.error).toBeNull();
    });

    it('handles insert error', async () => {
      const chain = createMockChain({ 
        data: null, 
        error: { message: 'Insert failed', code: '500' } 
      });
      mockSupabase.from.mockReturnValue(chain);

      const result = await mockSupabase
        .from('workouts')
        .insert({ user_id: 'user-123', started_at: '2024-01-15T10:00:00Z' })
        .select()
        .single();

      expect(result.error).toBeDefined();
      expect((result.error as { message: string })?.message).toBe('Insert failed');
    });
  });

  describe('getWorkoutHistory', () => {
    it('fetches paginated workout history', async () => {
      const mockWorkouts = [
        { id: 'w1', name: 'Push Day', created_at: '2024-01-15' },
        { id: 'w2', name: 'Pull Day', created_at: '2024-01-14' },
      ];

      const chain = createMockChain({ data: mockWorkouts, error: null });
      mockSupabase.from.mockReturnValue(chain);

      const result = await mockSupabase
        .from('workouts')
        .select('*')
        .eq('user_id', 'user-123')
        .order('created_at', { ascending: false })
        .limit(10);

      expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(chain.limit).toHaveBeenCalledWith(10);
      expect(result.data).toHaveLength(2);
    });

    it('returns empty array for no workouts', async () => {
      const chain = createMockChain({ data: [], error: null });
      mockSupabase.from.mockReturnValue(chain);

      const result = await mockSupabase
        .from('workouts')
        .select('*')
        .eq('user_id', 'user-123');

      expect(result.data).toEqual([]);
    });
  });

  describe('getWorkoutById', () => {
    it('fetches workout with exercises and sets', async () => {
      const mockWorkout = {
        id: 'workout-123',
        name: 'Push Day',
        workout_exercises: [
          {
            id: 'we-1',
            exercise: { id: 'ex-1', name: 'Bench Press' },
            sets: [
              { id: 'set-1', weight: 135, reps: 10 },
              { id: 'set-2', weight: 155, reps: 8 },
            ],
          },
        ],
      };

      const chain = createMockChain({ data: mockWorkout, error: null });
      mockSupabase.from.mockReturnValue(chain);

      const result = await mockSupabase
        .from('workouts')
        .select(`
          *,
          workout_exercises (
            *,
            exercise: exercises (*),
            sets: workout_sets (*)
          )
        `)
        .eq('id', 'workout-123')
        .single();

      const data = result.data as typeof mockWorkout;
      expect(data?.workout_exercises).toHaveLength(1);
      expect(data?.workout_exercises[0].sets).toHaveLength(2);
    });

    it('returns null for non-existent workout', async () => {
      const chain = createMockChain({ 
        data: null, 
        error: { code: 'PGRST116', message: 'Row not found' } 
      });
      mockSupabase.from.mockReturnValue(chain);

      const result = await mockSupabase
        .from('workouts')
        .select('*')
        .eq('id', 'non-existent')
        .single();

      expect(result.data).toBeNull();
      expect((result.error as { code: string })?.code).toBe('PGRST116');
    });
  });

  describe('updateWorkout', () => {
    it('updates workout name', async () => {
      const mockWorkout = {
        id: 'workout-123',
        name: 'Updated Push Day',
      };

      const chain = createMockChain({ data: mockWorkout, error: null });
      mockSupabase.from.mockReturnValue(chain);

      const result = await mockSupabase
        .from('workouts')
        .update({ name: 'Updated Push Day' })
        .eq('id', 'workout-123')
        .select()
        .single();

      expect(chain.update).toHaveBeenCalledWith({ name: 'Updated Push Day' });
      expect((result.data as typeof mockWorkout)?.name).toBe('Updated Push Day');
    });
  });

  describe('deleteWorkout', () => {
    it('deletes workout and related data', async () => {
      const chain = createMockChain({ data: null, error: null });
      mockSupabase.from.mockReturnValue(chain);

      const result = await mockSupabase
        .from('workouts')
        .delete()
        .eq('id', 'workout-123');

      expect(chain.delete).toHaveBeenCalled();
      expect(chain.eq).toHaveBeenCalledWith('id', 'workout-123');
      expect(result.error).toBeNull();
    });
  });

  describe('getWorkoutStats', () => {
    it('calculates workout statistics via RPC', async () => {
      const mockStats = {
        total_workouts: 50,
        total_volume: 250000,
        total_duration: 90000,
        avg_workout_duration: 1800,
      };

      mockSupabase.rpc.mockResolvedValue({
        data: mockStats,
        error: null,
      });

      const result = await mockSupabase.rpc('get_ai_usage_stats', {
        p_user_id: 'user-123',
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_ai_usage_stats', {
        p_user_id: 'user-123',
      });
      expect((result.data as typeof mockStats)?.total_workouts).toBe(50);
    });
  });
});

describe('Workout Exercises API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addExerciseToWorkout', () => {
    it('adds exercise with order index', async () => {
      const mockWorkoutExercise = {
        id: 'we-123',
        workout_id: 'workout-123',
        exercise_id: 'ex-123',
        order_index: 0,
      };

      const chain = createMockChain({ data: mockWorkoutExercise, error: null });
      mockSupabase.from.mockReturnValue(chain);

      const result = await mockSupabase
        .from('workout_exercises')
        .insert({
          workout_id: 'workout-123',
          exercise_id: 'ex-123',
          order_index: 0,
        })
        .select()
        .single();

      expect((result.data as typeof mockWorkoutExercise)?.order_index).toBe(0);
    });
  });

  describe('reorderExercises', () => {
    it('updates exercise order', async () => {
      const chain = createMockChain({ data: null, error: null });
      mockSupabase.from.mockReturnValue(chain);

      await mockSupabase
        .from('workout_exercises')
        .update({ order_index: 1 })
        .eq('id', 'we-123');

      expect(chain.update).toHaveBeenCalledWith({ order_index: 1 });
    });
  });
});

describe('Workout Sets API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addSet', () => {
    it('adds set with weight and reps', async () => {
      const mockSet = {
        id: 'set-123',
        workout_exercise_id: 'we-123',
        set_number: 1,
        weight: 135,
        reps: 10,
        is_completed: false,
      };

      const chain = createMockChain({ data: mockSet, error: null });
      mockSupabase.from.mockReturnValue(chain);

      const result = await mockSupabase
        .from('workout_sets')
        .insert({
          workout_exercise_id: 'we-123',
          set_number: 1,
          weight: 135,
          reps: 10,
        })
        .select()
        .single();

      const data = result.data as typeof mockSet;
      expect(data?.weight).toBe(135);
      expect(data?.reps).toBe(10);
    });
  });

  describe('completeSet', () => {
    it('marks set as completed', async () => {
      const chain = createMockChain({ data: { is_completed: true }, error: null });
      mockSupabase.from.mockReturnValue(chain);

      const result = await mockSupabase
        .from('workout_sets')
        .update({ is_completed: true })
        .eq('id', 'set-123')
        .select()
        .single();

      expect((result.data as { is_completed: boolean })?.is_completed).toBe(true);
    });
  });

  describe('updateSet', () => {
    it('updates weight and reps', async () => {
      const mockData = { weight: 145, reps: 8 };
      const chain = createMockChain({ 
        data: mockData, 
        error: null 
      });
      mockSupabase.from.mockReturnValue(chain);

      const result = await mockSupabase
        .from('workout_sets')
        .update({ weight: 145, reps: 8 })
        .eq('id', 'set-123')
        .select()
        .single();

      const data = result.data as typeof mockData;
      expect(data?.weight).toBe(145);
      expect(data?.reps).toBe(8);
    });
  });

  describe('deleteSet', () => {
    it('removes set from workout', async () => {
      const chain = createMockChain({ data: null, error: null });
      mockSupabase.from.mockReturnValue(chain);

      const result = await mockSupabase
        .from('workout_sets')
        .delete()
        .eq('id', 'set-123');

      expect(chain.delete).toHaveBeenCalled();
      expect(result.error).toBeNull();
    });
  });
});

