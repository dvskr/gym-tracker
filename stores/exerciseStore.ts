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
  measurementType?: string; // ADD THIS FIELD
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
  | 'waist'
  | 'arms'    // Grouped filter for both upper and lower arms
  | 'legs';   // Grouped filter for both upper and lower legs

interface ExerciseState {
  // State
  exercises: DisplayExercise[];
  isLoading: boolean;
  searchQuery: string;
  selectedBodyPart: BodyPart | null;
  lastFetched: number | null;
  error: string | null;
  recentlyUsedIds: string[]; // Track last 20 exercise IDs used
  favoriteIds: string[]; // Track favorited exercise IDs

  // Actions
  fetchExercises: (force?: boolean) => Promise<void>;
  clearCache: () => void; // Force clear cache and reload
  searchExercises: (query: string) => void;
  filterByBodyPart: (bodyPart: BodyPart | null) => void;
  getFilteredExercises: () => DisplayExercise[];
  clearFilters: () => void;
  clearError: () => void;
  
  // Recently Used
  addToRecentlyUsed: (exerciseId: string) => void;
  getRecentlyUsedExercises: () => DisplayExercise[];
  
  // Favorites
  loadFavorites: () => Promise<void>;
  toggleFavorite: (exerciseId: string) => Promise<void>;
  isFavorite: (exerciseId: string) => boolean;
  getFavoriteExercises: () => DisplayExercise[];
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
    measurementType: exercise.measurement_type || 'reps_weight',
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
      recentlyUsedIds: [],
      favoriteIds: [],

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
              .eq('is_active', true)
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

      // Clear cache and force reload
      clearCache: () => {
        set({
          exercises: [],
          lastFetched: null,
          searchQuery: '',
          selectedBodyPart: null,
        });
        // Immediately fetch fresh data
        get().fetchExercises(true);
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

        // Filter by body part with partial matching
        if (selectedBodyPart) {
          const selected = selectedBodyPart.toLowerCase();
          
          filtered = filtered.filter((exercise) => {
            const bodyPart = exercise.bodyPart.toLowerCase();
            
            // Exact match OR partial match
            // This makes "legs" match both "upper legs" and "lower legs"
            // And "arms" match both "upper arms" and "lower arms"
            return bodyPart === selected || bodyPart.includes(selected);
          });
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

      // ==========================================
      // RECENTLY USED
      // ==========================================
      
      // Add exercise to recently used list
      addToRecentlyUsed: (exerciseId: string) => {
        const { recentlyUsedIds } = get();
        
        // Remove if already exists (to move to front)
        const filtered = recentlyUsedIds.filter(id => id !== exerciseId);
        
        // Add to front
        const updated = [exerciseId, ...filtered];
        
        // Keep max 20
        const trimmed = updated.slice(0, 20);
        
        set({ recentlyUsedIds: trimmed });
      },
      
      // Get recently used exercises in order
      getRecentlyUsedExercises: () => {
        const { exercises, recentlyUsedIds } = get();
        
        return recentlyUsedIds
          .map(id => exercises.find(ex => ex.id === id))
          .filter((ex): ex is DisplayExercise => ex !== undefined);
      },

      // ==========================================
      // FAVORITES
      // ==========================================
      
      // Load favorites from database
      loadFavorites: async () => {
        try {
          const { data, error } = await supabase
            .from('user_exercise_favorites')
            .select('exercise_id');
          
          if (error) throw error;
          
          const favoriteIds = data?.map(f => f.exercise_id) || [];
          set({ favoriteIds });
        } catch (error) {
          console.error('Failed to load favorites:', error);
        }
      },
      
      // Toggle favorite (optimistic update)
      toggleFavorite: async (exerciseId: string) => {
        const { favoriteIds } = get();
        const isFavorited = favoriteIds.includes(exerciseId);
        
        // Optimistic update
        if (isFavorited) {
          set({ favoriteIds: favoriteIds.filter(id => id !== exerciseId) });
        } else {
          set({ favoriteIds: [...favoriteIds, exerciseId] });
        }
        
        // Update database
        try {
          if (isFavorited) {
            // Remove from favorites
            const { error } = await supabase
              .from('user_exercise_favorites')
              .delete()
              .eq('exercise_id', exerciseId);
            
            if (error) throw error;
          } else {
            // Add to favorites
            const { error } = await supabase
              .from('user_exercise_favorites')
              .insert({ exercise_id: exerciseId });
            
            if (error) throw error;
          }
        } catch (error) {
          console.error('Failed to toggle favorite:', error);
          // Revert optimistic update on error
          set({ favoriteIds });
        }
      },
      
      // Check if exercise is favorited
      isFavorite: (exerciseId: string) => {
        const { favoriteIds } = get();
        return favoriteIds.includes(exerciseId);
      },
      
      // Get favorited exercises
      getFavoriteExercises: () => {
        const { exercises, favoriteIds } = get();
        
        return exercises.filter(ex => favoriteIds.includes(ex.id));
      },
    }),
    {
      name: 'exercise-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Persist exercises, lastFetched, and recentlyUsedIds
      partialize: (state) => ({
        exercises: state.exercises,
        lastFetched: state.lastFetched,
        recentlyUsedIds: state.recentlyUsedIds,
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
