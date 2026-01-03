import { logger } from '@/lib/utils/logger';
/**
 * High-level AI helpers for common gym app use cases
 * These wrap the aiService with domain-specific logic
 */

import { aiService } from './aiService';
import {
  FITNESS_COACH_SYSTEM_PROMPT,
  WORKOUT_SUGGESTION_PROMPT,
  FORM_CHECK_PROMPT,
  PROGRESSION_PROMPT,
  MOTIVATION_PROMPT,
  WORKOUT_CRITIQUE_PROMPT,
} from './prompts';
import {
  buildUserContext,
  buildWorkoutContext,
  buildExerciseHistory,
  buildCompleteContext,
} from './contextBuilder';

// ==========================================
// JSON PARSING UTILITIES
// ==========================================

/**
 * Clean AI response before JSON parsing
 * Removes markdown, code blocks, and extraneous text
 */
export function cleanAIResponse(response: string): string {
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
 * Clean exercise names from AI responses
 * Removes markdown, numbers, bullets, and extra whitespace
 */
export function cleanExerciseName(name: string): string {
  return name
    .replace(/\*\*/g, '')        // Remove bold markdown
    .replace(/^\d+\.\s*/, '')    // Remove numbered prefix (1. )
    .replace(/^[-•*]\s*/, '')    // Remove bullet prefix (- or • or *)
    .replace(/\s+/g, ' ')        // Normalize whitespace
    .trim();
}

/**
 * Safe JSON parse with fallback
 */
export function safeJSONParse<T>(response: string, fallback: T): T {
  try {
    const cleaned = cleanAIResponse(response);
    return JSON.parse(cleaned) as T;
  } catch (error) {
 logger.error('Failed to parse AI JSON response:', error);
 logger.error('Response was:', response);
    return fallback;
  }
}

/**
 * Validate and clean exercise array from AI response
 */
export function cleanExerciseArray(exercises: any[]): Array<{
  name: string;
  sets: number;
  reps: string;
}> {
  if (!Array.isArray(exercises)) {
    return [];
  }

  return exercises
    .filter((ex) => ex && ex.name)
    .map((ex) => ({
      name: cleanExerciseName(ex.name),
      sets: typeof ex.sets === 'number' ? ex.sets : 3,
      reps: ex.reps || '8-12',
    }));
}

// ==========================================
// AI HELPER FUNCTIONS
// ==========================================

/**
 * Get AI workout suggestion for today
 */
export async function getWorkoutSuggestion(userData: any): Promise<string> {
  const userContext = buildUserContext(userData);
  
  return await aiService.askWithContext(
    FITNESS_COACH_SYSTEM_PROMPT,
    `${userContext}\n\n${WORKOUT_SUGGESTION_PROMPT}`,
    { temperature: 0.3, maxTokens: 400 }
  );
}

/**
 * NOTE: getFormTips removed - now using database queries via hooks/useFormTips
 * Form tips for all 423 exercises are stored in the form_tips table
 */

/**
 * Get progression advice for an exercise
 */
export async function getProgressionAdvice(
  exerciseName: string,
  history: any[]
): Promise<string> {
  const historyContext = buildExerciseHistory(exerciseName, history);
  
  return await aiService.askWithContext(
    FITNESS_COACH_SYSTEM_PROMPT,
    `${historyContext}\n\n${PROGRESSION_PROMPT}`,
    { temperature: 0.3, maxTokens: 250 }
  );
}

/**
 * Critique a completed workout
 */
export async function critiqueWorkout(
  workout: any,
  userData: any
): Promise<string> {
  const context = buildCompleteContext({
    user: userData,
    workout: workout,
  });
  
  return await aiService.askWithContext(
    FITNESS_COACH_SYSTEM_PROMPT,
    `${context}\n\n${WORKOUT_CRITIQUE_PROMPT}`,
    { temperature: 0.3, maxTokens: 350 }
  );
}

/**
 * Get motivational message
 */
export async function getMotivation(userData: any): Promise<string> {
  const userContext = buildUserContext(userData);
  
  return await aiService.askWithContext(
    FITNESS_COACH_SYSTEM_PROMPT,
    `${userContext}\n\n${MOTIVATION_PROMPT}`,
    { temperature: 0.7, maxTokens: 150 }  // Keep higher temp for motivation
  );
}

/**
 * Ask the AI coach a custom question
 */
export async function askCoach(
  question: string,
  userData?: any
): Promise<string> {
  const context = userData ? buildUserContext(userData) : '';
  const fullPrompt = context 
    ? `${context}\n\nUser Question: ${question}`
    : question;
  
  return await aiService.askWithContext(
    FITNESS_COACH_SYSTEM_PROMPT,
    fullPrompt,
    { temperature: 0.5, maxTokens: 400 }
  );
}

/**
 * Get rest time recommendation
 */
export async function getRestTimeAdvice(
  exerciseName: string,
  weight: number,
  goal: 'strength' | 'hypertrophy' | 'endurance'
): Promise<string> {
  const prompt = `Exercise: ${exerciseName}
Weight: ${weight}lbs
Training Goal: ${goal}

Suggest appropriate rest time between sets with brief reasoning.`;

  return await aiService.askWithContext(
    FITNESS_COACH_SYSTEM_PROMPT,
    prompt,
    { temperature: 0.3, maxTokens: 200 }
  );
}

/**
 * Get exercise substitutions
 */
export async function getExerciseSubstitutes(
  exerciseName: string,
  reason?: string
): Promise<string> {
  const prompt = `Suggest 3-4 alternative exercises for: ${exerciseName}
${reason ? `Reason for substitution: ${reason}` : ''}

For each alternative, explain:
- Equipment needed
- Why it's a good substitute
- Key differences`;

  return await aiService.askWithContext(
    FITNESS_COACH_SYSTEM_PROMPT,
    prompt,
    { temperature: 0.4, maxTokens: 400 }
  );
}

/**
 * Analyze workout split
 */
export async function analyzeWorkoutSplit(
  recentWorkouts: any[]
): Promise<string> {
  const workoutsList = recentWorkouts.map((w, i) => 
    `${i + 1}. ${w.name} (${new Date(w.date).toLocaleDateString()}) - ${w.exercises?.map((e: any) => e.name).join(', ')}`
  ).join('\n');

  const prompt = `Recent workouts:\n${workoutsList}\n\nAnalyze this training pattern:
1. Is there good muscle group balance?
2. Are rest days appropriate?
3. Any concerns about overtraining?
4. Suggestions for improvement?`;

  return await aiService.askWithContext(
    FITNESS_COACH_SYSTEM_PROMPT,
    prompt,
    { temperature: 0.4, maxTokens: 400 }
  );
}

/**
 * Generate workout plan
 */
export async function generateWorkoutPlan(
  goal: string,
  daysPerWeek: number,
  experience: string,
  preferences?: string
): Promise<string> {
  const prompt = `Create a ${daysPerWeek}-day per week workout plan for:
- Goal: ${goal}
- Experience: ${experience}
${preferences ? `- Preferences: ${preferences}` : ''}

Include:
1. Weekly split structure
2. Sample workout for each day
3. Sets/reps guidance
4. Progression strategy`;

  return await aiService.askWithContext(
    FITNESS_COACH_SYSTEM_PROMPT,
    prompt,
    { temperature: 0.5, maxTokens: 600 }
  );
}

