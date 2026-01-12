import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/utils/logger';

export interface DefaultTemplateExercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  gif_url?: string;
}

export interface DefaultTemplate {
  id: string;
  name: string;
  description: string;
  color: string;
  muscleGroups: string[];
  exercises: DefaultTemplateExercise[];
}

// Muscle groups for each template type
const TEMPLATE_CONFIG: Record<string, { muscles: string[]; color: string; description: string }> = {
  'push-day': {
    muscles: ['pectorals', 'delts', 'triceps'],
    color: '#3b82f6',
    description: 'Chest, Shoulders, Triceps',
  },
  'pull-day': {
    muscles: ['lats', 'upper back', 'biceps'],
    color: '#10b981',
    description: 'Back, Biceps, Rear Delts',
  },
  'leg-day': {
    muscles: ['quads', 'hamstrings', 'glutes', 'calves'],
    color: '#f59e0b',
    description: 'Quads, Hamstrings, Glutes, Calves',
  },
  'upper-body': {
    muscles: ['pectorals', 'lats', 'delts', 'biceps', 'triceps', 'upper back'],
    color: '#8b5cf6',
    description: 'Full Upper Body Workout',
  },
  'lower-body': {
    muscles: ['quads', 'hamstrings', 'glutes', 'calves'],
    color: '#ef4444',
    description: 'Full Lower Body Workout',
  },
  'full-body': {
    muscles: ['pectorals', 'lats', 'quads', 'delts', 'hamstrings'],
    color: '#06b6d4',
    description: 'Complete Full Body Workout',
  },
};

// Preferred exercises for each template (will be matched against DB)
const PREFERRED_EXERCISES: Record<string, string[]> = {
  'push-day': [
    'bench press',
    'incline press',
    'overhead press',
    'shoulder press',
    'lateral raise',
    'tricep',
    'pushdown',
    'dip',
    'fly',
  ],
  'pull-day': [
    'row',
    'pull up',
    'pullup',
    'lat pulldown',
    'pulldown',
    'curl',
    'face pull',
    'deadlift',
  ],
  'leg-day': [
    'squat',
    'leg press',
    'romanian deadlift',
    'leg curl',
    'leg extension',
    'calf raise',
    'lunge',
  ],
  'upper-body': [
    'bench press',
    'row',
    'overhead press',
    'pull up',
    'pullup',
    'lat pulldown',
    'curl',
    'tricep',
    'pushdown',
  ],
  'lower-body': [
    'squat',
    'deadlift',
    'leg press',
    'romanian deadlift',
    'lunge',
    'leg curl',
    'leg extension',
    'calf raise',
  ],
  'full-body': [
    'squat',
    'bench press',
    'row',
    'overhead press',
    'deadlift',
    'pull up',
    'pullup',
  ],
};

// Default sets/reps for exercise types
function getSetsReps(exerciseName: string): { sets: number; reps: string } {
  const name = exerciseName.toLowerCase();
  
  // Compound movements - heavier, fewer reps
  if (name.includes('squat') || name.includes('deadlift') || name.includes('bench press')) {
    return { sets: 4, reps: '6-8' };
  }
  if (name.includes('row') || name.includes('press') || name.includes('pull up')) {
    return { sets: 3, reps: '8-10' };
  }
  // Isolation movements - lighter, more reps
  if (name.includes('curl') || name.includes('extension') || name.includes('raise') || name.includes('fly')) {
    return { sets: 3, reps: '12-15' };
  }
  if (name.includes('calf')) {
    return { sets: 4, reps: '15-20' };
  }
  // Default
  return { sets: 3, reps: '10-12' };
}

/**
 * Enriches template exercises with actual database data by matching exercise names
 */
