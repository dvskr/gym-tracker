/**
 * Complete mapping of workout types for Apple HealthKit and Health Connect
 */

// Apple HealthKit Workout Activity Types
// Reference: https://developer.apple.com/documentation/healthkit/hkworkoutactivitytype
export const HEALTHKIT_ACTIVITY_TYPES = {
  // Strength & Conditioning
  STRENGTH_TRAINING: 'HKWorkoutActivityTypeTraditionalStrengthTraining',
  FUNCTIONAL_STRENGTH: 'HKWorkoutActivityTypeFunctionalStrengthTraining',
  CORE_TRAINING: 'HKWorkoutActivityTypeCoreTraining',
  FLEXIBILITY: 'HKWorkoutActivityTypeFlexibility',
  CROSS_TRAINING: 'HKWorkoutActivityTypeCrossTrain',

  // Cardio
  CARDIO: 'HKWorkoutActivityTypeCardio',
  RUNNING: 'HKWorkoutActivityTypeRunning',
  CYCLING: 'HKWorkoutActivityTypeCycling',
  WALKING: 'HKWorkoutActivityTypeWalking',
  ELLIPTICAL: 'HKWorkoutActivityTypeElliptical',
  ROWING: 'HKWorkoutActivityTypeRowing',
  STAIR_CLIMBING: 'HKWorkoutActivityTypeStairClimbing',

  // Swimming
  SWIMMING: 'HKWorkoutActivityTypeSwimming',
  WATER_FITNESS: 'HKWorkoutActivityTypeWaterFitness',
  WATER_POLO: 'HKWorkoutActivityTypeWaterPolo',
  WATER_SPORTS: 'HKWorkoutActivityTypeWaterSports',

  // Sports
  BASKETBALL: 'HKWorkoutActivityTypeBasketball',
  SOCCER: 'HKWorkoutActivityTypeSoccer',
  TENNIS: 'HKWorkoutActivityTypeTennis',
  VOLLEYBALL: 'HKWorkoutActivityTypeVolleyball',
  BADMINTON: 'HKWorkoutActivityTypeBadminton',
  BASEBALL: 'HKWorkoutActivityTypeBaseball',
  BOXING: 'HKWorkoutActivityTypeBoxing',
  MARTIAL_ARTS: 'HKWorkoutActivityTypeMartialArts',

  // Mind & Body
  YOGA: 'HKWorkoutActivityTypeYoga',
  PILATES: 'HKWorkoutActivityTypePilates',
  TAI_CHI: 'HKWorkoutActivityTypeTaiChi',
  BARRE: 'HKWorkoutActivityTypeBarre',

  // High Intensity
  HIIT: 'HKWorkoutActivityTypeHighIntensityIntervalTraining',
  MIXED_CARDIO: 'HKWorkoutActivityTypeMixedCardio',

  // Winter Sports
  SKIING: 'HKWorkoutActivityTypeDownhillSkiing',
  CROSS_COUNTRY_SKIING: 'HKWorkoutActivityTypeCrossCountrySkiing',
  SNOWBOARDING: 'HKWorkoutActivityTypeSnowboarding',
  SKATING: 'HKWorkoutActivityTypeSkatingSports',

  // Other
  DANCE: 'HKWorkoutActivityTypeDance',
  CLIMBING: 'HKWorkoutActivityTypeClimbing',
  EQUESTRIAN: 'HKWorkoutActivityTypeEquestrianSports',
  GOLF: 'HKWorkoutActivityTypeGolf',
  HIKING: 'HKWorkoutActivityTypeHiking',
  JUMP_ROPE: 'HKWorkoutActivityTypeJumpRope',
  OTHER: 'HKWorkoutActivityTypeOther',
} as const;

// Health Connect Exercise Session Types (Android)
// Reference: https://developer.android.com/reference/kotlin/androidx/health/connect/client/records/ExerciseSessionRecord
export const HEALTH_CONNECT_ACTIVITY_TYPES = {
  // Strength & Conditioning
  STRENGTH_TRAINING: 13,
  CALISTHENICS: 14,
  WEIGHTLIFTING: 77,

  // Cardio
  RUNNING: 56,
  RUNNING_TREADMILL: 57,
  CYCLING: 8,
  BIKING: 8,
  WALKING: 79,
  ELLIPTICAL: 25,
  ROWING: 54,
  STAIR_CLIMBING: 68,
  STAIR_CLIMBING_MACHINE: 69,

  // Swimming
  SWIMMING_POOL: 71,
  SWIMMING_OPEN_WATER: 72,

  // Sports
  BASKETBALL: 4,
  SOCCER: 15,
  FOOTBALL_AMERICAN: 26,
  TENNIS: 73,
  VOLLEYBALL: 78,
  BADMINTON: 3,
  BASEBALL: 5,
  BOXING: 6,
  MARTIAL_ARTS: 47,

  // Mind & Body
  YOGA: 82,
  PILATES: 55,
  STRETCHING: 70,

  // High Intensity
  HIIT: 45,
  INTERVAL_TRAINING: 45,

  // Winter Sports
  SKIING: 63,
  CROSS_COUNTRY_SKIING: 64,
  SNOWBOARDING: 66,
  ICE_SKATING: 42,

  // Other
  DANCE: 19,
  ROCK_CLIMBING: 53,
  GOLF: 32,
  HIKING: 36,
  JUMP_ROPE: 43,
  OTHER: 0,
} as const;

/**
 * Get workout type for current platform
 */
