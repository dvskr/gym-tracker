import { logger } from '@/lib/utils/logger';
/**
 * AI Response Validation
 * Ensures AI responses meet expected structure and quality standards
 * Includes fuzzy matching for exercise name validation
 */

import Fuse from 'fuse.js';
import { WorkoutSuggestion } from './workoutSuggestions';
import { WorkoutAnalysis } from './workoutAnalysis';
import { supabase } from '@/lib/supabase';

// ==========================================
// FORM TIPS TYPE
// ==========================================

export interface FormTips {
  setup: string;
  execution: string;
  cues: string[];
  commonMistakes: string[];
  breathingPattern: string;
}

// ==========================================
// PROGRESSION RECOMMENDATION TYPE
// ==========================================

export interface ProgressionRecommendation {
  recommendation: 'increase_weight' | 'increase_reps' | 'maintain' | 'deload';
  suggestedWeight: number;
  suggestedReps?: string;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
}

// ==========================================
// VALIDATED SUGGESTION TYPE
// ==========================================

export interface ValidatedSuggestion extends WorkoutSuggestion {
  wasFiltered: boolean;
  exercises: Array<{
    name: string;
    sets: number;
    reps: string;
    equipment?: string;
  }>;
}

// ==========================================
// RESPONSE SPECIFICITY TYPES
// ==========================================

export interface UserContext {
  hasPRs: boolean;
  hasWorkoutHistory: boolean;
  recentExercises: string[];
  recentWeights?: Array<{ exercise: string; weight: number; reps: number }>;
  workoutCount?: number;
  lastWorkoutDate?: string;
}

export interface SpecificityCheck {
  isSpecific: boolean;
  score: number;
  issues: string[];
  details: {
    hasSpecificWeight: boolean;
    hasSpecificReps: boolean;
    mentionedExercises: string[];
    hasTimeReference: boolean;
  };
}

// ==========================================
// FUZZY MATCHING FOR EXERCISE NAMES
// ==========================================

// In-memory cache for exercise names and fuzzy search
let exerciseNames: string[] = [];
let exerciseMap: Map<string, { name: string; equipment: string }> = new Map();
let fuse: Fuse<string> | null = null;

/**
 * Initialize the exercise validator with exercise data from database
 */
export const initExerciseValidator = async () => {
  try {
    const { data, error } = await supabase
      .from('exercises')
      .select('name, equipment');
    
    if (error) {
 logger.error('Failed to load exercises for validation:', error);
      return;
    }
    
    if (data) {
      exerciseNames = data.map(ex => ex.name);
      exerciseMap.clear();
      data.forEach(ex => {
        exerciseMap.set(ex.name.toLowerCase(), { 
          name: ex.name, 
          equipment: ex.equipment 
        });
      });
      
      fuse = new Fuse(exerciseNames, {
        threshold: 0.3,
        includeScore: true,
        ignoreLocation: true,
        keys: ['name'],
      });
      
 logger.log(`S& Exercise validator initialized with ${exerciseNames.length} exercises`);
    }
  } catch (error) {
 logger.error('Failed to initialize exercise validator:', error);
  }
};

/**
 * Validate and correct an exercise name using fuzzy matching
 * Returns the corrected name or null if no valid match found
 */
export const validateExerciseName = (name: string): string | null => {
  if (!name || typeof name !== 'string') return null;
  
  const normalized = name.trim();
  if (!normalized) return null;
  
  // Exact match first (case-insensitive)
  const exactMatch = exerciseMap.get(normalized.toLowerCase());
  if (exactMatch) return exactMatch.name;
  
  // Fuzzy match using Fuse.js
  if (fuse) {
    const results = fuse.search(normalized);
    if (results.length > 0 && results[0].score !== undefined && results[0].score < 0.3) {
 logger.log(`S& Fuzzy matched "${normalized}" -> "${results[0].item}" (score: ${results[0].score})`);
      return results[0].item;
    }
  }
  
 logger.warn(`R No valid exercise match found for: "${normalized}"`);
  return null;
};

