/**
 * Platform Router for Health Service
 * 
 * This file conditionally loads the correct platform-specific implementation.
 * 
 * Why this is needed:
 * - healthService.android.ts imports 'react-native-health-connect' (Android-only)
 * - Metro bundler tries to resolve ALL imports at build time
 * - On iOS, the import would fail because the native module doesn't exist
 * - Using require() with Platform.OS check prevents this
 * 
 * Architecture:
 * - iOS: Loads healthService.ios.ts (stub with safe defaults)
 * - Android: Loads healthService.android.ts (full Health Connect integration)
 */

import { Platform } from 'react-native';

// Use require() for conditional loading - this prevents Metro from
// trying to resolve react-native-health-connect on iOS builds
const platformModule = Platform.OS === 'ios'
  ? require('./healthService.ios')
  : require('./healthService.android');

// Re-export the default export (the healthService instance)
export default platformModule.default;

// Re-export the named export
export const healthService = platformModule.healthService || platformModule.default;

// Re-export constants
export const HEALTH_PERMISSIONS = platformModule.HEALTH_PERMISSIONS;
export const WORKOUT_TYPE_MAP = platformModule.WORKOUT_TYPE_MAP;
export const HEALTHKIT_WORKOUT_TYPES = platformModule.HEALTHKIT_WORKOUT_TYPES;

// Export all types (these are safe to import, they're just interfaces)
export type {
  HealthPermissions,
  WorkoutData,
  WeightData,
  BodyMeasurementData,
  HeartRateReading,
  HeartRateStats,
  StepData,
  StepsWeeklySummary,
  SleepData,
  SleepWeeklySummary,
} from './healthService.ios'; // Both files have the same types

