import { create } from 'zustand';
import { logger } from '@/lib/utils/logger';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { Exercise } from '@/types/database';
import { initializeFuseSearch, fuzzySearchExercises, clearFuseInstance } from '@/lib/utils/fuzzySearch';

// Transform Supabase exercise to display format
interface DisplayExercise {
  id: string; // UUID from database
  externalId: string | null; // ExerciseDB ID (e.g., "0085")
  name: string;
  bodyPart: string;
  target: string;
  equipment: string;
  gifUrl: string;
  secondaryMuscles: string[];
  instructions: string[];
  measurementType?: string;
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

// Filter Presets - Quick access to common filter combinations
export interface FilterPreset {
  name: string;
  icon: string;
  equipment?: string[];
  bodyParts?: string[];
  exerciseKeywords?: string[];
}

export const FILTER_PRESETS = {
  homeWorkout: {
    name: 'Home Workout',
    icon: 'Home',
    equipment: ['body weight', 'dumbbell', 'resistance band'],
  },
  compoundLifts: {
    name: 'Compound Lifts',
    icon: 'Dumbbell',
    equipment: ['barbell'],
    exerciseKeywords: ['squat', 'deadlift', 'bench press', 'row', 'overhead press', 'clean', 'snatch'],
  },
  upperBody: {
    name: 'Upper Body',
    icon: 'User',
    bodyParts: ['chest', 'back', 'shoulders', 'upper arms'],
  },
  lowerBody: {
    name: 'Lower Body',
    icon: 'Footprints',
    bodyParts: ['upper legs', 'lower legs'],
  },
  coreWorkout: {
    name: 'Core',
    icon: 'Circle',
    bodyParts: ['waist'],
  },
} as const;

export type FilterPresetKey = keyof typeof FILTER_PRESETS;

interface ExerciseState {
  // State
  exercises: DisplayExercise[];
  isLoading: boolean;
  searchQuery: string;
  selectedBodyPart: BodyPart | null;
  selectedEquipment: string | null; // Currently selected equipment filter (null = all)
  lastFetched: number | null;
  error: string | null;
  recentlyUsedIds: string[]; // Track last 20 exercise IDs used
  favoriteIds: string[]; // Track favorited exercise IDs
  activePreset: FilterPresetKey | null; // Active filter preset

  // Actions
  fetchExercises: (force?: boolean) => Promise<void>;
  clearCache: () => void; // Force clear cache and reload
  searchExercises: (query: string) => void;
  filterByBodyPart: (bodyPart: BodyPart | null) => void;
  filterByEquipment: (equipment: string | null) => void;
  getFilteredExercises: () => DisplayExercise[];
  clearFilters: () => void;
  clearAllFilters: () => void; // Clear all filters including persisted ones
  clearError: () => void;
  
  // Recently Used
  addToRecentlyUsed: (exerciseId: string) => void;
  getRecentlyUsedExercises: () => DisplayExercise[];
  
  // Favorites
  loadFavorites: () => Promise<void>;
  toggleFavorite: (exerciseId: string) => Promise<void>;
  isFavorite: (exerciseId: string) => boolean;
  getFavoriteExercises: () => DisplayExercise[];
  
  // Filter Presets
  applyFilterPreset: (presetKey: FilterPresetKey) => void;
  clearPreset: () => void;
}

// Cache duration: 24 hours
const CACHE_DURATION = 24 * 60 * 60 * 1000;

// Transform Supabase exercise to display format
function transformExercise(exercise: Exercise): DisplayExercise {
  return {
    id: exercise.id, // Keep UUID for database relationships
    externalId: exercise.external_id || null,
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
      selectedEquipment: null,
      lastFetched: null,
      error: null,
      recentlyUsedIds: [],
      favoriteIds: [],
      activePreset: null,

      // Fetch all exercises from Supabase
      fetchExercises: async (force = false) => {
        const { lastFetched, exercises, isLoading } = get();

        // Prevent concurrent fetches
        if (isLoading) {
          logger.log('[ExerciseStore] Already loading, skipping');
          return;
        }

        // Check cache validity
        const isCacheValid =
          lastFetched &&
          Date.now() - lastFetched < CACHE_DURATION &&
          exercises.length > 100; // Only use cache if we have substantial data

        if (isCacheValid && !force) {
          const cacheAge = Math.round((Date.now() - (lastFetched || 0)) / 1000);
          logger.log(`[ExerciseStore] Using cached data (age: ${cacheAge} seconds, count: ${exercises.length})`);
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
          
          // Initialize fuzzy search with loaded exercises
          initializeFuseSearch(transformedExercises);
          
          logger.log(`[ExerciseStore] Loaded ${transformedExercises.length} exercises`);
        } catch (error) {
          logger.error('[ExerciseStore] Error fetching exercises:', error);
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to fetch exercises',
          });
        }
      },

