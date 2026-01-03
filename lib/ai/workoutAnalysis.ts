import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/utils/logger';
import { aiService } from './aiService';
import { FITNESS_COACH_SYSTEM_PROMPT } from './prompts';
import { buildWorkoutContext } from './contextBuilder';
import { validateWorkoutAnalysis, validateAndFallback, sanitizeText, sanitizeStringArray } from './validation';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WorkoutAnalysis {
  summary: string;
  highlights: string[];
  improvements: string[];
  nextWorkoutTip: string;
  volumeComparison: 'higher' | 'same' | 'lower' | 'first';
  estimatedCalories: number;
  musclesWorked: string[];
  totalVolume: number;
  totalSets: number;
  personalRecordsAchieved?: number;
}

interface WorkoutStats {
  totalWorkouts: number;
  streak: number;
}

// Cache configuration
const ANALYSIS_CACHE_KEY = 'workout_analysis_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface CachedAnalysis {
  analysis: WorkoutAnalysis;
  timestamp: number;
  workoutId: string;
}

class WorkoutAnalysisService {
  /**
   * Analyze completed workout and provide AI-powered feedback
   */
  async analyzeWorkout(
    workout: any,
    userId: string,
    forceRefresh = false
  ): Promise<WorkoutAnalysis> {
    try {
      // Check cache unless force refresh
      if (!forceRefresh && workout.id) {
        const cached = await this.getCachedAnalysis(workout.id);
        if (cached) {
 logger.log('S& Using cached workout analysis');
          return cached;
        }
      }
      // Get comparison data
      const [previousWorkout, userStats, prCount] = await Promise.all([
        this.getPreviousSimilarWorkout(userId, workout),
        this.getUserStats(userId),
        this.getNewPRCount(userId, workout),
      ]);

      // Calculate metrics
      const currentVolume = this.calculateVolume(workout);
      const previousVolume = previousWorkout ? this.calculateVolume(previousWorkout) : 0;
      const totalSets = this.countTotalSets(workout);
      const musclesWorked = this.getMusclesWorked(workout);

      // Determine volume comparison
      let volumeComparison: WorkoutAnalysis['volumeComparison'] = 'first';
      if (previousWorkout) {
        const diff = (currentVolume - previousVolume) / previousVolume;
        volumeComparison = diff > 0.05 ? 'higher' : diff < -0.05 ? 'lower' : 'same';
      }

      // Try AI analysis
      try {
        const aiAnalysis = await this.getAIAnalysis(
          workout,
          previousWorkout,
          userStats,
          currentVolume,
          previousVolume,
          prCount
        );

        // Validate and sanitize AI response
        const fallbackAnalysis = this.getRuleBasedAnalysis(
          workout,
          volumeComparison,
          musclesWorked,
          currentVolume,
          totalSets,
          prCount
        );

        const validated = validateAndFallback(
          aiAnalysis,
          validateWorkoutAnalysis,
          fallbackAnalysis,
          'WorkoutAnalysis'
        );

        const finalAnalysis: WorkoutAnalysis = {
          ...validated,
          summary: sanitizeText(validated.summary, 500),
          highlights: sanitizeStringArray(validated.highlights, 200),
          improvements: sanitizeStringArray(validated.improvements, 200),
          nextWorkoutTip: sanitizeText(validated.nextWorkoutTip, 200),
          volumeComparison,
          musclesWorked,
          estimatedCalories: this.estimateCalories(workout),
          totalVolume: currentVolume,
          totalSets,
          personalRecordsAchieved: prCount,
        };

        // Cache the result
        if (workout.id) {
          await this.cacheAnalysis(workout.id, finalAnalysis);
        }

        return finalAnalysis;
      } catch (error) {
 logger.error('AI analysis failed, using rule-based:', error);
        const fallback = this.getRuleBasedAnalysis(
          workout,
          volumeComparison,
          musclesWorked,
          currentVolume,
          totalSets,
          prCount
        );

        // Cache the fallback
        if (workout.id) {
          await this.cacheAnalysis(workout.id, fallback);
        }

        return fallback;
      }
    } catch (error) {
 logger.error('Workout analysis failed:', error);
      return this.getDefaultAnalysis(workout);
    }
  }

