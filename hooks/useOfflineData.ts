import { useOfflineFirst, UseOfflineFirstResult } from './useOfflineFirst';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

/**
 * Convenience hook for workouts with offline-first pattern
 */
export function useWorkoutsOffline(): UseOfflineFirstResult<any> {
  const { user } = useAuthStore();

  return useOfflineFirst(
    '@gym/workouts',
    async () => {
      const { data, error } = await supabase
        .from('workouts')
        .select(`
          *,
          workout_exercises (
            *,
            exercise:exercises (*)
          )
        `)
        .eq('user_id', user?.id)
        .order('started_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    {
      cacheTime: 5 * 60 * 1000, // 5 minutes
      refetchOnMount: true,
      refetchOnReconnect: true,
    }
  );
}

/**
 * Convenience hook for templates with offline-first pattern
 */
export function useTemplatesOffline(): UseOfflineFirstResult<any> {
  const { user } = useAuthStore();

  return useOfflineFirst(
    '@gym/templates',
    async () => {
      const { data, error } = await supabase
        .from('workout_templates')
        .select(`
          *,
          template_exercises (
            *,
            exercise:exercises (*)
          )
        `)
        .eq('user_id', user?.id)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    {
      cacheTime: 10 * 60 * 1000, // 10 minutes (templates change less often)
      refetchOnMount: false,
      refetchOnReconnect: true,
    }
  );
}

/**
 * Convenience hook for body weight log with offline-first pattern
 */
export function useWeightLogOffline(): UseOfflineFirstResult<any> {
  const { user } = useAuthStore();

  return useOfflineFirst(
    '@gym/weight_log',
    async () => {
      const { data, error } = await supabase
        .from('body_weight_log')
        .select('*')
        .eq('user_id', user?.id)
        .order('logged_at', { ascending: false })
        .limit(100); // Last 100 entries

      if (error) throw error;
      return data || [];
    },
    {
      cacheTime: 5 * 60 * 1000,
      refetchOnMount: true,
      refetchOnReconnect: true,
    }
  );
}

/**
 * Convenience hook for body measurements with offline-first pattern
 */
export function useMeasurementsOffline(): UseOfflineFirstResult<any> {
  const { user } = useAuthStore();

  return useOfflineFirst(
    '@gym/measurements',
    async () => {
      const { data, error } = await supabase
        .from('body_measurements')
        .select('*')
        .eq('user_id', user?.id)
        .order('measured_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    {
      cacheTime: 10 * 60 * 1000,
      refetchOnMount: false,
      refetchOnReconnect: true,
    }
  );
}

/**
 * Convenience hook for personal records with offline-first pattern
 */
export function usePersonalRecordsOffline(): UseOfflineFirstResult<any> {
  const { user } = useAuthStore();

  return useOfflineFirst(
    '@gym/personal_records',
    async () => {
      const { data, error } = await supabase
        .from('personal_records')
        .select(`
          *,
          exercise:exercises (*)
        `)
        .eq('user_id', user?.id)
        .order('achieved_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    {
      cacheTime: 5 * 60 * 1000,
      refetchOnMount: true,
      refetchOnReconnect: true,
    }
  );
}

/**
 * Hook for exercises (cached, read-only)
 * Exercises don't change often, so cache for longer
 */
export function useExercises() {
  return useOfflineFirst(
    '@gym/exercises',
    async () => {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    {
      cacheTime: 60 * 60 * 1000, // 1 hour (exercises rarely change)
      refetchOnMount: false,
      refetchOnReconnect: false,
    }
  );
}

/**
 * Hook for custom exercises (user-created)
 */
export function useCustomExercises(): UseOfflineFirstResult<any> {
  const { user } = useAuthStore();

  return useOfflineFirst(
    '@gym/custom_exercises',
    async () => {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('created_by', user?.id)
        .eq('is_custom', true)
        .order('name', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    {
      cacheTime: 10 * 60 * 1000,
      refetchOnMount: false,
      refetchOnReconnect: true,
    }
  );
}

