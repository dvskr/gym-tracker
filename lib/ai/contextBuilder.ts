import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/utils/logger';

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
 logger.error('Error building fitness profile context:', error);
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
 logger.error('Error building recovery context:', error);
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
 * Build comprehensive coach context including profile, workouts, injuries, equipment, PRs, and check-ins
 * @deprecated Use the new buildCoachContext that returns CoachContext instead
 */
export const buildCoachContextLegacy = async (userId: string): Promise<string> => {
  try {
    // Fetch all relevant data in parallel for performance
    const [
      profile,
      recentWorkouts,
      injuries,
      todayCheckin,
      prs,
      mainLiftHistory
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single(),
      supabase
        .from('workouts')
        .select(`
          id,
          name,
          created_at,
          duration_minutes,
          total_volume,
          notes,
          workout_exercises(
            id,
            exercise_id,
            exercises(name, primary_muscles, secondary_muscles, equipment)
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(14), // Get 2 weeks for better analysis
      supabase
        .from('user_injuries')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true),
      supabase
        .from('daily_checkins')
        .select('*')
        .eq('user_id', userId)
        .eq('date', new Date().toISOString().split('T')[0])
        .single(),
      supabase
        .from('personal_records')
        .select(`
          weight,
          reps,
          created_at,
          exercises(name)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10),
      getMainLiftHistory(userId) // Get detailed history for main lifts
    ]);

    let context = '=== USE❌ PROFILE ===\n';

    // Profile information
    if (profile.data) {
      const p = profile.data;
      context += `Name: ${p.full_name || 'User'}\n`;
      
      if (p.fitness_goal) {
        const goalLabels: Record<string, string> = {
          'build_muscle': 'Build Muscle (Hypertrophy)',
          'lose_fat': 'Lose Fat',
          'strength': 'Strength Training',
          'endurance': 'Endurance/Conditioning',
          'maintain': 'Maintain Fitness',
          'general_fitness': 'General Fitness',
        };
        context += `Goal: ${goalLabels[p.fitness_goal] || p.fitness_goal}\n`;
      }
      
      if (p.experience_level) {
        const expLabels: Record<string, string> = {
          'beginner': 'Beginner (<1 year)',
          'intermediate': 'Intermediate (1-3 years)',
          'advanced': 'Advanced (3+ years)',
        };
        context += `Experience: ${expLabels[p.experience_level] || p.experience_level}\n`;
      }
      
      if (p.weekly_workout_target) {
        context += `Weekly target: ${p.weekly_workout_target} workouts\n`;
      }
      
      context += `Preferred units: ${p.unit_system === 'metric' ? 'kg/cm' : 'lbs/in'}\n`;
      
      // Equipment
      if (p.available_equipment && Array.isArray(p.available_equipment) && p.available_equipment.length > 0) {
        context += `\nEQUIPMENT AVAILABLE:\n${p.available_equipment.map((eq: string) => `- ${eq.replace(/_/g, ' ')}`).join('\n')}\n`;
      } else if (p.gym_type === 'commercial_gym') {
        context += `\nEQUIPMENT: Full commercial gym access\n`;
      } else if (p.gym_type === 'home_gym') {
        context += `\nEQUIPMENT: Home gym setup\n`;
      }
    }

    // Active injuries
    if (injuries.data && injuries.data.length > 0) {
      context += `\n⚠️ ACTIVE INJURIES (CRITICAL - DO NOT suggest exercises that aggravate these):\n`;
      injuries.data.forEach((injury: any) => {
        context += `- ${injury.body_part.replace(/_/g, ' ').toUpperCase()}`;
        if (injury.injury_type) {
          context += ` (${injury.injury_type})`;
        }
        context += ` - ${injury.severity} severity\n`;
        
        if (injury.avoid_movements && injury.avoid_movements.length > 0) {
          context += `  ❌ Avoid: ${injury.avoid_movements.join(', ')}\n`;
        }
        
        if (injury.avoid_exercises && injury.avoid_exercises.length > 0) {
          context += `  ❌ Avoid exercises: ${injury.avoid_exercises.join(', ')}\n`;
        }
      });
    }

    // Recent workouts
    if (recentWorkouts.data && recentWorkouts.data.length > 0) {
      context += `\n=== RECENT WORKOUTS (Last 7 days) ===\n`;
      recentWorkouts.data.forEach((workout: any) => {
        const date = new Date(workout.created_at);
        const daysAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
        const dateStr = daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo} days ago`;
        
        context += `- ${workout.name} (${dateStr})`;
        if (workout.duration_minutes) {
          context += ` - ${workout.duration_minutes} min`;
        }
        
        // List exercises
        if (workout.workout_exercises && workout.workout_exercises.length > 0) {
          const exercises = workout.workout_exercises
            .map((we: any) => we.exercises?.name)
            .filter(Boolean);
          if (exercises.length > 0) {
            context += `\n  Exercises: ${exercises.slice(0, 5).join(', ')}`;
            if (exercises.length > 5) context += ` +${exercises.length - 5} more`;
          }
        }
        context += '\n';
      });
    }

    // Personal records
    if (prs.data && prs.data.length > 0) {
      context += `\n=== PERSONAL RECORDS (Use these EXACT numbers) ===\n`;
      prs.data.forEach((pr: any) => {
        if (pr.exercises?.name) {
          const unit = profile.data?.unit_system === 'metric' ? 'kg' : 'lbs';
          context += `- ${pr.exercises.name}: ${pr.weight}${unit}  ${pr.reps} reps\n`;
        }
      });
    }

    // Main lift history with specific progression data
    if (mainLiftHistory && mainLiftHistory.length > 0) {
      context += `\n=== RECENT LIFT HISTORY (Reference these SPECIFIC numbers in advice) ===\n`;
      mainLiftHistory.forEach((lift: any) => {
        if (lift.sessions.length > 0) {
          const recent = lift.sessions.slice(0, 4);
          const weights = recent.map((s: any) => `${s.weight}${s.reps}`).join(', ');
          
          context += `- ${lift.name}: ${weights}`;
          
          // Detect trends
          if (lift.trend === 'plateau') {
            context += ` ⚠️ PLATEAU (no progress in ${lift.weeksSinceImprovement} weeks)`;
          } else if (lift.trend === 'improving') {
            context += ` ✅ IMPROVING`;
          } else if (lift.trend === 'declining') {
            context += ` ⚠️ DECLINING`;
          }
          
          context += '\n';
        }
      });
    }

    // Weekly training summary with specific numbers
    if (recentWorkouts.data && recentWorkouts.data.length > 0) {
      const now = new Date();
      const thisWeek = recentWorkouts.data.filter((w: any) => {
        const workoutDate = new Date(w.created_at);
        const daysDiff = Math.floor((now.getTime() - workoutDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysDiff < 7;
      });
      
      const lastWeek = recentWorkouts.data.filter((w: any) => {
        const workoutDate = new Date(w.created_at);
        const daysDiff = Math.floor((now.getTime() - workoutDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysDiff >= 7 && daysDiff < 14;
      });
      
      const thisWeekVolume = thisWeek.reduce((sum: number, w: any) => sum + (w.total_volume || 0), 0);
      const lastWeekVolume = lastWeek.reduce((sum: number, w: any) => sum + (w.total_volume || 0), 0);
      const unit = profile.data?.unit_system === 'metric' ? 'kg' : 'lbs';
      
      context += `\n=== WEEKLY SUMMARY (Use these numbers when analyzing training) ===\n`;
      context += `This week: ${thisWeek.length} workouts`;
      if (profile.data?.weekly_workout_target) {
        context += ` (target: ${profile.data.weekly_workout_target})`;
      }
      context += `\n`;
      context += `Last week: ${lastWeek.length} workouts\n`;
      
      if (thisWeekVolume > 0) {
        context += `Total volume this week: ${thisWeekVolume.toLocaleString()} ${unit}\n`;
      }
      if (lastWeekVolume > 0) {
        context += `Total volume last week: ${lastWeekVolume.toLocaleString()} ${unit}\n`;
      }
      
      // Volume change analysis
      if (thisWeekVolume > 0 && lastWeekVolume > 0) {
        const volumeChange = ((thisWeekVolume - lastWeekVolume) / lastWeekVolume * 100).toFixed(1);
        const sign = thisWeekVolume > lastWeekVolume ? '+' : '';
        context += `Volume change: ${sign}${volumeChange}%\n`;
      }
    }

    // Today's check-in
    if (todayCheckin.data) {
      const c = todayCheckin.data;
      context += `\n=== TODAY'S WELLNESS CHECK-IN ===\n`;
      
      if (c.sleep_quality) {
        const quality = ['Terrible', 'Poor', 'Okay', 'Good', 'Great'][c.sleep_quality - 1];
        context += `Sleep quality: ${quality} (${c.sleep_quality}/5)`;
        if (c.sleep_hours) context += ` - ${c.sleep_hours} hours`;
        context += '\n';
      }
      
      if (c.energy_level) {
        const energy = ['Exhausted', 'Tired', 'Okay', 'Good', 'Energized'][c.energy_level - 1];
        context += `Energy: ${energy} (${c.energy_level}/5)\n`;
      }
      
      if (c.stress_level) {
        const stress = ['Very Low', 'Low', 'Moderate', 'High', 'Very High'][c.stress_level - 1];
        context += `Stress: ${stress} (${c.stress_level}/5)\n`;
      }
      
      if (c.soreness_level) {
        const soreness = ['None', 'Mild', 'Moderate', 'Significant', 'Severe'][c.soreness_level - 1];
        context += `Soreness: ${soreness} (${c.soreness_level}/5)\n`;
      }
      
      if (c.notes) {
        context += `Notes: ${c.notes}\n`;
      }

      // Add wellness-based recommendations
      if (c.sleep_quality && c.sleep_quality <= 2) {
        context += '\n⚠️ Note: Poor sleep - consider lighter training\n';
      }
      if (c.energy_level && c.energy_level <= 2) {
        context += '⚠️ Note: Low energy - may need active recovery\n';
      }
      if (c.soreness_level && c.soreness_level >= 4) {
        context += '⚠️ Note: High soreness - focus on unaffected muscle groups\n';
      }
    }

    context += '\n=== CRITICAL INSTRUCTIONS ===\n';
    context += '1. ALWAYS reference SPECIFIC numbers from their data (weights, reps, dates)\n';
    context += '2. NEVE❌ give generic advice when you have specific data available\n';
    context += '3. If they ask about an exercise, find it in their history and reference ACTUAL weights\n';
    context += '4. If they have a plateau, mention the SPECIFIC duration and weights\n';
    context += '5. Compare to their PREVIOUS performance, not generic standards\n';
    context += '6. Respect all injuries - suggest safe alternatives\n';
    context += '7. Only suggest exercises they can do with their equipment\n';
    context += '8. Consider their wellness data when giving recommendations\n';
    context += '\nEXAMPLES:\n';
    context += 'BAD: "Try increasing weight by 5 lbs"\n';
    context += 'GOOD: "Your last bench was 185Ã—8. Try 190Ã—6 or go for 18510"\n\n';
    context += 'BAD: "You might be overtraining"\n';
    context += 'GOOD: "You\'ve trained 6 times in the last 7 days. Your average is 4. Take a rest day."\n';

    return context;
  } catch (error) {
 logger.error('Error building coach context:', error);
    return 'Unable to load full user context. Providing general advice.';
  }
};

