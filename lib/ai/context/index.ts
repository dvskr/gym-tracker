/**
 * AI Context Building Module
 * 
 * Exports all context builders for AI features
 */

// User context builders
export {
  buildUserContext,
  buildEquipmentContext,
  buildFitnessProfileContext,
} from './userContext';

// Recovery and injury context builders
export {
  buildRecoveryContext,
  buildInjuryContext,
} from './recoveryContext';

// Workout history context builders
export {
  getRecentWorkouts,
  getPersonalRecords,
  getUserProfile,
  getActiveInjuries,
  getTodayCheckin,
  buildWorkoutHistoryContext,
  buildPRContext,
  getMainLiftHistory,
} from './workoutContext';

