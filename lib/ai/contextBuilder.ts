import { supabase } from '@/lib/supabase';

/**
 * Build user context for AI prompts (legacy compatibility)
 */
export const buildUserContext = (data: {
  recentWorkouts?: any[];
  personalRecords?: any[];
  currentStreak?: number;
  totalWorkouts?: number;
  preferredUnits?: string;
  goals?: string;
  experienceLevel?: string;
}): string => {
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
      for (const exercise of workout.exercises || []) {
        for (const muscle of [...(exercise.primary_muscles || []), ...(exercise.secondary_muscles || [])]) {
          muscleFrequency[muscle] = (muscleFrequency[muscle] || 0) + 1;
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
  } catch (error) {
    console.error('Error building fitness profile context:', error);
    return '';
  }
};

/**
 * Build recovery context from daily check-in
 */
export const buildRecoveryContext = async (userId: string): Promise<string> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('daily_checkins')
      .select('sleep_quality, sleep_hours, stress_level, soreness_level, energy_level')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    if (error || !data) {
      return '';
    }

    let context = 'Today\'s Wellness:\n';
    
    if (data.sleep_quality) {
      const quality = ['Terrible', 'Poor', 'Okay', 'Good', 'Great'][data.sleep_quality - 1];
      context += `- Sleep quality: ${quality} (${data.sleep_quality}/5)\n`;
    }
    
    if (data.sleep_hours) {
      context += `- Sleep hours: ${data.sleep_hours}hrs\n`;
    }
    
    if (data.energy_level) {
      const energy = ['Exhausted', 'Tired', 'Okay', 'Good', 'Energized'][data.energy_level - 1];
      context += `- Energy: ${energy} (${data.energy_level}/5)\n`;
    }
    
    if (data.stress_level) {
      const stress = ['Very Low', 'Low', 'Moderate', 'High', 'Very High'][data.stress_level - 1];
      context += `- Stress: ${stress} (${data.stress_level}/5)\n`;
    }
    
    if (data.soreness_level) {
      const soreness = ['None', 'Mild', 'Moderate', 'Significant', 'Severe'][data.soreness_level - 1];
      context += `- Soreness: ${soreness} (${data.soreness_level}/5)\n`;
    }

    // Add recommendations based on wellness
    if (data.sleep_quality && data.sleep_quality <= 2) {
      context += '\nNote: Poor sleep detected. Consider lighter training today.';
    }
    
    if (data.energy_level && data.energy_level <= 2) {
      context += '\nNote: Low energy detected. May need active recovery instead.';
    }
    
    if (data.soreness_level && data.soreness_level >= 4) {
      context += '\nNote: High soreness detected. Focus on unaffected muscle groups.';
    }

    return context;
  } catch (error) {
    console.error('Error building recovery context:', error);
    return '';
  }
};

/**
 * Build complete AI context combining all factors
 */
export const buildCompleteContext = async (userId: string): Promise<string> => {
  const fitnessProfile = await buildFitnessProfileContext(userId);
  const recoveryContext = await buildRecoveryContext(userId);
  const injuryContext = await buildInjuryContext(userId);

  let context = '';
  
  if (fitnessProfile) {
    context += fitnessProfile + '\n\n';
  }
  
  if (recoveryContext) {
    context += recoveryContext + '\n\n';
  }

  if (injuryContext) {
    context += injuryContext + '\n\n';
  }

  context += 'Please provide personalized recommendations based on this profile.';

  return context;
};

/**
 * Validate exercises against available equipment
 */
export const validateExerciseEquipment = (
  exerciseName: string,
  requiredEquipment: string[],
  availableEquipment: string[]
): { valid: boolean; missingEquipment: string[] } => {
  if (!requiredEquipment || requiredEquipment.length === 0) {
    return { valid: true, missingEquipment: [] };
  }

  const missing = requiredEquipment.filter(eq => !availableEquipment.includes(eq));
  
  return {
    valid: missing.length === 0,
    missingEquipment: missing,
  };
};

/**
 * Get equipment-appropriate alternatives
 */
export const getEquipmentAlternatives = (
  equipment: string[]
): Record<string, string[]> => {
  const alternatives: Record<string, string[]> = {
    barbell: ['dumbbells', 'kettlebells', 'resistance_bands'],
    cables: ['resistance_bands', 'dumbbells'],
    machines: ['dumbbells', 'barbell', 'bodyweight'],
    squat_rack: ['dumbbells', 'kettlebells', 'bodyweight'],
    leg_press: ['barbell', 'dumbbells', 'bodyweight'],
    smith_machine: ['barbell', 'dumbbells'],
  };

  return alternatives;
};

/**
 * Build injury/limitation context for AI prompts
 */
export const buildInjuryContext = async (userId: string): Promise<string> => {
  try {
    const { data, error } = await supabase
      .from('user_injuries')
      .select('body_part, injury_type, severity, avoid_exercises, avoid_movements, notes')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error || !data || data.length === 0) {
      return '';
    }

    let context = '\n⚠️ IMPORTANT - Active Injuries/Limitations:\n';
    
    for (const injury of data) {
      context += `\n${injury.body_part.replace('_', ' ').toUpperCase()}`;
      if (injury.injury_type) {
        context += ` (${injury.injury_type})`;
      }
      context += ` - Severity: ${injury.severity}\n`;
      
      if (injury.avoid_movements && injury.avoid_movements.length > 0) {
        context += `  ❌ Avoid movements: ${injury.avoid_movements.join(', ')}\n`;
      }
      
      if (injury.avoid_exercises && injury.avoid_exercises.length > 0) {
        context += `  ❌ Avoid exercises: ${injury.avoid_exercises.join(', ')}\n`;
      }
      
      if (injury.notes) {
        context += `  📝 Note: ${injury.notes}\n`;
      }
    }

    context += '\n🔒 CRITICAL INSTRUCTIONS:\n';
    context += '- DO NOT suggest any avoided exercises or movements\n';
    context += '- Suggest safe alternatives that don\'t stress injured areas\n';
    context += '- Consider injury severity when programming volume/intensity\n';
    context += '- Prioritize injury-safe exercises even if suboptimal\n';

    return context;
  } catch (error) {
    console.error('Error building injury context:', error);
    return '';
  }
};