/**
 * Get detailed history for main compound lifts
 */
async function getMainLiftHistory(userId: string) {
  try {
    const mainLifts = [
      'Bench Press', 'Barbell Bench Press',
      'Squat', 'Barbell Squat', 'Back Squat',
      'Deadlift', 'Barbell Deadlift', 'Conventional Deadlift',
      'Overhead Press', 'Barbell Overhead Press', 'Military Press',
      'Barbell Row', 'Bent Over Row', 'Pendlay Row'
    ];
    
    // Get workouts from last 60 days
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    
    const { data: workouts } = await supabase
      .from('workouts')
      .select(`
        id,
        created_at,
        workout_exercises(
          id,
          exercises(id, name),
          workout_sets:workout_sets(
            weight,
            reps,
            set_type,
            is_completed
          )
        )
      `)
      .eq('user_id', userId)
      .gte('created_at', sixtyDaysAgo.toISOString())
      .order('created_at', { ascending: false });
    
    if (!workouts) return [];
    
    // Group by exercise and analyze
    const liftData: Record<string, any> = {};
    
    workouts.forEach((workout: any) => {
      workout.workout_exercises?.forEach((we: any) => {
        const exerciseName = we.exercises?.name;
        if (!exerciseName || !mainLifts.some(ml => exerciseName.toLowerCase().includes(ml.toLowerCase()))) {
          return;
        }
        
        // Get best set from this workout
        const completedSets = we.workout_sets?.filter((s: any) => s.is_completed && s.set_type === 'normal') || [];
        if (completedSets.length === 0) return;
        
        const bestSet = completedSets.reduce((best: any, set: any) => {
          const volume = (set.weight || 0) * (set.reps || 0);
          const bestVolume = (best?.weight || 0) * (best?.reps || 0);
          return volume > bestVolume ? set : best;
        }, completedSets[0]);
        
        if (!liftData[exerciseName]) {
          liftData[exerciseName] = {
            name: exerciseName,
            sessions: []
          };
        }
        
        liftData[exerciseName].sessions.push({
          date: workout.created_at,
          weight: bestSet.weight,
          reps: bestSet.reps,
          volume: bestSet.weight * bestSet.reps
        });
      });
    });
    
    // Analyze trends for each lift
    const results = Object.values(liftData).map((lift: any) => {
      // Sort by date
      lift.sessions.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      // Detect trend
      if (lift.sessions.length >= 3) {
        const recent = lift.sessions.slice(0, 3);
        const older = lift.sessions.slice(3, 6);
        
        const recentAvgVolume = recent.reduce((sum: number, s: any) => sum + s.volume, 0) / recent.length;
        const olderAvgVolume = older.length > 0 
          ? older.reduce((sum: number, s: any) => sum + s.volume, 0) / older.length 
          : recentAvgVolume;
        
        if (recentAvgVolume > olderAvgVolume * 1.05) {
          lift.trend = 'improving';
        } else if (recentAvgVolume < olderAvgVolume * 0.95) {
          lift.trend = 'declining';
        } else {
          // Check for plateau (no P❌ in last 4 weeks)
          const fourWeeksAgo = new Date();
          fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
          
          const recentPeak = Math.max(...recent.map((s: any) => s.volume));
          const olderSessions = lift.sessions.filter((s: any) => new Date(s.date) < fourWeeksAgo);
          const olderPeak = olderSessions.length > 0 
            ? Math.max(...olderSessions.map((s: any) => s.volume))
            : 0;
          
          if (recentPeak <= olderPeak) {
            lift.trend = 'plateau';
            // Calculate weeks since improvement
            const lastImprovement = lift.sessions.find((s: any, i: number) => {
              if (i === 0) return false;
              return s.volume > lift.sessions[i - 1].volume;
            });
            
            if (lastImprovement) {
              const weeksSince = Math.floor(
                (Date.now() - new Date(lastImprovement.date).getTime()) / (7 * 24 * 60 * 60 * 1000)
              );
              lift.weeksSinceImprovement = weeksSince;
            }
          } else {
            lift.trend = 'maintaining';
          }
        }
      }
      
      return lift;
    });
    
    // Return only lifts with at least 2 sessions
    return results.filter(lift => lift.sessions.length >= 2);
  } catch (error) {
 logger.error('Error getting main lift history:', error);
    return [];
  }
}

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
        context += `  x Note: ${injury.notes}\n`;
      }
    }

    context += '\nx CRITICAL INSTRUCTIONS:\n';
    context += '- DO NOT suggest any avoided exercises or movements\n';
    context += '- Suggest safe alternatives that don\'t stress injured areas\n';
    context += '- Consider injury severity when programming volume/intensity\n';
    context += '- Prioritize injury-safe exercises even if suboptimal\n';

    return context;
  } catch (error) {
 logger.error('Error building injury context:', error);
    return '';
  }
};

