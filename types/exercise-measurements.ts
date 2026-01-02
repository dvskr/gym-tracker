/**
 * Flexible Measurement System for Exercises
 * 
 * Supports different types of exercise tracking:
 * - Traditional strength training (reps + weight)
 * - Bodyweight exercises (reps only)
 * - Timed exercises (planks, holds)
 * - Cardio (time + distance)
 * - Assisted exercises (reps with negative assistance weight)
 * - AMRAP (As Many Reps As Possible in time limit)
 */

export type MeasurementType = 
  | 'reps_weight'    // Standard: 3 sets × 10 reps × 50kg
  | 'time'           // Plank: 3 sets × 60 seconds
  | 'time_weight'    // Weighted carries: 60 seconds × 20kg
  | 'distance'       // Running: 5km × 25 minutes
  | 'reps_only'      // Push-ups: 3 sets × 20 reps
  | 'assisted'       // Assisted pull-ups: 3 sets × 8 reps × -20kg assistance
  | 'amrap';         // As Many Reps As Possible: time limit

export interface MeasurementTracks {
  reps?: boolean;
  weight?: boolean;
  time?: boolean;
  distance?: boolean;
  assistance?: boolean;
}

export interface ExerciseMeasurementConfig {
  type: MeasurementType;
  tracks: MeasurementTracks;
  defaultUnit?: string;
  label?: string;
  placeholder?: {
    reps?: string;
    weight?: string;
    time?: string;
    distance?: string;
    assistance?: string;
  };
}

export interface ExerciseSet {
  id?: string;
  set_number: number;
  reps?: number;
  weight?: number;
  duration_seconds?: number;
  distance_meters?: number;
  assistance_weight?: number;
  is_completed: boolean;
  notes?: string;
}

export interface Exercise {
  id: string;
  name: string;
  category: string;
  equipment: string;
  primary_muscles?: string[];
  secondary_muscles?: string[];
  measurement_type?: MeasurementType;
  // ... other fields
}

// Helper types for displaying measurements
export interface FormattedMeasurement {
  value: string | number;
  unit: string;
  label: string;
}
