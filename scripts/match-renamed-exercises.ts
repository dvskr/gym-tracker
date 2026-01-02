import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function matchRenamedExercises() {
  console.log('= MATCHING RENAMED EXERCISES TO GIF FILES');
  console.log('═'.repeat(80));
  console.log('');

  // ============================================
  // STEP 1: Get broken exercises
  // ============================================
  console.log('STEP 1: Getting broken exercises from database');
  console.log('─'.repeat(80));

  const brokenNames = [
    'cable cross-over reverse fly',
    't-bar row machine',
    'superman push-up',
    'pec deck machine',
    'reverse hyperextension machine',
    'barbell lying close-grip triceps extension',
    'cable kneeling crunch',
    'seated row machine',
    'barbell standing front raise over head',
    'elbow-to-knee',
    'reverse fly machine',
    'lever seated reverse fly (parallel grip)',
    'handstand push-up',
    'leg pull in flat bench',
    'chest press machine',
    'lever kneeling twist',
    'shoulder press machine',
    'muscle up',
    'rear decline bridge',
    'kettlebell pistol squat',
    'self assisted inverse leg curl',
    'resistance band hip thrusts on knees',
    'oblique crunch',
    'rowing machine',
    'air bike',
    'belt squat'
  ];

  const { data: brokenExercises } = await supabase
    .from('exercises')
    .select('id, name, external_id, gif_url, equipment, category')
    .eq('is_active', true)
    .or(
      `gif_url.is.null,and(gif_url.not.like.%.gif,gif_url.not.is.null),name.in.(${brokenNames.map(n => `"${n}"`).join(',')})`
    )
    .order('name');

  console.log(`Found ${brokenExercises?.length} broken exercises\n`);

  // ============================================
  // STEP 2: Get all storage files
  // ============================================
  console.log('STEP 2: Getting all storage files');
  console.log('─'.repeat(80));

  const { data: files } = await supabase.storage
    .from('exercise-gifs')
    .list('', { limit: 1000 });

  const storageFiles = files?.filter(f => f.name.endsWith('.gif')).map(f => f.name) || [];
  console.log(`Total storage files: ${storageFiles.length}\n`);

  // ============================================
  // STEP 3: Try to match exercises to files
  // ============================================
  console.log('STEP 3: Attempting to match exercises to GIF files');
  console.log('─'.repeat(80));
  console.log('');

  const matches: any[] = [];

  for (const ex of brokenExercises || []) {
    console.log(`${ex.name}`);
    console.log(`  ID: ${ex.id}`);
    console.log(`  External ID: ${ex.external_id || 'NULL'}`);
    console.log(`  Current gif_url: ${ex.gif_url || 'NULL'}`);
    console.log(`  Equipment: ${ex.equipment}`);
    
    // Try to find matches
    const nameWords = ex.name.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w: string) => w.length > 3); // Only words > 3 chars

    const possibleMatches = storageFiles.filter(filename => {
      const filenameLower = filename.toLowerCase();
      // Check if filename contains key words from exercise name
      return nameWords.some((word: string) => filenameLower.includes(word));
    }).slice(0, 5); // Limit to 5 best matches

    if (possibleMatches.length > 0) {
      console.log(`  = Possible matches:`);
      possibleMatches.forEach(m => console.log(`     - ${m}`));
      
      matches.push({
        exercise: ex,
        possibleFiles: possibleMatches
      });
    } else {
      console.log(`  ❌ No matches found`);
    }
    
    console.log('');
  }

  // ============================================
  // STEP 4: Summary
  // ============================================
  console.log('═'.repeat(80));
  console.log('=� MATCHING SUMMARY');
  console.log('═'.repeat(80));
  console.log(`Total broken exercises: ${brokenExercises?.length}`);
  console.log(`Exercises with possible matches: ${matches.length}`);
  console.log(`Exercises with no matches: ${(brokenExercises?.length || 0) - matches.length}`);
  console.log('');

  // Save results
  fs.writeFileSync(
    path.join(__dirname, 'exercise-gif-matches.json'),
    JSON.stringify({
      timestamp: new Date().toISOString(),
      totalBroken: brokenExercises?.length,
      matchesFound: matches.length,
      matches: matches.map(m => ({
        exerciseId: m.exercise.id,
        exerciseName: m.exercise.name,
        externalId: m.exercise.external_id,
        currentGifUrl: m.exercise.gif_url,
        equipment: m.exercise.equipment,
        category: m.exercise.category,
        possibleFiles: m.possibleFiles
      })),
      noMatches: brokenExercises?.filter(ex => 
        !matches.some(m => m.exercise.id === ex.id)
      ).map(ex => ({
        exerciseId: ex.id,
        exerciseName: ex.name,
        externalId: ex.external_id,
        equipment: ex.equipment
      }))
    }, null, 2)
  );

  console.log('✅ Results saved to scripts/exercise-gif-matches.json');
  console.log('');

  // ============================================
  // STEP 5: Check for UUID matches
  // ============================================
  console.log('═'.repeat(80));
  console.log('BONUS CHECK: Do any exercise IDs match storage filenames?');
  console.log('─'.repeat(80));

  let uuidMatches = 0;
  for (const ex of brokenExercises || []) {
    const expectedFilename = `${ex.id}.gif`;
    if (storageFiles.includes(expectedFilename)) {
      console.log(`✅ ${ex.name} → ${expectedFilename} EXISTS!`);
      uuidMatches++;
    }
  }

  if (uuidMatches === 0) {
    console.log('❌ No exercises have GIF files matching their UUID');
  } else {
    console.log(`\n✅ Found ${uuidMatches} UUID matches!`);
  }
  console.log('');
}

matchRenamedExercises();

