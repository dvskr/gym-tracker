import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/utils/logger';
import { aiService } from './aiService';
import { buildUserContext, buildEquipmentContext, buildFitnessProfileContext, buildInjuryContext } from './contextBuilder';
import { FITNESS_COACH_SYSTEM_PROMPT, WORKOUT_SUGGESTION_PROMPT } from './prompts';
import { 
  validateWorkoutSuggestion, 
  validateAndFallback, 
  normalizeConfidence,
  validateWorkoutSuggestionAdvanced,
  type ValidatedSuggestion
} from './validation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocalWorkout } from '@/lib/types/common';

export interface WorkoutSuggestion {
  type: string;
  reason: string;
  exercises: {
    name: string;
    sets: number;
    reps: string;
  }[];
  confidence: 'high' | 'medium' | 'low';
}

// Cache configuration
const SUGGESTION_CACHE_KEY = 'workout_suggestion_cache';
const CACHE_DURATION = 4 * 60 * 60 * 1000; // 4 hours

interface CachedSuggestion {
  suggestion: WorkoutSuggestion | ValidatedSuggestion;
  timestamp: number;
  userId: string;
}

class WorkoutSuggestionService {
  /**
   * Get AI-powered workout suggestion for today
   * Now includes strict validation with equipment and injury filtering
   */
  async getSuggestion(userId: string, forceRefresh = false): Promise<ValidatedSuggestion> {
    try {
      // Check cache unless force refresh
      if (!forceRefresh) {
        const cached = await this.getCachedSuggestion(userId);
        if (cached) {
 logger.log('S& Using cached workout suggestion');
          return cached;
        }
      }

      // Gather user data
      const [recentWorkouts, personalRecords, profile] = await Promise.all([
        this.getRecentWorkouts(userId, 14), // Last 2 weeks
        this.getPersonalRecords(userId),
        this.getUserProfile(userId),
      ]);

      // If not enough data, return rule-based default
      if (recentWorkouts.length < 2) {
 logger.log('Not enough workout history, using default');
        return this.getDefaultSuggestion(recentWorkouts);
      }

      // Try AI suggestion first
      try {
        const aiSuggestion = await this.getAISuggestion({
          recentWorkouts,
          personalRecords,
          profile,
        });
        
        // " STRICT VALIDATION with equipment and injury filtering
 logger.log('x Validating AI suggestion...');
        const validated = validateWorkoutSuggestionAdvanced(
          aiSuggestion,
          profile.available_equipment || [],
          profile.injury_restrictions || []
        );
        
        // Log validation results
        if (validated.wasFiltered) {
          const removed = aiSuggestion.exercises.length - validated.exercises.length;
 logger.warn(`a Filtered ${removed} exercises (equipment/injury restrictions)`);
        }
        
        // " CHECK: If too many exercises filtered, use fallback
        if (validated.exercises.length < 3) {
 logger.warn('R Too few valid exercises after filtering, using rule-based fallback');
          const fallback = this.getRuleBasedSuggestion(recentWorkouts);
          
          // Validate fallback too (should pass since rule-based uses valid exercises)
          const validatedFallback = validateWorkoutSuggestionAdvanced(
            fallback,
            profile.available_equipment || [],
            profile.injury_restrictions || []
          );
          
          await this.cacheSuggestion(userId, validatedFallback);
          return validatedFallback;
        }
        
        // Validate structure (existing validation)
        if (!validateWorkoutSuggestion(validated)) {
 logger.warn('AI response structure invalid, using fallback');
          const fallback = this.getRuleBasedSuggestion(recentWorkouts);
          const validatedFallback = validateWorkoutSuggestionAdvanced(
            fallback,
            profile.available_equipment || [],
            profile.injury_restrictions || []
          );
          await this.cacheSuggestion(userId, validatedFallback);
          return validatedFallback;
        }
        
 logger.log('S& AI suggestion validated successfully');
        
        // Cache the result
        await this.cacheSuggestion(userId, validated);
        
        return validated;
      } catch (aiError) {
 logger.warn('AI suggestion failed, falling back to rule-based:', aiError);
        const fallback = this.getRuleBasedSuggestion(recentWorkouts);
        const validatedFallback = validateWorkoutSuggestionAdvanced(
          fallback,
          profile.available_equipment || [],
          profile.injury_restrictions || []
        );
        await this.cacheSuggestion(userId, validatedFallback);
        return validatedFallback;
      }
    } catch (error) {
 logger.error('Failed to get workout suggestion:', error);
      return this.getDefaultSuggestion([]);
    }
  }

