import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

// ==========================================
// TIER 1: ESSENTIAL KEYWORDS (AUTO KEEP)
// ==========================================
const TIER_1_KEYWORDS = [
  'squat', 'deadlift', 'bench press', 'barbell row', 'overhead press',
  'pull-up', 'chin-up', 'dip', 'lunge', 'leg press', 'leg curl', 
  'leg extension', 'calf raise', 'plank', 'crunch'
];

// ==========================================
// EXCLUDE PATTERNS (AUTO REMOVE)
// ==========================================
const EXCLUDE_PATTERNS = [
  'v. 2', 'v. 3', 'v. 4',
  '(kneeling)', 'kneeling',
  'with towel', 'with arm blaster', 'with stability ball',
  'exercise ball, tennis ball',
  'assisted lying', 'assisted standing',
  'yoga pose', 'stretch',
  '45°', '90°',
  ', exercise ball'
];

// ==========================================
// MUSCLE GROUP CAPS
// ==========================================
const MUSCLE_CAPS: { [key: string]: number } = {
  'biceps': 20,
  'triceps': 20,
  'delts': 35,
  'pectorals': 40,
  'abs': 15,
  'lats': 30,
  'upper back': 30,
  'glutes': 40,
  'calves': 20,
  'forearms': 10,
  'traps': 10,
  'spine': 10,
  'cardiovascular system': 10,
  'serratus anterior': 3,
  // NO CAPS on these (we need more):
  'quads': 999,
  'hamstrings': 999,
  'adductors': 999,
  'abductors': 999
};

// ==========================================
// SCORING SYSTEM
// ==========================================
function scoreExercise(exercise: any): number {
  let score = 0;
  const name = (exercise.name || '').toLowerCase();
  const muscle = (exercise.primary_muscles?.[0] || '').toLowerCase();
  const equipment = (exercise.equipment || '').toLowerCase();

  // 1. TIER 1 ESSENTIAL? (+100 points)
  const isTier1 = TIER_1_KEYWORDS.some(keyword => name.includes(keyword));
  if (isTier1) score += 100;

  // 2. MUSCLE GROUP PRIORITY
  if (['quads', 'hamstrings', 'adductors', 'abductors'].includes(muscle)) {
    score += 50; // We need more leg exercises
  } else if (['glutes', 'lats', 'upper back'].includes(muscle)) {
    score += 30;
  } else if (['pectorals', 'delts'].includes(muscle)) {
    score += 20;
  } else if (['biceps', 'triceps'].includes(muscle)) {
    score += 10; // We have too many already
  } else {
    score += 15; // Other muscles
  }

  // 3. EQUIPMENT TYPE
  if (equipment.includes('barbell')) score += 30;
  else if (equipment.includes('dumbbell')) score += 25;
  else if (equipment.includes('body weight')) score += 20;
  else if (equipment.includes('cable')) score += 20;
  else if (equipment.includes('leverage machine') || equipment.includes('machine')) score += 15;
  else if (equipment.includes('kettlebell') || equipment.includes('band')) score += 5;

  // 4. NAME QUALITY
  const wordCount = name.split(' ').length;
  if (wordCount <= 4) score += 20; // Simple names are better
  else if (wordCount <= 6) score += 10;
  else score += 5; // Overly complex names

  // 5. POPULARITY KEYWORDS
  const popularKeywords = [
    'press', 'curl', 'raise', 'extension', 'fly', 'row', 
    'pull', 'push', 'lateral', 'front', 'rear'
  ];
  if (popularKeywords.some(kw => name.includes(kw))) score += 15;

  // 6. PENALTIES
  if (EXCLUDE_PATTERNS.some(pattern => name.includes(pattern.toLowerCase()))) {
    score -= 100; // Basically disqualify
  }

  return score;
}

// ==========================================
// MAIN SELECTION LOGIC
// ==========================================
async function selectExercises() {
  console.log('= Fetching all exercises from database...\n');

  const { data: allExercises, error } = await supabase
    .from('exercises')
    .select('*')
    .order('name');

  if (error || !allExercises) {
    console.error('❌ Error fetching exercises:', error);
    return;
  }

  console.log(`= Total exercises in database: ${allExercises.length}\n`);

  // Score all exercises
  const scored = allExercises.map(ex => ({
    ...ex,
    score: scoreExercise(ex)
  }));

  // Sort by score (highest first)
  scored.sort((a, b) => b.score - a.score);

  // Select with muscle group caps
  const selected: any[] = [];
  const muscleCounts: { [key: string]: number } = {};

  for (const exercise of scored) {
    const muscle = (exercise.primary_muscles?.[0] || 'unknown').toLowerCase();
    const currentCount = muscleCounts[muscle] || 0;
    const cap = MUSCLE_CAPS[muscle] || 999;

    if (currentCount < cap && selected.length < 400) {
      selected.push(exercise);
      muscleCounts[muscle] = currentCount + 1;
    }

    if (selected.length >= 400) break;
  }

  // Display results
  console.log('✅ SELECTED 400 EXERCISES\n');
  console.log('='.repeat(60));
  console.log('\n=� BREAKDOWN BY MUSCLE GROUP:\n');

  Object.entries(muscleCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([muscle, count]) => {
      const cap = MUSCLE_CAPS[muscle] || 999;
      const capStr = cap === 999 ? '∞' : cap.toString();
      console.log(`${muscle.padEnd(25)} ${count.toString().padStart(3)} / ${capStr.padStart(3)}`);
    });

  console.log('\n' + '='.repeat(60));

  // Save to file
  const output = {
    total: selected.length,
    byMuscle: muscleCounts,
    exercises: selected.map(ex => ({
      id: ex.id,
      name: ex.name,
      muscle: ex.primary_muscles?.[0],
      equipment: ex.equipment,
      score: ex.score
    }))
  };

  fs.writeFileSync(
    'scripts/selected-400-exercises.json',
    JSON.stringify(output, null, 2)
  );

  console.log('\n✅ Results saved to: scripts/selected-400-exercises.json');
  console.log('\n=� NEXT STEPS:');
  console.log('1. Review the selected exercises');
  console.log('2. Make manual adjustments if needed');
  console.log('3. Run the database update script to mark as active');
}

selectExercises();
