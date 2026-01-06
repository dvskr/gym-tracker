/**
 * Shared API and data types for type-safe development
 */

import { Database } from '@/types/database';

// ============================================
// Database Table Row Types (from Supabase)
// ============================================

export type Workout = Database['public']['Tables']['workouts']['Row'];
export type Exercise = Database['public']['Tables']['exercises']['Row'];
export type WorkoutExercise = Database['public']['Tables']['workout_exercises']['Row'];
export type WorkoutSet = Database['public']['Tables']['workout_sets']['Row'];
export type Template = Database['public']['Tables']['workout_templates']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type WeightEntry = Database['public']['Tables']['weight_entries']['Row'];
export type BodyMeasurement = Database['public']['Tables']['body_measurements']['Row'];

// ============================================
// API Response Wrappers
// ============================================

export interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
}

// ============================================
// Complex Nested Types
// ============================================

export interface WorkoutWithExercises extends Workout {
  workout_exercises: Array<WorkoutExercise & {
    exercise: Exercise;
    workout_sets: WorkoutSet[];
  }>;
}

export interface TemplateWithExercises extends Template {
  template_exercises: Array<{
    id: string;
    exercise_id: string;
    order_index: number;
    sets: number;
    reps: string;
    rest_seconds: number;
    notes?: string;
    exercise: Exercise;
  }>;
}

// ============================================
// Sync & Conflict Types
// ============================================

export interface SyncableRecord {
  id: string;
  updated_at: string;
  created_at: string;
  user_id: string;
  _synced?: boolean;
  _local_updated_at?: string;
  [key: string]: unknown;
}

export interface ConflictData<T extends SyncableRecord = SyncableRecord> {
  localData: T;
  serverData: T;
  localUpdatedAt: Date;
  serverUpdatedAt: Date;
  resolution?: 'local' | 'server' | 'merged';
  mergedData?: T;
}

// ============================================
// AI Response Types
// ============================================

export interface AIWorkoutSuggestion {
  name: string;
  exercises: Array<{
    name: string;
    sets: number;
    reps: string;
    restSeconds: number;
    notes?: string;
  }>;
  estimatedDuration: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  focusAreas: string[];
  reasoning?: string;
}

export interface AIFormTip {
  exerciseName: string;
  tips: string[];
  commonMistakes: string[];
  cues: string[];
  safetyNotes?: string[];
}

export interface AICoachResponse {
  message: string;
  suggestions?: string[];
  warnings?: string[];
  motivational?: boolean;
}

export interface AIPlateauAnalysis {
  isPlateaued: boolean;
  exerciseName: string;
  duration: string;
  lastPRDate?: string;
  currentWeight: number;
  recommendations: string[];
  strategies: string[];
}

export interface AIRecoveryRecommendation {
  recommendation: 'rest' | 'light' | 'moderate' | 'intense';
  reason: string;
  sleepScore: number;
  muscleReadiness: number;
  suggestions: string[];
}

// ============================================
// Health Data Types
// ============================================

export interface HealthConnectRecord {
  metadata?: {
    id: string;
    dataOrigin: {
      packageName: string;
    };
  };
}

export interface HealthConnectHeartRate extends HealthConnectRecord {
  time: string;
  beatsPerMinute: number;
  samples?: Array<{
    time: string;
    beatsPerMinute: number;
  }>;
}

export interface HealthConnectWeight extends HealthConnectRecord {
  time: string;
  weight: {
    value: number;
    unit: string;
  };
}

export interface HealthConnectSteps extends HealthConnectRecord {
  startTime: string;
  endTime: string;
  count: number;
}

export interface HealthConnectSleep extends HealthConnectRecord {
  startTime: string;
  endTime: string;
  stages?: Array<{
    startTime: string;
    endTime: string;
    stage: number;
  }>;
}

// ============================================
// Type Guards
// ============================================

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

export function isArray<T>(value: unknown): value is T[] {
  return Array.isArray(value);
}

export function hasProperty<K extends string>(
  obj: unknown,
  key: K
): obj is Record<K, unknown> {
  return isObject(obj) && key in obj;
}

export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${value}`);
}

