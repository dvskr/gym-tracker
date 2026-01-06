/**
 * Recovery Status Service
 * 
 * Calculates muscle group recovery based on workout history.
 * Uses time-based algorithms - NOT AI/OpenAI - completely free.
 * 
 * How it works:
 * - Tracks days since each muscle group was trained
 * - Compares against optimal recovery times (24-72 hours depending on muscle)
 * - Returns recovery percentage and status per muscle group
 * - Suggests which workout type (Push/Pull/Legs) to do next
 * 
 * Cost: $0 (no API calls, pure calculation)
 */

import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/utils/logger';
import { LocalWorkout } from '@/lib/types/common';

export interface MuscleRecoveryStatus {
  muscle: string;
  status: 'fresh' | 'recovering' | 'fatigued';
  daysSinceTraining: number;
  optimalRecoveryDays: number;
}

export interface MuscleRecoveryDetail {
  name: string;
  recoveryPercent: number;  // 0-100
  status: 'ready' | 'almost' | 'recovering' | 'fatigued';
  daysSinceTraining: number;
  hoursUntilReady: number;  // 0 if ready
}

export interface RecoveryStatus {
  // Actionable output (NEW)
  readyToTrain: string[];      // ["Chest", "Back", "Shoulders"]
  needsRest: string[];         // ["Legs", "Biceps"]
  suggestedFocus: string;      // "Push" or "Pull" or "Legs" or "Upper" or "Lower"
  
  // NEW: Detailed muscle recovery with percentages
  muscleDetails: MuscleRecoveryDetail[];
  
  // Legacy output (kept for backwards compatibility)
  overall: 'recovered' | 'moderate' | 'fatigued' | 'overtrained';
  score: number; // 0-100
  muscleGroups: MuscleRecoveryStatus[];
  recommendation: string;
  suggestedAction: 'train_hard' | 'train_light' | 'active_recovery' | 'rest';
  
  // Stats
  consecutiveDays: number;
  workoutsThisWeek: number;
}

class RecoveryService {
  // Optimal recovery times by muscle group (days)
  private readonly RECOVERY_TIMES: Record<string, number> = {
    chest: 2,
    back: 2,
    shoulders: 2,
    biceps: 1.5,
    triceps: 1.5,
    quadriceps: 3,
    hamstrings: 3,
    glutes: 2.5,
    calves: 1,
    core: 1,
    abs: 1,
    lats: 2,
    traps: 2,
    forearms: 1,
  };

  /**
   * Get comprehensive recovery status for user
   * REFACTORED: No longer depends on daily check-in data
   * Uses workout data only for reliable, zero-friction recovery status
   */
  async getRecoveryStatus(userId: string): Promise<RecoveryStatus> {
    try {
      const recentWorkouts = await this.getRecentWorkouts(userId, 14);
      
      // Get fitness preferences (experience_level, fitness_goal, etc.)
      const fitnessPrefs = await this.getFitnessPreferences(userId);
      
      if (recentWorkouts.length === 0) {
        return this.getDefaultStatus();
      }

      // Calculate per-muscle recovery
      const muscleStatus = this.calculateMuscleRecovery(recentWorkouts, fitnessPrefs);
      
      // Get training frequency metrics
      const workoutsThisWeek = this.countWorkoutsThisWeek(recentWorkouts);
      const consecutiveDays = this.getConsecutiveTrainingDays(recentWorkouts);
      
      // Calculate overall score (no check-in dependency)
      const overallScore = this.calculateOverallScore(
        muscleStatus,
        workoutsThisWeek,
        consecutiveDays,
        fitnessPrefs
      );
      
      // Determine recommendation
      const { status, recommendation, action } = this.getRecommendation(
        overallScore,
        muscleStatus,
        consecutiveDays,
        workoutsThisWeek,
        fitnessPrefs
      );

      // NEW: Calculate actionable output
      const readyToTrain = muscleStatus
        .filter(m => m.status === 'fresh' || m.status === 'recovering')
        .map(m => this.capitalizeMuscle(m.muscle));
      
      const needsRest = muscleStatus
        .filter(m => m.status === 'fatigued')
        .map(m => this.capitalizeMuscle(m.muscle));
      
      // Determine suggested workout focus based on ready muscles
      const suggestedFocus = this.determineSuggestedFocus(muscleStatus);
      
      // NEW: Calculate muscle recovery details with percentages
      const muscleDetails = this.calculateMuscleDetails(muscleStatus, fitnessPrefs);

      return {
        // Actionable output (NEW)
        readyToTrain,
        needsRest,
        suggestedFocus,
        muscleDetails,
        
        // Legacy output
        overall: status,
        score: overallScore,
        muscleGroups: muscleStatus,
        recommendation,
        suggestedAction: action,
        consecutiveDays,
        workoutsThisWeek,
      };
    } catch (error: unknown) {
 logger.error('Failed to get recovery status:', error);
      return this.getDefaultStatus();
    }
  }

