/**
 * Plateau Detection Service
 * 
 * Analyzes workout history to detect training stagnation.
 * Uses statistical analysis - NOT AI/OpenAI - completely free.
 * 
 * How it works:
 * - Compares volume (weight × reps) over 3+ week periods
 * - Flags exercises with no progress
 * - Generates rule-based suggestions (deload, change rep range, etc.)
 * - Severity based on weeks stalled (mild: 3-4wks, moderate: 4-6wks, significant: 6+wks)
 * 
 * Cost: $0 (no API calls, pure data analysis)
 */

import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/utils/logger';

export interface PlateauAlert {
  exerciseId: string;
  exerciseName: string;
  weeksStalled: number;
  lastWeight: number;
  lastReps: number;
  suggestions: string[];
  severity: 'mild' | 'moderate' | 'significant';
  percentageStalled?: number;
}

interface ExerciseHistory {
  id: string;
  name: string;
  history: {
    weight: number;
    reps: number;
    date: string;
  }[];
}

class PlateauDetectionService {
  private readonly PLATEAU_WEEKS = 3; // Weeks without progress = plateau
  private readonly MIN_DATA_POINTS = 6; // Minimum sessions needed

  /**
   * Detect plateaus across all user exercises
   */
  async detectPlateaus(userId: string): Promise<PlateauAlert[]> {
    try {
      const exercises = await this.getExerciseProgress(userId);
      const plateaus: PlateauAlert[] = [];

      for (const exercise of exercises) {
        const plateau = this.analyzeExercise(exercise);
        if (plateau) {
          plateaus.push(plateau);
        }
      }

      // Sort by severity, then by weeks stalled
      return plateaus.sort((a, b) => {
        const severityOrder = { significant: 3, moderate: 2, mild: 1 };
        const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
        if (severityDiff !== 0) return severityDiff;
        return b.weeksStalled - a.weeksStalled;
      });
    } catch (error: unknown) {
 logger.error('Failed to detect plateaus:', error);
      return [];
    }
  }

  /**
   * Analyze single exercise for plateau
   */
  private analyzeExercise(exercise: ExerciseHistory): PlateauAlert | null {
    const { history, name, id } = exercise;
    
    if (history.length < this.MIN_DATA_POINTS) return null;

    // Sort by date (newest first)
    const sortedHistory = [...history].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Group by week and get max volume (weight × reps) per week
    const weeklyMaxVolume = this.getWeeklyMaxVolume(sortedHistory);
    
    if (weeklyMaxVolume.length < this.PLATEAU_WEEKS) return null;

    // Check for plateau (no improvement in volume)
    const plateauAnalysis = this.detectVolumeStagnation(weeklyMaxVolume);
    
    if (!plateauAnalysis.isPlateaued) return null;

    // Get most recent max lift
    const recentBest = sortedHistory.reduce((max, curr) => {
      const currVolume = curr.weight * curr.reps;
      const maxVolume = max.weight * max.reps;
      return currVolume > maxVolume ? curr : max;
    }, sortedHistory[0]);

    // Determine severity
    const weeksStalled = plateauAnalysis.weeksStalled;
    const severity: PlateauAlert['severity'] = 
      weeksStalled >= 6 ? 'significant' :
      weeksStalled >= 4 ? 'moderate' : 'mild';

    // Generate suggestions
    const suggestions = this.generateSuggestions(name, weeksStalled, recentBest.weight);

    return {
      exerciseId: id,
      exerciseName: name,
      weeksStalled,
      lastWeight: recentBest.weight,
      lastReps: recentBest.reps,
      suggestions,
      severity,
      percentageStalled: Math.round((weeksStalled / 12) * 100), // % of quarter year
    };
  }

