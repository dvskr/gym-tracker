import { supabase } from '@/lib/supabase';
import { createTemplate, getTemplates, updateTemplateExercises } from '@/lib/api/templates';

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
      { name: "barbell bench press", sets: 4, reps: "6-8" },
      { name: "dumbbell incline bench press", sets: 3, reps: "8-10" },
      { name: "barbell seated overhead press", sets: 3, reps: "8-10" },
      { name: "dumbbell lateral raise", sets: 3, reps: "12-15" },
      { name: "cable pushdown", sets: 3, reps: "10-12" },
      { name: "cable pushdown (with rope attachment)", sets: 3, reps: "10-12" },
    ],
  },
  {
    name: "Pull Day",
    description: "Back and biceps",
    target_muscles: ["back", "biceps"],
    estimated_duration: 60,
    exercises: [
      { name: "barbell deadlift", sets: 4, reps: "5-6" },
      { name: "pull-up", sets: 3, reps: "6-10" },
      { name: "barbell bent over row", sets: 3, reps: "8-10" },
      { name: "cable rear pulldown", sets: 3, reps: "12-15" },
      { name: "barbell curl", sets: 3, reps: "10-12" },
      { name: "dumbbell hammer curl", sets: 3, reps: "10-12" },
    ],
  },
  {
    name: "Leg Day",
    description: "Quads, hamstrings, glutes, and calves",
    target_muscles: ["quadriceps", "hamstrings", "glutes", "calves"],
    estimated_duration: 60,
    exercises: [
      { name: "barbell full squat", sets: 4, reps: "6-8" },
      { name: "barbell romanian deadlift", sets: 3, reps: "8-10" },
      { name: "sled 45° leg press", sets: 3, reps: "10-12" },
      { name: "lying leg curl machine", sets: 3, reps: "10-12" },
      { name: "leg extension machine", sets: 3, reps: "12-15" },
      { name: "lever standing calf raise", sets: 4, reps: "12-15" },
    ],
  },
  {
    name: "Upper Body",
    description: "Full upper body - chest, back, shoulders, arms",
    target_muscles: ["chest", "back", "shoulders", "arms"],
    estimated_duration: 75,
    exercises: [
      { name: "barbell bench press", sets: 4, reps: "6-8" },
      { name: "barbell bent over row", sets: 4, reps: "6-8" },
      { name: "barbell seated overhead press", sets: 3, reps: "8-10" },
      { name: "pull-up", sets: 3, reps: "8-10" },
      { name: "dumbbell hammer curl", sets: 3, reps: "10-12" },
      { name: "triceps dip", sets: 3, reps: "10-12" },
    ],
  },
  {
    name: "Full Body",
    description: "Complete full body workout",
    target_muscles: ["full body"],
    estimated_duration: 60,
    exercises: [
      { name: "barbell full squat", sets: 3, reps: "8-10" },
      { name: "barbell bench press", sets: 3, reps: "8-10" },
      { name: "barbell bent over row", sets: 3, reps: "8-10" },
      { name: "dumbbell standing overhead press", sets: 3, reps: "10-12" },
      { name: "barbell romanian deadlift", sets: 3, reps: "10-12" },
    ],
  },
  {
    name: "Arms",
    description: "Biceps and triceps focus",
    target_muscles: ["biceps", "triceps"],
    estimated_duration: 45,
    exercises: [
      { name: "barbell curl", sets: 3, reps: "8-10" },
      { name: "cable pushdown", sets: 3, reps: "10-12" },
      { name: "dumbbell hammer curl", sets: 3, reps: "10-12" },
      { name: "cable pushdown (with rope attachment)", sets: 3, reps: "10-12" },
      { name: "dumbbell concentration curl", sets: 3, reps: "12-15" },
      { name: "triceps dip (bench leg)", sets: 3, reps: "12-15" },
    ],
  },
  {
    name: "Back & Biceps",
    description: "Complete back development + biceps",
    target_muscles: ["back", "biceps"],
    estimated_duration: 60,
    exercises: [
      { name: "barbell deadlift", sets: 4, reps: "5" },
      { name: "pull-up", sets: 3, reps: "8-10" },
      { name: "cable seated row", sets: 3, reps: "10-12" },
      { name: "lat pulldown cable", sets: 3, reps: "10-12" },
      { name: "barbell curl", sets: 3, reps: "10-12" },
      { name: "dumbbell hammer curl", sets: 3, reps: "10-12" },
    ],
  },
  {
    name: "Chest & Triceps",
    description: "Chest pressing + triceps",
    target_muscles: ["chest", "triceps"],
    estimated_duration: 50,
    exercises: [
      { name: "barbell bench press", sets: 4, reps: "6-8" },
      { name: "dumbbell incline bench press", sets: 3, reps: "8-10" },
      { name: "dumbbell fly", sets: 3, reps: "10-12" },
      { name: "cable pushdown", sets: 3, reps: "10-12" },
      { name: "dumbbell kickback", sets: 3, reps: "12-15" },
      { name: "push-up", sets: 3, reps: "15-20" },
    ],
  },
  {
    name: "Shoulders",
    description: "All three delt heads",
    target_muscles: ["shoulders"],
    estimated_duration: 45,
    exercises: [
      { name: "barbell seated overhead press", sets: 4, reps: "6-8" },
      { name: "dumbbell arnold press", sets: 3, reps: "8-10" },
      { name: "dumbbell lateral raise", sets: 3, reps: "12-15" },
      { name: "dumbbell rear fly", sets: 3, reps: "12-15" },
      { name: "cable lateral raise", sets: 3, reps: "12-15" },
      { name: "barbell shrug", sets: 3, reps: "12-15" },
    ],
  },
  {
    name: "Home Workout",
    description: "Full body with minimal equipment",
    target_muscles: ["full body"],
    estimated_duration: 40,
    exercises: [
      { name: "push-up", sets: 4, reps: "10-15" },
      { name: "pull-up", sets: 3, reps: "6-10" },
      { name: "forward lunge", sets: 3, reps: "12" },
      { name: "triceps dip (bench leg)", sets: 3, reps: "12-15" },
      { name: "inverted row", sets: 3, reps: "10-12" },
      { name: "jump squat", sets: 3, reps: "15" },
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

/**
 * Add new default templates to existing users
 * This function adds templates that don't already exist (by name)
 * @param userId - The user's ID
 */
export async function addNewDefaultTemplates(userId: string): Promise<void> {
  try {
    console.log('Checking for new templates to add...');
    
    // Get existing templates
    const existing = await getTemplates(userId);
    const existingNames = new Set(existing.map(t => t.name));
    
    console.log(`User has ${existing.length} existing templates:`, Array.from(existingNames));
    
    // Find templates that don't exist yet
    const newTemplates = DEFAULT_TEMPLATES.filter(t => !existingNames.has(t.name));
    
    if (newTemplates.length === 0) {
      console.log('No new templates to add');
    } else {
      console.log(`Adding ${newTemplates.length} new templates:`, newTemplates.map(t => t.name));
      
      // Add each new template
      for (const template of newTemplates) {
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

      console.log('Finished adding new default templates');
    }
    
    // Now update existing templates with correct exercise names
    console.log('Checking for templates that need exercise updates...');
    
    const templatesToUpdate = DEFAULT_TEMPLATES.filter(t => existingNames.has(t.name));
    
    if (templatesToUpdate.length > 0) {
      console.log(`Updating ${templatesToUpdate.length} existing templates with correct exercise names`);
      
      for (const template of templatesToUpdate) {
        // Find the existing template
        const existingTemplate = existing.find(t => t.name === template.name);
        if (!existingTemplate) continue;
        
        console.log(`Updating exercises for template "${template.name}"...`);
        
        // Look up correct exercise IDs with new names
        const exercisePromises = template.exercises.map(async (ex, index) => {
          const exerciseId = await findExerciseByName(ex.name);
          const { min, max } = parseRepRange(ex.reps);

          return {
            exercise_id: exerciseId,
            order_index: index,
            target_sets: ex.sets,
            target_reps_min: min,
            target_reps_max: max,
            rest_seconds: 90,
          };
        });

        const exercises = await Promise.all(exercisePromises);

        // Filter out exercises that weren't found
        const validExercises = exercises.filter(
          (e): e is typeof e & { exercise_id: string } => e.exercise_id !== null
        );

        if (validExercises.length === 0) {
          console.warn(`No exercises found for template "${template.name}", skipping update`);
          continue;
        }

        // Update template exercises
        await updateTemplateExercises(existingTemplate.id, validExercises as any);

        console.log(
          `Updated template "${template.name}" with ${validExercises.length}/${template.exercises.length} exercises`
        );
      }
      
      console.log('Finished updating existing templates');
    }
    
  } catch (error) {
    console.error('Error adding/updating default templates:', error);
    // Don't throw - this shouldn't break the app
  }
}