  /**
   * Get cached suggestion if valid
   */
  private async getCachedSuggestion(userId: string): Promise<ValidatedSuggestion | null> {
    try {
      const cached = await AsyncStorage.getItem(SUGGESTION_CACHE_KEY);
      if (!cached) return null;
      
      const parsed: CachedSuggestion = JSON.parse(cached);
      
      // Check if cache is for same user and not expired
      const isExpired = Date.now() - parsed.timestamp > CACHE_DURATION;
      if (parsed.userId !== userId || isExpired) {
        await AsyncStorage.removeItem(SUGGESTION_CACHE_KEY);
        return null;
      }
      
      return parsed.suggestion;
    } catch (error) {
 logger.error('Error reading cache:', error);
      return null;
    }
  }

  /**
   * Cache suggestion for future use
   */
  private async cacheSuggestion(userId: string, suggestion: ValidatedSuggestion): Promise<void> {
    try {
      const cacheData: CachedSuggestion = {
        suggestion,
        timestamp: Date.now(),
        userId,
      };
      await AsyncStorage.setItem(SUGGESTION_CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
 logger.error('Error caching suggestion:', error);
    }
  }

  /**
   * Get AI-powered suggestion
   */
  private async getAISuggestion(data: {
    recentWorkouts: LocalWorkout[];
    personalRecords: Array<{
      exercises?: { name?: string } | null;
      weight?: number | null;
      reps?: number | null;
      [key: string]: unknown;
    }>;
    profile: {
      current_streak?: number;
      weight_unit?: string;
      fitness_goals?: string;
      experience_level?: string;
      available_equipment?: string[];
      [key: string]: unknown;
    };
  }): Promise<WorkoutSuggestion> {
    const { recentWorkouts, personalRecords, profile } = data;

    try {
      // Build context for AI
      const userContext = buildUserContext({
        recentWorkouts: recentWorkouts.map(w => ({
          name: w.name,
          created_at: w.created_at,
          duration_seconds: w.duration_seconds,
          exercises: w.workout_exercises?.map((we) => ({
            name: we.exercises?.name,
            primary_muscles: we.exercises?.primary_muscles || [],
            secondary_muscles: we.exercises?.secondary_muscles || [],
          })),
        })),
        personalRecords: personalRecords.map(pr => ({
          exercise_name: pr.exercises?.name || 'Unknown',
          weight: pr.weight,
          reps: pr.reps,
        })),
        currentStreak: profile.current_streak || 0,
        totalWorkouts: recentWorkouts.length,
        preferredUnits: profile.weight_unit || 'lbs',
        goals: profile.fitness_goals,
        experienceLevel: profile.experience_level || 'intermediate',
      });

      // Add equipment context
      const equipmentContext = profile.available_equipment 
        ? buildEquipmentContext(profile.available_equipment)
        : '';

      // Add injury context
      const { data: { user } } = await supabase.auth.getUser();
      const injuryContext = user ? await buildInjuryContext(user.id) : '';

      // Get AI suggestion with detailed error logging
      const prompt = `${userContext}\n\n${equipmentContext}\n\n${injuryContext}\n\n${WORKOUT_SUGGESTION_PROMPT}`;
      
 logger.log('x Calling AI service for workout suggestion...');
      
      const response = await aiService.askWithContext(
        FITNESS_COACH_SYSTEM_PROMPT,
        prompt,
        { 
          temperature: 0.7, 
          maxTokens: 500,
          requestType: 'workout_suggestion',
        }
      );

 logger.log('S& AI service responded successfully');
      return this.parseAISuggestion(response);

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
 logger.error('R AI service failed:', {
        message,
        status: error.status,
        details: error.details || error,
      });
      
      // If it's a rate limit error, throw it up so the UI can handle it
      if (error.name === 'AILimitError' || error.message?.includes('limit')) {
        throw error;
      }
      
      // For other errors, fall back to rule-based
 logger.log('a Falling back to rule-based suggestion');
      throw new Error('AI service unavailable, using fallback');
    }
  }

  /**
   * Rule-based suggestion when AI unavailable
   */
  private getRuleBasedSuggestion(recentWorkouts: LocalWorkout[]): ValidatedSuggestion {
    const muscleMap = this.analyzeRecentMuscles(recentWorkouts);
    const now = new Date();
    
    // Define muscle groups for each workout type
    const workoutTypes = [
      { 
        type: 'Push', 
        muscles: ['chest', 'shoulders', 'triceps'],
        description: 'chest, shoulders, and triceps',
      },
      { 
        type: 'Pull', 
        muscles: ['back', 'biceps', 'lats'],
        description: 'back and biceps',
      },
      { 
        type: 'Legs', 
        muscles: ['quadriceps', 'hamstrings', 'glutes', 'calves'],
        description: 'legs',
      },
    ];

    // Find least recently trained muscle group
    let bestSuggestion = workoutTypes[0];
    let longestRest = 0;

    for (const workoutType of workoutTypes) {
      let minDays = Infinity;
      
      for (const muscle of workoutType.muscles) {
        const lastTrained = muscleMap.get(muscle);
        if (lastTrained) {
          const days = (now.getTime() - lastTrained.getTime()) / (1000 * 60 * 60 * 24);
          minDays = Math.min(minDays, days);
        } else {
          minDays = 7; // Never trained = 7 days ago
        }
      }
      
      if (minDays > longestRest) {
        longestRest = minDays;
        bestSuggestion = workoutType;
      }
    }

    const daysSince = Math.floor(longestRest);
    const reason = daysSince >= 7
      ? `You haven't trained ${bestSuggestion.description} in over a week. Perfect time to hit them!`
      : `Your ${bestSuggestion.description} have had ${daysSince} days of rest. Time to train!`;

    return {
      type: `${bestSuggestion.type} Day`,
      reason,
      exercises: this.getDefaultExercises(bestSuggestion.type),
      confidence: 'medium',
      wasFiltered: false,
    };
  }

  /**
   * Analyze recent workouts to find when muscles were last trained
   */
  private analyzeRecentMuscles(workouts: LocalWorkout[]): Map<string, Date> {
    const muscleLastTrained = new Map<string, Date>();
    
    for (const workout of workouts) {
      const date = new Date(workout.created_at);
      
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
          
          if (!existing || date > existing) {
            muscleLastTrained.set(muscleKey, date);
          }
        }
      }
    }
    
