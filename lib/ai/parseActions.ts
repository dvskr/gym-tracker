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
  
  if (workoutMatch) {
    try {
      const workoutData = JSON.parse(workoutMatch[1]);
      
      // Validate the workout data structure
      if (workoutData.name && Array.isArray(workoutData.exercises)) {
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
      }
    } catch (error: unknown) {
 logger.warn('Failed to parse workout action:', error);
      // Return original message if parsing fails
      return { message: response };
    }
  }
  
  // No action found, return original message
  return { message: response };
}

/**
 * Check if a response contains a workout action
 */
export function hasWorkoutAction(response: string): boolean {
  return /```workout\s*\n[\s\S]*?\n```/.test(response);
}