  /**
   * Group sets by week and get max volume per week
   */
  private getWeeklyMaxVolume(history: ExerciseHistory['history']): Array<{
    week: string;
    volume: number;
    weight: number;
    reps: number;
    date: Date;
  }> {
    interface WeeklyMaxEntry {
      week: string;
      volume: number;
      weight: number;
      reps: number;
      date: Date;
    }

    const weeklyMax = new Map<string, WeeklyMaxEntry>();

    for (const entry of history) {
      const date = new Date(entry.date);
      const week = this.getWeekKey(date);
      const volume = entry.weight * entry.reps;
      
      const existing = weeklyMax.get(week);
      if (!existing || volume > existing.volume) {
        weeklyMax.set(week, {
          week,
          volume,
          weight: entry.weight,
          reps: entry.reps,
          date,
        });
      }
    }

    return Array.from(weeklyMax.values())
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  /**
   * Detect if volume has stagnated
   */
  private detectVolumeStagnation(weeklyData: Array<{
    week: string;
    volume: number;
    weight: number;
    reps: number;
    date: Date;
  }>): {
    isPlateaued: boolean;
    weeksStalled: number;
  } {
    if (weeklyData.length < this.PLATEAU_WEEKS) {
      return { isPlateaued: false, weeksStalled: 0 };
    }

    const recentVolume = weeklyData[0].volume;
    let weeksStalled = 1;

    // Check each subsequent week
    for (let i = 1; i < weeklyData.length; i++) {
      const weekVolume = weeklyData[i].volume;
      
      // If current week is within 5% of recent max, no progress
      if (weekVolume >= recentVolume * 0.95) {
        weeksStalled++;
      } else {
        // Found a week where volume was significantly lower (progress since then)
        break;
      }
    }

    return {
      isPlateaued: weeksStalled >= this.PLATEAU_WEEKS,
      weeksStalled,
    };
  }

  /**
   * Generate actionable suggestions based on plateau duration
   */
  private generateSuggestions(
    exerciseName: string,
    weeks: number,
    weight: number
  ): string[] {
    const allSuggestions: string[] = [];

    // Base suggestions for any plateau
    allSuggestions.push(
      `Try adding 1-2 more reps at ${weight}lbs before increasing weight`,
      'Add a drop set after your last set for extra stimulus',
      'Try tempo training: slow negatives (3-4 seconds down)',
      'Ensure adequate protein intake (0.8-1g per lb bodyweight)'
    );

    // Moderate plateau (4+ weeks)
    if (weeks >= 4) {
      allSuggestions.unshift(
        `Consider a deload week: reduce weight by 10-15% and focus on perfect form`,
        'Try a variation: change grip, stance, or angle',
        'Add pause reps: pause at the hardest point for 2 seconds',
        'Check your sleep quality - aim for 7-9 hours per night'
      );
    }

    // Significant plateau (6+ weeks)
    if (weeks >= 6) {
      allSuggestions.unshift(
        'Consider changing your program or exercise order',
        'Try a different rep range (if doing 8-10, try 5-6 or 12-15)',
        'Add pre-fatigue or post-exhaust supersets',
        'A professional trainer could help identify form issues or weaknesses'
      );
    }

    // Exercise-specific suggestions
    const exerciseLower = exerciseName.toLowerCase();
    
    if (exerciseLower.includes('bench')) {
      allSuggestions.push('Try adding dumbbell bench press for different stimulus');
    } else if (exerciseLower.includes('squat')) {
      allSuggestions.push('Add Bulgarian split squats to strengthen individual legs');
    } else if (exerciseLower.includes('deadlift')) {
      allSuggestions.push('Try deficit deadlifts or Romanian deadlifts as accessories');
    } else if (exerciseLower.includes('pull') || exerciseLower.includes('row')) {
      allSuggestions.push('Add band-assisted or weighted variations');
    }

    // Return top 5 suggestions
    return allSuggestions.slice(0, 5);
  }

  /**
   * Get week key (YYYY-WXX format)
   */
  private getWeekKey(date: Date): string {
    const year = date.getFullYear();
    const week = this.getWeekNumber(date);
    return `${year}-W${week.toString().padStart(2, '0')}`;
  }

  /**
   * Get ISO week number
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  /**
   * Get exercise progress history from database
   */
  private async getExerciseProgress(userId: string): Promise<ExerciseHistory[]> {
    try {
      // Get last 90 days of workout data
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const { data, error } = await supabase
        .from('workout_sets')
        .select(`
          weight,
          reps,
          created_at,
          workout_exercises!inner(
            exercise_id,
            exercises!inner(id, name),
            workouts!inner(user_id)
          )
        `)
        .eq('workout_exercises.workouts.user_id', userId)
        .gte('created_at', ninetyDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) {
 logger.error('Error fetching exercise progress:', error);
        return [];
      }

      // Group by exercise
      const exerciseMap = new Map<string, ExerciseHistory>();
      
      for (const set of data || []) {
        const exerciseId = set.workout_exercises.exercise_id;
        const exerciseName = set.workout_exercises.exercises.name;
        
        if (!exerciseMap.has(exerciseId)) {
          exerciseMap.set(exerciseId, {
            id: exerciseId,
            name: exerciseName,
            history: [],
          });
        }

        const exerciseData = exerciseMap.get(exerciseId);
        if (exerciseData) {
          exerciseData.history.push({
            weight: set.weight,
            reps: set.reps,
            date: set.created_at,
          });
        }
      }

      // Filter exercises with enough data
      return Array.from(exerciseMap.values())
        .filter(ex => ex.history.length >= this.MIN_DATA_POINTS);
    } catch (error: unknown) {
 logger.error('Failed to get exercise progress:', error);
      return [];
    }
  }

  /**
   * Get detailed progress report for specific exercise
   */
  async getExerciseProgressReport(
    userId: string,
    exerciseId: string
  ): Promise<{
    exercise: ExerciseHistory | null;
    plateau: PlateauAlert | null;
    weeklyProgress: Array<{
      week: string;
      volume: number;
      weight: number;
      reps: number;
      date: Date;
    }>;
  }> {
    try {
      const exercises = await this.getExerciseProgress(userId);
      const exercise = exercises.find(ex => ex.id === exerciseId);
      
      if (!exercise) {
        return { exercise: null, plateau: null, weeklyProgress: [] };
      }

      const plateau = this.analyzeExercise(exercise);
      const weeklyProgress = this.getWeeklyMaxVolume(exercise.history);

      return {
        exercise,
        plateau,
        weeklyProgress,
      };
    } catch (error: unknown) {
 logger.error('Failed to get progress report:', error);
      return { exercise: null, plateau: null, weeklyProgress: [] };
    }
  }
}

export const plateauDetectionService = new PlateauDetectionService();


