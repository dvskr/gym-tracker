/**
 * Exercise Measurement Configuration Utility
 * 
 * Intelligently determines the appropriate measurement type and tracking fields
 * for different exercises based on their category, name, and equipment.
 */

import type { 
  Exercise, 
  ExerciseMeasurementConfig, 
  MeasurementType,
  FormattedMeasurement 
} from '@/types/exercise-measurements';

/**
 * Get measurement configuration for an exercise
 * Analyzes exercise properties to determine optimal tracking method
 */
export const getMeasurementConfig = (
  exercise: Exercise
): ExerciseMeasurementConfig => {
  // Use explicit measurement type if set
  if (exercise.measurement_type) {
    return getConfigByType(exercise.measurement_type);
  }

  // Otherwise, intelligently determine based on exercise properties
  const category = exercise.category.toLowerCase();
  const name = exercise.name.toLowerCase();
  const equipment = exercise.equipment.toLowerCase();

  // Cardio exercises - track time and distance
  if (isCardioExercise(category, name)) {
    return {
      type: 'distance',
      tracks: { time: true, distance: true },
      defaultUnit: 'minutes',
      label: 'Cardio',
      placeholder: {
        time: 'Duration (min)',
        distance: 'Distance (km)'
      }
    };
  }

  // Assisted exercises - track reps with assistance weight
  if (name.includes('assisted')) {
    return {
      type: 'assisted',
      tracks: { reps: true, assistance: true },
      label: 'Assisted',
      placeholder: {
        reps: 'Reps',
        assistance: 'Assistance (kg)'
      }
    };
  }

  // Timed holds - only track duration
  if (isTimedHold(name)) {
    return {
      type: 'time',
      tracks: { time: true },
      defaultUnit: 'seconds',
      label: 'Timed Hold',
      placeholder: {
        time: 'Duration (sec)'
      }
    };
  }

  // Weighted carries/walks - track time and weight
  if (isWeightedCarry(name)) {
    return {
      type: 'time_weight',
      tracks: { time: true, weight: true },
      defaultUnit: 'seconds',
      label: 'Weighted Carry',
      placeholder: {
        time: 'Duration (sec)',
        weight: 'Weight (kg)'
      }
    };
  }

  // Bodyweight exercises - only reps
  if (isBodyweightOnly(equipment, name)) {
    return {
      type: 'reps_only',
      tracks: { reps: true },
      label: 'Bodyweight',
      placeholder: {
        reps: 'Reps'
      }
    };
  }

  // Default: traditional strength training (reps + weight)
  return {
    type: 'reps_weight',
    tracks: { reps: true, weight: true },
    label: 'Strength',
    placeholder: {
      reps: 'Reps',
      weight: 'Weight (kg)'
    }
  };
};

/**
 * Get configuration by explicit measurement type
 */
function getConfigByType(type: MeasurementType): ExerciseMeasurementConfig {
  const configs: Record<MeasurementType, ExerciseMeasurementConfig> = {
    reps_weight: {
      type: 'reps_weight',
      tracks: { reps: true, weight: true },
      label: 'Strength',
      placeholder: { reps: 'Reps', weight: 'Weight (kg)' }
    },
    time: {
      type: 'time',
      tracks: { time: true },
      defaultUnit: 'seconds',
      label: 'Timed',
      placeholder: { time: 'Duration (sec)' }
    },
    time_weight: {
      type: 'time_weight',
      tracks: { time: true, weight: true },
      defaultUnit: 'seconds',
      label: 'Weighted Time',
      placeholder: { time: 'Duration (sec)', weight: 'Weight (kg)' }
    },
    distance: {
      type: 'distance',
      tracks: { time: true, distance: true },
      defaultUnit: 'minutes',
      label: 'Cardio',
      placeholder: { time: 'Duration (min)', distance: 'Distance (km)' }
    },
    reps_only: {
      type: 'reps_only',
      tracks: { reps: true },
      label: 'Bodyweight',
      placeholder: { reps: 'Reps' }
    },
    assisted: {
      type: 'assisted',
      tracks: { reps: true, assistance: true },
      label: 'Assisted',
      placeholder: { reps: 'Reps', assistance: 'Assistance (kg)' }
    },
    amrap: {
      type: 'amrap',
      tracks: { reps: true, time: true },
      defaultUnit: 'seconds',
      label: 'AMRAP',
      placeholder: { reps: 'Reps', time: 'Time Limit (sec)' }
    }
  };

  return configs[type];
}

/**
 * Helper: Check if exercise is cardio
 */
