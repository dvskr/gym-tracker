/**
 * AI Service exports
 * Provides AI-powered features for the gym tracker app
 */

// ==========================================
// CORE AI SERVICE (Production)
// ==========================================
export { aiService } from './aiService';
export type { 
  AIMessage, 
  AIResponse, 
  AIOptions, 
  AILimitStatus,
  AIUsageStats 
} from './types';
export { AILimitError } from './types';

// ==========================================
// VALIDATION
// ==========================================
export {
  validateWorkoutSuggestion,
  // validateWorkoutAnalysis removed - dead code
  validateFormTips,
  validateProgression,
  validateAndFallback,
  sanitizeText,
  sanitizeStringArray,
  normalizeConfidence,
  initExerciseValidator,
  validateExerciseName,
  getExerciseByName,
  validateWorkoutSuggestionAdvanced,
  checkResponseSpecificity,
  buildUserContextFromData,
  validateResponseQuality,
} from './validation';

export type {
  FormTips,
  ProgressionRecommendation,
  ValidatedSuggestion,
  UserContext,
  SpecificityCheck,
} from './validation';

// ==========================================
// JSON PARSING UTILITIES
// ==========================================
export {
  cleanAIResponse,
  cleanExerciseName,
  safeJSONParse,
  cleanExerciseArray,
} from './helpers';

// ==========================================
// CONTEXT BUILDERS
// ==========================================
export {
  buildUserContext,
  buildWorkoutContext,
  buildExerciseHistory,
  buildMuscleGroupContext,
  buildWorkoutSplitContext,
  buildProgressContext,
  buildCompleteContext,
  buildCoachContext,
} from './contextBuilder';

export type { 
  UserContext, 
  WorkoutContext,
  CoachContext,
  DataStateFlags,
} from './contextBuilder';

// ==========================================
// AI PROMPTS
// ==========================================
export {
  FITNESS_COACH_SYSTEM_PROMPT,
  WORKOUT_SUGGESTION_PROMPT,
  FORM_TIPS_PROMPT,
  WORKOUT_ANALYSIS_PROMPT,
  PROGRESSIVE_OVERLOAD_PROMPT,
  FORM_CHECK_PROMPT,
  PROGRESSION_PROMPT,
  REST_TIME_PROMPT,
  WORKOUT_CRITIQUE_PROMPT,
  RECOVERY_ADVICE_PROMPT,
  EXERCISE_SUBSTITUTION_PROMPT,
  PLATEAU_BREAKTHROUGH_PROMPT,
  CREATE_WORKOUT_PLAN_PROMPT,
  MOTIVATION_PROMPT,
  NUTRITION_BASICS_PROMPT,
  buildCustomPrompt,
  formatUserQuestion,
} from './prompts';

// ==========================================
// AI-POWERED SERVICES
// ==========================================
export { workoutSuggestionService } from './workoutSuggestions';
export type { WorkoutSuggestion } from './workoutSuggestions';

// NOTE: formTipsService removed - now using database queries via hooks/useFormTips

export { progressiveOverloadService } from './progressiveOverload';
export type { SetRecommendation } from './progressiveOverload';

// NOTE: workoutAnalysisService removed - dead code, never used in UI

export { plateauDetectionService } from './plateauDetection';
export type { PlateauAlert } from './plateauDetection';

export { recoveryService } from './recoveryService';
export type { RecoveryStatus, MuscleRecoveryStatus } from './recoveryService';

// ==========================================
// PREFETCH & CACHING
// ==========================================
export {
  prefetchAIData,
  getCachedData,
  setCacheData,
  invalidateCache,
  invalidateCacheKey,
  isCached,
  getCacheStats,
  clearAllCache,
  CACHE_DURATIONS,
} from './prefetch';

// ==========================================
// HIGH-LEVEL HELPERS
// ==========================================
export {
  getWorkoutSuggestion,
  // getFormTips removed - now using database via hooks/useFormTips
  getProgressionAdvice,
  critiqueWorkout,
  getMotivation,
  askCoach,
  getRestTimeAdvice,
  getExerciseSubstitutes,
  analyzeWorkoutSplit,
  generateWorkoutPlan,
} from './helpers';

// ==========================================
// LEGACY (Deprecated - now using database tracking)
// ==========================================
export { aiUsageTracker } from './usageTracker';
export type { UsageData, UsageStats, UsageCheck } from './usageTracker';

// ==========================================
// ANALYTICS & MONITORING
// ==========================================
export {
  logAIQuality,
  getAIQualityStats,
  buildQualityLog,
  getMonitoringDashboard,
} from './analytics';

export type {
  AIResponseQuality,
  AIQualityStats,
  AIQualityAlert,
} from './analytics';

