import { create } from 'zustand';
import { logger } from '@/lib/utils/logger';
import { supabase } from '@/lib/supabase';
import { invalidateCoachContextAfterCheckin } from '@/lib/ai/cacheInvalidation';

export interface CheckinData {
  sleep_quality?: number;
  sleep_hours?: number;
  stress_level?: number;
  soreness_level?: number;
  energy_level?: number;
  notes?: string;
}

export interface DailyCheckin extends CheckinData {
  id: string;
  user_id: string;
  date: string;
  created_at: string;
  updated_at: string;
}

interface CheckinStore {
  todaysCheckin: DailyCheckin | null;
  hasCheckedInToday: boolean;
  loading: boolean;
  error: string | null;
  
  fetchTodaysCheckin: () => Promise<void>;
  saveCheckin: (data: CheckinData) => Promise<boolean>;
  clearError: () => void;
}

export const useCheckinStore = create<CheckinStore>((set, get) => ({
  todaysCheckin: null,
  hasCheckedInToday: false,
  loading: false,
  error: null,

  fetchTodaysCheckin: async () => {
    try {
      set({ loading: true, error: null });
      
      const today = new Date().toISOString().split('T')[0];
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        set({ loading: false });
        return;
      }

      const { data, error } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found (ok)
        throw error;
      }

      set({ 
        todaysCheckin: data,
        hasCheckedInToday: !!data,
        loading: false 
      });
    } catch (error: unknown) {
 logger.error('Error fetching check-in:', error);
      set({ 
        error: error.message || 'Failed to fetch check-in',
        loading: false 
      });
    }
  },

  saveCheckin: async (checkinData: CheckinData): Promise<boolean> => {
    try {
      set({ loading: true, error: null });
      
      const today = new Date().toISOString().split('T')[0];
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        set({ loading: false, error: 'User not authenticated' });
        return false;
      }

      const { data, error } = await supabase
        .from('daily_checkins')
        .upsert({
          user_id: user.id,
          date: today,
          ...checkinData,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,date'
        })
        .select()
        .single();

      if (error) throw error;

      set({ 
        todaysCheckin: data,
        hasCheckedInToday: true,
        loading: false 
      });

      // Invalidate AI cache so coach sees latest wellness data
      invalidateCoachContextAfterCheckin(user.id);

      return true;
    } catch (error: unknown) {
 logger.error('Error saving check-in:', error);
      set({ 
        error: error.message || 'Failed to save check-in',
        loading: false 
      });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));

/**
 * Helper function to get wellness average for last N days
 */
export async function getWellnessAverage(userId: string, days: number = 7) {
  try {
    const { data, error } = await supabase.rpc('get_wellness_average', {
      p_user_id: userId,
      p_days: days
    });

    if (error) throw error;
    return data;
  } catch (error: unknown) {
 logger.error('Error fetching wellness average:', error);
    return null;
  }
}

/**
 * Helper function to get check-ins for a date range
 */
export async function getCheckinsForRange(userId: string, startDate: string, endDate: string) {
  try {
    const { data, error } = await supabase
      .from('daily_checkins')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error: unknown) {
 logger.error('Error fetching check-ins range:', error);
    return [];
  }
}


