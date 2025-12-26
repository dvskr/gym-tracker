import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ExerciseDBExercise, BodyPart } from '@/types/database';
import {
  fetchAllExercises,
  searchExercisesByName,
  fetchExercisesByBodyPart,
} from '@/lib/services/exercisedb';

interface ExerciseState {
  // State
  exercises: ExerciseDBExercise[];
  isLoading: boolean;
  searchQuery: string;
  selectedBodyPart: BodyPart | null;
  lastFetched: number | null;
  error: string | null;

  // Actions
  fetchExercises: (force?: boolean) => Promise<void>;
  searchExercises: (query: string) => void;
  filterByBodyPart: (bodyPart: BodyPart | null) => Promise<void>;
  getFilteredExercises: () => ExerciseDBExercise[];
  clearFilters: () => void;
  clearError: () => void;
}

// Cache duration: 24 hours
const CACHE_DURATION = 24 * 60 * 60 * 1000;

export const useExerciseStore = create<ExerciseState>()(
  persist(
    (set, get) => ({
      // Initial state
      exercises: [],
      isLoading: false,
      searchQuery: '',
      selectedBodyPart: null,
      lastFetched: null,
      error: null,

      // Fetch all exercises with caching
      fetchExercises: async (force = false) => {
        const { lastFetched, exercises, isLoading } = get();

        // Prevent concurrent fetches
        if (isLoading) return;

        // Check cache validity
        const isCacheValid =
          lastFetched &&
          Date.now() - lastFetched < CACHE_DURATION &&
          exercises.length > 0;

        if (isCacheValid && !force) {
          return;
        }

        set({ isLoading: true, error: null });

        try {
          // Fetch exercises in batches for better performance
          const allExercises: ExerciseDBExercise[] = [];
          let offset = 0;
          const limit = 100;
          let hasMore = true;

          // Fetch up to 1000 exercises (10 batches)
          while (hasMore && offset < 1000) {
            const batch = await fetchAllExercises({ limit, offset });
            
            if (batch.length === 0) {
              hasMore = false;
            } else {
              allExercises.push(...batch);
              offset += limit;
              
              // If we got less than the limit, we've reached the end
              if (batch.length < limit) {
                hasMore = false;
              }
            }
          }

          set({
            exercises: allExercises,
            lastFetched: Date.now(),
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to fetch exercises',
          });
        }
      },

      // Set search query (filtering happens in getFilteredExercises)
      searchExercises: (query: string) => {
        set({ searchQuery: query });
      },

      // Filter by body part - fetches from API if not in cache
      filterByBodyPart: async (bodyPart: BodyPart | null) => {
        set({ selectedBodyPart: bodyPart });

        // If clearing filter or exercises already loaded, no need to fetch
        if (!bodyPart || get().exercises.length > 0) {
          return;
        }

        // If no exercises cached, fetch the specific body part
        set({ isLoading: true, error: null });

        try {
          const exercises = await fetchExercisesByBodyPart(bodyPart, { limit: 200 });
          
          set((state) => ({
            exercises: [...state.exercises, ...exercises].filter(
              (exercise, index, self) =>
                index === self.findIndex((e) => e.id === exercise.id)
            ),
            isLoading: false,
          }));
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to fetch exercises',
          });
        }
      },

      // Get filtered exercises based on search query and body part
      getFilteredExercises: () => {
        const { exercises, searchQuery, selectedBodyPart } = get();

        let filtered = [...exercises];

        // Filter by body part
        if (selectedBodyPart) {
          filtered = filtered.filter(
            (exercise) =>
              exercise.bodyPart.toLowerCase() === selectedBodyPart.toLowerCase()
          );
        }

        // Filter by search query
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase().trim();
          filtered = filtered.filter(
            (exercise) =>
              exercise.name.toLowerCase().includes(query) ||
              exercise.target.toLowerCase().includes(query) ||
              exercise.equipment.toLowerCase().includes(query) ||
              exercise.bodyPart.toLowerCase().includes(query)
          );
        }

        // Sort alphabetically by name
        return filtered.sort((a, b) => a.name.localeCompare(b.name));
      },

      // Clear all filters
      clearFilters: () => {
        set({ searchQuery: '', selectedBodyPart: null });
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'exercise-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist exercises and lastFetched, not UI state
      partialize: (state) => ({
        exercises: state.exercises,
        lastFetched: state.lastFetched,
      }),
    }
  )
);

// Selector hooks for better performance
export const useExercises = () => useExerciseStore((state) => state.exercises);
export const useExerciseLoading = () => useExerciseStore((state) => state.isLoading);
export const useExerciseError = () => useExerciseStore((state) => state.error);
export const useSearchQuery = () => useExerciseStore((state) => state.searchQuery);
export const useSelectedBodyPart = () => useExerciseStore((state) => state.selectedBodyPart);