  /**
   * Capitalize muscle name for display
   */
  private capitalizeMuscle(muscle: string): string {
    return muscle.charAt(0).toUpperCase() + muscle.slice(1);
  }

  /**
   * Calculate detailed muscle recovery with percentages
   */
  private calculateMuscleDetails(
    muscleStatus: MuscleRecoveryStatus[],
    fitnessPrefs?: {
      fitness_goal?: string;
      experience_level?: string;
      [key: string]: unknown;
    } | null
  ): MuscleRecoveryDetail[] {
    return muscleStatus.map(muscle => {
      const hoursSinceTraining = muscle.daysSinceTraining * 24;
      const baseRecoveryHours = muscle.optimalRecoveryDays * 24;
      
      // Calculate recovery percentage
      const recoveryPercent = Math.min(100, Math.round((hoursSinceTraining / baseRecoveryHours) * 100));
      
      // Determine detailed status
      let status: MuscleRecoveryDetail['status'];
      if (recoveryPercent >= 100) status = 'ready';
      else if (recoveryPercent >= 75) status = 'almost';
      else if (recoveryPercent >= 40) status = 'recovering';
      else status = 'fatigued';
      
      // Hours until ready
      const hoursUntilReady = Math.max(0, Math.round(baseRecoveryHours - hoursSinceTraining));
      
      return {
        name: this.capitalizeMuscle(muscle.muscle),
        recoveryPercent,
        status,
        daysSinceTraining: muscle.daysSinceTraining,
        hoursUntilReady,
      };
    });
  }

  /**
   * Determine suggested workout focus based on muscle recovery status
   */
  private determineSuggestedFocus(muscleStatus: MuscleRecoveryStatus[]): string {
    // Group muscles by workout type
    const pushMuscles = ['chest', 'shoulders', 'triceps'];
    const pullMuscles = ['back', 'lats', 'biceps', 'traps', 'forearms'];
    const legMuscles = ['quadriceps', 'hamstrings', 'glutes', 'calves'];
    const coreMuscles = ['core', 'abs'];

    // Calculate readiness score for each group
    const getGroupReadiness = (muscles: string[]): number => {
      const relevant = muscleStatus.filter(m => muscles.includes(m.muscle));
      if (relevant.length === 0) return 100; // Never trained = ready
      
      const freshCount = relevant.filter(m => m.status === 'fresh').length;
      const recoveringCount = relevant.filter(m => m.status === 'recovering').length;
      const fatiguedCount = relevant.filter(m => m.status === 'fatigued').length;
      
      return (freshCount * 100 + recoveringCount * 50 + fatiguedCount * 0) / relevant.length;
    };

    const pushReadiness = getGroupReadiness(pushMuscles);
    const pullReadiness = getGroupReadiness(pullMuscles);
    const legReadiness = getGroupReadiness(legMuscles);

    // Find the most ready group
    const scores = [
      { type: 'Push', score: pushReadiness },
      { type: 'Pull', score: pullReadiness },
      { type: 'Legs', score: legReadiness },
    ];

    scores.sort((a, b) => b.score - a.score);
    
    // If top score is low, suggest rest
    if (scores[0].score < 30) {
      return 'Rest Day';
    }

    return scores[0].type;
  }