      // Clear cache and force reload
      clearCache: () => {
        // Clear fuzzy search instance
        clearFuseInstance();
        
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

      // Filter by equipment
      filterByEquipment: (equipment: string | null) => {
        set({ selectedEquipment: equipment });
      },

      // Get filtered exercises based on search query and body part
      getFilteredExercises: () => {
        const { exercises, searchQuery, selectedBodyPart, selectedEquipment, activePreset } = get();

        let filtered = [...exercises];

        // Apply preset filters first if active
        if (activePreset) {
          const preset = FILTER_PRESETS[activePreset];
          
          // Filter by preset equipment
          if (preset.equipment && preset.equipment.length > 0) {
            filtered = filtered.filter((exercise) =>
              preset.equipment!.some((equipment) =>
                exercise.equipment.toLowerCase().includes(equipment.toLowerCase())
              )
            );
          }
          
          // Filter by preset body parts
          if (preset.bodyParts && preset.bodyParts.length > 0) {
            filtered = filtered.filter((exercise) =>
              preset.bodyParts!.some((bodyPart) =>
                exercise.bodyPart.toLowerCase().includes(bodyPart.toLowerCase())
              )
            );
          }
          
          // Filter by preset exercise keywords
          if (preset.exerciseKeywords && preset.exerciseKeywords.length > 0) {
            filtered = filtered.filter((exercise) =>
              preset.exerciseKeywords!.some((keyword) =>
                exercise.name.toLowerCase().includes(keyword.toLowerCase())
              )
            );
          }
        }

        // Filter by search query (FUZZY SEARCH)
        if (searchQuery.trim()) {
          // Try fuzzy search first
          const fuzzyResults = fuzzySearchExercises(searchQuery);
          
          if (fuzzyResults.length > 0) {
            // Use fuzzy search results (already sorted by relevance)
            // But only if they're in the current filtered set
            const filteredIds = new Set(filtered.map(ex => ex.id));
            filtered = fuzzyResults.filter(ex => filteredIds.has(ex.id));
          } else {
            // Fallback to exact .includes() matching if no fuzzy results
            const query = searchQuery.toLowerCase().trim();
            filtered = filtered.filter(
              (exercise) =>
                exercise.name.toLowerCase().includes(query) ||
                exercise.target.toLowerCase().includes(query) ||
                exercise.equipment.toLowerCase().includes(query) ||
                exercise.bodyPart.toLowerCase().includes(query)
            );
          }
        }

        // Filter by body part with partial matching (manual filter, overrides preset)
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

        // Filter by equipment (exact match)
        if (selectedEquipment) {
          filtered = filtered.filter((exercise) =>
            exercise.equipment.toLowerCase() === selectedEquipment.toLowerCase()
          );
        }

        // Sort alphabetically by name (only if not using fuzzy search results)
        // Fuzzy search results are already sorted by relevance
        if (!searchQuery.trim() || fuzzySearchExercises(searchQuery).length === 0) {
          filtered = filtered.sort((a, b) => a.name.localeCompare(b.name));
        }
        
        return filtered;
      },

      // Clear all filters
      clearFilters: () => {
        set({ searchQuery: '', selectedBodyPart: null });
      },

      // Clear all filters and reset persisted state
      clearAllFilters: () => {
        set({
          searchQuery: '',
          selectedBodyPart: null,
          selectedEquipment: null,
          activePreset: null,
        });
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
          logger.error('Failed to load favorites:', error);
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
          logger.error('Failed to toggle favorite:', error);
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

      // ==========================================
      // FILTER PRESETS
      // ==========================================
      
      // Apply a filter preset
      applyFilterPreset: (presetKey: FilterPresetKey) => {
        set({
          activePreset: presetKey,
          // Clear manual filters when preset is applied
          selectedBodyPart: null,
        });
      },
      
      // Clear active preset
      clearPreset: () => {
        set({ activePreset: null });
      },
    }),
    {
      name: 'exercise-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Persist exercises, lastFetched, recentlyUsedIds, filter state, and activePreset
      partialize: (state) => ({
        exercises: state.exercises,
        lastFetched: state.lastFetched,
        recentlyUsedIds: state.recentlyUsedIds,
        // Filter state (persisted between sessions)
        searchQuery: state.searchQuery,
        selectedBodyPart: state.selectedBodyPart,
        selectedEquipment: state.selectedEquipment,
        activePreset: state.activePreset,
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
