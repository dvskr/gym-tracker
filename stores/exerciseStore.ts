import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { Exercise } from '@/types/database';

// Transform Supabase exercise to display format
interface DisplayExercise {
  id: string;
  name: string;
  bodyPart: string;
  target: string;
  equipment: string;
  gifUrl: string;
  secondaryMuscles: string[];
  instructions: string[];
}

type BodyPart = 
  | 'back'
  | 'cardio'
  | 'chest'
  | 'lower arms'
  | 'lower legs'
  | 'neck'
  | 'shoulders'
  | 'upper arms'
  | 'upper legs'
  | 'waist';

interface ExerciseState {
  // State
  exercises: DisplayExercise[];
  isLoading: boolean;
  searchQuery: string;
  selectedBodyPart: BodyPart | null;
  lastFetched: number | null;
  error: string | null;

  // Actions
  fetchExercises: (force?: boolean) => Promise<void>;
  searchExercises: (query: string) => void;
  filterByBodyPart: (bodyPart: BodyPart | null) => void;
  getFilteredExercises: () => DisplayExercise[];
  clearFilters: () => void;
  clearError: () => void;
}

// Cache duration: 24 hours
const CACHE_DURATION = 24 * 60 * 60 * 1000;

// Transform Supabase exercise to display format
function transformExercise(exercise: Exercise): DisplayExercise {
  return {
    id: exercise.external_id || exercise.id,
    name: exercise.name,
    bodyPart: exercise.category || '',
    target: exercise.primary_muscles?.[0] || '',
    equipment: exercise.equipment || '',
    gifUrl: exercise.gif_url || '',
    secondaryMuscles: exercise.secondary_muscles || [],
    instructions: exercise.instructions || [],
  };
}

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

      // Fetch all exercises from Supabase
      fetchExercises: async (force = false) => {
        const { lastFetched, exercises, isLoading } = get();

        // Prevent concurrent fetches
        if (isLoading) return;

        // Check cache validity
        const isCacheValid =
          lastFetched &&
          Date.now() - lastFetched < CACHE_DURATION &&
          exercises.length > 100; // Only use cache if we have substantial data

        if (isCacheValid && !force) {
          return;
        }

        set({ isLoading: true, error: null });

        try {
          // Supabase has a default limit of 1000 rows
          // Fetch in batches to get all exercises
          const allExercises: Exercise[] = [];
          const batchSize = 1000;
          let offset = 0;
          let hasMore = true;

          while (hasMore) {
            const { data, error } = await supabase
              .from('exercises')
              .select('*')
              .order('name')
              .range(offset, offset + batchSize - 1);

            if (error) {
              throw new Error(error.message);
            }

            if (data && data.length > 0) {
              allExercises.push(...data);
              offset += batchSize;
              
              // If we got less than batch size, we've reached the end
              if (data.length < batchSize) {
                hasMore = false;
              }
            } else {
              hasMore = false;
            }
          }

          const transformedExercises = allExercises.map(transformExercise);

          set({
            exercises: transformedExercises,
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

      // Filter by body part
      filterByBodyPart: (bodyPart: BodyPart | null) => {
        set({ selectedBodyPart: bodyPart });
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
