import { logger } from '@/lib/utils/logger';
/**
 * Exercise Validation Examples
 * Demonstrates usage of the fuzzy matching validation system
 */

import { 
  initExerciseValidator, 
  validateExerciseName, 
  getExerciseByName,
  validateWorkoutSuggestionAdvanced,
  type ValidatedSuggestion,
  type WorkoutSuggestion
} from '@/lib/ai/validation';

// ==========================================
// Example 1: Initialize the Validator
// ==========================================

/**
 * Call this once when your app starts (e.g., in App.tsx or _layout.tsx)
 */
export const initializeValidator = async () => {
 logger.log('x Initializing exercise validator...');
  await initExerciseValidator();
 logger.log('S& Exercise validator ready!');
};

// ==========================================
// Example 2: Validate Single Exercise Names
// ==========================================

export const validateSingleExercises = () => {
 logger.log('\nx Testing single exercise validation:');
  
  // Test cases with typos and variations
  const testCases = [
    'bench pres',           // Typo
    'BENCH PRESS',         // Wrong case
    'dumbel row',          // Typo
    'pullup',              // Missing hyphen
    'lateral raise',       // Wrong case
    'xyz123',              // Invalid
  ];
  
  testCases.forEach(name => {
    const validated = validateExerciseName(name);
 logger.log(`"${name}" -> ${validated || 'INVALID'}`);
  });
};

// ==========================================
// Example 3: Get Exercise Equipment
// ==========================================

export const checkExerciseEquipment = () => {
 logger.log('\nx9 Checking exercise equipment:');
  
  const exercises = ['Bench Press', 'Pull-ups', 'Dumbbell Row'];
  
  exercises.forEach(name => {
    const exercise = getExerciseByName(name);
    if (exercise) {
 logger.log(`${exercise.name}: ${exercise.equipment}`);
    }
  });
};

// ==========================================
// Example 4: Validate Full Workout Suggestion
// ==========================================

export const validateWorkoutExample = () => {
 logger.log('\nx Validating workout suggestion:');
  
  // Simulated AI response with typos and invalid exercises
  const aiSuggestion: WorkoutSuggestion = {
    type: 'Push Day',
    reason: 'Your chest and shoulders are well-rested',
    exercises: [
      { name: 'bench pres', sets: 4, reps: '8-10' },      // Typo
      { name: 'Overhead Press', sets: 3, reps: '8-10' },  // Valid
      { name: 'LATERAL RAISE', sets: 3, reps: '12-15' },  // Wrong case
      { name: 'xyz123', sets: 3, reps: '10-12' },         // Invalid
    ],
    confidence: 'high',
  };
  
 logger.log('Original suggestion:', JSON.stringify(aiSuggestion, null, 2));
  
  // Validate without equipment/injury restrictions
  const validated = validateWorkoutSuggestionAdvanced(
    aiSuggestion,
    [],  // No equipment restrictions
    []   // No injury restrictions
  );
  
 logger.log('\nValidated suggestion:', JSON.stringify(validated, null, 2));
 logger.log(`\nWas filtered: ${validated.wasFiltered}`);
 logger.log(`Original exercises: ${aiSuggestion.exercises.length}`);
 logger.log(`Valid exercises: ${validated.exercises.length}`);
};

// ==========================================
// Example 5: Filter by Equipment
// ==========================================

export const validateWithEquipment = () => {
 logger.log('\nx} Validating with equipment restrictions:');
  
  const aiSuggestion: WorkoutSuggestion = {
    type: 'Upper Body',
    reason: 'Time to train upper body',
    exercises: [
      { name: 'Bench Press', sets: 4, reps: '8-10' },        // Requires barbell
      { name: 'Dumbbell Row', sets: 3, reps: '10-12' },      // Requires dumbbell
      { name: 'Pull-ups', sets: 3, reps: 'AMRAP' },          // Requires pull-up bar
      { name: 'Cable Crossover', sets: 3, reps: '12-15' },   // Requires cable machine
    ],
    confidence: 'high',
  };
  
  // User only has dumbbells
  const userEquipment = ['dumbbell'];
  
  const validated = validateWorkoutSuggestionAdvanced(
    aiSuggestion,
    userEquipment,
    []
  );
  
 logger.log('User equipment:', userEquipment);
 logger.log('Exercises after filtering:');
  validated.exercises.forEach(ex => {
 logger.log(` - ${ex.name} (${ex.equipment})`);
  });
};

// ==========================================
// Example 6: Filter by Injury Restrictions
// ==========================================

export const validateWithInjuries = () => {
 logger.log('\nx Validating with injury restrictions:');
  
  const aiSuggestion: WorkoutSuggestion = {
    type: 'Upper Body',
    reason: 'Time to train upper body',
    exercises: [
      { name: 'Bench Press', sets: 4, reps: '8-10' },
      { name: 'Overhead Press', sets: 3, reps: '8-10' },    // Has "shoulder"
      { name: 'Lateral Raises', sets: 3, reps: '12-15' },   // Has "shoulder"
      { name: 'Dumbbell Row', sets: 3, reps: '10-12' },
    ],
    confidence: 'high',
  };
  
  // User has shoulder injury - avoid exercises with "shoulder" in name
  const injuries = ['shoulder'];
  
  const validated = validateWorkoutSuggestionAdvanced(
    aiSuggestion,
    [],
    injuries
  );
  
 logger.log('Injury restrictions:', injuries);
 logger.log('Safe exercises:');
  validated.exercises.forEach(ex => {
 logger.log(` - ${ex.name}`);
  });
};

