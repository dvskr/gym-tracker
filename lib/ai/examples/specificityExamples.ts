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
  console.log('\n📊 Example 1: Basic Specificity Check');
  
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
  
  console.log('Specific Response:', specificResponse);
  console.log('Result:', check1);
  console.log(`✅ Score: ${check1.score} (${check1.isSpecific ? 'PASS' : 'FAIL'})`);
  
  // Test a generic response
  const genericResponse = 
    "Try to increase weight gradually. Progressive overload is important. " +
    "Most people see good results with this approach.";
  
  const check2 = checkResponseSpecificity(genericResponse, userContext);
  
  console.log('\nGeneric Response:', genericResponse);
  console.log('Result:', check2);
  console.log(`❌ Score: ${check2.score} (${check2.isSpecific ? 'PASS' : 'FAIL'})`);
  console.log('Issues:', check2.issues);
};

// ==========================================
// Example 2: Building Context from Data
// ==========================================

export const example2_buildingContext = () => {
  console.log('\n🔨 Example 2: Building Context from Workout Data');
  
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
  
  console.log('Generated Context:', JSON.stringify(context, null, 2));
  console.log('\nExtracted:');
  console.log('- Exercises:', context.recentExercises.join(', '));
  console.log('- Weights:', context.recentWeights?.map(w => 
    `${w.exercise}: ${w.weight}×${w.reps}`
  ).join(', '));
  console.log('- Has PRs:', context.hasPRs);
  console.log('- Has History:', context.hasWorkoutHistory);
};

// ==========================================
// Example 3: Complete Quality Validation
// ==========================================

export const example3_qualityValidation = () => {
  console.log('\n✅ Example 3: Complete Quality Validation');
  
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
    
    console.log(`\n[${name}] Score: ${result.specificity.score}`);
    console.log(`Valid: ${result.isValid ? '✅' : '❌'}`);
    console.log(`Response: "${text.substring(0, 80)}..."`);
    console.log(`Feedback: ${result.feedback}`);
  });
};

// ==========================================
// Example 4: Integration with AI Service
// ==========================================

export const example4_aiServiceIntegration = async () => {
  console.log('\n🤖 Example 4: AI Service Integration');
  
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
    console.log(`\nAttempt ${attempt + 1}/${maxRetries}`);
    
    const response = await mockAIService.ask('Should I increase my bench press weight?');
    const validation = validateResponseQuality(response, userContext);
    
    console.log(`Response: "${response}"`);
    console.log(`Score: ${validation.specificity.score}`);
    console.log(`Valid: ${validation.isValid ? '✅' : '❌'}`);
    
    if (validation.isValid) {
      finalResponse = response;
      console.log('\n✅ Accepted! Response is specific enough.');
      break;
    }
    
    console.log(`⚠️ Too generic: ${validation.feedback}`);
    
    if (attempt < maxRetries - 1) {
      console.log('Retrying with enhanced prompt...');
    }
  }
  
  return finalResponse;
};

// ==========================================
// Example 5: Scoring Breakdown
// ==========================================

export const example5_scoringBreakdown = () => {
  console.log('\n🎯 Example 5: Scoring Breakdown');
  
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
    
    console.log(`\n[${name}]`);
    console.log(`Text: "${text}"`);
    console.log(`Expected: ${expectedScore}, Got: ${check.score}`);
    console.log(`Pass: ${check.isSpecific ? '✅' : '❌'}`);
    console.log('Details:', check.details);
  });
};

// ==========================================
// Example 6: Real-World Workout Analysis
// ==========================================

export const example6_workoutAnalysis = () => {
  console.log('\n💪 Example 6: Workout Analysis Specificity');
  
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
    
    console.log(`\n[${type} Analysis]`);
    console.log(`Score: ${result.specificity.score}`);
    console.log(`Valid: ${result.isValid ? '✅' : '❌'}`);
    console.log(`Exercises mentioned: ${result.specificity.details.mentionedExercises.join(', ') || 'None'}`);
    console.log(`Has weights: ${result.specificity.details.hasSpecificWeight ? '✅' : '❌'}`);
    console.log(`Has reps: ${result.specificity.details.hasSpecificReps ? '✅' : '❌'}`);
    
    if (!result.isValid) {
      console.log(`Issues: ${result.specificity.issues.join(', ')}`);
    }
  });
};

// ==========================================
// Example 7: Threshold Testing
// ==========================================

export const example7_thresholdTesting = () => {
  console.log('\n🎚️ Example 7: Testing Different Thresholds');
  
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
    
    console.log(`\nThreshold: ${threshold}`);
    console.log(`Score: ${result.specificity.score}`);
    console.log(`Pass: ${result.isValid ? '✅' : '❌'}`);
  });
};

// ==========================================
// Example 8: Complete Integration Example
// ==========================================

export const example8_completeIntegration = async () => {
  console.log('\n🚀 Example 8: Complete Integration');
  
  // Step 1: Get user data
  console.log('Step 1: Fetch user workout data...');
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
  console.log('Step 2: Build user context...');
  const userContext = buildUserContextFromData(workoutData);
  console.log(`- Exercises: ${userContext.recentExercises.join(', ')}`);
  console.log(`- Latest weight: ${userContext.recentWeights?.[0]?.weight} lbs`);
  
  // Step 3: Get AI response (simulated)
  console.log('\nStep 3: Get AI response...');
  const aiResponse = 
    "Your bench press at 185×8 yesterday was strong! You're ready to bump up to " +
    "190 lbs for 6-8 reps on your next push day.";
  
  console.log(`Response: "${aiResponse}"`);
  
  // Step 4: Validate specificity
  console.log('\nStep 4: Validate specificity...');
  const validation = validateResponseQuality(aiResponse, userContext);
  
  console.log(`Score: ${validation.specificity.score}/100`);
  console.log(`Valid: ${validation.isValid ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Feedback: ${validation.feedback}`);
  
  // Step 5: Log details for monitoring
  console.log('\nStep 5: Analytics data:');
  console.log(JSON.stringify({
    score: validation.specificity.score,
    isValid: validation.isValid,
    hasWeight: validation.specificity.details.hasSpecificWeight,
    hasReps: validation.specificity.details.hasSpecificReps,
    exercisesMentioned: validation.specificity.details.mentionedExercises.length,
    hasTimeRef: validation.specificity.details.hasTimeReference,
  }, null, 2));
  
  // Step 6: Decision
  if (validation.isValid) {
    console.log('\n✅ Response approved - sending to user');
    return aiResponse;
  } else {
    console.log('\n⚠️ Response needs improvement - regenerating...');
    return null;
  }
};

// ==========================================
// Run All Examples
// ==========================================

export const runAllSpecificityExamples = async () => {
  console.log('═══════════════════════════════════════');
  console.log('  RESPONSE SPECIFICITY EXAMPLES');
  console.log('═══════════════════════════════════════');
  
  example1_basicCheck();
  example2_buildingContext();
  example3_qualityValidation();
  await example4_aiServiceIntegration();
  example5_scoringBreakdown();
  example6_workoutAnalysis();
  example7_thresholdTesting();
  await example8_completeIntegration();
  
  console.log('\n═══════════════════════════════════════');
  console.log('  ALL EXAMPLES COMPLETE');
  console.log('═══════════════════════════════════════\n');
};

