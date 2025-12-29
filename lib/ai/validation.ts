/**
 * AI Response Validation
 * Ensures AI responses meet expected structure and quality standards
 */

import { WorkoutSuggestion } from './workoutSuggestions';
import { WorkoutAnalysis } from './workoutAnalysis';

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
// VALIDATION FUNCTIONS
// ==========================================

/**
 * Validate workout suggestion response
 */
export function validateWorkoutSuggestion(data: any): data is WorkoutSuggestion {
  if (!data || typeof data !== 'object') {
    console.warn('Validation failed: data is not an object');
    return false;
  }
  
  // Check required fields
  const hasType = typeof data.type === 'string' || typeof data.workoutType === 'string';
  const hasReason = typeof data.reason === 'string';
  const hasExercises = Array.isArray(data.exercises);
  
  if (!hasType) {
    console.warn('Validation failed: missing workout type');
    return false;
  }
  
  if (!hasReason) {
    console.warn('Validation failed: missing reason');
    return false;
  }
  
  if (!hasExercises) {
    console.warn('Validation failed: exercises is not an array');
    return false;
  }
  
  // Validate exercise count
  if (data.exercises.length < 2 || data.exercises.length > 8) {
    console.warn(`Validation failed: invalid exercise count (${data.exercises.length})`);
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
      console.warn(`Validation failed: exercise ${index} is invalid`, ex);
    }
    
    return isValid;
  });
  
  if (!validExercises) {
    return false;
  }
  
  // Validate confidence if present
  if (data.confidence && !['high', 'medium', 'low'].includes(data.confidence)) {
    console.warn('Validation warning: invalid confidence value, will be normalized');
  }
  
  return true;
}

/**
 * Validate workout analysis response
 */
export function validateWorkoutAnalysis(data: any): data is Partial<WorkoutAnalysis> {
  if (!data || typeof data !== 'object') {
    console.warn('Validation failed: data is not an object');
    return false;
  }
  
  // Check summary
  if (typeof data.summary !== 'string' || data.summary.length === 0) {
    console.warn('Validation failed: invalid summary');
    return false;
  }
  
  if (data.summary.length > 500) {
    console.warn('Validation warning: summary too long, will be truncated');
  }
  
  // Check highlights
  if (!Array.isArray(data.highlights)) {
    console.warn('Validation failed: highlights is not an array');
    return false;
  }
  
  if (data.highlights.length === 0) {
    console.warn('Validation failed: no highlights provided');
    return false;
  }
  
  // Validate highlight strings
  const validHighlights = data.highlights.every((h: any) => 
    typeof h === 'string' && h.length > 0 && h.length < 200
  );
  
  if (!validHighlights) {
    console.warn('Validation failed: invalid highlights');
    return false;
  }
  
  // Check improvements (can be empty array)
  if (!Array.isArray(data.improvements)) {
    console.warn('Validation failed: improvements is not an array');
    return false;
  }
  
  // Validate improvement strings
  const validImprovements = data.improvements.every((i: any) => 
    typeof i === 'string' && i.length > 0 && i.length < 200
  );
  
  if (!validImprovements && data.improvements.length > 0) {
    console.warn('Validation failed: invalid improvements');
    return false;
  }
  
  // Check next workout tip
  if (typeof data.nextWorkoutTip !== 'string' || data.nextWorkoutTip.length === 0) {
    console.warn('Validation failed: invalid nextWorkoutTip');
    return false;
  }
  
  if (data.nextWorkoutTip.length > 200) {
    console.warn('Validation warning: nextWorkoutTip too long, will be truncated');
  }
  
  return true;
}

/**
 * Validate form tips response
 */
export function validateFormTips(data: any): data is FormTips {
  if (!data || typeof data !== 'object') {
    console.warn('Validation failed: data is not an object');
    return false;
  }
  
  // Check setup
  if (typeof data.setup !== 'string' || data.setup.length === 0) {
    console.warn('Validation failed: invalid setup');
    return false;
  }
  
  // Check execution
  if (typeof data.execution !== 'string' || data.execution.length === 0) {
    console.warn('Validation failed: invalid execution');
    return false;
  }
  
  // Check cues
  if (!Array.isArray(data.cues) || data.cues.length < 2) {
    console.warn('Validation failed: invalid cues array');
    return false;
  }
  
  const validCues = data.cues.every((cue: any) => 
    typeof cue === 'string' && cue.length > 0 && cue.length < 100
  );
  
  if (!validCues) {
    console.warn('Validation failed: invalid cue strings');
    return false;
  }
  
  // Check common mistakes
  if (!Array.isArray(data.commonMistakes) || data.commonMistakes.length === 0) {
    console.warn('Validation failed: invalid commonMistakes array');
    return false;
  }
  
  const validMistakes = data.commonMistakes.every((mistake: any) => 
    typeof mistake === 'string' && mistake.length > 0 && mistake.length < 150
  );
  
  if (!validMistakes) {
    console.warn('Validation failed: invalid mistake strings');
    return false;
  }
  
  // Check breathing pattern
  if (typeof data.breathingPattern !== 'string' || data.breathingPattern.length === 0) {
    console.warn('Validation failed: invalid breathingPattern');
    return false;
  }
  
  return true;
}

/**
 * Validate progression recommendation response
 */
export function validateProgression(data: any): data is ProgressionRecommendation {
  if (!data || typeof data !== 'object') {
    console.warn('Validation failed: data is not an object');
    return false;
  }
  
  const validRecommendations = ['increase_weight', 'increase_reps', 'maintain', 'deload'];
  
  // Check recommendation type
  if (!validRecommendations.includes(data.recommendation)) {
    console.warn('Validation failed: invalid recommendation type');
    return false;
  }
  
  // Check suggested weight
  if (typeof data.suggestedWeight !== 'number' || data.suggestedWeight <= 0) {
    console.warn('Validation failed: invalid suggestedWeight');
    return false;
  }
  
  // Check reason
  if (typeof data.reason !== 'string' || data.reason.length === 0) {
    console.warn('Validation failed: invalid reason');
    return false;
  }
  
  // Check confidence if present
  if (data.confidence && !['high', 'medium', 'low'].includes(data.confidence)) {
    console.warn('Validation warning: invalid confidence value');
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
    console.log(`${contextStr}Validation passed`);
    return data;
  }
  
  console.warn(`${contextStr}AI response validation failed, using fallback`);
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

