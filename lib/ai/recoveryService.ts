import { supabase } from '@/lib/supabase';

export interface MuscleRecoveryStatus {
  muscle: string;
  status: 'fresh' | 'recovering' | 'fatigued';
  daysSinceTraining: number;
  optimalRecoveryDays: number;
}

export interface RecoveryStatus {
  overall: 'recovered' | 'moderate' | 'fatigued' | 'overtrained';
  score: number; // 0-100
  muscleGroups: MuscleRecoveryStatus[];
  recommendation: string;
  suggestedAction: 'train_hard' | 'train_light' | 'active_recovery' | 'rest';
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
   */
  async getRecoveryStatus(userId: string): Promise<RecoveryStatus> {
    try {
      const recentWorkouts = await this.getRecentWorkouts(userId, 14);
      
      if (recentWorkouts.length === 0) {
        return this.getDefaultStatus();
      }

      // Calculate per-muscle recovery
      const muscleStatus = this.calculateMuscleRecovery(recentWorkouts);
      
      // Get training frequency metrics
      const workoutsThisWeek = this.countWorkoutsThisWeek(recentWorkouts);
      const consecutiveDays = this.getConsecutiveTrainingDays(recentWorkouts);
      
      // Calculate overall score
      const overallScore = this.calculateOverallScore(
        muscleStatus,
        workoutsThisWeek,
        consecutiveDays
      );
      
      // Determine recommendation
      const { status, recommendation, action } = this.getRecommendation(
        overallScore,
        muscleStatus,
        consecutiveDays,
        workoutsThisWeek
      );

      return {
        overall: status,
        score: overallScore,
        muscleGroups: muscleStatus,
        recommendation,
        suggestedAction: action,
        consecutiveDays,
        workoutsThisWeek,
      };
    } catch (error) {
      console.error('Failed to get recovery status:', error);
      return this.getDefaultStatus();
    }
  }

  /**
   * Calculate recovery status for each muscle group
   */
  private calculateMuscleRecovery(workouts: any[]): MuscleRecoveryStatus[] {
    const muscleLastTrained = new Map<string, Date>();
    const now = new Date();

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
      const recoveryTime = this.RECOVERY_TIMES[muscle] || 2;
      
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
   */
  private calculateOverallScore(
    muscleStatus: MuscleRecoveryStatus[],
    workoutsThisWeek: number,
    consecutiveDays: number
  ): number {
    let score = 100;

    // Training frequency adjustments
    if (workoutsThisWeek >= 7) {
      score -= 35; // Training every day = overtraining risk
    } else if (workoutsThisWeek >= 6) {
      score -= 25;
    } else if (workoutsThisWeek >= 5) {
      score -= 15;
    } else if (workoutsThisWeek === 0) {
      score -= 5; // Full week off = slight detraining
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
   */
  private getRecommendation(
    score: number,
    muscleStatus: MuscleRecoveryStatus[],
    consecutiveDays: number,
    workoutsThisWeek: number
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
      
      if (freshMuscles.length > 0) {
        recommendation += `Focus on ${this.formatMuscleList(freshMuscles.slice(0, 2))}.`;
      } else {
        recommendation += 'All systems go!';
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
        recommendation = `You've trained ${consecutiveDays} days in a row. Consider a lighter session or active recovery today.`;
      } else if (fatiguedMuscles.length > 2) {
        recommendation = `Several muscle groups need rest (${this.formatMuscleList(fatiguedMuscles.slice(0, 2))}). Train fresh muscles or go lighter.`;
      } else {
        recommendation = 'Moderate recovery. A normal workout is fine, but listen to your body.';
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
  private getConsecutiveTrainingDays(workouts: any[]): number {
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
  private countWorkoutsThisWeek(workouts: any[]): number {
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
    console.log('Recovery Debug - Workouts This Week:', {
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
        console.error('Error fetching recent workouts:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch recent workouts:', error);
      return [];
    }
  }

  /**
   * Default status when no data available
   */
  private getDefaultStatus(): RecoveryStatus {
    return {
      overall: 'recovered',
      score: 100,
      muscleGroups: [],
      recommendation: 'No recent workouts found. You\'re fully recovered and ready to train!',
      suggestedAction: 'train_hard',
      consecutiveDays: 0,
      workoutsThisWeek: 0,
    };
  }
}

export const recoveryService = new RecoveryService();