  /**
   * Calculate recovery status for each muscle group
   */
  private calculateMuscleRecovery(workouts: LocalWorkout[], fitnessPrefs?: {
    experience_level?: string;
    fitness_goal?: string;
    [key: string]: unknown;
  } | null): MuscleRecoveryStatus[] {
    const muscleLastTrained = new Map<string, Date>();
    const now = new Date();

    // Adjust recovery times based on experience level
    const recoveryMultiplier = fitnessPrefs?.experience_level === 'beginner' ? 1.3 :
                               fitnessPrefs?.experience_level === 'advanced' ? 0.8 : 1.0;

    // Adjust for strength goal (needs more recovery)
    const goalMultiplier = fitnessPrefs?.fitness_goal === 'strength' ? 1.2 : 1.0;

    const adjustedRecoveryTimes = Object.fromEntries(
      Object.entries(this.RECOVERY_TIMES).map(([muscle, days]) => [
        muscle,
        days * recoveryMultiplier * goalMultiplier
      ])
    );

    // Find last training date for each muscle
    for (const workout of workouts) {
      const workoutDate = new Date(workout.created_at);
      
      for (const workoutExercise of workout.workout_exercises || []) {
        const exercise = workoutExercise.exercises;
        if (!exercise) continue;
        
        // Get muscles from both primary and secondary arrays
        const muscles = [
          ...(exercise.primary_muscles || []),
          ...(exercise.secondary_muscles || []),
        ];
        
        for (const muscle of muscles) {
          const muscleKey = muscle.toLowerCase();
          const existing = muscleLastTrained.get(muscleKey);
          if (!existing || workoutDate > existing) {
            muscleLastTrained.set(muscleKey, workoutDate);
          }
        }
      }
    }

    // Calculate status for each muscle
    const muscleStatuses: MuscleRecoveryStatus[] = [];
    
    for (const [muscle, lastTrained] of muscleLastTrained.entries()) {
      const daysSince = (now.getTime() - lastTrained.getTime()) / (1000 * 60 * 60 * 24);
      const recoveryTime = adjustedRecoveryTimes[muscle] || 2;
      
      let status: MuscleRecoveryStatus['status'];
      if (daysSince >= recoveryTime * 1.5) {
        status = 'fresh'; // Fully recovered + extra time
      } else if (daysSince >= recoveryTime) {
        status = 'recovering'; // Just recovered
      } else {
        status = 'fatigued'; // Still needs more time
      }

      muscleStatuses.push({
        muscle,
        status,
        daysSinceTraining: Math.round(daysSince * 10) / 10,
        optimalRecoveryDays: recoveryTime,
      });
    }

    // Sort by days since training (most recent first)
    return muscleStatuses.sort((a, b) => a.daysSinceTraining - b.daysSinceTraining);
  }