// ==========================================
// Example 7: Complete Integration Example
// ==========================================

export const completeExample = async () => {
 logger.log('\nxa Complete validation workflow:');
  
  // 1. Initialize (do this once at app start)
  await initializeValidator();
  
  // 2. Get AI suggestion (simulated)
  const aiSuggestion: WorkoutSuggestion = {
    type: 'Push Day',
    reason: 'Well-rested chest and shoulders',
    exercises: [
      { name: 'bench pres', sets: 4, reps: '8-10' },        // Typo
      { name: 'OVERHEAD PRESS', sets: 3, reps: '8-10' },    // Wrong case + has shoulder
      { name: 'incline dumbbell press', sets: 3, reps: '10-12' },
      { name: 'lateral raise', sets: 3, reps: '12-15' },    // Has shoulder
      { name: 'tricep dips', sets: 3, reps: '10-12' },
    ],
    confidence: 'high',
  };
  
 logger.log('x Received AI suggestion with', aiSuggestion.exercises.length, 'exercises');
  
  // 3. User profile data
  const userEquipment = ['barbell', 'dumbbell', 'bodyweight'];
  const userInjuries = ['shoulder'];
  
 logger.log('x User has equipment:', userEquipment);
 logger.log('x User has injuries:', userInjuries);
  
  // 4. Validate and filter
  const validated = validateWorkoutSuggestionAdvanced(
    aiSuggestion,
    userEquipment,
    userInjuries
  );
  
  // 5. Check results
 logger.log('\nx Validation complete:');
 logger.log(' - Exercises before:', aiSuggestion.exercises.length);
 logger.log(' - Exercises after:', validated.exercises.length);
 logger.log(' - Was filtered:', validated.wasFiltered);
  
 logger.log('\nS& Final workout:');
  validated.exercises.forEach((ex, i) => {
 logger.log(` ${i + 1}. ${ex.name} - ${ex.sets} ${ex.reps} (${ex.equipment})`);
  });
  
  // 6. Handle edge case: too many filtered
  if (validated.exercises.length < 3 && validated.wasFiltered) {
 logger.warn('\na Warning: Too many exercises filtered!');
 logger.log('Consider regenerating with fallback logic');
  }
};

// ==========================================
// Example 8: Usage in Workout Suggestion Service
// ==========================================

/**
 * How to integrate into your existing workout suggestion service
 */
export class WorkoutSuggestionServiceExample {
  async getSuggestion(userId: string): Promise<ValidatedSuggestion> {
    // 1. Get user profile
    const profile = await this.getUserProfile(userId);
    
    // 2. Get AI suggestion (call your AI service)
    const aiSuggestion = await this.getAISuggestion(profile);
    
    // 3. Validate the suggestion
    const validated = validateWorkoutSuggestionAdvanced(
      aiSuggestion,
      profile.available_equipment || [],
      profile.injury_keywords || []
    );
    
    // 4. Handle edge cases
    if (validated.exercises.length === 0) {
      throw new Error('No valid exercises after validation');
    }
    
    if (validated.exercises.length < 3 && validated.wasFiltered) {
 logger.warn('Many exercises filtered, consider fallback');
      // Could call a rule-based fallback here
    }
    
    return validated;
  }
  
  private async getUserProfile(userId: string): Promise<any> {
    // Fetch from database
    return {
      available_equipment: ['barbell', 'dumbbell'],
      injury_keywords: ['knee', 'shoulder'],
    };
  }
  
  private async getAISuggestion(profile: any): Promise<WorkoutSuggestion> {
    // Call AI service
    return {
      type: 'Push Day',
      reason: 'Based on your training history',
      exercises: [
        { name: 'Bench Press', sets: 4, reps: '8-10' },
        { name: 'Overhead Press', sets: 3, reps: '8-10' },
      ],
      confidence: 'high',
    };
  }
}

// ==========================================
// Run All Examples
// ==========================================

export const runAllExamples = async () => {
 logger.log('"""""""""""""""""""""""""""""""""""""""');
 logger.log(' EXERCISE VALIDATION EXAMPLES');
 logger.log('"""""""""""""""""""""""""""""""""""""""');
  
  await initializeValidator();
  
  validateSingleExercises();
  checkExerciseEquipment();
  validateWorkoutExample();
  validateWithEquipment();
  validateWithInjuries();
  await completeExample();
  
 logger.log('\n"""""""""""""""""""""""""""""""""""""""');
 logger.log(' ALL EXAMPLES COMPLETE');
 logger.log('"""""""""""""""""""""""""""""""""""""""\n');
};