/**
 * Get exercise data by name (for equipment checks)
 */
export const getExerciseByName = (name: string): { name: string; equipment: string } | null => {
  const data = exerciseMap.get(name.toLowerCase());
  return data || null;
};

/**
 * Validate workout suggestion against user equipment and injury restrictions
 */
export const validateWorkoutSuggestionAdvanced = (
  suggestion: WorkoutSuggestion,
  userEquipment: string[] = [],
  injuryAvoidList: string[] = []
): ValidatedSuggestion => {
  const validatedExercises = suggestion.exercises
    .map(ex => {
      // 1. Validate exercise name exists
      const validName = validateExerciseName(ex.name);
      if (!validName) {
 logger.warn(`Filtered out invalid exercise: "${ex.name}"`);
        return null;
      }
      
      // 2. Check equipment match (only if user has specified equipment)
      if (userEquipment.length > 0) {
        const exerciseData = getExerciseByName(validName);
        if (exerciseData && !userEquipment.includes(exerciseData.equipment)) {
 logger.warn(`Filtered out "${validName}" - requires ${exerciseData.equipment}`);
          return null;
        }
      }
      
      // 3. Check injury avoid list
      if (injuryAvoidList.length > 0) {
        const isAvoided = injuryAvoidList.some(avoid => 
          validName.toLowerCase().includes(avoid.toLowerCase())
        );
        if (isAvoided) {
 logger.warn(`Filtered out "${validName}" - on injury avoid list`);
          return null;
        }
      }
      
      // Get equipment info for response
      const exerciseData = getExerciseByName(validName);
      
      return {
        ...ex,
        name: validName, // Use exact database name
        equipment: exerciseData?.equipment,
      };
    })
    .filter(Boolean) as Array<{
      name: string;
      sets: number;
      reps: string;
      equipment?: string;
    }>;
  
  return {
    ...suggestion,
    exercises: validatedExercises,
    wasFiltered: validatedExercises.length < suggestion.exercises.length,
  };
};

// ==========================================
// VALIDATION FUNCTIONS
// ==========================================

/**
 * Validate workout suggestion response
 */
export function validateWorkoutSuggestion(data: any): data is WorkoutSuggestion {
  if (!data || typeof data !== 'object') {
 logger.warn('Validation failed: data is not an object');
    return false;
  }
  
  // Check required fields
  const hasType = typeof data.type === 'string' || typeof data.workoutType === 'string';
  const hasReason = typeof data.reason === 'string';
  const hasExercises = Array.isArray(data.exercises);
  
  if (!hasType) {
 logger.warn('Validation failed: missing workout type');
    return false;
  }
  
  if (!hasReason) {
 logger.warn('Validation failed: missing reason');
    return false;
  }
  
  if (!hasExercises) {
 logger.warn('Validation failed: exercises is not an array');
    return false;
  }
  
  // Validate exercise count
  if (data.exercises.length < 2 || data.exercises.length > 8) {
 logger.warn(`Validation failed: invalid exercise count (${data.exercises.length})`);
    return false;
  }
  
  // Validate each exercise
  const validExercises = data.exercises.every((ex: any, index: number) => {
    const isValid = 
      typeof ex.name === 'string' &&
      ex.name.length > 0 &&
      ex.name.length < 100 &&
      typeof ex.sets === 'number' &&
      ex.sets > 0 &&
      ex.sets <= 10 &&
      (typeof ex.reps === 'string' || typeof ex.reps === 'number');
    
    if (!isValid) {
 logger.warn(`Validation failed: exercise ${index} is invalid`, ex);
    }
    
    return isValid;
  });
  
  if (!validExercises) {
    return false;
  }
  
  // Validate confidence if present
  if (data.confidence && !['high', 'medium', 'low'].includes(data.confidence)) {
 logger.warn('Validation warning: invalid confidence value, will be normalized');
  }
  
  return true;
}