// ==========================================
// ENHANCED COACH CONTEXT (Prevents Hallucinations)
// ==========================================

/**
 * Data state flags for context awareness
 */
export interface DataStateFlags {
  hasWorkouts: boolean;
  hasPRs: boolean;
  hasInjuries: boolean;
  hasCheckin: boolean;
  hasGoals: boolean;
  hasEquipment: boolean;
  workoutCount: number;
  isNewUser: boolean;
  experienceLevel?: string;
}

/**
 * Complete coach context with explicit state
 */
export interface CoachContext {
  text: string;
  flags: DataStateFlags;
  warnings: string[];
}

/**
 * Build comprehensive coach context with hallucination prevention
 * Explicitly tells AI what data exists and what to avoid claiming
 */
export const buildCoachContext = async (userId: string): Promise<CoachContext> => {
  try {
    // Fetch all relevant data in parallel
    const [workouts, prs, profile, injuries, checkin] = await Promise.all([
      getRecentWorkouts(userId, 14),
      getPersonalRecords(userId, 10),
      getUserProfile(userId),
      getActiveInjuries(userId),
      getTodayCheckin(userId),
    ]);

    // Build explicit state flags
    const dataState: DataStateFlags = {
      hasWorkouts: workouts.length > 0,
      hasPRs: prs.length > 0,
      hasInjuries: injuries.length > 0,
      hasCheckin: checkin !== null,
      hasGoals: !!(profile?.fitness_goal),
      hasEquipment: !!(profile?.available_equipment?.length),
      workoutCount: workouts.length,
      isNewUser: workouts.length === 0,
      experienceLevel: profile?.experience_level,
    };

    const warnings: string[] = [];
    let contextText = '';

    // ==========================================
    // NEW USE❌ WARNING (Critical!)
    // ==========================================
    if (dataState.isNewUser) {
      contextText += `
⚠️aï¸⚠️ NEW USE❌ - ZERO WORKOUT DATA ⚠️aï¸⚠️

CRITICAL INSTRUCTIONS:
- This user has NO workout history in the system
- DO NOT reference "your recent workouts" or "last time you trained"
- DO NOT claim to know their strength levels, PRs, or capabilities
- DO NOT say things like "based on your training history" (there is none!)
- DO NOT make assumptions about their experience level
- DO ask questions to understand their background and goals
- DO provide general beginner-friendly guidance
- DO suggest starting points for weight/reps (but label as "starting point")

YOU MUST BE HONEST: "I don't have any workout history for you yet. Let's start fresh!"
`;
      warnings.push('NEW_USER_NO_DATA');
    } else {
      // User has history - build normal context
      contextText += buildWorkoutHistoryContext(workouts);
      
      if (dataState.hasPRs) {
        contextText += '\n' + buildPRContext(prs);
      }
    }

    // ==========================================
    // INJURY WARNINGS (Always prominent)
    // ==========================================
    if (dataState.hasInjuries && injuries.length > 0) {
      contextText += `

🚨🚨🚨 ACTIVE INJURIES - CRITICAL 🚨🚨xa

`;
      for (const injury of injuries) {
        contextText += `
x ${injury.bodyPart.toUpperCase()} - ${injury.type || 'Injury'} (Severity: ${injury.severity})
   ❌ NEVE❌ suggest: ${(injury.avoidExercises || []).join(', ') || 'N/A'}
   ❌ NEVE❌ suggest movements: ${(injury.avoidMovements || []).join(', ') || 'N/A'}
   ${injury.notes ? `x Note: ${injury.notes}` : ''}
`;
      }

      contextText += `
x MANDATORY RULES:
- NEVE❌ suggest avoided exercises/movements (list above)
- Always suggest safe alternatives
- Consider injury severity in programming
- Prioritize safety over optimization
`;
      warnings.push('ACTIVE_INJURIES');
    }

    // ==========================================
    // PROFILE DATA (If available)
    // ==========================================
    if (profile) {
      contextText += '\nx` USE❌ PROFILE:\n';
      
      if (profile.fitness_goal) {
        contextText += `- Primary Goal: ${profile.fitness_goal}\n`;
      }
      
      if (profile.experience_level) {
        contextText += `- Experience Level: ${profile.experience_level}\n`;
      }
      
      if (profile.available_equipment && profile.available_equipment.length > 0) {
        contextText += `- Available Equipment: ${profile.available_equipment.join(', ')}\n`;
        contextText += `  ⚠️ ONLY suggest exercises using this equipment!\n`;
      } else {
        warnings.push('NO_EQUIPMENT_SPECIFIED');
      }
      
      if (profile.weekly_workout_target) {
        contextText += `- Weekly Workout Target: ${profile.weekly_workout_target} days\n`;
      }
    }

    // ==========================================
    // TODAY'S CHECK-IN (If available)
    // ==========================================
    if (dataState.hasCheckin && checkin) {
      contextText += `\nx TODAY'S CHECK-IN:\n`;
      contextText += `- Energy Level: ${checkin.energyLevel}/10\n`;
      contextText += `- Motivation: ${checkin.motivation}/10\n`;
      
      if (checkin.sleepQuality) {
        contextText += `- Sleep Quality: ${checkin.sleepQuality}/10\n`;
      }
      
      if (checkin.soreness && checkin.soreness.length > 0) {
        contextText += `- Sore Areas: ${checkin.soreness.join(', ')}\n`;
        contextText += `  ⚠️ Avoid overworking these areas today\n`;
      }
      
      if (checkin.notes) {
        contextText += `- Notes: ${checkin.notes}\n`;
      }
    }

    // ==========================================
    // DATA AVAILABILITY SUMMARY
    // ==========================================
    contextText += `\n
x9 DATA AVAILABILITY SUMMARY:
- Workout History: ${dataState.hasWorkouts ? `✅ Yes (${dataState.workoutCount} recent)` : '❌ None'}
- Personal Records: ${dataState.hasPRs ? '✅ Yes' : '❌ None'}
- Active Injuries: ${dataState.hasInjuries ? '🚨 Yes (see above)' : '✅ None'}
- Today's Check-in: ${dataState.hasCheckin ? '✅ Yes (see above)' : '❌ None'}
- Equipment Info: ${dataState.hasEquipment ? '✅ Yes (see above)' : '❌ Not specified'}
- Goals Set: ${dataState.hasGoals ? '✅ Yes' : '❌ Not specified'}

⚠️ IMPORTANT: Base your responses ONLY on the data marked with ✅ above.
DO NOT make claims about data marked with R.
`;

    return {
      text: contextText,
      flags: dataState,
      warnings,
    };
  } catch (error) {
 logger.error('Error building coach context:', error);
    
    // Return minimal safe context on error
    return {
      text: '⚠️ Error loading user data. Provide general guidance only.',
      flags: {
        hasWorkouts: false,
        hasPRs: false,
        hasInjuries: false,
        hasCheckin: false,
        hasGoals: false,
        hasEquipment: false,
        workoutCount: 0,
        isNewUser: true,
      },
      warnings: ['ERROR_LOADING_DATA'],
    };
  }
};

