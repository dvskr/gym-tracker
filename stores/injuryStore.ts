import { create } from 'zustand';
import { logger } from '@/lib/utils/logger';
import { supabase } from '@/lib/supabase';
import { invalidateCoachContextAfterInjuryUpdate } from '@/lib/ai/cacheInvalidation';

export interface Injury {
  id: string;
  user_id: string;
  body_part: string;
  injury_type?: string;
  severity: 'mild' | 'moderate' | 'severe';
  avoid_exercises: string[];
  avoid_movements: string[];
  notes?: string;
  is_active: boolean;
  start_date: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
}

interface InjuryStore {
  injuries: Injury[];
  activeInjuries: Injury[];
  loading: boolean;
  error: string | null;
  
  fetchInjuries: () => Promise<void>;
  addInjury: (injury: Partial<Injury>) => Promise<boolean>;
  updateInjury: (id: string, updates: Partial<Injury>) => Promise<boolean>;
  deactivateInjury: (id: string) => Promise<boolean>;
  reactivateInjury: (id: string) => Promise<boolean>;
  deleteInjury: (id: string) => Promise<boolean>;
  getAvoidedExercises: () => string[];
  getAvoidedMovements: () => string[];
  clearError: () => void;
}

export const useInjuryStore = create<InjuryStore>((set, get) => ({
  injuries: [],
  activeInjuries: [],
  loading: false,
  error: null,

  fetchInjuries: async () => {
    try {
      set({ loading: true, error: null });
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ loading: false });
        return;
      }

      const { data, error } = await supabase
        .from('user_injuries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const injuries = data || [];
      const activeInjuries = injuries.filter(i => i.is_active);

      set({ 
        injuries,
        activeInjuries,
        loading: false 
      });
    } catch (error: any) {
 logger.error('Error fetching injuries:', error);
      set({ 
        error: error.message || 'Failed to fetch injuries',
        loading: false 
      });
    }
  },

  addInjury: async (injuryData: Partial<Injury>): Promise<boolean> => {
    try {
      set({ loading: true, error: null });
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ loading: false, error: 'User not authenticated' });
        return false;
      }

      const { data, error } = await supabase
        .from('user_injuries')
        .insert({
          user_id: user.id,
          body_part: injuryData.body_part,
          injury_type: injuryData.injury_type,
          severity: injuryData.severity || 'moderate',
          avoid_exercises: injuryData.avoid_exercises || [],
          avoid_movements: injuryData.avoid_movements || [],
          notes: injuryData.notes,
          is_active: true,
          start_date: injuryData.start_date || new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (error) throw error;

      // Refresh injuries list
      await get().fetchInjuries();
      
      // Invalidate AI cache so coach sees latest injury data
      invalidateCoachContextAfterInjuryUpdate(user.id);
      
      set({ loading: false });
      return true;
    } catch (error: any) {
 logger.error('Error adding injury:', error);
      set({ 
        error: error.message || 'Failed to add injury',
        loading: false 
      });
      return false;
    }
  },

  updateInjury: async (id: string, updates: Partial<Injury>): Promise<boolean> => {
    try {
      set({ loading: true, error: null });

      const { error } = await supabase
        .from('user_injuries')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      // Refresh injuries list
      await get().fetchInjuries();
      
      // Invalidate AI cache so coach sees updated injury data
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        invalidateCoachContextAfterInjuryUpdate(user.id);
      }
      
      set({ loading: false });
      return true;
    } catch (error: any) {
 logger.error('Error updating injury:', error);
      set({ 
        error: error.message || 'Failed to update injury',
        loading: false 
      });
      return false;
    }
  },

  deactivateInjury: async (id: string): Promise<boolean> => {
    return get().updateInjury(id, {
      is_active: false,
      end_date: new Date().toISOString().split('T')[0],
    });
  },

  reactivateInjury: async (id: string): Promise<boolean> => {
    return get().updateInjury(id, {
      is_active: true,
      end_date: undefined,
    });
  },

  deleteInjury: async (id: string): Promise<boolean> => {
    try {
      set({ loading: true, error: null });

      const { error } = await supabase
        .from('user_injuries')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Refresh injuries list
      await get().fetchInjuries();
      
      // Invalidate AI cache so coach knows injury is removed
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        invalidateCoachContextAfterInjuryUpdate(user.id);
      }
      
      set({ loading: false });
      return true;
    } catch (error: any) {
 logger.error('Error deleting injury:', error);
      set({ 
        error: error.message || 'Failed to delete injury',
        loading: false 
      });
      return false;
    }
  },

  getAvoidedExercises: (): string[] => {
    const { activeInjuries } = get();
    const allExercises = activeInjuries.flatMap(i => i.avoid_exercises || []);
    return [...new Set(allExercises)]; // Remove duplicates
  },

  getAvoidedMovements: (): string[] => {
    const { activeInjuries } = get();
    const allMovements = activeInjuries.flatMap(i => i.avoid_movements || []);
    return [...new Set(allMovements)]; // Remove duplicates
  },

  clearError: () => set({ error: null }),
}));

/**
 * Helper function to check if an exercise should be avoided
 */
export const shouldAvoidExercise = (exerciseName: string, injuries: Injury[]): boolean => {
  return injuries.some(injury => 
    injury.is_active && 
    injury.avoid_exercises?.includes(exerciseName.toLowerCase())
  );
};

/**
 * Helper function to get injury warnings for an exercise
 */
export const getExerciseWarnings = (
  exerciseName: string,
  exerciseMovements: string[],
  injuries: Injury[]
): { level: 'none' | 'caution' | 'avoid'; message: string } => {
  const activeInjuries = injuries.filter(i => i.is_active);
  
  if (activeInjuries.length === 0) {
    return { level: 'none', message: '' };
  }

  // Check if exercise is explicitly avoided
  const explicitlyAvoided = activeInjuries.some(injury =>
    injury.avoid_exercises?.some(ex => 
      exerciseName.toLowerCase().includes(ex.toLowerCase()) ||
      ex.toLowerCase().includes(exerciseName.toLowerCase())
    )
  );

  if (explicitlyAvoided) {
    const injury = activeInjuries.find(i =>
      i.avoid_exercises?.some(ex =>
        exerciseName.toLowerCase().includes(ex.toLowerCase()) ||
        ex.toLowerCase().includes(exerciseName.toLowerCase())
      )
    );
    return {
      level: 'avoid',
      message: `Avoid due to ${injury?.body_part.replace('_', ' ')} injury`,
    };
  }

  // Check for movement pattern conflicts
  const movementConflict = activeInjuries.find(injury =>
    injury.avoid_movements?.some(movement =>
      exerciseMovements.some(em =>
        em.toLowerCase().includes(movement.toLowerCase()) ||
        movement.toLowerCase().includes(em.toLowerCase())
      )
    )
  );

  if (movementConflict) {
    return {
      level: 'caution',
      message: `Use caution with ${movementConflict.body_part.replace('_', ' ')} injury`,
    };
  }

  return { level: 'none', message: '' };
};