export function getWorkoutType(
  category: string,
  platform: 'ios' | 'android'
): string | number {
  const normalized = category.toLowerCase().trim();

  if (platform === 'ios') {
    // Map to HealthKit types
    const typeMap: Record<string, string> = {
      chest: HEALTHKIT_ACTIVITY_TYPES.STRENGTH_TRAINING,
      back: HEALTHKIT_ACTIVITY_TYPES.STRENGTH_TRAINING,
      shoulders: HEALTHKIT_ACTIVITY_TYPES.STRENGTH_TRAINING,
      legs: HEALTHKIT_ACTIVITY_TYPES.STRENGTH_TRAINING,
      arms: HEALTHKIT_ACTIVITY_TYPES.STRENGTH_TRAINING,
      core: HEALTHKIT_ACTIVITY_TYPES.CORE_TRAINING,
      abs: HEALTHKIT_ACTIVITY_TYPES.CORE_TRAINING,
      full_body: HEALTHKIT_ACTIVITY_TYPES.STRENGTH_TRAINING,
      cardio: HEALTHKIT_ACTIVITY_TYPES.CARDIO,
      running: HEALTHKIT_ACTIVITY_TYPES.RUNNING,
      cycling: HEALTHKIT_ACTIVITY_TYPES.CYCLING,
      swimming: HEALTHKIT_ACTIVITY_TYPES.SWIMMING,
      walking: HEALTHKIT_ACTIVITY_TYPES.WALKING,
      hiit: HEALTHKIT_ACTIVITY_TYPES.HIIT,
      yoga: HEALTHKIT_ACTIVITY_TYPES.YOGA,
      pilates: HEALTHKIT_ACTIVITY_TYPES.PILATES,
      flexibility: HEALTHKIT_ACTIVITY_TYPES.FLEXIBILITY,
      boxing: HEALTHKIT_ACTIVITY_TYPES.BOXING,
      martial_arts: HEALTHKIT_ACTIVITY_TYPES.MARTIAL_ARTS,
      dance: HEALTHKIT_ACTIVITY_TYPES.DANCE,
      climbing: HEALTHKIT_ACTIVITY_TYPES.CLIMBING,
    };
    return typeMap[normalized] || HEALTHKIT_ACTIVITY_TYPES.STRENGTH_TRAINING;
  } else {
    // Map to Health Connect types
    const typeMap: Record<string, number> = {
      chest: HEALTH_CONNECT_ACTIVITY_TYPES.STRENGTH_TRAINING,
      back: HEALTH_CONNECT_ACTIVITY_TYPES.STRENGTH_TRAINING,
      shoulders: HEALTH_CONNECT_ACTIVITY_TYPES.STRENGTH_TRAINING,
      legs: HEALTH_CONNECT_ACTIVITY_TYPES.STRENGTH_TRAINING,
      arms: HEALTH_CONNECT_ACTIVITY_TYPES.STRENGTH_TRAINING,
      core: HEALTH_CONNECT_ACTIVITY_TYPES.STRENGTH_TRAINING,
      abs: HEALTH_CONNECT_ACTIVITY_TYPES.STRENGTH_TRAINING,
      full_body: HEALTH_CONNECT_ACTIVITY_TYPES.STRENGTH_TRAINING,
      cardio: HEALTH_CONNECT_ACTIVITY_TYPES.RUNNING,
      running: HEALTH_CONNECT_ACTIVITY_TYPES.RUNNING,
      cycling: HEALTH_CONNECT_ACTIVITY_TYPES.CYCLING,
      swimming: HEALTH_CONNECT_ACTIVITY_TYPES.SWIMMING_POOL,
      walking: HEALTH_CONNECT_ACTIVITY_TYPES.WALKING,
      hiit: HEALTH_CONNECT_ACTIVITY_TYPES.HIIT,
      yoga: HEALTH_CONNECT_ACTIVITY_TYPES.YOGA,
      pilates: HEALTH_CONNECT_ACTIVITY_TYPES.PILATES,
      flexibility: HEALTH_CONNECT_ACTIVITY_TYPES.STRETCHING,
      boxing: HEALTH_CONNECT_ACTIVITY_TYPES.BOXING,
      martial_arts: HEALTH_CONNECT_ACTIVITY_TYPES.MARTIAL_ARTS,
      dance: HEALTH_CONNECT_ACTIVITY_TYPES.DANCE,
      climbing: HEALTH_CONNECT_ACTIVITY_TYPES.ROCK_CLIMBING,
    };
    return typeMap[normalized] || HEALTH_CONNECT_ACTIVITY_TYPES.STRENGTH_TRAINING;
  }
}

/**
 * Get friendly name for workout type
 */
export function getWorkoutTypeName(category: string): string {
  const nameMap: Record<string, string> = {
    chest: 'Chest Workout',
    back: 'Back Workout',
    shoulders: 'Shoulder Workout',
    legs: 'Leg Workout',
    arms: 'Arms Workout',
    core: 'Core Training',
    abs: 'Abs Workout',
    full_body: 'Full Body Workout',
    cardio: 'Cardio',
    running: 'Running',
    cycling: 'Cycling',
    swimming: 'Swimming',
    walking: 'Walking',
    hiit: 'HIIT',
    yoga: 'Yoga',
    pilates: 'Pilates',
    flexibility: 'Flexibility',
    boxing: 'Boxing',
    martial_arts: 'Martial Arts',
    dance: 'Dance',
    climbing: 'Climbing',
  };

  return nameMap[category.toLowerCase()] || 'Workout';
}

