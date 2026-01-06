/**
 * Exercise Measurement Utilities
 * 
 * Provides helper functions and configurations for different exercise measurement types
 */

export type MeasurementType = 
  | 'reps_weight'    // Standard: Bench Press, Squat - tracks weight + reps
  | 'time'           // Timed holds: Plank, Wall Sit - tracks duration only
  | 'time_distance'  // Cardio: Running, Cycling - tracks time + distance
  | 'time_weight'    // Weighted carries: Farmer's Walk - tracks time + weight
  | 'reps_only'      // Bodyweight: Push-ups, Pull-ups - tracks reps only
  | 'assisted';      // Assisted exercises: Assisted Pull-ups - tracks reps + assistance

export interface MeasurementConfig {
  type: MeasurementType;
  fields: string[];
  displayFormat: (set: SetData) => string;
  shortFormat: (set: SetData) => string;
  icon: string;
}

interface SetData {
  weight?: number | null;
  reps?: number | null;
  duration_seconds?: number | null;
  distance_meters?: number | null;
  assistance_weight?: number | null;
  [key: string]: unknown;
}

/**
 * Get measurement configuration for a specific type
 */
export const getMeasurementConfig = (type: MeasurementType): MeasurementConfig => {
  const configs: Record<MeasurementType, MeasurementConfig> = {
    reps_weight: {
      type: 'reps_weight',
      fields: ['weight', 'reps'],
      displayFormat: (set) => `${set.weight || 0} lbs  ${set.reps || 0} reps`,
      shortFormat: (set) => `${set.weight || 0}  ${set.reps || 0}`,
      icon: '',
    },
    time: {
      type: 'time',
      fields: ['duration_seconds'],
      displayFormat: (set) => {
        const secs = set.duration_seconds || 0;
        const mins = Math.floor(secs / 60);
        const remainingSecs = secs % 60;
        return mins > 0 
          ? `${mins}:${remainingSecs.toString().padStart(2, '0')} hold`
          : `${secs} seconds`;
      },
      shortFormat: (set) => {
        const secs = set.duration_seconds || 0;
        const mins = Math.floor(secs / 60);
        const remainingSecs = secs % 60;
        return mins > 0 ? `${mins}:${remainingSecs.toString().padStart(2, '0')}` : `${secs}s`;
      },
      icon: '',
    },
    time_distance: {
      type: 'time_distance',
      fields: ['duration_seconds', 'distance_meters'],
      displayFormat: (set) => {
        const secs = set.duration_seconds || 0;
        const mins = Math.floor(secs / 60);
        const remainingSecs = secs % 60;
        const miles = ((set.distance_meters || 0) / 1609.34).toFixed(2);
        const timeStr = mins > 0 ? `${mins}:${remainingSecs.toString().padStart(2, '0')}` : `${secs}s`;
        return `${miles} mi in ${timeStr}`;
      },
      shortFormat: (set) => {
        const miles = ((set.distance_meters || 0) / 1609.34).toFixed(2);
        return `${miles} mi`;
      },
      icon: '',
    },
    time_weight: {
      type: 'time_weight',
      fields: ['weight', 'duration_seconds'],
      displayFormat: (set) => {
        const secs = set.duration_seconds || 0;
        const mins = Math.floor(secs / 60);
        const remainingSecs = secs % 60;
        const timeStr = mins > 0 ? `${mins}:${remainingSecs.toString().padStart(2, '0')}` : `${secs}s`;
        return `${set.weight || 0} lbs for ${timeStr}`;
      },
      shortFormat: (set) => `${set.weight || 0} lbs  ${set.duration_seconds || 0}s`,
      icon: '=',
    },
    reps_only: {
      type: 'reps_only',
      fields: ['reps'],
      displayFormat: (set) => `${set.reps || 0} reps`,
      shortFormat: (set) => `${set.reps || 0}`,
      icon: '=',
    },
    assisted: {
      type: 'assisted',
      fields: ['reps', 'assistance_weight'],
      displayFormat: (set) => `${set.reps || 0} reps @ -${set.assistance_weight || 0} lbs assist`,
      shortFormat: (set) => `${set.reps || 0} (-${set.assistance_weight || 0})`,
      icon: '>',
    },
  };

  return configs[type] || configs.reps_weight;
};

/**
 * Format a set for display based on measurement type
 */
export const formatSet = (set: SetData, measurementType: MeasurementType): string => {
  const config = getMeasurementConfig(measurementType);
  return config.displayFormat(set);
};

/**
 * Format a set for compact display (e.g., in lists)
 */
export const formatSetShort = (set: SetData, measurementType: MeasurementType): string => {
  const config = getMeasurementConfig(measurementType);
  return config.shortFormat(set);
};

/**
 * Get the icon for a measurement type
 */
export const getMeasurementIcon = (measurementType: MeasurementType): string => {
  const config = getMeasurementConfig(measurementType);
  return config.icon;
};

/**
 * Validate if a set has all required fields for its measurement type
 */
export const validateSet = (set: SetData, measurementType: MeasurementType): boolean => {
  const config = getMeasurementConfig(measurementType);
  
  return config.fields.every(field => {
    const value = set[field];
    return value !== undefined && value !== null && typeof value === 'number' && value > 0;
  });
};

/**
 * Get placeholder values for a new set based on measurement type
 */
export const getEmptySet = (measurementType: MeasurementType): Record<string, unknown> => {
  const emptySet: Record<string, unknown> = {
    reps: undefined,
    weight: undefined,
    duration_seconds: undefined,
    distance_meters: undefined,
    assistance_weight: undefined,
  };

  const config = getMeasurementConfig(measurementType);
  
  // Initialize only the fields needed for this measurement type
  config.fields.forEach(field => {
    emptySet[field] = 0;
  });

  return emptySet;
};

/**
 * Calculate volume for different exercise types
 */
export const calculateVolume = (set: SetData, measurementType: MeasurementType): number => {
  switch (measurementType) {
    case 'reps_weight':
      return (set.weight || 0) * (set.reps || 0);
    
    case 'time':
      return set.duration_seconds || 0;
    
    case 'time_distance':
      return set.distance_meters || 0;
    
    case 'time_weight':
      return (set.weight || 0) * (set.duration_seconds || 0);
    
    case 'reps_only':
      return set.reps || 0;
    
    case 'assisted':
      // For assisted exercises, higher assistance = easier, so subtract from volume
      return (set.reps || 0) * Math.max(0, 100 - (set.assistance_weight || 0));
    
    default:
      return 0;
  }
};

/**
 * Get user-friendly label for measurement type
 */
export const getMeasurementTypeLabel = (type: MeasurementType): string => {
  const labels: Record<MeasurementType, string> = {
    reps_weight: 'Weight & Reps',
    time: 'Timed Hold',
    time_distance: 'Time & Distance',
    time_weight: 'Weighted Carry',
    reps_only: 'Reps Only',
    assisted: 'Assisted',
  };

  return labels[type] || 'Standard';
};

/**
 * Get description for measurement type
 */
export const getMeasurementTypeDescription = (type: MeasurementType): string => {
  const descriptions: Record<MeasurementType, string> = {
    reps_weight: 'Track weight and repetitions',
    time: 'Track duration of hold',
    time_distance: 'Track time and distance covered',
    time_weight: 'Track weight carried for a duration',
    reps_only: 'Track repetitions only (bodyweight)',
    assisted: 'Track reps with assistance weight',
  };

  return descriptions[type] || 'Standard exercise tracking';
};

