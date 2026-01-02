import { logger } from '@/lib/utils/logger';
/**
 * Response Specificity Validation Examples
 * Demonstrates how to ensure AI responses are personalized, not generic
 */

import {
  checkResponseSpecificity,
  buildUserContextFromData,
  validateResponseQuality,
  type UserContext,
  type SpecificityCheck,
} from '@/lib/ai/validation';

// ==========================================
// Example 1: Basic Specificity Check
// ==========================================

export const example1_basicCheck = () => {
  logger.log('\n�x` Example 1: Basic Specificity Check');
  
  // Simulate user context
  const userContext: UserContext = {
    hasPRs: true,
    hasWorkoutHistory: true,
    recentExercises: ['Bench Press', 'Squats', 'Deadlifts'],
    recentWeights: [
      { exercise: 'Bench Press', weight: 185, reps: 8 },
      { exercise: 'Squats', weight: 225, reps: 10 },
    ],
    workoutCount: 45,
    lastWorkoutDate: '2025-12-30',
  };
  
  // Test a specific response
  const specificResponse = 
    "Your bench press at 185×8 last week was solid! Since you hit all reps, " +
    "try bumping to 190 lbs next session.";
  
  const check1 = checkResponseSpecificity(specificResponse, userContext);
  
  logger.log('Specific Response:', specificResponse);
  logger.log('Result:', check1);
  logger.log(`�S& Score: ${check1.score} (${check1.isSpecific ? 'PASS' : 'FAIL'})`);
  
  // Test a generic response
  const genericResponse = 
    "Try to increase weight gradually. Progressive overload is important. " +
    "Most people see good results with this approach.";
  
  const check2 = checkResponseSpecificity(genericResponse, userContext);
  
  logger.log('\nGeneric Response:', genericResponse);
  logger.log('Result:', check2);
  logger.log(`�R Score: ${check2.score} (${check2.isSpecific ? 'PASS' : 'FAIL'})`);
  logger.log('Issues:', check2.issues);
};

// ==========================================
// Example 2: Building Context from Data
// ==========================================

export const example2_buildingContext = () => {
  logger.log('\n�x� Example 2: Building Context from Workout Data');
  
  // Simulate raw workout data from database
  const workoutData = {
    recentWorkouts: [
      {
        created_at: '2025-12-30T10:00:00Z',
        workout_exercises: [
          {
            exercises: { name: 'Bench Press' },
            workout_sets: [
              { weight: 185, reps: 8 },
              { weight: 185, reps: 7 },
              { weight: 185, reps: 6 },
            ],
          },
          {
            exercises: { name: 'Dumbbell Row' },
            workout_sets: [
              { weight: 70, reps: 10 },
              { weight: 70, reps: 10 },
            ],
          },
        ],
      },
      {
        created_at: '2025-12-28T10:00:00Z',
        workout_exercises: [
          {
            exercises: { name: 'Squats' },
            workout_sets: [
              { weight: 225, reps: 10 },
              { weight: 225, reps: 9 },
            ],
          },
        ],
      },
    ],
    personalRecords: [
      { exercise_id: 1, weight: 200, reps: 5 },
      { exercise_id: 2, weight: 245, reps: 5 },
    ],
    workoutCount: 45,
  };
  
  // Build context
  const context = buildUserContextFromData(workoutData);
  
  logger.log('Generated Context:', JSON.stringify(context, null, 2));
  logger.log('\nExtracted:');
  logger.log('- Exercises:', context.recentExercises.join(', '));
  logger.log('- Weights:', context.recentWeights?.map(w => 
    `${w.exercise}: ${w.weight}×${w.reps}`
  ).join(', '));
  logger.log('- Has PRs:', context.hasPRs);
  logger.log('- Has History:', context.hasWorkoutHistory);
};

// ==========================================
// Example 3: Complete Quality Validation
// ==========================================

export const example3_qualityValidation = () => {
  logger.log('\n�S& Example 3: Complete Quality Validation');
  
  const userContext: UserContext = {
    hasPRs: true,
    hasWorkoutHistory: true,
    recentExercises: ['Bench Press', 'Overhead Press'],
    recentWeights: [
      { exercise: 'Bench Press', weight: 185, reps: 8 },
    ],
  };
  
  // Test various responses
  const responses = [
    {
      name: 'Excellent',
      text: "Your bench press at 185×8 on Monday was strong. Last week you hit 180×9, " +
            "so you're progressing well. Try 190 lbs for 6-8 reps next session.",
    },
    {
      name: 'Good',
      text: "You hit 185 lbs for 8 reps on bench press. That's progress! " +
            "Aim for 190 next time.",
    },
    {
      name: 'Fair',
      text: "Your bench press is improving. Try adding 5 lbs next workout.",
    },
    {
      name: 'Poor',
      text: "Keep working on progressive overload. Generally, you should increase " +
            "weight when you feel ready. Most people do this.",
    },
  ];
  
  responses.forEach(({ name, text }) => {
    const result = validateResponseQuality(text, userContext);
    
    logger.log(`\n[${name}] Score: ${result.specificity.score}`);
    logger.log(`Valid: ${result.isValid ? '�S&' : '�R'}`);
    logger.log(`Response: "${text.substring(0, 80)}..."`);
    logger.log(`Feedback: ${result.feedback}`);
  });
};

