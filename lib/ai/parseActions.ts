import { logger } from '@/lib/utils/logger';
/**
 * Parse AI coach responses to extract structured actions
 */

export interface WorkoutAction {
  type: 'workout';
  name: string;
  exercises: Array<{
    name: string;
    sets: number;
    reps: string;
  }>;
}

export interface ParsedResponse {
  message: string;
  action?: WorkoutAction;
}

/**
 * Parse coach response and extract any structured actions
 */
export function parseCoachResponse(response: string): ParsedResponse {
  // Look for workout JSON block in markdown code fence
  const workoutMatch = response.match(/```workout\s*\n([\s\S]*?)\n```/);
  
  logger.log('[ParseActions] Checking for workout block in response');
  logger.log('[ParseActions] Workout match found:', !!workoutMatch);
  
  if (workoutMatch) {
    try {
      logger.log('[ParseActions] Attempting to parse workout JSON:', workoutMatch[1]);
      const workoutData = JSON.parse(workoutMatch[1]);
      
      // Validate the workout data structure
      if (workoutData.name && Array.isArray(workoutData.exercises)) {
        logger.log('[ParseActions] ✅ Valid workout data parsed:', workoutData);
        
        // Remove the workout block from the message
        const cleanMessage = response
          .replace(/```workout\s*\n[\s\S]*?\n```/, '')
          .trim();
        
        return {
          message: cleanMessage,
          action: {
            type: 'workout',
            name: workoutData.name,
            exercises: workoutData.exercises,
          },
        };
      } else {
        logger.warn('[ParseActions] Invalid workout structure - missing name or exercises');
      }
    } catch (error: unknown) {
      logger.warn('[ParseActions] Failed to parse workout action:', error);
      // Return original message if parsing fails
      return { message: response };
    }
  } else {
    logger.log('[ParseActions] No workout block found in response');
    
    // FALLBACK: Try to detect if AI listed exercises in plain text
    // Look for patterns like "1. Exercise Name - 3x10" or "Exercise (3 sets × 10 reps)"
    const fallbackWorkout = tryExtractPlainTextWorkout(response);
    if (fallbackWorkout) {
      logger.log('[ParseActions] ✅ Extracted workout from plain text');
      return {
        message: response,
        action: fallbackWorkout,
      };
    }
  }
  
  // No action found, return original message
  return { message: response };
}

/**
 * Fallback: Try to extract workout from plain text format
 */
function tryExtractPlainTextWorkout(text: string): WorkoutAction | null {
  const exercises: Array<{ name: string; sets: number; reps: string }> = [];
  
  // Pattern 1: "1. Exercise Name - 3x10" or "1. Exercise Name: 3x10"
  const pattern1 = /(?:\d+\.|[-•])\s*([A-Za-z\s]+?)[-:]\s*(\d+)\s*[x×]\s*(\d+(?:-\d+)?)/g;
  let match;
  
  while ((match = pattern1.exec(text)) !== null) {
    const name = match[1].trim();
    const sets = parseInt(match[2]);
    const reps = match[3];
    
    if (name && sets > 0) {
      exercises.push({ name, sets, reps });
    }
  }
  
  // Pattern 2: "Exercise Name (3 sets × 10 reps)"
  const pattern2 = /([A-Za-z\s]+?)\s*\((\d+)\s*sets?\s*[x×]\s*(\d+(?:-\d+)?)\s*reps?\)/gi;
  
  while ((match = pattern2.exec(text)) !== null) {
    const name = match[1].trim();
    const sets = parseInt(match[2]);
    const reps = match[3];
    
    if (name && sets > 0) {
      exercises.push({ name, sets, reps });
    }
  }
  
  // If we found at least 2 exercises, create a workout
  if (exercises.length >= 2) {
    return {
      type: 'workout',
      name: 'AI Suggested Workout',
      exercises,
    };
  }
  
  return null;
}

/**
 * Check if a response contains a workout action
 */
export function hasWorkoutAction(response: string): boolean {
  return /```workout\s*\n[\s\S]*?\n```/.test(response);
}