/**
 * Validate workout analysis response
 */
export function validateWorkoutAnalysis(data: any): data is Partial<WorkoutAnalysis> {
  if (!data || typeof data !== 'object') {
 logger.warn('Validation failed: data is not an object');
    return false;
  }
  
  // Check summary
  if (typeof data.summary !== 'string' || data.summary.length === 0) {
 logger.warn('Validation failed: invalid summary');
    return false;
  }
  
  if (data.summary.length > 500) {
 logger.warn('Validation warning: summary too long, will be truncated');
  }
  
  // Check highlights
  if (!Array.isArray(data.highlights)) {
 logger.warn('Validation failed: highlights is not an array');
    return false;
  }
  
  if (data.highlights.length === 0) {
 logger.warn('Validation failed: no highlights provided');
    return false;
  }
  
  // Validate highlight strings
  const validHighlights = data.highlights.every((h: any) => 
    typeof h === 'string' && h.length > 0 && h.length < 200
  );
  
  if (!validHighlights) {
 logger.warn('Validation failed: invalid highlights');
    return false;
  }
  
  // Check improvements (can be empty array)
  if (!Array.isArray(data.improvements)) {
 logger.warn('Validation failed: improvements is not an array');
    return false;
  }
  
  // Validate improvement strings
  const validImprovements = data.improvements.every((i: any) => 
    typeof i === 'string' && i.length > 0 && i.length < 200
  );
  
  if (!validImprovements && data.improvements.length > 0) {
 logger.warn('Validation failed: invalid improvements');
    return false;
  }
  
  // Check next workout tip
  if (typeof data.nextWorkoutTip !== 'string' || data.nextWorkoutTip.length === 0) {
 logger.warn('Validation failed: invalid nextWorkoutTip');
    return false;
  }
  
  if (data.nextWorkoutTip.length > 200) {
 logger.warn('Validation warning: nextWorkoutTip too long, will be truncated');
  }
  
  return true;
}

/**
 * Validate form tips response
 */
export function validateFormTips(data: any): data is FormTips {
  if (!data || typeof data !== 'object') {
 logger.warn('Validation failed: data is not an object');
    return false;
  }
  
  // Check setup
  if (typeof data.setup !== 'string' || data.setup.length === 0) {
 logger.warn('Validation failed: invalid setup');
    return false;
  }
  
  // Check execution
  if (typeof data.execution !== 'string' || data.execution.length === 0) {
 logger.warn('Validation failed: invalid execution');
    return false;
  }
  
  // Check cues
  if (!Array.isArray(data.cues) || data.cues.length < 2) {
 logger.warn('Validation failed: invalid cues array');
    return false;
  }
  
  const validCues = data.cues.every((cue: any) => 
    typeof cue === 'string' && cue.length > 0 && cue.length < 100
  );
  
  if (!validCues) {
 logger.warn('Validation failed: invalid cue strings');
    return false;
  }
  
  // Check common mistakes
  if (!Array.isArray(data.commonMistakes) || data.commonMistakes.length === 0) {
 logger.warn('Validation failed: invalid commonMistakes array');
    return false;
  }
  
  const validMistakes = data.commonMistakes.every((mistake: any) => 
    typeof mistake === 'string' && mistake.length > 0 && mistake.length < 150
  );
  
  if (!validMistakes) {
 logger.warn('Validation failed: invalid mistake strings');
    return false;
  }
  
  // Check breathing pattern
  if (typeof data.breathingPattern !== 'string' || data.breathingPattern.length === 0) {
 logger.warn('Validation failed: invalid breathingPattern');
    return false;
  }
  
  return true;
}

/**
 * Validate progression recommendation response
 */