// ==========================================
// Example 4: Integration with AI Service
// ==========================================

export const example4_aiServiceIntegration = async () => {
  logger.log('\n�x� Example 4: AI Service Integration');
  
  // Simulate AI service
  const mockAIService = {
    responses: [
      // First response is generic (will retry)
      "Try to increase weight when you feel ready. Progressive overload is key.",
      // Second response is specific (will pass)
      "Your bench press at 185×8 last week shows you're ready for 190 lbs next session.",
    ],
    currentIndex: 0,
    
    async ask(prompt: string): Promise<string> {
      const response = this.responses[this.currentIndex];
      this.currentIndex++;
      return response;
    },
  };
  
  // Simulate user data
  const userData = {
    recentWorkouts: [
      {
        created_at: '2025-12-30',
        workout_exercises: [
          {
            exercises: { name: 'Bench Press' },
            workout_sets: [{ weight: 185, reps: 8 }],
          },
        ],
      },
    ],
    personalRecords: [{ weight: 200, reps: 5 }],
    workoutCount: 45,
  };
  
  const userContext = buildUserContextFromData(userData);
  
  // Try with retries
  const maxRetries = 2;
  let finalResponse = '';
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    logger.log(`\nAttempt ${attempt + 1}/${maxRetries}`);
    
    const response = await mockAIService.ask('Should I increase my bench press weight?');
    const validation = validateResponseQuality(response, userContext);
    
    logger.log(`Response: "${response}"`);
    logger.log(`Score: ${validation.specificity.score}`);
    logger.log(`Valid: ${validation.isValid ? '�S&' : '�R'}`);
    
    if (validation.isValid) {
      finalResponse = response;
      logger.log('\n�S& Accepted! Response is specific enough.');
      break;
    }
    
    logger.log(`�a���� Too generic: ${validation.feedback}`);
    
    if (attempt < maxRetries - 1) {
      logger.log('Retrying with enhanced prompt...');
    }
  }
  
  return finalResponse;
};

// ==========================================
// Example 5: Scoring Breakdown
// ==========================================

export const example5_scoringBreakdown = () => {
  logger.log('\n�x}� Example 5: Scoring Breakdown');
  
  const userContext: UserContext = {
    hasPRs: true,
    hasWorkoutHistory: true,
    recentExercises: ['Bench Press', 'Squats'],
    recentWeights: [{ exercise: 'Bench Press', weight: 185, reps: 8 }],
  };
  
  const testCases = [
    {
      name: 'Only weight',
      text: 'Try 185 lbs.',
      expectedScore: 30,
    },
    {
      name: 'Weight + reps',
      text: 'Try 185 lbs for 8 reps.',
      expectedScore: 50,
    },
    {
      name: 'Weight + exercise mention',
      text: 'Your bench press at 185 lbs is strong.',
      expectedScore: 60,
    },
    {
      name: 'Full context',
      text: 'Your bench press at 185×8 last week was great.',
      expectedScore: 80,
    },
  ];
  
  testCases.forEach(({ name, text, expectedScore }) => {
    const check = checkResponseSpecificity(text, userContext);
    
    logger.log(`\n[${name}]`);
    logger.log(`Text: "${text}"`);
    logger.log(`Expected: ${expectedScore}, Got: ${check.score}`);
    logger.log(`Pass: ${check.isSpecific ? '�S&' : '�R'}`);
    logger.log('Details:', check.details);
  });
};

// ==========================================
// Example 6: Real-World Workout Analysis
// ==========================================

export const example6_workoutAnalysis = () => {
  logger.log('\n�x� Example 6: Workout Analysis Specificity');
  
  const userContext = buildUserContextFromData({
    recentWorkouts: [
      {
        created_at: '2025-12-30',
        workout_exercises: [
          {
            exercises: { name: 'Bench Press' },
            workout_sets: [
              { weight: 185, reps: 8 },
              { weight: 185, reps: 7 },
              { weight: 185, reps: 6 },
            ],
          },
          {
            exercises: { name: 'Incline Press' },
            workout_sets: [
              { weight: 155, reps: 10 },
              { weight: 155, reps: 9 },
            ],
          },
        ],
      },
    ],
    personalRecords: [{ weight: 200, reps: 5 }],
    workoutCount: 45,
  });
  
  // Simulate AI workout analysis responses
  const analyses = [
    {
      type: 'Generic',
      text: "Good workout! You're making progress. Keep up the good work and " +
            "try to increase weight when possible.",
    },
    {
      type: 'Specific',
      text: "Strong push day! Your bench press hit 185×8/7/6 - that's 21 total reps " +
            "at 185 lbs. Your incline press at 155×10 is also solid. Next session, " +
            "try 190 lbs on bench for 3×6-8.",
    },
  ];
  
  analyses.forEach(({ type, text }) => {
    const result = validateResponseQuality(text, userContext);
    
    logger.log(`\n[${type} Analysis]`);
    logger.log(`Score: ${result.specificity.score}`);
    logger.log(`Valid: ${result.isValid ? '�S&' : '�R'}`);
    logger.log(`Exercises mentioned: ${result.specificity.details.mentionedExercises.join(', ') || 'None'}`);
    logger.log(`Has weights: ${result.specificity.details.hasSpecificWeight ? '�S&' : '�R'}`);
    logger.log(`Has reps: ${result.specificity.details.hasSpecificReps ? '�S&' : '�R'}`);
    
    if (!result.isValid) {
      logger.log(`Issues: ${result.specificity.issues.join(', ')}`);
    }
  });
};