  /**
   * Calculate overall recovery score (0-100)
   * REFACTORED: No longer uses check-in data - purely workout-based
   */
  private calculateOverallScore(
    muscleStatus: MuscleRecoveryStatus[],
    workoutsThisWeek: number,
    consecutiveDays: number,
    fitnessPrefs?: {
      weekly_workout_target?: number;
      fitness_goal?: string;
      experience_level?: string;
      [key: string]: unknown;
    } | null
  ): number {
    let score = 100;

    // Get target from fitness preferences or default to 4
    const targetWorkouts = fitnessPrefs?.weekly_workout_target || 4;

    // Training frequency adjustments - personalized to target
    if (workoutsThisWeek >= 7) {
      score -= 35; // Training every day = overtraining risk
    } else if (workoutsThisWeek >= 6) {
      score -= 25;
    } else if (workoutsThisWeek >= 5 && targetWorkouts < 5) {
      score -= 15; // Only penalize if above target
    } else if (workoutsThisWeek >= targetWorkouts + 2) {
      score -= 10; // Training more than 2 days above target
    } else if (workoutsThisWeek === 0 && targetWorkouts > 0) {
      score -= 5; // Full week off = slight detraining
    }

    // Adjust for fitness goal
    if (fitnessPrefs?.fitness_goal === 'strength' && consecutiveDays >= 3) {
      score -= 15; // Strength training needs more rest between sessions
    }

    if (fitnessPrefs?.fitness_goal === 'endurance' && workoutsThisWeek < targetWorkouts) {
      score += 5; // Endurance athletes can handle more volume
    }

    // Experience level adjustments
    if (fitnessPrefs?.experience_level === 'beginner') {
      // Beginners need more recovery
      if (consecutiveDays >= 3) score -= 15;
      if (workoutsThisWeek >= 5) score -= 10;
    } else if (fitnessPrefs?.experience_level === 'advanced') {
      // Advanced can handle more
      score += 5;
    }

    // Consecutive days penalty
    if (consecutiveDays >= 5) {
      score -= 25;
    } else if (consecutiveDays >= 4) {
      score -= 15;
    } else if (consecutiveDays >= 3) {
      score -= 10;
    }

    // Muscle fatigue adjustments
    const fatiguedCount = muscleStatus.filter(m => m.status === 'fatigued').length;
    const recoveringCount = muscleStatus.filter(m => m.status === 'recovering').length;
    const freshCount = muscleStatus.filter(m => m.status === 'fresh').length;

    score -= fatiguedCount * 8; // Heavy penalty for fatigued muscles
    score -= recoveringCount * 3; // Light penalty for recovering muscles
    score += freshCount * 3; // Bonus for fresh muscles

    // Ensure score stays in bounds
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Get recommendation based on recovery metrics
   * REFACTORED: No longer uses check-in data
   */
  private getRecommendation(
    score: number,
    muscleStatus: MuscleRecoveryStatus[],
    consecutiveDays: number,
    workoutsThisWeek: number,
    fitnessPrefs?: {
      fitness_goal?: string;
      preferred_rest_days?: string[];
      [key: string]: unknown;
    } | null
  ): {
    status: RecoveryStatus['overall'];
    recommendation: string;
    action: RecoveryStatus['suggestedAction'];
  } {
    const freshMuscles = muscleStatus
      .filter(m => m.status === 'fresh')
      .map(m => m.muscle);
    
    const fatiguedMuscles = muscleStatus
      .filter(m => m.status === 'fatigued')
      .map(m => m.muscle);

    // Recovered (80-100)
    if (score >= 80) {
      let recommendation = 'You\'re well recovered and ready for an intense session! ';
      
      if (fitnessPrefs?.fitness_goal) {
        const goalMessages: Record<string, string> = {
          'build_muscle': 'Perfect time for heavy compound lifts. ',
          'strength': 'Your strength training day looks good. ',
          'lose_fat': 'Great energy for a high-intensity workout. ',
          'endurance': 'Ideal conditions for a challenging cardio session. ',
          'maintain': 'Ready for a solid workout. ',
          'general_fitness': 'All systems go for training! ',
        };
        recommendation = goalMessages[fitnessPrefs.fitness_goal as string] || recommendation;
      }
      
      if (freshMuscles.length > 0) {
        recommendation += `Focus on ${this.formatMuscleList(freshMuscles.slice(0, 2))}.`;
      } else {
        recommendation += 'All muscle groups recovered!';
      }

      // Check if today is preferred rest day
      if (fitnessPrefs?.preferred_rest_days) {
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        if (fitnessPrefs.preferred_rest_days.includes(today)) {
          recommendation += ` Note: Today is your preferred rest day, but you're recovered if you want to train.`;
        }
      }

      return {
        status: 'recovered',
        recommendation,
        action: 'train_hard',
      };
    }

    // Moderate (60-79)
    if (score >= 60) {
      let recommendation = '';
      
      if (consecutiveDays >= 3) {
        recommendation += `You've trained ${consecutiveDays} days in a row. Consider a lighter session or active recovery today.`;
      } else if (fatiguedMuscles.length > 2) {
        recommendation += `Several muscle groups need rest (${this.formatMuscleList(fatiguedMuscles.slice(0, 2))}). Train fresh muscles or go lighter.`;
      } else {
        recommendation += 'Moderate recovery. A normal workout is fine, but listen to your body.';
      }

      return {
        status: 'moderate',
        recommendation,
        action: consecutiveDays >= 3 || fatiguedMuscles.length > 2 ? 'train_light' : 'train_hard',
      };
    }

    // Fatigued (40-59)
    if (score >= 40) {
      let recommendation = 'Showing signs of fatigue. ';
      
      if (workoutsThisWeek >= 5) {
        recommendation += `You've trained ${workoutsThisWeek} times this week. `;
      }
      
      recommendation += 'Light workout or active recovery (walking, yoga, stretching) recommended.';

      return {
        status: 'fatigued',
        recommendation,
        action: 'active_recovery',
      };
    }

    // Overtrained (<40)
    let recommendation = 'High fatigue detected! ';
    
    if (consecutiveDays >= 5) {
      recommendation += `${consecutiveDays} consecutive training days is too much. `;
    }
    
    recommendation += 'Take a full rest day - your muscles grow during recovery, not training!';

    return {
      status: 'overtrained',
      recommendation,
      action: 'rest',
    };
  }

  /**
   * Format muscle list for display
   */
  private formatMuscleList(muscles: string[]): string {
    if (muscles.length === 0) return '';
    if (muscles.length === 1) return muscles[0];
    if (muscles.length === 2) return `${muscles[0]} and ${muscles[1]}`;
    return `${muscles[0]}, ${muscles[1]}, and ${muscles.length - 2} more`;
  }

  /**
   * Count consecutive training days
   */
  private getConsecutiveTrainingDays(workouts: LocalWorkout[]): number {
    if (workouts.length === 0) return 0;

    // Get unique training dates
    const uniqueDates = Array.from(
      new Set(
        workouts.map(w => new Date(w.created_at).toDateString())
      )
    ).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    // Check if streak includes today or yesterday
    if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) {
      return 0; // No recent training
    }

    // Count consecutive days
    let consecutive = 1;
    for (let i = 1; i < uniqueDates.length; i++) {
      const prevDate = new Date(uniqueDates[i - 1]);
      const currDate = new Date(uniqueDates[i]);
      const diffDays = (prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (diffDays <= 1.5) {
        // Within 1 day = consecutive
        consecutive++;
      } else {
        break;
      }
    }

    return consecutive;
  }

  /**
   * Count workouts in last 7 days
   */
  /**
   * Count workouts from Monday of current week to today
   * Fixed: Was counting last 7 days instead of current calendar week
   */
  private countWorkoutsThisWeek(workouts: LocalWorkout[]): number {
    // Get start of current week (Monday)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // If Sunday, go back 6 days; else calculate offset to Monday
    
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() + mondayOffset);
    startOfWeek.setHours(0, 0, 0, 0); // Set to midnight
    
    const startTimestamp = startOfWeek.getTime();
    
    // Count workouts from Monday onwards
    const count = workouts.filter(w => {
      const workoutTime = new Date(w.created_at).getTime();
      return workoutTime >= startTimestamp;
    }).length;
    
    // Debug logging (can be removed after testing)
 logger.log('Recovery Debug - Workouts This Week:', {
      startOfWeek: startOfWeek.toISOString(),
      now: now.toISOString(),
      dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek],
      count,
      totalWorkoutsInLast14Days: workouts.length,
    });
    