export function validateProgression(data: any): data is ProgressionRecommendation {
  if (!data || typeof data !== 'object') {
 logger.warn('Validation failed: data is not an object');
    return false;
  }
  
  const validRecommendations = ['increase_weight', 'increase_reps', 'maintain', 'deload'];
  
  // Check recommendation type
  if (!validRecommendations.includes(data.recommendation)) {
 logger.warn('Validation failed: invalid recommendation type');
    return false;
  }
  
  // Check suggested weight
  if (typeof data.suggestedWeight !== 'number' || data.suggestedWeight <= 0) {
 logger.warn('Validation failed: invalid suggestedWeight');
    return false;
  }
  
  // Check reason
  if (typeof data.reason !== 'string' || data.reason.length === 0) {
 logger.warn('Validation failed: invalid reason');
    return false;
  }
  
  // Check confidence if present
  if (data.confidence && !['high', 'medium', 'low'].includes(data.confidence)) {
 logger.warn('Validation warning: invalid confidence value');
  }
  
  return true;
}

// ==========================================
// GENERIC VALIDATION WRAPPER
// ==========================================

/**
 * Validate data and fallback to default if invalid
 */
export function validateAndFallback<T>(
  data: any,
  validator: (d: any) => d is T,
  fallback: T,
  context?: string
): T {
  const contextStr = context ? `[${context}] ` : '';
  
  if (validator(data)) {
 logger.log(`${contextStr}Validation passed`);
    return data;
  }
  
 logger.warn(`${contextStr}AI response validation failed, using fallback`);
  return fallback;
}

/**
 * Sanitize text fields (remove excessive whitespace, trim length)
 */
export function sanitizeText(text: string, maxLength: number = 500): string {
  return text
    .replace(/\s+/g, ' ')  // Normalize whitespace
    .trim()
    .substring(0, maxLength);
}

/**
 * Sanitize array of strings
 */
export function sanitizeStringArray(arr: string[], maxLength: number = 200): string[] {
  return arr
    .filter(s => typeof s === 'string' && s.length > 0)
    .map(s => sanitizeText(s, maxLength));
}

/**
 * Normalize and validate confidence level
 */
export function normalizeConfidence(confidence: any): 'high' | 'medium' | 'low' {
  if (['high', 'medium', 'low'].includes(confidence)) {
    return confidence;
  }
  
  // Try to infer from numeric values
  if (typeof confidence === 'number') {
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.5) return 'medium';
    return 'low';
  }
  
  return 'medium';  // Default
}

// ==========================================
// RESPONSE SPECIFICITY VALIDATION
// ==========================================

/**
 * Check if AI response is specific enough (not generic)
 * Ensures responses reference actual user data like exercises, weights, dates
 */
