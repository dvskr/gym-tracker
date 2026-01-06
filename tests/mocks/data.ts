/**
 * Shared mock data for tests
 */

export const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  created_at: '2025-01-01T00:00:00Z',
};

export const mockSession = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: mockUser,
};

export const mockExercise = {
  id: 'exercise-bench-press',
  name: 'Bench Press',
  display_name: 'Bench Press',
  muscle_group: 'chest',
  primary_muscles: ['chest'],
  secondary_muscles: ['triceps', 'shoulders'],
  equipment: 'barbell',
  difficulty: 'intermediate',
  instructions: 'Lie on bench, lower bar to chest, press up.',
  is_custom: false,
  is_active: true,
};

export const mockWorkoutSet = {
  id: 'set-1',
  workout_exercise_id: 'we-1',
  set_number: 1,
  weight: 135,
  reps: 10,
  completed: true,
  set_type: 'normal',
  rpe: null,
  created_at: '2025-01-05T10:00:00Z',
};

export const mockWorkoutExercise = {
  id: 'we-1',
  workout_id: 'workout-1',
  exercise_id: 'exercise-bench-press',
  exercise: mockExercise,
  order_index: 0,
  sets: [mockWorkoutSet],
  notes: '',
};

export const mockWorkout = {
  id: 'workout-1',
  user_id: 'user-123',
  name: 'Push Day',
  started_at: '2025-01-05T09:00:00Z',
  completed_at: '2025-01-05T10:30:00Z',
  duration_seconds: 5400,
  total_volume: 13500,
  total_sets: 15,
  total_reps: 120,
  exercises: [mockWorkoutExercise],
  notes: '',
  is_synced: true,
};

// Factory functions for creating test data
export function createMockSet(overrides: Partial<typeof mockWorkoutSet> = {}) {
  return {
    ...mockWorkoutSet,
    id: `set-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    ...overrides,
  };
}

export function createMockExercise(overrides: Partial<typeof mockExercise> = {}) {
  return {
    ...mockExercise,
    id: `exercise-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    ...overrides,
  };
}

export function createMockWorkout(overrides: Partial<typeof mockWorkout> = {}) {
  return {
    ...mockWorkout,
    id: `workout-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    ...overrides,
  };
}