function isCardioExercise(category: string, name: string): boolean {
  return (
    category === 'cardio' ||
    name.includes('running') ||
    name.includes('cycling') ||
    name.includes('rowing') ||
    name.includes('swimming') ||
    name.includes('walking') ||
    name.includes('hiking') ||
    name.includes('elliptical') ||
    name.includes('treadmill') ||
    name.includes('bike')
  );
}

/**
 * Helper: Check if exercise is a timed hold
 */
function isTimedHold(name: string): boolean {
  return (
    name.includes('plank') ||
    name.includes('hold') ||
    name.includes('hang') ||
    name.includes('static') ||
    name.includes('isometric')
  );
}

/**
 * Helper: Check if exercise is a weighted carry
 */
function isWeightedCarry(name: string): boolean {
  return (
    name.includes('carry') ||
    name.includes('farmer') ||
    name.includes('walk') && name.includes('weight')
  );
}

/**
 * Helper: Check if exercise is bodyweight only
 */
function isBodyweightOnly(equipment: string, name: string): boolean {
  if (equipment !== 'body weight' && equipment !== 'bodyweight') {
    return false;
  }

  // Bodyweight exercises that typically don't use added weight
  const bodyweightExercises = [
    'push up', 'push-up', 'pushup',
    'pull up', 'pull-up', 'pullup',
    'chin up', 'chin-up', 'chinup',
    'sit up', 'sit-up', 'situp',
    'crunch',
    'squat', // bodyweight squat
    'lunge', // bodyweight lunge
    'dip',
    'burpee',
    'jumping jack',
    'mountain climber',
    'leg raise'
  ];

  return bodyweightExercises.some(ex => name.includes(ex));
}

/**
 * Format a set's measurements for display
 */
export const formatSetMeasurements = (
  set: any,
  config: ExerciseMeasurementConfig
): FormattedMeasurement[] => {
  const measurements: FormattedMeasurement[] = [];

  if (config.tracks.reps && set.reps != null) {
    measurements.push({
      value: set.reps,
      unit: 'reps',
      label: 'Reps'
    });
  }

  if (config.tracks.weight && set.weight != null) {
    measurements.push({
      value: set.weight,
      unit: 'kg',
      label: 'Weight'
    });
  }

  if (config.tracks.time && set.duration_seconds != null) {
    const minutes = Math.floor(set.duration_seconds / 60);
    const seconds = set.duration_seconds % 60;
    const displayValue = minutes > 0 
      ? `${minutes}:${seconds.toString().padStart(2, '0')}`
      : `${seconds}`;
    const displayUnit = minutes > 0 ? 'min' : 'sec';
    
    measurements.push({
      value: displayValue,
      unit: displayUnit,
      label: 'Duration'
    });
  }

  if (config.tracks.distance && set.distance_meters != null) {
    const km = (set.distance_meters / 1000).toFixed(2);
    measurements.push({
      value: km,
      unit: 'km',
      label: 'Distance'
    });
  }

  if (config.tracks.assistance && set.assistance_weight != null) {
    measurements.push({
      value: Math.abs(set.assistance_weight),
      unit: 'kg',
      label: 'Assistance'
    });
  }

  return measurements;
};

/**
 * Calculate volume for different measurement types
 */
export const calculateSetVolume = (
  set: any,
  config: ExerciseMeasurementConfig
): number => {
  switch (config.type) {
    case 'reps_weight':
      return (set.reps || 0) * (set.weight || 0);
    
    case 'time_weight':
      return (set.duration_seconds || 0) * (set.weight || 0);
    
    case 'reps_only':
      return set.reps || 0;
    
    case 'time':
      return set.duration_seconds || 0;
    
    case 'distance':
      return set.distance_meters || 0;
    
    case 'assisted':
      // For assisted exercises, higher assistance = easier = lower volume
      // Volume = reps * (bodyweight - assistance)
      // Simplified: just use reps as base volume
      return set.reps || 0;
    
    case 'amrap':
      return set.reps || 0;
    
    default:
      return 0;
  }
};

/**
 * Validate set data based on measurement configuration
 */
export const validateSetData = (
  set: any,
  config: ExerciseMeasurementConfig
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (config.tracks.reps && (set.reps == null || set.reps <= 0)) {
    errors.push('Reps must be greater than 0');
  }

  if (config.tracks.weight && (set.weight == null || set.weight < 0)) {
    errors.push('Weight must be 0 or greater');
  }

  if (config.tracks.time && (set.duration_seconds == null || set.duration_seconds <= 0)) {
    errors.push('Duration must be greater than 0');
  }

  if (config.tracks.distance && (set.distance_meters == null || set.distance_meters <= 0)) {
    errors.push('Distance must be greater than 0');
  }

  if (config.tracks.assistance && set.assistance_weight == null) {
    errors.push('Assistance weight is required');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