  /**
   * Get cached analysis if valid
   */
  private async getCachedAnalysis(workoutId: string): Promise<WorkoutAnalysis | null> {
    try {
      const cacheKey = `${ANALYSIS_CACHE_KEY}_${workoutId}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      if (!cached) return null;
      
      const parsed: CachedAnalysis = JSON.parse(cached);
      
      // Check if cache is not expired
      const isExpired = Date.now() - parsed.timestamp > CACHE_DURATION;
      if (isExpired) {
        await AsyncStorage.removeItem(cacheKey);
        return null;
      }
      
      return parsed.analysis;
    } catch (error) {
 logger.error('Error reading cache:', error);
      return null;
    }
  }

  /**
   * Cache analysis for future use
   */
  private async cacheAnalysis(workoutId: string, analysis: WorkoutAnalysis): Promise<void> {
    try {
      const cacheKey = `${ANALYSIS_CACHE_KEY}_${workoutId}`;
      const cacheData: CachedAnalysis = {
        analysis,
        timestamp: Date.now(),
        workoutId,
      };
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
 logger.error('Error caching analysis:', error);
    }
  }

  /**
   * Get AI-powered analysis
   */
  private async getAIAnalysis(
    workout: any,
    previousWorkout: any,
    userStats: WorkoutStats,
    currentVolume: number,
    previousVolume: number,
    prCount: number
  ): Promise<Partial<WorkoutAnalysis>> {
    const workoutContext = this.buildSimpleWorkoutContext(workout, currentVolume);
    
    const comparisonContext = previousWorkout
      ? `\n\nPREVIOUS SIMILAR WORKOUT:
Duration: ${Math.round(previousWorkout.duration_seconds / 60)} minutes
Exercises: ${previousWorkout.exercises?.length || 0}
Total Volume: ${previousVolume} lbs
${previousVolume > 0 ? `Volume Change: ${((currentVolume - previousVolume) / previousVolume * 100).toFixed(1)}%` : ''}`
      : '\n\nThis is their first workout of this type!';

    const prContext = prCount > 0 ? `\n\nx  ${prCount} NEW PERSONAL RECORD${prCount > 1 ? 'S' : ''} SET!` : '';

    const prompt = `Analyze this completed workout and provide encouraging feedback.

${workoutContext}
${comparisonContext}
${prContext}

USER STATS:
- Total workouts completed: ${userStats.totalWorkouts}
- Current streak: ${userStats.streak} days

Provide:
1. A brief 1-2 sentence summary (be encouraging!)
2. 2-3 highlights (what went well, specific numbers)
3. 1-2 suggestions for improvement (only if meaningful, can be empty)
4. One actionable tip for their next workout

Be specific, reference actual numbers, and keep it motivating!

Respond in this exact JSON format:
{
  "summary": "...",
  "highlights": ["...", "...", "..."],
  "improvements": ["..."],
  "nextWorkoutTip": "..."
}`;

    const response = await aiService.askWithContext(
      FITNESS_COACH_SYSTEM_PROMPT,
      prompt,
      { temperature: 0.3, maxTokens: 500, requestType: 'analysis' }
    );

    return this.parseAnalysisResponse(response);
  }

  /**
   * Parse AI analysis response
   */
  private parseAnalysisResponse(response: string): Partial<WorkoutAnalysis> {
    try {
      // Clean response before parsing
      const cleaned = this.cleanAIResponse(response);
      
      // Try to extract JSON from response
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          summary: parsed.summary || 'Great workout!',
          highlights: Array.isArray(parsed.highlights) 
            ? parsed.highlights.filter((h: string) => h && h.length > 0)
            : ['Strong performance!'],
          improvements: Array.isArray(parsed.improvements) 
            ? parsed.improvements.filter((i: string) => i && i.length > 0)
            : [],
          nextWorkoutTip: parsed.nextWorkoutTip || 'Keep up the great work!',
        };
      }
    } catch (parseError) {
 logger.error('Failed to parse AI analysis:', parseError);
    }

    // Fallback: extract from text
    return this.parseTextResponse(response);
  }

  /**
   * Clean AI response before JSON parsing
   */
  private cleanAIResponse(response: string): string {
    return response
      // Remove markdown code blocks
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      // Remove any leading/trailing whitespace
      .trim()
      // Remove any text before the first {
      .replace(/^[^{]*/, '')
      // Remove any text after the last }
      .replace(/}[^}]*$/, '}');
  }

  /**
   * Parse AI response as text (fallback)
   */
  private parseTextResponse(text: string): Partial<WorkoutAnalysis> {
    const lines = text.split('\n').filter(l => l.trim());
    
    return {
      summary: lines[0] || 'Solid workout completed!',
      highlights: lines.slice(1, 4).filter(l => l.length > 10),
      improvements: [],
      nextWorkoutTip: lines[lines.length - 1] || 'Keep pushing forward!',
    };
  }

  /**
   * Rule-based analysis (fallback)
   */
  private getRuleBasedAnalysis(
    workout: any,
    volumeComparison: WorkoutAnalysis['volumeComparison'],
    musclesWorked: string[],
    totalVolume: number,
    totalSets: number,
    prCount: number
  ): WorkoutAnalysis {
    const durationMinutes = Math.round((workout.duration_seconds || 0) / 60);
    const exerciseCount = workout.exercises?.length || 0;

    // Dynamic summary based on comparison
    let summary = '';
    if (volumeComparison === 'higher') {
      summary = `Excellent work! You increased your training volume by ${this.getVolumeChangePercent(workout)}%. ${totalSets} sets completed.`;
    } else if (volumeComparison === 'lower') {
      summary = `Solid session with ${totalSets} sets. Remember, recovery is part of progress!`;
    } else if (volumeComparison === 'same') {
      summary = `Consistent performance with ${totalSets} sets. Great job maintaining your training volume!`;
    } else {
      summary = `First ${workout.name || 'workout'} tracked! ${totalSets} sets completed. You're building your baseline.`;
    }

    // Add PR callout to summary
    if (prCount > 0) {
      summary += ` x  ${prCount} new PR${prCount > 1 ? 's' : ''}!`;
    }

    // Build highlights
    const highlights: string[] = [
      `Completed ${totalSets} sets across ${exerciseCount} exercise${exerciseCount !== 1 ? 's' : ''}`,
      `${durationMinutes} minutes of focused training`,
    ];

    if (musclesWorked.length > 0) {
      highlights.push(`Trained ${musclesWorked.join(', ')}`);
    }

    if (totalVolume > 0) {
      highlights.push(`Total volume: ${totalVolume.toLocaleString()} lbs`);
    }

    if (prCount > 0) {
      highlights.push(`Set ${prCount} new personal record${prCount > 1 ? 's' : ''}!`);
    }

    // Build improvements (only if needed)
    const improvements: string[] = [];
    if (volumeComparison === 'lower' && totalSets < 15) {
      improvements.push('Consider adding 1-2 more sets next time if energy allows');
    }
    if (durationMinutes < 30) {
      improvements.push('Try to maintain intensity - short sessions are great, but ensure quality work');
    }

    // Next workout tip
    let nextWorkoutTip = 'Focus on progressive overload - try to beat today\'s numbers!';
    if (volumeComparison === 'higher') {
      nextWorkoutTip = 'Great progress! Continue this momentum and aim for consistency.';
    } else if (prCount > 0) {
      nextWorkoutTip = 'You\'re on fire! Keep challenging yourself with those PRs.';
    }

    return {
      summary,
      highlights: highlights.slice(0, 4), // Limit to 4
      improvements,
      nextWorkoutTip,
      volumeComparison,
      estimatedCalories: this.estimateCalories(workout),
      musclesWorked,
      totalVolume,
      totalSets,
      personalRecordsAchieved: prCount,
    };
  }

