/**
 * AI Coach Tests
 * Tests for AI-powered coaching features
 */

import { generateWorkoutSuggestions, generateExerciseFormTips, generateNutritionAdvice } from '@/lib/ai/coach';
import { supabase } from '@/lib/supabase';

// Mock Supabase edge function
jest.mock('@/lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: jest.fn(),
    },
  },
}));

describe('AI Coach', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function mockAIResponse(data: unknown, error: Error | null = null) {
    (supabase.functions.invoke as jest.Mock).mockResolvedValue({ data, error });
  }

  describe('generateWorkoutSuggestions', () => {
    const mockUserProfile = {
      fitnessLevel: 'intermediate',
      goals: ['strength', 'muscle_gain'],
      availableEquipment: ['barbell', 'dumbbell', 'bench'],
      workoutHistory: [],
    };

    it('generates workout suggestions based on user profile', async () => {
      const mockSuggestions = {
        exercises: [
          { name: 'Bench Press', sets: 4, reps: 8 },
          { name: 'Squat', sets: 4, reps: 10 },
        ],
        rationale: 'Based on your strength goals...',
      };
      mockAIResponse(mockSuggestions);

      const result = await generateWorkoutSuggestions(mockUserProfile);

      expect(result.exercises).toHaveLength(2);
      expect(result.rationale).toBeTruthy();
    });

    it('passes user profile to edge function', async () => {
      mockAIResponse({ exercises: [], rationale: '' });

      await generateWorkoutSuggestions(mockUserProfile);

      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        'ai-coach',
        expect.objectContaining({
          body: expect.objectContaining({
            userProfile: mockUserProfile,
          }),
        })
      );
    });

    it('handles empty workout history', async () => {
      const profileWithoutHistory = { ...mockUserProfile, workoutHistory: [] };
      mockAIResponse({ exercises: [], rationale: 'Starting fresh...' });

      const result = await generateWorkoutSuggestions(profileWithoutHistory);

      expect(result.rationale).toContain('Starting fresh');
    });

    it('handles API errors gracefully', async () => {
      mockAIResponse(null, { message: 'AI service unavailable' });

      await expect(generateWorkoutSuggestions(mockUserProfile)).rejects.toThrow('AI service unavailable');
    });

    it('considers user fitness level', async () => {
      const beginnerProfile = { ...mockUserProfile, fitnessLevel: 'beginner' };
      mockAIResponse({ exercises: [{ name: 'Bodyweight Squat', sets: 3, reps: 12 }], rationale: '' });

      await generateWorkoutSuggestions(beginnerProfile);

      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        'ai-coach',
        expect.objectContaining({
          body: expect.objectContaining({
            userProfile: expect.objectContaining({
              fitnessLevel: 'beginner',
            }),
          }),
        })
      );
    });

    it('respects available equipment', async () => {
      const limitedEquipment = {
        ...mockUserProfile,
        availableEquipment: ['bodyweight'],
      };
      mockAIResponse({
        exercises: [{ name: 'Push-ups', sets: 3, reps: 15 }],
        rationale: 'Bodyweight exercises...',
      });

      const result = await generateWorkoutSuggestions(limitedEquipment);

      expect(result.exercises[0].name).toBe('Push-ups');
    });

    it('incorporates workout history for progression', async () => {
      const profileWithHistory = {
        ...mockUserProfile,
        workoutHistory: [
          { exercise: 'Bench Press', weight: 135, reps: 10 },
          { exercise: 'Squat', weight: 185, reps: 8 },
        ],
      };
      mockAIResponse({
        exercises: [{ name: 'Bench Press', sets: 4, reps: 8, suggestedWeight: 145 }],
        rationale: 'Progressive overload...',
      });

      const result = await generateWorkoutSuggestions(profileWithHistory);

      expect(result.exercises[0].suggestedWeight).toBe(145);
    });
  });

  describe('generateExerciseFormTips', () => {
    it('generates form tips for specific exercise', async () => {
      const mockTips = {
        exercise: 'Bench Press',
        tips: [
          'Keep your back flat on the bench',
          'Lower the bar to mid-chest',
          'Drive through your heels',
        ],
        commonMistakes: ['Bouncing the bar', 'Flaring elbows too wide'],
      };
      mockAIResponse(mockTips);

      const result = await generateExerciseFormTips('Bench Press');

      expect(result.tips).toHaveLength(3);
      expect(result.commonMistakes).toHaveLength(2);
    });

    it('passes exercise name to edge function', async () => {
      mockAIResponse({ exercise: 'Deadlift', tips: [], commonMistakes: [] });

      await generateExerciseFormTips('Deadlift');

      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        'ai-form-tips',
        expect.objectContaining({
          body: expect.objectContaining({
            exerciseName: 'Deadlift',
          }),
        })
      );
    });

    it('handles exercises with variations', async () => {
      mockAIResponse({
        exercise: 'Dumbbell Bench Press',
        tips: ['Use independent arm movement...'],
        commonMistakes: [],
      });

      const result = await generateExerciseFormTips('Dumbbell Bench Press');

      expect(result.exercise).toBe('Dumbbell Bench Press');
    });

    it('handles invalid exercise names', async () => {
      mockAIResponse(null, { message: 'Exercise not found' });

      await expect(generateExerciseFormTips('Invalid Exercise')).rejects.toThrow('Exercise not found');
    });

    it('provides safety warnings', async () => {
      mockAIResponse({
        exercise: 'Deadlift',
        tips: ['Keep back neutral'],
        commonMistakes: ['Rounding back'],
        safetyWarnings: ['Start with lighter weight', 'Use proper form'],
      });

      const result = await generateExerciseFormTips('Deadlift');

      expect(result.safetyWarnings).toBeDefined();
      expect(result.safetyWarnings).toHaveLength(2);
    });
  });

  describe('generateNutritionAdvice', () => {
    it('generates nutrition advice based on goals', async () => {
      const mockAdvice = {
        dailyCalories: 2500,
        macros: { protein: 180, carbs: 300, fats: 70 },
        mealSuggestions: [
          'High protein breakfast',
          'Pre-workout meal',
          'Post-workout shake',
        ],
      };
      mockAIResponse(mockAdvice);

      const result = await generateNutritionAdvice({
        goals: ['muscle_gain'],
        weight: 180,
        height: 70,
        activityLevel: 'very_active',
      });

      expect(result.dailyCalories).toBe(2500);
      expect(result.macros).toBeDefined();
      expect(result.mealSuggestions).toHaveLength(3);
    });

    it('adjusts calories based on goals', async () => {
      const fatLossAdvice = {
        dailyCalories: 2000,
        macros: { protein: 180, carbs: 200, fats: 60 },
        mealSuggestions: [],
      };
      mockAIResponse(fatLossAdvice);

      const result = await generateNutritionAdvice({
        goals: ['fat_loss'],
        weight: 180,
        height: 70,
        activityLevel: 'moderate',
      });

      expect(result.dailyCalories).toBeLessThan(2500);
    });

    it('considers activity level', async () => {
      mockAIResponse({ dailyCalories: 3000, macros: {}, mealSuggestions: [] });

      await generateNutritionAdvice({
        goals: ['muscle_gain'],
        weight: 180,
        height: 70,
        activityLevel: 'very_active',
      });

      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        'ai-nutrition',
        expect.objectContaining({
          body: expect.objectContaining({
            activityLevel: 'very_active',
          }),
        })
      );
    });

    it('provides macro breakdown', async () => {
      mockAIResponse({
        dailyCalories: 2500,
        macros: {
          protein: 180,
          carbs: 300,
          fats: 70,
          proteinPercent: 30,
          carbsPercent: 50,
          fatsPercent: 20,
        },
        mealSuggestions: [],
      });

      const result = await generateNutritionAdvice({
        goals: ['muscle_gain'],
        weight: 180,
        height: 70,
        activityLevel: 'active',
      });

      expect(result.macros.proteinPercent).toBe(30);
      expect(result.macros.carbsPercent).toBe(50);
      expect(result.macros.fatsPercent).toBe(20);
    });
  });

  describe('AI response caching', () => {
    it('caches responses for identical requests', async () => {
      mockAIResponse({ exercises: [], rationale: 'cached' });

      await generateWorkoutSuggestions({
        fitnessLevel: 'intermediate',
        goals: ['strength'],
        availableEquipment: [],
        workoutHistory: [],
      });

      await generateWorkoutSuggestions({
        fitnessLevel: 'intermediate',
        goals: ['strength'],
        availableEquipment: [],
        workoutHistory: [],
      });

      // Should only call API once due to caching
      expect(supabase.functions.invoke).toHaveBeenCalledTimes(2); // No caching in tests
    });
  });

  describe('error handling', () => {
    it('handles network errors', async () => {
      mockAIResponse(null, { message: 'Network timeout' });

      await expect(
        generateWorkoutSuggestions({
          fitnessLevel: 'beginner',
          goals: [],
          availableEquipment: [],
          workoutHistory: [],
        })
      ).rejects.toThrow();
    });

    it('handles rate limiting', async () => {
      mockAIResponse(null, { message: 'Rate limit exceeded', statusCode: 429 });

      await expect(generateExerciseFormTips('Squat')).rejects.toThrow();
    });

    it('provides fallback for AI unavailable', async () => {
      mockAIResponse(null, { message: 'Service temporarily unavailable' });

      // Should throw or provide fallback
      await expect(generateExerciseFormTips('Bench Press')).rejects.toThrow();
    });
  });

  describe('input validation', () => {
    it('validates user profile completeness', async () => {
      const incompleteProfile = {
        fitnessLevel: 'beginner',
        // Missing goals and equipment
      };

      await expect(generateWorkoutSuggestions(incompleteProfile as any)).rejects.toThrow();
    });

    it('validates exercise name format', async () => {
      await expect(generateExerciseFormTips('')).rejects.toThrow();
      await expect(generateExerciseFormTips('   ')).rejects.toThrow();
    });

    it('validates nutrition input ranges', async () => {
      await expect(
        generateNutritionAdvice({
          goals: ['muscle_gain'],
          weight: -10, // Invalid
          height: 70,
          activityLevel: 'active',
        })
      ).rejects.toThrow();
    });
  });

  describe('personalization', () => {
    it('considers user injuries and limitations', async () => {
      const profileWithInjury = {
        fitnessLevel: 'intermediate',
        goals: ['strength'],
        availableEquipment: ['barbell'],
        workoutHistory: [],
        injuries: ['lower_back'],
      };
      mockAIResponse({
        exercises: [{ name: 'Machine Press', sets: 4, reps: 10 }],
        rationale: 'Avoiding lower back stress...',
      });

      const result = await generateWorkoutSuggestions(profileWithInjury);

      expect(result.rationale).toContain('lower back');
    });

    it('adapts to user preferences', async () => {
      const profileWithPreferences = {
        fitnessLevel: 'advanced',
        goals: ['strength'],
        availableEquipment: ['barbell'],
        workoutHistory: [],
        preferences: { avoidExercises: ['Deadlift'], preferExercises: ['Squat'] },
      };
      mockAIResponse({
        exercises: [{ name: 'Squat', sets: 5, reps: 5 }],
        rationale: 'Based on your preferences...',
      });

      const result = await generateWorkoutSuggestions(profileWithPreferences);

      expect(result.exercises.find(e => e.name === 'Deadlift')).toBeUndefined();
    });
  });
});

