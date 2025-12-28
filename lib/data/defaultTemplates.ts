import { supabase } from '@/lib/supabase';
import { createTemplate, getTemplates } from '@/lib/api/templates';

// ============================================
// Default Template Definitions
// ============================================

export interface DefaultTemplateExercise {
  name: string;
  sets: number;
  reps: string; // Format: "8-10" or "10"
}

export interface DefaultTemplate {
  name: string;
  description: string;
  target_muscles: string[];
  estimated_duration: number;
  exercises: DefaultTemplateExercise[];
}

export const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  {
    name: "Push Day",
    description: "Chest, shoulders, and triceps",
    target_muscles: ["chest", "shoulders", "triceps"],
    estimated_duration: 60,
    exercises: [
      { name: "Bench Press (Barbell)", sets: 4, reps: "6-8" },
      { name: "Incline Dumbbell Press", sets: 3, reps: "8-10" },
      { name: "Overhead Press (Barbell)", sets: 3, reps: "8-10" },
      { name: "Lateral Raise", sets: 3, reps: "12-15" },
      { name: "Tricep Pushdown", sets: 3, reps: "10-12" },
      { name: "Overhead Tricep Extension", sets: 3, reps: "10-12" },
    ],
  },
  {
    name: "Pull Day",
    description: "Back and biceps",
    target_muscles: ["back", "biceps"],
    estimated_duration: 60,
    exercises: [
      { name: "Deadlift (Barbell)", sets: 4, reps: "5-6" },
      { name: "Pull-up", sets: 3, reps: "6-10" },
      { name: "Barbell Row", sets: 3, reps: "8-10" },
      { name: "Face Pull", sets: 3, reps: "12-15" },
      { name: "Barbell Curl", sets: 3, reps: "10-12" },
      { name: "Hammer Curl", sets: 3, reps: "10-12" },
    ],
  },
  {
    name: "Leg Day",
    description: "Quads, hamstrings, and calves",
    target_muscles: ["quadriceps", "hamstrings", "glutes", "calves"],
    estimated_duration: 60,
    exercises: [
      { name: "Squat (Barbell)", sets: 4, reps: "6-8" },
      { name: "Romanian Deadlift", sets: 3, reps: "8-10" },
      { name: "Leg Press", sets: 3, reps: "10-12" },
      { name: "Leg Curl", sets: 3, reps: "10-12" },
      { name: "Leg Extension", sets: 3, reps: "12-15" },
      { name: "Calf Raise", sets: 4, reps: "12-15" },
    ],
  },
  {
    name: "Upper Body",
    description: "Full upper body workout",
    target_muscles: ["chest", "back", "shoulders", "arms"],
    estimated_duration: 75,
    exercises: [
      { name: "Bench Press (Barbell)", sets: 4, reps: "6-8" },
      { name: "Barbell Row", sets: 4, reps: "6-8" },
      { name: "Overhead Press (Barbell)", sets: 3, reps: "8-10" },
      { name: "Pull-up", sets: 3, reps: "8-10" },
      { name: "Dumbbell Curl", sets: 3, reps: "10-12" },
      { name: "Tricep Dip", sets: 3, reps: "10-12" },
    ],
  },
  {
    name: "Full Body",
    description: "Complete full body workout",
    target_muscles: ["full body"],
    estimated_duration: 60,
    exercises: [
      { name: "Squat (Barbell)", sets: 3, reps: "8-10" },
      { name: "Bench Press (Barbell)", sets: 3, reps: "8-10" },
      { name: "Barbell Row", sets: 3, reps: "8-10" },
      { name: "Overhead Press (Dumbbell)", sets: 3, reps: "10-12" },
      { name: "Romanian Deadlift", sets: 3, reps: "10-12" },
    ],
  },
];

// ============================================
// Helper Functions
// ============================================

/**
 * Parse rep range string into min and max values
 * @param reps - Rep string like "8-10" or "10"
 */
function parseRepRange(reps: string): { min: number; max: number } {
  const parts = reps.split('-');
  const min = parseInt(parts[0], 10);
  const max = parseInt(parts[1] || parts[0], 10);
  return { min, max };
}

/**
 * Find exercise ID by name using fuzzy matching
 * @param exerciseName - The exercise name to search for
 */
async function findExerciseByName(exerciseName: string): Promise<string | null> {
  // Try exact match first
  const { data: exactMatch } = await supabase
    .from('exercises')
    .select('id')
    .ilike('name', exerciseName)
    .limit(1)
    .single();

  if (exactMatch?.id) {
    return exactMatch.id;
  }

  // Try partial match - search for key words
  const searchTerms = exerciseName
    .toLowerCase()
    .replace(/\(.*\)/, '') // Remove parentheses
    .trim()
    .split(' ')
    .filter(term => term.length > 2); // Filter short words

  if (searchTerms.length > 0) {
    // Search using the first significant term
    const { data: partialMatch } = await supabase
      .from('exercises')
      .select('id, name')
      .ilike('name', `%${searchTerms[0]}%`)
      .limit(10);

    if (partialMatch && partialMatch.length > 0) {
      // Try to find best match by checking if other terms are present
      for (const exercise of partialMatch) {
        const nameLower = exercise.name.toLowerCase();
        const matchScore = searchTerms.filter(term => nameLower.includes(term)).length;
        if (matchScore >= Math.ceil(searchTerms.length / 2)) {
          return exercise.id;
        }
      }
      // Return first partial match if no good match found
      return partialMatch[0].id;
    }
  }

  return null;
}

// ============================================
// Seed Function
// ============================================

/**
 * Seed default templates for a new user
 * Only seeds if user has no existing templates
 * @param userId - The user's ID
 */
export async function seedDefaultTemplates(userId: string): Promise<void> {
  try {
    // Check if user already has templates
    const existing = await getTemplates(userId);
    if (existing.length > 0) {
      console.log('User already has templates, skipping seed');
      return;
    }

    console.log('Seeding default templates for user...');

    for (const template of DEFAULT_TEMPLATES) {
      // Look up exercise IDs by name
      const exercisePromises = template.exercises.map(async (ex, index) => {
        const exerciseId = await findExerciseByName(ex.name);
        const { min, max } = parseRepRange(ex.reps);

        return {
          exercise_id: exerciseId,
          order_index: index,
          target_sets: ex.sets,
          target_reps_min: min,
          target_reps_max: max,
        };
      });

      const exercises = await Promise.all(exercisePromises);

      // Filter out exercises that weren't found
      const validExercises = exercises.filter(
        (e): e is typeof e & { exercise_id: string } => e.exercise_id !== null
      );

      if (validExercises.length === 0) {
        console.warn(`No exercises found for template "${template.name}", skipping`);
        continue;
      }

      // Create the template
      await createTemplate({
        user_id: userId,
        name: template.name,
        description: template.description,
        target_muscles: template.target_muscles,
        estimated_duration: template.estimated_duration,
        exercises: validExercises,
      });

      console.log(
        `Created template "${template.name}" with ${validExercises.length}/${template.exercises.length} exercises`
      );
    }

    console.log('Finished seeding default templates');
  } catch (error) {
    console.error('Error seeding default templates:', error);
    // Don't throw - seeding failure shouldn't break the app
  }
}

/**
 * Check if user needs default templates seeded
 * @param userId - The user's ID
 */
export async function shouldSeedTemplates(userId: string): Promise<boolean> {
  try {
    const existing = await getTemplates(userId);
    return existing.length === 0;
  } catch {
    return false;
  }
}