  /**
   * Default analysis (error fallback)
   */
  private getDefaultAnalysis(workout: any): WorkoutAnalysis {
    const totalSets = this.countTotalSets(workout);
    const musclesWorked = this.getMusclesWorked(workout);

    return {
      summary: `Workout completed! ${totalSets} sets finished.`,
      highlights: [
        `${totalSets} total sets`,
        `${Math.round((workout.duration_seconds || 0) / 60)} minutes`,
      ],
      improvements: [],
      nextWorkoutTip: 'Keep up the consistency!',
      volumeComparison: 'first',
      estimatedCalories: this.estimateCalories(workout),
      musclesWorked,
      totalVolume: this.calculateVolume(workout),
      totalSets,
      personalRecordsAchieved: 0,
    };
  }

  /**
   * Build simplified workout context for AI
   */
  private buildSimpleWorkoutContext(workout: any, volume: number): string {
    const exercises = workout.exercises || [];
    const durationMinutes = Math.round((workout.duration_seconds || 0) / 60);

    let context = `WORKOUT: ${workout.name || 'Training Session'}
Duration: ${durationMinutes} minutes
Total Volume: ${volume} lbs

EXERCISES:`;

    for (const ex of exercises) {
      const sets = ex.sets || [];
      const completedSets = sets.filter((s: any) => s.isCompleted);
      context += `\n- ${ex.name}: ${completedSets.length} sets`;
      
      if (completedSets.length > 0) {
        const topSet = completedSets.reduce((max: any, s: any) => 
          (s.weight * s.reps > max.weight * max.reps) ? s : max
        );
        context += ` (top: ${topSet.weight}lbs  ${topSet.reps})`;
      }
    }

    return context;
  }