export const checkResponseSpecificity = (
  response: string,
  context: UserContext
): SpecificityCheck => {
  const issues: string[] = [];
  let score = 0;
  
  // Check for specific numbers (e.g., "185×8", "225 lbs")
  const weightPattern = /\d+\s*(lbs?|kg|pounds?|kilos?)/gi;
  const hasSpecificWeight = weightPattern.test(response);
  
  const repsPattern = /\d+\s*(|x|reps?|sets?)/gi;
  const hasSpecificReps = repsPattern.test(response);
  
  if (hasSpecificWeight) {
    score += 30;
  } else if (context.hasPRs || (context.recentWeights && context.recentWeights.length > 0)) {
    issues.push('Missing specific weights (user has PR/weight data)');
  }
  
  if (hasSpecificReps) {
    score += 20;
  }
  
  // Check if response mentions user's actual exercises
  const mentionedExercises = context.recentExercises.filter(ex => {
    const pattern = new RegExp(ex.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    return pattern.test(response);
  });
  
  if (mentionedExercises.length > 0) {
    score += 30;
  } else if (context.hasWorkoutHistory && context.recentExercises.length > 0) {
    issues.push("Doesn't reference user's actual exercises");
  }
  
  // Check for temporal references ("last week", "3 weeks ago")
  const timePattern = /(last|previous|ago|yesterday|this week|past|recent)/i;
  const hasTimeRef = timePattern.test(response);
  
  if (hasTimeRef) {
    score += 20;
  }
  
  // Additional checks for quality
  
  // Check for specific workout names if user has history
  if (context.lastWorkoutDate) {
    const datePattern = /\b\d{1,2}[/-]\d{1,2}|\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i;
    if (datePattern.test(response)) {
      score += 10;
    }
  }
  
  // Penalize if response is too generic (common phrases)
  const genericPhrases = [
    'in general',
    'typically',
    'usually',
    'most people',
    'generally speaking',
    'on average'
  ];
  
  const genericCount = genericPhrases.filter(phrase => 
    response.toLowerCase().includes(phrase)
  ).length;
  
  if (genericCount > 2) {
    score -= 15;
    issues.push('Response contains too many generic phrases');
  }
  
  return {
    isSpecific: score >= 50,
    score,
    issues,
    details: {
      hasSpecificWeight,
      hasSpecificReps,
      mentionedExercises,
      hasTimeReference: hasTimeRef,
    },
  };
};

/**
 * Helper: Build UserContext from workout data
 */
export const buildUserContextFromData = (data: {
  recentWorkouts?: any[];
  personalRecords?: any[];
  workoutCount?: number;
}): UserContext => {
  const recentExercises: string[] = [];
  const recentWeights: Array<{ exercise: string; weight: number; reps: number }> = [];
  
  // Extract recent exercises
  if (data.recentWorkouts && data.recentWorkouts.length > 0) {
    for (const workout of data.recentWorkouts.slice(0, 3)) {
      for (const we of workout.workout_exercises || []) {
        const exerciseName = we.exercises?.name;
        if (exerciseName && !recentExercises.includes(exerciseName)) {
          recentExercises.push(exerciseName);
        }
        
        // Extract weights
        const sets = we.workout_sets || [];
        const bestSet = sets.reduce((best: any, set: any) => {
          const volume = (set.weight || 0) * (set.reps || 0);
          const bestVolume = (best.weight || 0) * (best.reps || 0);
          return volume > bestVolume ? set : best;
        }, {});
        
        if (bestSet.weight && bestSet.reps && exerciseName) {
          recentWeights.push({
            exercise: exerciseName,
            weight: bestSet.weight,
            reps: bestSet.reps,
          });
        }
      }
    }
  }
  
  return {
    hasPRs: (data.personalRecords?.length || 0) > 0,
    hasWorkoutHistory: (data.recentWorkouts?.length || 0) > 0,
    recentExercises,
    recentWeights,
    workoutCount: data.workoutCount,
    lastWorkoutDate: data.recentWorkouts?.[0]?.created_at,
  };
};

/**
 * Validate response quality and provide feedback
 */
export const validateResponseQuality = (
  response: string,
  context: UserContext,
  minScore: number = 50
): { 
  isValid: boolean; 
  specificity: SpecificityCheck; 
  feedback: string 
} => {
  const specificity = checkResponseSpecificity(response, context);
  
  let feedback = '';
  
  if (!specificity.isSpecific) {
    feedback = `Response too generic (score: ${specificity.score}/${minScore}). `;
    
    if (specificity.issues.length > 0) {
      feedback += 'Issues: ' + specificity.issues.join(', ');
    }
    
    // Provide specific guidance
    if (!specificity.details.hasSpecificWeight && context.recentWeights?.length) {
      feedback += ' | Try mentioning specific weights like "' + 
        context.recentWeights[0].weight + ' lbs"';
    }
    
    if (specificity.details.mentionedExercises.length === 0 && context.recentExercises.length > 0) {
      feedback += ' | Try mentioning exercises like "' + 
        context.recentExercises.slice(0, 2).join('" or "') + '"';
    }
  } else {
    feedback = `Response is specific enough (score: ${specificity.score})`;
  }
  
  return {
    isValid: specificity.isSpecific,
    specificity,
    feedback,
  };
};