// ==========================================
// HELPE❌ FUNCTIONS
// ==========================================

/**
 * Get recent workouts for user
 */
async function getRecentWorkouts(userId: string, days: number): Promise<any[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from('workouts')
    .select(`
      *,
      workout_exercises (
        *,
        exercises (*),
        workout_sets (*)
      )
    `)
    .eq('user_id', userId)
    .gte('created_at', since.toISOString())
    .not('ended_at', 'is', null)
    .order('created_at', { ascending: false });

  if (error) {
 logger.error('Error fetching workouts:', error);
    return [];
  }

  return data || [];
}

/**
 * Get personal records for user
 */
async function getPersonalRecords(userId: string, limit: number): Promise<any[]> {
  const { data, error } = await supabase
    .from('personal_records')
    .select('*, exercises(name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
 logger.error('Error fetching PRs:', error);
    return [];
  }

  return data || [];
}

/**
 * Get user profile
 */
async function getUserProfile(userId: string): Promise<any | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
 logger.error('Error fetching profile:', error);
    return null;
  }

  return data;
}

/**
 * Get active injuries
 */
async function getActiveInjuries(userId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('user_injuries')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error) {
 logger.error('Error fetching injuries:', error);
    return [];
  }

  return data || [];
}

/**
 * Get today's check-in
 */