  /**
   * Calculate total volume (weight × reps)
   */
  private calculateVolume(workout: any): number {
    let volume = 0;
    for (const exercise of workout.exercises || []) {
      for (const set of exercise.sets || []) {
        if (set.isCompleted || set.completed_at) {
          volume += (set.weight || 0) * (set.reps || 0);
        }
      }
    }
    return volume;
  }

  /**
   * Count total sets
   */
  private countTotalSets(workout: any): number {
    let count = 0;
    for (const exercise of workout.exercises || []) {
      count += (exercise.sets || []).filter((s: any) => s.isCompleted || s.completed_at).length;
    }
    return count;
  }

  /**
   * Get muscles worked
   */
  private getMusclesWorked(workout: any): string[] {
    const muscles = new Set<string>();
    for (const exercise of workout.exercises || []) {
      if (exercise.muscle_group) {
        muscles.add(exercise.muscle_group);
      }
    }
    return Array.from(muscles);
  }

  /**
   * Estimate calories burned
   */
  private estimateCalories(workout: any): number {
    // Rough estimate: 6 calories per set + 4 calories per minute
    const totalSets = this.countTotalSets(workout);
    const minutes = (workout.duration_seconds || 0) / 60;
    return Math.round(totalSets * 6 + minutes * 4);
  }

  /**
   * Get volume change percentage
   */
  private getVolumeChangePercent(workout: any): number {
    // This would need previous workout data - placeholder
    return 10;
  }

  /**
   * Get previous similar workout
   */
  private async getPreviousSimilarWorkout(userId: string, currentWorkout: any) {
    try {
      // Get most recent workout before this one
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
        .neq('id', currentWorkout.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
 logger.error('Error fetching previous workout:', error);
        return null;
      }

      // Transform to match expected structure
      if (data) {
        return {
          ...data,
          exercises: data.workout_exercises?.map((we: any) => ({
            ...we.exercises,
            sets: we.workout_sets,
          })),
        };
      }

      return null;
    } catch (error) {
 logger.error('Failed to get previous workout:', error);
      return null;
    }
  }

  /**
   * Get user stats
   */
  private async getUserStats(userId: string): Promise<WorkoutStats> {
    try {
      // Calculate stats from workouts table instead of profiles
      // (profiles.total_workouts column doesn't exist)
      const { data: workouts, error } = await supabase
        .from('workouts')
        .select('id, completed_at, status')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      if (error) {
        logger.error('Error fetching user workouts for stats:', error);
        return { totalWorkouts: 0, streak: 0 };
      }

      const totalWorkouts = workouts?.length || 0;
      
      // Calculate current streak
      let streak = 0;
      if (workouts && workouts.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let currentDate = new Date(today);
        
        for (const workout of workouts) {
          const workoutDate = new Date(workout.completed_at);
          workoutDate.setHours(0, 0, 0, 0);
          
          const dayDiff = Math.floor((currentDate.getTime() - workoutDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (dayDiff === 0 || dayDiff === 1) {
            streak++;
            currentDate = new Date(workoutDate);
          } else {
            break;
          }
        }
      }

      return {
        totalWorkouts,
        streak,
      };
    } catch (error) {
      logger.error('Failed to get user stats:', error);
      return { totalWorkouts: 0, streak: 0 };
    }
  }

  /**
   * Get count of new PRs in this workout
   */
  private async getNewPRCount(userId: string, workout: any): Promise<number> {
    try {
      // Get PRs created today (or in last hour)
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      const { data, error } = await supabase
        .from('personal_records')
        .select('id')
        .eq('user_id', userId)
        .gte('created_at', oneHourAgo.toISOString());

      if (error) {
 logger.error('Error fetching PR count:', error);
        return 0;
      }

      return data?.length || 0;
    } catch (error) {
 logger.error('Failed to get PR count:', error);
      return 0;
    }
  }
}

export const workoutAnalysisService = new WorkoutAnalysisService();