// ==========================================
// Example 7: Threshold Testing
// ==========================================

export const example7_thresholdTesting = () => {
  logger.log('\n�x}a️ Example 7: Testing Different Thresholds');
  
  const userContext: UserContext = {
    hasPRs: true,
    hasWorkoutHistory: true,
    recentExercises: ['Bench Press'],
    recentWeights: [{ exercise: 'Bench Press', weight: 185, reps: 8 }],
  };
  
  const response = "Your bench press looks good at 185 lbs.";
  
  // Test with different minimum scores
  const thresholds = [30, 40, 50, 60, 70];
  
  thresholds.forEach(threshold => {
    const result = validateResponseQuality(response, userContext, threshold);
    
    logger.log(`\nThreshold: ${threshold}`);
    logger.log(`Score: ${result.specificity.score}`);
    logger.log(`Pass: ${result.isValid ? '�S&' : '�R'}`);
  });
};

// ==========================================
// Example 8: Complete Integration Example
// ==========================================

export const example8_completeIntegration = async () => {
  logger.log('\n�xa� Example 8: Complete Integration');
  
  // Step 1: Get user data
  logger.log('Step 1: Fetch user workout data...');
  const workoutData = {
    recentWorkouts: [
      {
        created_at: '2025-12-30T10:00:00Z',
        workout_exercises: [
          {
            exercises: { name: 'Bench Press' },
            workout_sets: [
              { weight: 185, reps: 8 },
              { weight: 185, reps: 7 },
            ],
          },
        ],
      },
    ],
    personalRecords: [{ weight: 200, reps: 5 }],
    workoutCount: 45,
  };
  
  // Step 2: Build context
  logger.log('Step 2: Build user context...');
  const userContext = buildUserContextFromData(workoutData);
  logger.log(`- Exercises: ${userContext.recentExercises.join(', ')}`);
  logger.log(`- Latest weight: ${userContext.recentWeights?.[0]?.weight} lbs`);
  
  // Step 3: Get AI response (simulated)
  logger.log('\nStep 3: Get AI response...');
  const aiResponse = 
    "Your bench press at 185×8 yesterday was strong! You're ready to bump up to " +
    "190 lbs for 6-8 reps on your next push day.";
  
  logger.log(`Response: "${aiResponse}"`);
  
  // Step 4: Validate specificity
  logger.log('\nStep 4: Validate specificity...');
  const validation = validateResponseQuality(aiResponse, userContext);
  
  logger.log(`Score: ${validation.specificity.score}/100`);
  logger.log(`Valid: ${validation.isValid ? '�S& PASS' : '�R FAIL'}`);
  logger.log(`Feedback: ${validation.feedback}`);
  
  // Step 5: Log details for monitoring
  logger.log('\nStep 5: Analytics data:');
  logger.log(JSON.stringify({
    score: validation.specificity.score,
    isValid: validation.isValid,
    hasWeight: validation.specificity.details.hasSpecificWeight,
    hasReps: validation.specificity.details.hasSpecificReps,
    exercisesMentioned: validation.specificity.details.mentionedExercises.length,
    hasTimeRef: validation.specificity.details.hasTimeReference,
  }, null, 2));
  
  // Step 6: Decision
  if (validation.isValid) {
    logger.log('\n�S& Response approved - sending to user');
    return aiResponse;
  } else {
    logger.log('\n�a���� Response needs improvement - regenerating...');
    return null;
  }
};

// ==========================================
// Run All Examples
// ==========================================

export const runAllSpecificityExamples = async () => {
  logger.log('�"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"');
  logger.log('  RESPONSE SPECIFICITY EXAMPLES');
  logger.log('�"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"');
  
  example1_basicCheck();
  example2_buildingContext();
  example3_qualityValidation();
  await example4_aiServiceIntegration();
  example5_scoringBreakdown();
  example6_workoutAnalysis();
  example7_thresholdTesting();
  await example8_completeIntegration();
  
  logger.log('\n�"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"');
  logger.log('  ALL EXAMPLES COMPLETE');
  logger.log('�"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"\n');
};