async function getTodayCheckin(userId: string): Promise<any | null> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('daily_checkins')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', today)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    // No check-in today is not an error
    return null;
  }

  return data;
}

/**
 * Build workout history context text
 */
function buildWorkoutHistoryContext(workouts: any[]): string {
  if (workouts.length === 0) return '';

  let context = '\nx RECENT WORKOUT HISTORY:\n\n';

  // Show last 3 workouts with details
  const recentWorkouts = workouts.slice(0, 3);

  for (const workout of recentWorkouts) {
    const date = new Date(workout.created_at).toLocaleDateString();
    context += `${workout.name || 'Workout'} (${date}):\n`;

    const exercises = workout.workout_exercises || [];
    for (const we of exercises.slice(0, 5)) {
      const ex = we.exercises;
      if (!ex) continue;

      const sets = we.workout_sets || [];
      const completedSets = sets.filter((s: any) => s.is_completed);

      if (completedSets.length > 0) {
        const weights = completedSets.map((s: any) => `${s.weight || 0}${s.reps || 0}`);
        context += `  - ${ex.name}: ${weights.join(', ')}\n`;
      }
    }

    context += '\n';
  }

  // Workout frequency
  const daysSinceFirst = Math.ceil(
    (Date.now() - new Date(workouts[workouts.length - 1].created_at).getTime()) / (1000 * 60 * 60 * 24)
  );
  const frequency = daysSinceFirst > 0 ? (workouts.length / daysSinceFirst * 7).toFixed(1) : 0;

  context += `Workout Frequency: ${frequency} times/week (${workouts.length} workouts in ${daysSinceFirst} days)\n`;

  return context;
}

/**
 * Build P❌ context text
 */
function buildPRContext(prs: any[]): string {
  if (prs.length === 0) return '';

  let context = '📝  PERSONAL RECORDS:\n';

  for (const pr of prs.slice(0, 5)) {
    const exerciseName = pr.exercises?.name || 'Unknown';
    context += `  - ${exerciseName}: ${pr.weight} lbs Ã— ${pr.reps} reps\n`;
  }

  return context;
}
