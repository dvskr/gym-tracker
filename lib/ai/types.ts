/**
 * Shared types for AI module
 * Provides proper typing for workout data used across AI services
 */

import { Database } from '@/types/database';

// Database table types
export type DbWorkout = Database['public']['Tables']['workouts']['Row'];
export type DbWorkoutExercise = Database['public']['Tables']['workout_exercises']['Row'];
export type DbWorkoutSet = Database['public']['Tables']['workout_sets']['Row'];
export type DbExercise = Database['public']['Tables']['exercises']['Row'];
export type DbProfile = Database['public']['Tables']['profiles']['Row'];
export type DbPersonalRecord = Database['public']['Tables']['personal_records']['Row'];
export type DbDailyCheckin = Database['public']['Tables']['daily_checkins']['Row'];
export type DbUserInjury = Database['public']['Tables']['user_injuries']['Row'];

// Nested workout data from Supabase joins
export interface WorkoutSetData {
  id: string;
  set_number: number;
  weight: number | null;
  reps: number | null;
  is_completed: boolean | null;
  completed_at: string | null;
  set_type: string | null;
  rpe: number | null;
  weight_unit: string | null;
}

export interface WorkoutExerciseData {
  id: string;
  exercise_id: string;
  order_index: number;
  notes: string | null;
  exercises: DbExercise | null;
  workout_sets: WorkoutSetData[];
}

export interface WorkoutWithExercises extends DbWorkout {
  workout_exercises?: WorkoutExerciseData[];
}

export interface PersonalRecordWithExercise extends DbPersonalRecord {
  exercises?: Pick<DbExercise, 'name'> | null;
}

// Context builder types
export interface RecentWorkoutContext {
  id: string;
  name: string | null;
  created_at: string | null;
  duration_minutes?: number;
  duration_seconds?: number | null;
  total_volume: number | null;
  notes: string | null;
  exercises?: Array<{
    name?: string;
    primary_muscles?: string[];
    secondary_muscles?: string[] | null;
    sets?: Array<{
      weight: number | null;
      reps: number | null;
      is_completed?: boolean | null;
    }>;
  }>;
  workout_exercises?: WorkoutExerciseData[];
}

export interface UserContextData {
  recentWorkouts?: RecentWorkoutContext[];
  personalRecords?: PersonalRecordWithExercise[];
  currentStreak?: number;
  totalWorkouts?: number;
  preferredUnits?: string;
  goals?: string;
  experienceLevel?: string;
}

// Injury context
export interface InjuryContext {
  bodyPart: string;
  type: string | null;
  severity: string | null;
  avoidExercises: string[] | null;
  avoidMovements: string[] | null;
  notes: string | null;
}

// Main lift history
export interface LiftSession {
  date: string;
  weight: number;
  reps: number;
  volume: number;
}

export interface MainLiftData {
  name: string;
  sessions: LiftSession[];
  trend?: 'improving' | 'maintaining' | 'declining' | 'plateau';
  weeksSinceImprovement?: number;
}

// Workout analysis input types
export interface WorkoutForAnalysis {
  id?: string;
  name?: string;
  duration_seconds?: number;
  exercises?: Array<{
    name: string;
    muscle_group?: string;
    sets?: Array<{
      weight?: number;
      reps?: number;
      isCompleted?: boolean;
      completed_at?: string | null;
    }>;
  }>;
}

// Settings store shape (partial)
export interface SettingsSnapshot {
  unitSystem?: string;
  weightUnit?: string;
  theme?: string;
  hapticEnabled?: boolean;
  soundEnabled?: boolean;
  autoStartTimer?: boolean;
  restTimerDefault?: number;
  [key: string]: unknown;
}

