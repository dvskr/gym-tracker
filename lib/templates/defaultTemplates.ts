import { supabase } from '@/lib/supabase';

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
    console.error('Error fetching exercises for enrichment:', error);
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
    console.warn(`Exercise not found in database: ${templateEx.name}`);
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
      console.error(`Error fetching exercises for ${templateId}:`, error);
      continue;
    }

    // Filter to exercises matching this template's muscles
    const matchingExercises = allExercises.filter(ex => 
      config.muscles.some(muscle => 
        ex.primary_muscles?.toLowerCase().includes(muscle.toLowerCase())
      )
    );

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
 * Fallback static templates using verified exercises with downloaded GIFs
 * Exercise names match exactly with database entries (case-insensitive)
 */
export const FALLBACK_TEMPLATES: DefaultTemplate[] = [
  {
    id: 'push-day',
    name: 'Push Day',
    description: 'Chest, Shoulders, Triceps',
    color: '#3b82f6',
    muscleGroups: ['pectorals', 'delts', 'triceps'],
    exercises: [
      { id: 'fallback-1', name: 'barbell bench press', sets: 4, reps: '6-8' },
      { id: 'fallback-2', name: 'dumbbell incline bench press', sets: 3, reps: '8-10' },
      { id: 'fallback-3', name: 'dumbbell seated shoulder press', sets: 3, reps: '8-10' },
      { id: 'fallback-4', name: 'dumbbell lateral raise', sets: 3, reps: '12-15' },
      { id: 'fallback-5', name: 'bench dip (knees bent)', sets: 3, reps: '10-12' },
    ],
  },
  {
    id: 'pull-day',
    name: 'Pull Day',
    description: 'Back, Biceps, Rear Delts',
    color: '#10b981',
    muscleGroups: ['lats', 'upper back', 'biceps'],
    exercises: [
      { id: 'fallback-6', name: 'barbell bent over row', sets: 4, reps: '6-8' },
      { id: 'fallback-7', name: 'cable pulldown', sets: 3, reps: '8-10' },
      { id: 'fallback-8', name: 'cable seated row', sets: 3, reps: '10-12' },
      { id: 'fallback-9', name: 'dumbbell rear fly', sets: 3, reps: '12-15' },
      { id: 'fallback-10', name: 'barbell curl', sets: 3, reps: '10-12' },
    ],
  },
  {
    id: 'leg-day',
    name: 'Leg Day',
    description: 'Quads, Hamstrings, Glutes, Calves',
    color: '#f59e0b',
    muscleGroups: ['quads', 'hamstrings', 'glutes', 'calves'],
    exercises: [
      { id: 'fallback-11', name: 'barbell full squat', sets: 4, reps: '6-8' },
      { id: 'fallback-12', name: 'barbell romanian deadlift', sets: 3, reps: '8-10' },
      { id: 'fallback-13', name: 'lever leg extension', sets: 3, reps: '10-12' },
      { id: 'fallback-14', name: 'lever lying leg curl', sets: 3, reps: '10-12' },
      { id: 'fallback-15', name: 'lever standing calf raise', sets: 4, reps: '12-15' },
    ],
  },
  {
    id: 'upper-body',
    name: 'Upper Body',
    description: 'Full Upper Body Workout',
    color: '#8b5cf6',
    muscleGroups: ['pectorals', 'lats', 'delts', 'biceps', 'triceps'],
    exercises: [
      { id: 'fallback-16', name: 'barbell bench press', sets: 3, reps: '8-10' },
      { id: 'fallback-17', name: 'barbell bent over row', sets: 3, reps: '8-10' },
      { id: 'fallback-18', name: 'dumbbell seated shoulder press', sets: 3, reps: '10-12' },
      { id: 'fallback-19', name: 'cable pulldown', sets: 3, reps: '10-12' },
      { id: 'fallback-20', name: 'barbell curl', sets: 2, reps: '10-12' },
      { id: 'fallback-21', name: 'bench dip (knees bent)', sets: 2, reps: '12-15' },
    ],
  },
  {
    id: 'lower-body',
    name: 'Lower Body',
    description: 'Full Lower Body Workout',
    color: '#ef4444',
    muscleGroups: ['quads', 'hamstrings', 'glutes', 'calves'],
    exercises: [
      { id: 'fallback-22', name: 'barbell full squat', sets: 4, reps: '6-8' },
      { id: 'fallback-23', name: 'barbell romanian deadlift', sets: 3, reps: '8-10' },
      { id: 'fallback-24', name: 'dumbbell lunge', sets: 3, reps: '10-12' },
      { id: 'fallback-25', name: 'lever lying leg curl', sets: 3, reps: '10-12' },
      { id: 'fallback-26', name: 'lever standing calf raise', sets: 4, reps: '12-15' },
    ],
  },
  {
    id: 'full-body',
    name: 'Full Body',
    description: 'Complete Full Body Workout',
    color: '#06b6d4',
    muscleGroups: ['pectorals', 'lats', 'quads', 'delts', 'hamstrings'],
    exercises: [
      { id: 'fallback-27', name: 'barbell full squat', sets: 3, reps: '8-10' },
      { id: 'fallback-28', name: 'barbell bench press', sets: 3, reps: '8-10' },
      { id: 'fallback-29', name: 'barbell bent over row', sets: 3, reps: '8-10' },
      { id: 'fallback-30', name: 'dumbbell seated shoulder press', sets: 3, reps: '10-12' },
      { id: 'fallback-31', name: 'barbell romanian deadlift', sets: 3, reps: '10-12' },
    ],
  },
];