async function enrichTemplateExercises(template: DefaultTemplate): Promise<DefaultTemplate> {
  // Get all exercise names from template (lowercase for matching)
  const exerciseNames = template.exercises.map(ex => ex.name.toLowerCase());

  // Fetch matching exercises from database
  const { data: dbExercises, error } = await supabase
    .from('exercises')
    .select('id, name, primary_muscles, equipment, gif_url')
    .eq('is_active', true)
    .not('gif_url', 'is', null)
    .not('gif_url', 'eq', '');

  if (error || !dbExercises) {
 logger.error('Error fetching exercises for enrichment:', error);
    return template;
  }

  // Map template exercises to DB exercises by name (case-insensitive)
  const enrichedExercises: DefaultTemplateExercise[] = template.exercises.map(templateEx => {
    const dbEx = dbExercises.find(
      db => db.name.toLowerCase() === templateEx.name.toLowerCase()
    );

    if (dbEx) {
      return {
        id: dbEx.id,
        name: dbEx.name,
        sets: templateEx.sets,
        reps: templateEx.reps,
        gif_url: dbEx.gif_url || undefined,
      };
    }

    // If not found in DB, return original (may not have valid ID/GIF)
 logger.warn(`Exercise not found in database: ${templateEx.name}`);
    return templateEx;
  }).filter(ex => ex.id !== 'fallback-1' && !ex.id.startsWith('fallback')); // Remove exercises without real IDs

  return {
    ...template,
    exercises: enrichedExercises,
  };
}

/**
 * Fetches exercises from database that match template requirements
 * Only returns exercises with GIFs
 */
export async function fetchDefaultTemplates(): Promise<DefaultTemplate[]> {
  const templates: DefaultTemplate[] = [];

  for (const [templateId, config] of Object.entries(TEMPLATE_CONFIG)) {
    const templateName = templateId
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    // Fetch exercises for this template's muscle groups WITH GIFs only
    const { data: allExercises, error } = await supabase
      .from('exercises')
      .select('id, name, primary_muscles, secondary_muscles, equipment, gif_url')
      .eq('is_active', true)
      .not('gif_url', 'is', null)
      .not('gif_url', 'eq', '')
      .order('name');

    if (error || !allExercises) {
 logger.error(`Error fetching exercises for ${templateId}:`, error);
      continue;
    }

    // Filter to exercises matching this template's muscles
    const matchingExercises = allExercises.filter(ex => {
      // Handle primary_muscles as either string or array
      const primaryMuscles = Array.isArray(ex.primary_muscles) 
        ? ex.primary_muscles 
        : (ex.primary_muscles ? [ex.primary_muscles] : []);
      
      return config.muscles.some(muscle => 
        primaryMuscles.some(pm => 
          pm?.toLowerCase().includes(muscle.toLowerCase())
        )
      );
    });

    // Find preferred exercises that exist in database
    const preferredPatterns = PREFERRED_EXERCISES[templateId] || [];
    const selectedExercises: DefaultTemplateExercise[] = [];
    const usedIds = new Set<string>();

    // First pass: find exercises matching preferred patterns
    for (const pattern of preferredPatterns) {
      if (selectedExercises.length >= 5) break; // Max 5 exercises per template

      const match = matchingExercises.find(ex => 
        !usedIds.has(ex.id) && 
        ex.name.toLowerCase().includes(pattern.toLowerCase())
      );

      if (match) {
        usedIds.add(match.id);
        const { sets, reps } = getSetsReps(match.name);
        selectedExercises.push({
          id: match.id,
          name: match.name,
          sets,
          reps,
          gif_url: match.gif_url || undefined,
        });
      }
    }

    // If we don't have enough, add more from matching exercises
    if (selectedExercises.length < 4) {
      // Prefer barbell/dumbbell exercises
      const prioritized = matchingExercises
        .filter(ex => !usedIds.has(ex.id))
        .sort((a, b) => {
          const aScore = (a.equipment?.includes('barbell') ? 2 : 0) + 
                        (a.equipment?.includes('dumbbell') ? 1 : 0);
          const bScore = (b.equipment?.includes('barbell') ? 2 : 0) + 
                        (b.equipment?.includes('dumbbell') ? 1 : 0);
          return bScore - aScore;
        });

      for (const ex of prioritized) {
        if (selectedExercises.length >= 5) break;
        usedIds.add(ex.id);
        const { sets, reps } = getSetsReps(ex.name);
        selectedExercises.push({
          id: ex.id,
          name: ex.name,
          sets,
          reps,
          gif_url: ex.gif_url || undefined,
        });
      }
    }

    templates.push({
      id: templateId,
      name: templateName,
      description: config.description,
      color: config.color,
      muscleGroups: config.muscles,
      exercises: selectedExercises,
    });
  }

  return templates;
}

/**
 * Enriches fallback templates with actual database IDs and GIF URLs
 */
