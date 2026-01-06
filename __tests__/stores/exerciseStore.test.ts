/**
 * Exercise Store Tests
 * Tests for the exercise store state management
 */

import { useExerciseStore } from '@/stores/exerciseStore';
import { supabase } from '@/lib/supabase';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    storage: {
      from: jest.fn(),
    },
  },
}));

describe('exerciseStore', () => {
  beforeEach(() => {
    // Reset store state
    useExerciseStore.setState({
      exercises: [],
      isLoading: false,
      error: null,
      filters: {
        categories: [],
        equipment: [],
        muscles: [],
        searchQuery: '',
      },
      favoriteExercises: [],
    });
    jest.clearAllMocks();
  });

  function mockExercisesQuery(data: unknown[], error: Error | null = null) {
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      then: jest.fn().mockResolvedValue({ data, error }),
    };
    (supabase.from as jest.Mock).mockReturnValue(mockChain);
    return mockChain;
  }

  describe('loadExercises', () => {
    it('loads exercises from database', async () => {
      const mockExercises = [
        {
          id: '1',
          name: 'Bench Press',
          category: 'chest',
          equipment: 'barbell',
          primary_muscles: ['pectorals'],
          secondary_muscles: ['triceps'],
        },
        {
          id: '2',
          name: 'Squat',
          category: 'legs',
          equipment: 'barbell',
          primary_muscles: ['quadriceps'],
          secondary_muscles: ['glutes'],
        },
      ];
      mockExercisesQuery(mockExercises);

      await useExerciseStore.getState().loadExercises();

      const state = useExerciseStore.getState();
      expect(state.exercises).toHaveLength(2);
      expect(state.exercises[0].name).toBe('Bench Press');
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('sets loading state during fetch', async () => {
      mockExercisesQuery([]);

      const loadPromise = useExerciseStore.getState().loadExercises();
      
      // Check loading state immediately
      expect(useExerciseStore.getState().isLoading).toBe(true);
      
      await loadPromise;
      
      expect(useExerciseStore.getState().isLoading).toBe(false);
    });

    it('handles errors gracefully', async () => {
      mockExercisesQuery([], { message: 'Network error' });

      await useExerciseStore.getState().loadExercises();

      const state = useExerciseStore.getState();
      expect(state.error).toBe('Network error');
      expect(state.isLoading).toBe(false);
      expect(state.exercises).toHaveLength(0);
    });

    it('clears previous error on successful load', async () => {
      // First fail
      mockExercisesQuery([], { message: 'Error' });
      await useExerciseStore.getState().loadExercises();
      expect(useExerciseStore.getState().error).toBe('Error');

      // Then succeed
      mockExercisesQuery([{ id: '1', name: 'Test' }]);
      await useExerciseStore.getState().loadExercises();
      
      expect(useExerciseStore.getState().error).toBeNull();
    });
  });

  describe('filtering', () => {
    beforeEach(async () => {
      const mockExercises = [
        {
          id: '1',
          name: 'Bench Press',
          category: 'chest',
          equipment: 'barbell',
          primary_muscles: ['pectorals'],
        },
        {
          id: '2',
          name: 'Dumbbell Press',
          category: 'chest',
          equipment: 'dumbbell',
          primary_muscles: ['pectorals'],
        },
        {
          id: '3',
          name: 'Squat',
          category: 'legs',
          equipment: 'barbell',
          primary_muscles: ['quadriceps'],
        },
        {
          id: '4',
          name: 'Deadlift',
          category: 'back',
          equipment: 'barbell',
          primary_muscles: ['lower back'],
        },
      ];
      mockExercisesQuery(mockExercises);
      await useExerciseStore.getState().loadExercises();
    });

    describe('setFilter', () => {
      it('filters by category', () => {
        useExerciseStore.getState().setFilter('categories', ['chest']);

        const filtered = useExerciseStore.getState().getFilteredExercises();
        expect(filtered).toHaveLength(2);
        expect(filtered.every(e => e.category === 'chest')).toBe(true);
      });

      it('filters by equipment', () => {
        useExerciseStore.getState().setFilter('equipment', ['dumbbell']);

        const filtered = useExerciseStore.getState().getFilteredExercises();
        expect(filtered).toHaveLength(1);
        expect(filtered[0].equipment).toBe('dumbbell');
      });

      it('filters by muscle group', () => {
        useExerciseStore.getState().setFilter('muscles', ['pectorals']);

        const filtered = useExerciseStore.getState().getFilteredExercises();
        expect(filtered).toHaveLength(2);
        expect(filtered.every(e => e.primary_muscles?.includes('pectorals'))).toBe(true);
      });

      it('combines multiple category filters', () => {
        useExerciseStore.getState().setFilter('categories', ['chest', 'legs']);

        const filtered = useExerciseStore.getState().getFilteredExercises();
        expect(filtered).toHaveLength(3);
      });

      it('combines different filter types', () => {
        useExerciseStore.getState().setFilter('categories', ['chest']);
        useExerciseStore.getState().setFilter('equipment', ['barbell']);

        const filtered = useExerciseStore.getState().getFilteredExercises();
        expect(filtered).toHaveLength(1);
        expect(filtered[0].name).toBe('Bench Press');
      });
    });

    describe('setSearchQuery', () => {
      it('filters by search query (case insensitive)', () => {
        useExerciseStore.getState().setSearchQuery('press');

        const filtered = useExerciseStore.getState().getFilteredExercises();
        expect(filtered).toHaveLength(2);
        expect(filtered.some(e => e.name === 'Bench Press')).toBe(true);
        expect(filtered.some(e => e.name === 'Dumbbell Press')).toBe(true);
      });

      it('handles partial matches', () => {
        useExerciseStore.getState().setSearchQuery('squa');

        const filtered = useExerciseStore.getState().getFilteredExercises();
        expect(filtered).toHaveLength(1);
        expect(filtered[0].name).toBe('Squat');
      });

      it('returns all exercises for empty query', () => {
        useExerciseStore.getState().setSearchQuery('');

        const filtered = useExerciseStore.getState().getFilteredExercises();
        expect(filtered).toHaveLength(4);
      });

      it('returns empty array for no matches', () => {
        useExerciseStore.getState().setSearchQuery('nonexistent');

        const filtered = useExerciseStore.getState().getFilteredExercises();
        expect(filtered).toHaveLength(0);
      });

      it('combines with category filter', () => {
        useExerciseStore.getState().setSearchQuery('press');
        useExerciseStore.getState().setFilter('equipment', ['barbell']);

        const filtered = useExerciseStore.getState().getFilteredExercises();
        expect(filtered).toHaveLength(1);
        expect(filtered[0].name).toBe('Bench Press');
      });
    });

    describe('clearFilters', () => {
      it('clears all filters', () => {
        useExerciseStore.getState().setFilter('categories', ['chest']);
        useExerciseStore.getState().setFilter('equipment', ['barbell']);
        useExerciseStore.getState().setSearchQuery('press');

        useExerciseStore.getState().clearFilters();

        const state = useExerciseStore.getState();
        expect(state.filters.categories).toHaveLength(0);
        expect(state.filters.equipment).toHaveLength(0);
        expect(state.filters.searchQuery).toBe('');

        const filtered = state.getFilteredExercises();
        expect(filtered).toHaveLength(4);
      });
    });
  });

  describe('favorites', () => {
    it('adds exercise to favorites', () => {
      useExerciseStore.getState().toggleFavorite('exercise-1');

      const state = useExerciseStore.getState();
      expect(state.favoriteExercises).toContain('exercise-1');
    });

    it('removes exercise from favorites', () => {
      useExerciseStore.getState().toggleFavorite('exercise-1');
      useExerciseStore.getState().toggleFavorite('exercise-1');

      const state = useExerciseStore.getState();
      expect(state.favoriteExercises).not.toContain('exercise-1');
    });

    it('checks if exercise is favorite', () => {
      useExerciseStore.getState().toggleFavorite('exercise-1');

      const isFavorite = useExerciseStore.getState().isFavorite('exercise-1');
      expect(isFavorite).toBe(true);
    });

    it('returns false for non-favorite exercise', () => {
      const isFavorite = useExerciseStore.getState().isFavorite('exercise-1');
      expect(isFavorite).toBe(false);
    });

    it('maintains multiple favorites', () => {
      useExerciseStore.getState().toggleFavorite('exercise-1');
      useExerciseStore.getState().toggleFavorite('exercise-2');
      useExerciseStore.getState().toggleFavorite('exercise-3');

      const state = useExerciseStore.getState();
      expect(state.favoriteExercises).toHaveLength(3);
    });
  });

  describe('getExerciseById', () => {
    beforeEach(async () => {
      mockExercisesQuery([
        { id: '1', name: 'Exercise 1' },
        { id: '2', name: 'Exercise 2' },
      ]);
      await useExerciseStore.getState().loadExercises();
    });

    it('finds exercise by id', () => {
      const exercise = useExerciseStore.getState().getExerciseById('1');
      expect(exercise).toBeDefined();
      expect(exercise?.name).toBe('Exercise 1');
    });

    it('returns undefined for non-existent id', () => {
      const exercise = useExerciseStore.getState().getExerciseById('999');
      expect(exercise).toBeUndefined();
    });
  });

  describe('getFilteredExercises', () => {
    beforeEach(async () => {
      mockExercisesQuery([
        {
          id: '1',
          name: 'Bench Press',
          category: 'chest',
          equipment: 'barbell',
        },
        {
          id: '2',
          name: 'Squat',
          category: 'legs',
          equipment: 'barbell',
        },
      ]);
      await useExerciseStore.getState().loadExercises();
    });

    it('returns all exercises when no filters applied', () => {
      const filtered = useExerciseStore.getState().getFilteredExercises();
      expect(filtered).toHaveLength(2);
    });

    it('applies filters correctly', () => {
      useExerciseStore.getState().setFilter('categories', ['chest']);
      
      const filtered = useExerciseStore.getState().getFilteredExercises();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].category).toBe('chest');
    });

    it('returns empty array when no exercises loaded', () => {
      useExerciseStore.setState({ exercises: [] });
      
      const filtered = useExerciseStore.getState().getFilteredExercises();
      expect(filtered).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('handles empty exercise list', async () => {
      mockExercisesQuery([]);
      
      await useExerciseStore.getState().loadExercises();
      
      const state = useExerciseStore.getState();
      expect(state.exercises).toHaveLength(0);
      expect(state.error).toBeNull();
    });

    it('handles malformed exercise data', async () => {
      mockExercisesQuery([
        { id: '1', name: null },
        { id: '2' },
      ]);
      
      await useExerciseStore.getState().loadExercises();
      
      // Should still load, even with missing fields
      const state = useExerciseStore.getState();
      expect(state.exercises).toHaveLength(2);
    });

    it('handles special characters in search', () => {
      useExerciseStore.setState({
        exercises: [
          { id: '1', name: 'Test (variation)' } as any,
        ],
      });

      useExerciseStore.getState().setSearchQuery('(variation)');
      
      const filtered = useExerciseStore.getState().getFilteredExercises();
      expect(filtered).toHaveLength(1);
    });

    it('handles very long search queries', () => {
      const longQuery = 'a'.repeat(1000);
      
      useExerciseStore.getState().setSearchQuery(longQuery);
      
      const filtered = useExerciseStore.getState().getFilteredExercises();
      expect(filtered).toHaveLength(0);
    });
  });

  describe('performance', () => {
    it('handles large number of exercises', async () => {
      const manyExercises = Array.from({ length: 1000 }, (_, i) => ({
        id: `${i}`,
        name: `Exercise ${i}`,
        category: i % 2 === 0 ? 'chest' : 'legs',
        equipment: 'barbell',
      }));
      mockExercisesQuery(manyExercises);

      await useExerciseStore.getState().loadExercises();

      const state = useExerciseStore.getState();
      expect(state.exercises).toHaveLength(1000);

      // Filtering should still work
      useExerciseStore.getState().setFilter('categories', ['chest']);
      const filtered = state.getFilteredExercises();
      expect(filtered).toHaveLength(500);
    });

    it('handles rapid filter changes', () => {
      useExerciseStore.getState().setFilter('categories', ['chest']);
      useExerciseStore.getState().setFilter('categories', ['legs']);
      useExerciseStore.getState().setFilter('categories', ['back']);
      useExerciseStore.getState().setFilter('categories', ['chest']);

      const state = useExerciseStore.getState();
      expect(state.filters.categories).toEqual(['chest']);
    });
  });
});