    return muscleLastTrained;
  }

  /**
   * Default suggestion when no data available
   */
  private getDefaultSuggestion(recentWorkouts: LocalWorkout[]): ValidatedSuggestion {
    // If user has never worked out, suggest full body
    if (recentWorkouts.length === 0) {
      return {
        type: 'Full Body Workout',
        reason: 'Start with a balanced full-body routine to build a foundation.',
        exercises: [
          { name: 'Squats', sets: 3, reps: '8-12' },
          { name: 'Bench Press', sets: 3, reps: '8-12' },
          { name: 'Barbell Rows', sets: 3, reps: '8-12' },
          { name: 'Overhead Press', sets: 3, reps: '8-10' },
          { name: 'Romanian Deadlifts', sets: 3, reps: '8-10' },
        ],
        confidence: 'low',
        wasFiltered: false,
      };
    }

    // Otherwise use rule-based
    const suggestion = this.getRuleBasedSuggestion(recentWorkouts);
    return {
      ...suggestion,
      wasFiltered: false,
    };
  }

  /**
   * Get default exercises for each workout type
   */
  private getDefaultExercises(type: string) {
    const defaults: Record<string, any[]> = {
      Push: [
        { name: 'Bench Press', sets: 4, reps: '8-10' },
        { name: 'Overhead Press', sets: 3, reps: '8-10' },
        { name: 'Incline Dumbbell Press', sets: 3, reps: '10-12' },
        { name: 'Lateral Raises', sets: 3, reps: '12-15' },
        { name: 'Tricep Pushdowns', sets: 3, reps: '12-15' },
      ],
      Pull: [
        { name: 'Barbell Rows', sets: 4, reps: '8-10' },
        { name: 'Pull-ups', sets: 3, reps: '8-12' },
        { name: 'Lat Pulldowns', sets: 3, reps: '10-12' },
        { name: 'Face Pulls', sets: 3, reps: '15-20' },
        { name: 'Barbell Curls', sets: 3, reps: '10-12' },
      ],
      Legs: [
        { name: 'Squats', sets: 4, reps: '6-8' },
        { name: 'Romanian Deadlifts', sets: 3, reps: '8-10' },
        { name: 'Leg Press', sets: 3, reps: '10-12' },
        { name: 'Leg Curls', sets: 3, reps: '10-12' },
        { name: 'Calf Raises', sets: 4, reps: '12-15' },
      ],
    };
    
    return defaults[type] || defaults.Push;
  }

  /**
   * Parse AI response into structured suggestion
   */
  private parseAISuggestion(response: string): WorkoutSuggestion {
    try {
      // Clean response before parsing
      const cleaned = this.cleanAIResponse(response);
      
      // Try to parse as JSON first
      if (cleaned.trim().startsWith('{')) {
        const parsed = JSON.parse(cleaned);
        
        // Clean and validate structure
        return {
          type: parsed.workoutType || parsed.type || 'Full Body',
          reason: parsed.reason || 'Based on your recent training patterns.',
          exercises: this.cleanExercises(parsed.exercises || []),
          confidence: normalizeConfidence(parsed.confidence),
        };
      }

      // Fallback: parse text response (legacy format)
      return this.parseTextResponse(response);
    } catch (error) {
 logger.error('Failed to parse AI suggestion:', error);
 logger.error('Response was:', response);
      return this.getDefaultSuggestion([]);
    }
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
   * Clean exercise array from AI response
   */
  private cleanExercises(exercises: unknown[]): Array<{
    name: string;
    sets: number;
    reps: string;
  }> {
    if (!Array.isArray(exercises)) {
      return [];
    }

    const cleaned = exercises
      .filter((ex) => ex && ex.name)
      .map((ex) => ({
        name: this.cleanExerciseName(ex.name),
        sets: typeof ex.sets === 'number' ? ex.sets : 3,
        reps: ex.reps || '8-12',
      }))
      .slice(0, 5); // Limit to 5 exercises

    // If no exercises, return defaults
    if (cleaned.length === 0) {
      return this.getDefaultExercises('Push');
    }

    return cleaned;
  }

  /**
   * Clean exercise name
   */
  private cleanExerciseName(name: string): string {
    return name
      .replace(/\*\*/g, '')        // Remove bold markdown
      .replace(/^\d+\.\s*/, '')    // Remove numbered prefix (1. )
      .replace(/^[-•*]\s*/, '')    // Remove bullet prefix (- or • or *)
      .replace(/\s+/g, ' ')        // Normalize whitespace
      .trim();
  }

  /**
   * Parse text response (legacy fallback)
   */
  private parseTextResponse(response: string): WorkoutSuggestion {
    const lines = response.split('\n').filter(l => l.trim());
    
    // Extract workout type (usually in first line with ** or #)
    let type = 'Full Body';
    const typeMatch = lines[0]?.match(/\*\*(.+?)\*\*|#\s*(.+?)$/);
    if (typeMatch) {
      type = (typeMatch[1] || typeMatch[2]).trim();
    }
    
    // Extract reason (usually next 2-3 lines)
    const reasonLines: string[] = [];
    let exerciseStartIndex = 1;
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Stop when we hit exercises (numbered or bulleted list)
      if (/^\d+\.|^[-•*]/.test(line.trim())) {
        exerciseStartIndex = i;
        break;
      }
      if (line.trim() && !line.toLowerCase().includes('exercise')) {
        reasonLines.push(line);
      }
    }
    
    const reason = reasonLines.join(' ').substring(0, 250) || 
                   'Based on your recent training patterns.';
    
    // Extract exercises
    const exercises: unknown[] = [];
    for (let i = exerciseStartIndex; i < lines.length; i++) {
      const line = lines[i];
      // Match patterns like:
      // 1. Bench Press - 4 x 6-8
      // - Squats - 3 x 8-10
      // • Deadlifts: 4 sets of 6-8 reps
      const match = line.match(/[-•*\d.]\s*(.+?)[-:]\s*(\d+)\s*(?:sets?\s*)?(?:x|×|of)\s*(\d+[-~]\d+|\d+)/i);
      
      if (match && exercises.length < 5) {
        exercises.push({
          name: this.cleanExerciseName(match[1]),
          sets: parseInt(match[2]),
          reps: match[3],
        });
      }
    }

    // If no exercises found, use defaults
    const cleanedExercises = exercises.length > 0 
      ? exercises 
      : this.getDefaultExercises(
          type.includes('Push') ? 'Push' : 
          type.includes('Pull') ? 'Pull' : 
          type.includes('Leg') ? 'Legs' : 'Push'
        );

    return {
      type,
      reason,
      exercises: cleanedExercises,
      confidence: 'medium',
    };
  }

  /**
   * Get recent workouts for user
   */
  private async getRecentWorkouts(userId: string, days: number) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    
    const { data, error } = await supabase
      .from('workouts')
      .select(`
        *,
        workout_exercises (
          *,
          exercises (*)
        )
      `)
      .eq('user_id', userId)
      .gte('created_at', since.toISOString())
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
  private async getPersonalRecords(userId: string) {
    const { data, error } = await supabase
      .from('personal_records')
      .select('*, exercises(name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (error) {
 logger.error('Error fetching PRs:', error);
      return [];
    }
    
    return data || [];
  }

  /**
   * Get user profile
   */
  private async getUserProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
 logger.error('Error fetching profile:', error);
      return {};
    }
    
    return data || {};
  }
}

export const workoutSuggestionService = new WorkoutSuggestionService();

