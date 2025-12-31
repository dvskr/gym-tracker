// lib/constants/measurementTypes.ts

export type MeasurementType = 
  | 'weight_reps'    // Weight and repetitions (most strength exercises)
  | 'reps_only'      // Just repetitions (bodyweight exercises)
  | 'time'           // Duration (planks, cardio, stretches)
  | 'distance'       // Distance covered (running, walking, rowing)
  | 'weight_time'    // Weight and time (farmers walk, loaded carries)
  | 'calories';      // Calorie based (cardio machines)

export const MEASUREMENT_TYPE_CONFIG: Record<MeasurementType, {
  label: string;
  fields: string[];
  units: Record<string, string[]>;
}> = {
  weight_reps: {
    label: 'Weight & Reps',
    fields: ['weight', 'reps'],
    units: { weight: ['kg', 'lbs'] },
  },
  reps_only: {
    label: 'Reps Only',
    fields: ['reps'],
    units: {},
  },
  time: {
    label: 'Time',
    fields: ['duration'],
    units: { duration: ['seconds', 'minutes'] },
  },
  distance: {
    label: 'Distance',
    fields: ['distance', 'duration'],
    units: { distance: ['km', 'miles', 'meters'] },
  },
  weight_time: {
    label: 'Weight & Time',
    fields: ['weight', 'duration'],
    units: { weight: ['kg', 'lbs'], duration: ['seconds', 'minutes'] },
  },
  calories: {
    label: 'Calories',
    fields: ['calories', 'duration'],
    units: { duration: ['minutes'] },
  },
};

