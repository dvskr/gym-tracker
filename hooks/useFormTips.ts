// hooks/useFormTips.ts
// Hook to fetch form tips for an exercise from database

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface FormTips {
  id: string;
  exercise_id: string;
  key_cues: string[];
  common_mistakes: string[];
  breathing: string;
  safety_tips: string[];
}

export function useFormTips(exerciseId: string | undefined) {
  const [tips, setTips] = useState<FormTips | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!exerciseId) {
      setTips(null);
      return;
    }

    let isMounted = true;

    async function fetchTips() {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('form_tips')
          .select('*')
          .eq('exercise_id', exerciseId)
          .single();

        if (!isMounted) return;

        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            setTips(null); // No tips found - not an error
          } else {
            setError(fetchError.message);
          }
        } else {
          setTips(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch form tips');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchTips();
    return () => {
      isMounted = false;
    };
  }, [exerciseId]);

  return { tips, isLoading, error };
}