export async function getEnrichedFallbackTemplates(): Promise<DefaultTemplate[]> {
  const enrichedTemplates = await Promise.all(
    FALLBACK_TEMPLATES.map(template => enrichTemplateExercises(template))
  );
  
  // Filter out templates with no valid exercises
  return enrichedTemplates.filter(t => t.exercises.length > 0);
}

/**
 * Single source of truth for default templates
 * These are used for both guest mode and seeding new user accounts
 * Exercise names match exactly with database entries (case-insensitive)
 */
export const FALLBACK_TEMPLATES: DefaultTemplate[] = [
  {
    id: 'push-day',
    name: 'Push Day',
    description: 'Chest, shoulders, and triceps',
    color: '#3b82f6',
    muscleGroups: ['chest', 'shoulders', 'triceps'],
    exercises: [
      { id: 'fallback-1', name: 'barbell bench press', sets: 4, reps: '6-8' },
      { id: 'fallback-2', name: 'dumbbell incline bench press', sets: 3, reps: '8-10' },
      { id: 'fallback-3', name: 'barbell seated overhead press', sets: 3, reps: '8-10' },
      { id: 'fallback-4', name: 'dumbbell lateral raise', sets: 3, reps: '12-15' },
      { id: 'fallback-5', name: 'cable pushdown', sets: 3, reps: '10-12' },
      { id: 'fallback-6', name: 'cable pushdown (with rope attachment)', sets: 3, reps: '10-12' },
    ],
  },
  {
    id: 'pull-day',
    name: 'Pull Day',
    description: 'Back and biceps',
    color: '#10b981',
    muscleGroups: ['back', 'biceps'],
    exercises: [
      { id: 'fallback-7', name: 'barbell deadlift', sets: 4, reps: '5-6' },
      { id: 'fallback-8', name: 'pull-up', sets: 3, reps: '6-10' },
      { id: 'fallback-9', name: 'barbell bent over row', sets: 3, reps: '8-10' },
      { id: 'fallback-10', name: 'cable rear pulldown', sets: 3, reps: '12-15' },
      { id: 'fallback-11', name: 'barbell curl', sets: 3, reps: '10-12' },
      { id: 'fallback-12', name: 'dumbbell hammer curl', sets: 3, reps: '10-12' },
    ],
  },
  {
    id: 'leg-day',
    name: 'Leg Day',
    description: 'Quads, hamstrings, glutes, and calves',
    color: '#f59e0b',
    muscleGroups: ['quadriceps', 'hamstrings', 'glutes', 'calves'],
    exercises: [
      { id: 'fallback-13', name: 'barbell full squat', sets: 4, reps: '6-8' },
      { id: 'fallback-14', name: 'barbell romanian deadlift', sets: 3, reps: '8-10' },
      { id: 'fallback-15', name: 'sled 45° leg press', sets: 3, reps: '10-12' },
      { id: 'fallback-16', name: 'lying leg curl machine', sets: 3, reps: '10-12' },
      { id: 'fallback-17', name: 'leg extension machine', sets: 3, reps: '12-15' },
      { id: 'fallback-18', name: 'lever standing calf raise', sets: 4, reps: '12-15' },
    ],
  },
  {
    id: 'upper-body',
    name: 'Upper Body',
    description: 'Full upper body - chest, back, shoulders, arms',
    color: '#8b5cf6',
    muscleGroups: ['chest', 'back', 'shoulders', 'arms'],
    exercises: [
      { id: 'fallback-19', name: 'barbell bench press', sets: 4, reps: '6-8' },
      { id: 'fallback-20', name: 'barbell bent over row', sets: 4, reps: '6-8' },
      { id: 'fallback-21', name: 'barbell seated overhead press', sets: 3, reps: '8-10' },
      { id: 'fallback-22', name: 'pull-up', sets: 3, reps: '8-10' },
      { id: 'fallback-23', name: 'dumbbell hammer curl', sets: 3, reps: '10-12' },
      { id: 'fallback-24', name: 'triceps dip', sets: 3, reps: '10-12' },
    ],
  },
  {
    id: 'full-body',
    name: 'Full Body',
    description: 'Complete full body workout',
    color: '#06b6d4',
    muscleGroups: ['full body'],
    exercises: [
      { id: 'fallback-25', name: 'barbell full squat', sets: 3, reps: '8-10' },
      { id: 'fallback-26', name: 'barbell bench press', sets: 3, reps: '8-10' },
      { id: 'fallback-27', name: 'barbell bent over row', sets: 3, reps: '8-10' },
      { id: 'fallback-28', name: 'dumbbell standing overhead press', sets: 3, reps: '10-12' },
      { id: 'fallback-29', name: 'barbell romanian deadlift', sets: 3, reps: '10-12' },
    ],
  },
  {
    id: 'arms',
    name: 'Arms',
    description: 'Biceps and triceps focus',
    color: '#ec4899',
    muscleGroups: ['biceps', 'triceps'],
    exercises: [
      { id: 'fallback-30', name: 'barbell curl', sets: 3, reps: '8-10' },
      { id: 'fallback-31', name: 'cable pushdown', sets: 3, reps: '10-12' },
      { id: 'fallback-32', name: 'dumbbell hammer curl', sets: 3, reps: '10-12' },
      { id: 'fallback-33', name: 'cable pushdown (with rope attachment)', sets: 3, reps: '10-12' },
      { id: 'fallback-34', name: 'dumbbell concentration curl', sets: 3, reps: '12-15' },
      { id: 'fallback-35', name: 'triceps dip (bench leg)', sets: 3, reps: '12-15' },
    ],
  },
  {
    id: 'back-biceps',
    name: 'Back & Biceps',
    description: 'Complete back development + biceps',
    color: '#14b8a6',
    muscleGroups: ['back', 'biceps'],
    exercises: [
      { id: 'fallback-36', name: 'barbell deadlift', sets: 4, reps: '5' },
      { id: 'fallback-37', name: 'pull-up', sets: 3, reps: '8-10' },
      { id: 'fallback-38', name: 'cable seated row', sets: 3, reps: '10-12' },
      { id: 'fallback-39', name: 'lat pulldown cable', sets: 3, reps: '10-12' },
      { id: 'fallback-40', name: 'barbell curl', sets: 3, reps: '10-12' },
      { id: 'fallback-41', name: 'dumbbell hammer curl', sets: 3, reps: '10-12' },
    ],
  },
  {
    id: 'chest-triceps',
    name: 'Chest & Triceps',
    description: 'Chest pressing + triceps',
    color: '#f97316',
    muscleGroups: ['chest', 'triceps'],
    exercises: [
      { id: 'fallback-42', name: 'barbell bench press', sets: 4, reps: '6-8' },
      { id: 'fallback-43', name: 'dumbbell incline bench press', sets: 3, reps: '8-10' },
      { id: 'fallback-44', name: 'dumbbell fly', sets: 3, reps: '10-12' },
      { id: 'fallback-45', name: 'cable pushdown', sets: 3, reps: '10-12' },
      { id: 'fallback-46', name: 'dumbbell kickback', sets: 3, reps: '12-15' },
      { id: 'fallback-47', name: 'push-up', sets: 3, reps: '15-20' },
    ],
  },
  {
    id: 'shoulders',
    name: 'Shoulders',
    description: 'All three delt heads',
    color: '#a855f7',
    muscleGroups: ['shoulders'],
    exercises: [
      { id: 'fallback-48', name: 'barbell seated overhead press', sets: 4, reps: '6-8' },
      { id: 'fallback-49', name: 'dumbbell arnold press', sets: 3, reps: '8-10' },
      { id: 'fallback-50', name: 'dumbbell lateral raise', sets: 3, reps: '12-15' },
      { id: 'fallback-51', name: 'dumbbell rear fly', sets: 3, reps: '12-15' },
      { id: 'fallback-52', name: 'cable lateral raise', sets: 3, reps: '12-15' },
      { id: 'fallback-53', name: 'barbell shrug', sets: 3, reps: '12-15' },
    ],
  },
  {
    id: 'home-workout',
    name: 'Home Workout',
    description: 'Full body with minimal equipment',
    color: '#84cc16',
    muscleGroups: ['full body'],
    exercises: [
      { id: 'fallback-54', name: 'push-up', sets: 4, reps: '10-15' },
      { id: 'fallback-55', name: 'pull-up', sets: 3, reps: '6-10' },
      { id: 'fallback-56', name: 'forward lunge', sets: 3, reps: '12' },
      { id: 'fallback-57', name: 'triceps dip (bench leg)', sets: 3, reps: '12-15' },
      { id: 'fallback-58', name: 'inverted row', sets: 3, reps: '10-12' },
      { id: 'fallback-59', name: 'jump squat', sets: 3, reps: '15' },
    ],
  },
];