    // Sanity check: Cap at 14 (2 per day max for a week)
    return Math.min(count, 14);
  }

  /**
   * Get recent workouts with exercises
   */
  private async getRecentWorkouts(userId: string, days: number) {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data, error } = await supabase
        .from('workouts')
        .select(`
          *,
          workout_exercises (
            *,
            exercises (
              primary_muscles,
              secondary_muscles
            )
          )
        `)
        .eq('user_id', userId)
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
 logger.error('Error fetching recent workouts:', error);
        return [];
      }

      return data || [];
    } catch (error: unknown) {
 logger.error('Failed to fetch recent workouts:', error);
      return [];
    }
  }

  /**
   * Default status when no data available
   */
  private getDefaultStatus(): RecoveryStatus {
    return {
      // Actionable output
      readyToTrain: ['All muscle groups'],
      needsRest: [],
      suggestedFocus: 'Full Body',
      muscleDetails: [],
      
      // Legacy output
      overall: 'recovered',
      score: 100,
      muscleGroups: [],
      recommendation: 'No recent workouts found. You\'re fully recovered and ready to train!',
      suggestedAction: 'train_hard',
      consecutiveDays: 0,
      workoutsThisWeek: 0,
    };
  }

  /**
   * Get user fitness preferences
   */
  private async getFitnessPreferences(userId: string): Promise<{
    fitness_goal?: string;
    weekly_workout_target?: number;
    preferred_rest_days?: string[];
    experience_level?: string;
    training_split?: string;
    [key: string]: unknown;
  } | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('fitness_goal, weekly_workout_target, preferred_rest_days, experience_level, training_split')
        .eq('id', userId)
        .single();

      if (error) {
 logger.warn('Error fetching fitness preferences:', error);
        return null;
      }

      return data || null;
    } catch (error: unknown) {
 logger.error('Error fetching fitness preferences:', error);
      return null;
    }
  }
}

export const recoveryService = new RecoveryService();


