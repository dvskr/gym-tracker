import React, { useCallback } from 'react';
import { logger } from '@/lib/utils/logger';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { ExerciseSearch } from '@/components/exercise/ExerciseSearch';
import { ExerciseDBExercise } from '@/types/database';
import { supabase } from '@/lib/supabase';
import { successHaptic } from '@/lib/utils/haptics';

export default function AddExerciseToTemplateScreen() {
  const { templateId } = useLocalSearchParams<{ templateId: string }>();

  const handleSelectExercise = useCallback(
    async (exercise: ExerciseDBExercise) => {
      if (!templateId) return;

      try {
        // First, find or create the exercise in our database
        let exerciseId: string;

        const { data: existingExercise } = await supabase
          .from('exercises')
          .select('id')
          .eq('external_id', exercise.id)
          .single();

        if (existingExercise) {
          exerciseId = existingExercise.id;
        } else {
          // Create exercise in DB
          const { data: newExercise, error: exerciseError } = await supabase
            .from('exercises')
            .insert({
              external_id: exercise.id,
              name: exercise.name,
              primary_muscles: [exercise.target],
              secondary_muscles: exercise.secondaryMuscles || [],
              equipment: exercise.equipment,
              category: exercise.bodyPart,
              gif_url: exercise.gifUrl,
              instructions: exercise.instructions || [],
              is_custom: false,
            })
            .select()
            .single();

          if (exerciseError) throw exerciseError;
          exerciseId = newExercise.id;
        }

        // Get current max order_index for this template
        const { data: maxOrder } = await supabase
          .from('template_exercises')
          .select('order_index')
          .eq('template_id', templateId)
          .order('order_index', { ascending: false })
          .limit(1)
          .single();

        const nextOrderIndex = (maxOrder?.order_index ?? -1) + 1;

        // Add exercise to template
        const { error: insertError } = await supabase
          .from('template_exercises')
          .insert({
            template_id: templateId,
            exercise_id: exerciseId,
            order_index: nextOrderIndex,
            target_sets: 3,
            target_reps_min: 8,
            target_reps_max: 12,
            rest_seconds: 90,
          });

        if (insertError) throw insertError;

        successHaptic();
        router.back();
      } catch (error) {
 logger.error('Error adding exercise to template:', error);
      }
    },
    [templateId]
  );

  const handleClose = useCallback(() => {
    router.back();
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />
      <View style={styles.content}>
        <ExerciseSearch
          onSelectExercise={handleSelectExercise}
          onClose={handleClose}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  content: {
    flex: 1,
  },
});
