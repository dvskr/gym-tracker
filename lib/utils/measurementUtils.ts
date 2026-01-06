/**
 * Get dynamic column headers based on measurement type
 */
export const getColumnHeaders = (measurementType: string): string[] => {
  switch (measurementType) {
    case 'reps_weight':
      return ['PREVIOUS', 'LBS', 'REPS'];
    case 'time':
      return ['PREVIOUS', 'SEC'];
    case 'time_distance':
      return ['PREVIOUS', 'SEC', 'KM'];
    case 'time_weight':
      return ['PREVIOUS', 'SEC', 'LBS'];
    case 'reps_only':
      return ['PREVIOUS', 'REPS'];
    case 'assisted':
      return ['PREVIOUS', 'REPS', 'ASSIST'];
    default:
      return ['PREVIOUS', 'LBS', 'REPS'];
  }
};

/**
 * Format a set for display based on measurement type
 */

interface SetData {
  weight?: number | null;
  reps?: number | null;
  duration_seconds?: number | null;
  distance_meters?: number | null;
  assistance_weight?: number | null;
}

export const formatSetDisplay = (
  set: SetData,
  measurementType: string
): string => {
  switch (measurementType) {
    case 'reps_weight':
      return set.weight && set.reps 
        ? `${set.weight} lbs  ${set.reps} reps`
        : '—';
    
    case 'time':
      return set.duration_seconds 
        ? `${set.duration_seconds}s`
        : '—';
    
    case 'time_distance':
      const time = set.duration_seconds || 0;
      const dist = set.distance_meters || 0;
      return time || dist
        ? `${time}s / ${(dist / 1000).toFixed(2)}km`
        : '—';
    
    case 'time_weight':
      return set.duration_seconds && set.weight
        ? `${set.duration_seconds}s  ${set.weight} lbs`
        : '—';
    
    case 'reps_only':
      return set.reps ? `${set.reps} reps` : '—';
    
    case 'assisted':
      return set.reps && set.assistance_weight
        ? `${set.reps} reps @ -${set.assistance_weight} lbs`
        : '—';
    
    default:
      return '—';
  }
};

/**
 * Validate a set based on measurement type
 */
export const validateSet = (
  set: SetData,
  measurementType: string
): boolean => {
  switch (measurementType) {
    case 'reps_weight':
      return !!(set.reps && set.weight);
    
    case 'time':
      return !!set.duration_seconds;
    
    case 'time_distance':
      return !!(set.duration_seconds || set.distance_meters);
    
    case 'time_weight':
      return !!(set.duration_seconds && set.weight);
    
    case 'reps_only':
      return !!set.reps;
    
    case 'assisted':
      return !!(set.reps && set.assistance_weight);
    
    default:
      return false;
  }
};

/**
 * Get empty set template based on measurement type
 */
export const getEmptySet = (measurementType: string) => {
  const base = {
    id: crypto.randomUUID(),
    setNumber: 0,
    weightUnit: 'lbs' as const,
    setType: 'normal' as const,
    isCompleted: false,
    completedAt: null,
    isPR: false,
    prType: null,
  };

  switch (measurementType) {
    case 'reps_weight':
      return { ...base, reps: null, weight: null };
    
    case 'time':
      return { ...base, duration_seconds: null };
    
    case 'time_distance':
      return { ...base, duration_seconds: null, distance_meters: null };
    
    case 'time_weight':
      return { ...base, duration_seconds: null, weight: null };
    
    case 'reps_only':
      return { ...base, reps: null };
    
    case 'assisted':
      return { ...base, reps: null, assistance_weight: null };
    
    default:
      return { ...base, reps: null, weight: null };
  }
};


