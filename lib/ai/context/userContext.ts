/**
 * User profile context building for AI prompts
 */

import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/utils/logger';
import type { UserContextData } from '../types';

/**
 * Build user context for AI prompts (legacy compatibility)
 */
export const buildUserContext = (data: UserContextData): string => {
  let context = '';

  if (data.experienceLevel) {
    context += `Experience: ${data.experienceLevel}\n`;
  }

  if (data.goals) {
    context += `Goals: ${data.goals}\n`;
  }

  if (data.currentStreak) {
    context += `Current streak: ${data.currentStreak} days\n`;
  }

  if (data.recentWorkouts && data.recentWorkouts.length > 0) {
    const muscleFrequency: Record<string, number> = {};
    
    for (const workout of data.recentWorkouts) {
      for (const exercise of workout.workout_exercises || []) {
        if (exercise.exercises) {
          for (const muscle of [...(exercise.exercises.primary_muscles || []), ...(exercise.exercises.secondary_muscles || [])]) {
            muscleFrequency[muscle] = (muscleFrequency[muscle] || 0) + 1;
          }
        }
      }
    }

    const sortedMuscles = Object.entries(muscleFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    if (sortedMuscles.length > 0) {
      context += `\nRecently trained: ${sortedMuscles.map(([m]) => m).join(', ')}\n`;
    }
  }

  return context;
};

/**
 * Build equipment context for AI prompts
 */
export const buildEquipmentContext = (equipment: string[]): string => {
  if (!equipment || equipment.length === 0) {
    return 'No equipment restrictions. Suggest any exercises.';
  }

  const equipmentList = equipment.join(', ');
  
  return `Available equipment: ${equipmentList}. 
IMPORTANT: Only suggest exercises that can be done with this equipment. 
Do not suggest exercises requiring equipment the user doesn't have.`;
};

/**
 * Build fitness profile context for AI prompts
 */
export const buildFitnessProfileContext = async (userId: string): Promise<string> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('fitness_goal, weekly_workout_target, experience_level, training_split, gym_type, available_equipment')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return '';
    }

    const goalLabels: Record<string, string> = {
      'build_muscle': 'Build Muscle (Hypertrophy)',
      'lose_fat': 'Lose Fat',
      'strength': 'Strength Training',
      'endurance': 'Endurance/Conditioning',
      'maintain': 'Maintain Fitness',
      'general_fitness': 'General Fitness',
    };

    const experienceLabels: Record<string, string> = {
      'beginner': 'Beginner (<1 year)',
      'intermediate': 'Intermediate (1-3 years)',
      'advanced': 'Advanced (3+ years)',
    };

    const gymTypeLabels: Record<string, string> = {
      'commercial_gym': 'Commercial Gym',
      'home_gym': 'Home Gym',
      'minimal': 'Minimal Equipment',
      'bodyweight_only': 'Bodyweight Only',
    };

    let context = 'User Profile:\n';
    
    if (data.fitness_goal) {
      context += `- Goal: ${goalLabels[data.fitness_goal] || data.fitness_goal}\n`;
    }
    
    if (data.weekly_workout_target) {
      context += `- Target: ${data.weekly_workout_target}x per week\n`;
    }
    
    if (data.experience_level) {
      context += `- Experience: ${experienceLabels[data.experience_level] || data.experience_level}\n`;
    }
    
    if (data.training_split) {
      context += `- Split: ${data.training_split.replace(/_/g, ' ')}\n`;
    }

    if (data.gym_type) {
      context += `- Setup: ${gymTypeLabels[data.gym_type] || data.gym_type}\n`;
    }

    if (data.available_equipment && data.available_equipment.length > 0) {
      context += `\n${buildEquipmentContext(data.available_equipment)}`;
    }

    return context;
  } catch (error: unknown) {
    logger.error('Error building fitness profile context:', error);
    return '';
  }
};


