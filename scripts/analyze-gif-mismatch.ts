import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function analyzeGifMismatch() {
  console.log('= Analyzing GIF URL Mismatch...\n');

  // Get sample of broken exercises
  const brokenExerciseNames = [
    'cable cross-over reverse fly',
    't-bar row machine',
    'superman push-up',
    'pec deck machine',
    'reverse hyperextension machine',
    'oblique crunch',
    'handstand push-up',
    'muscle up',
    'kettlebell pistol squat',
    'chest press machine'
  ];

  // Step 1: Get database gif_url for these exercises
  console.log('=� STEP 1: Database gif_url Values');
  console.log('═'.repeat(80));
  
  const { data: exercises } = await supabase
    .from('exercises')
    .select('id, name, gif_url, external_id')
    .eq('is_active', true)
    .in('name', brokenExerciseNames)
    .order('name');

  exercises?.forEach(ex => {
    const filename = ex.gif_url?.split('/').pop() || 'NULL';
    console.log(`${ex.name}`);
    console.log(`  gif_url filename: ${filename}`);
    console.log(`  external_id: ${ex.external_id}`);
    console.log('');
  });

  // Step 2: Get all files in storage
  console.log('\n= STEP 2: Listing Files in Storage');
  console.log('═'.repeat(80));
  
  const { data: allFiles } = await supabase.storage
    .from('exercise-gifs')
    .list('', { limit: 1000 });

  const gifFiles = allFiles?.filter(f => f.name.endsWith('.gif')) || [];
  console.log(`Total GIF files in storage: ${gifFiles.length}\n`);

  // Create a map of storage files
  const storageFileMap = new Map(gifFiles.map(f => [f.name, f]));

  // Step 3: Try to find matching files
  console.log('\n= STEP 3: Searching for Potential Matches');
  console.log('═'.repeat(80));
  
  exercises?.forEach(ex => {
    const dbFilename = ex.gif_url?.split('/').pop();
    const nameSlug = ex.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    console.log(`\n${ex.name}:`);
    console.log(`  Database expects: ${dbFilename}`);
    console.log(`  Exists in storage: ${storageFileMap.has(dbFilename || '') ? '✅ YES' : '❌ NO'}`);
    
    // Try to find similar filenames
    const possibleMatches = gifFiles.filter(f => {
      const fNameLower = f.name.toLowerCase();
      return nameSlug.split('-').some(word => 
        word.length > 3 && fNameLower.includes(word)
      );
    }).slice(0, 3);

    if (possibleMatches.length > 0) {
      console.log(`  Possible matches in storage:`);
      possibleMatches.forEach(m => console.log(`    - ${m.name}`));
    } else {
      console.log(`  No similar files found in storage`);
    }
  });

  // Step 4: Sample of actual storage filenames
  console.log('\n\n= STEP 4: Sample of Actual Storage Filenames (first 30)');
  console.log('═'.repeat(80));
  
  gifFiles.slice(0, 30).forEach((f, i) => {
    console.log(`${String(i + 1).padStart(2)}. ${f.name}`);
  });

  // Step 5: Check filename patterns
  console.log('\n\n=" STEP 5: Filename Pattern Analysis');
  console.log('═'.repeat(80));
  
  const numericFiles = gifFiles.filter(f => /^\d+\.gif$/.test(f.name));
  const textFiles = gifFiles.filter(f => !/^\d+\.gif$/.test(f.name));
  
  console.log(`Numeric filenames (e.g., 0001.gif): ${numericFiles.length}`);
  console.log(`Text filenames (e.g., bench-press.gif): ${textFiles.length}`);
  
  if (numericFiles.length > 0) {
    console.log(`\nSample numeric files:`);
    numericFiles.slice(0, 10).forEach(f => console.log(`  - ${f.name}`));
  }
  
  if (textFiles.length > 0) {
    console.log(`\nSample text files:`);
    textFiles.slice(0, 10).forEach(f => console.log(`  - ${f.name}`));
  }

  // Step 6: Check what database expects vs what exists
  console.log('\n\n= STEP 6: Summary');
  console.log('═'.repeat(80));
  
  const { data: allActiveExercises } = await supabase
    .from('exercises')
    .select('gif_url')
    .eq('is_active', true)
    .not('gif_url', 'is', null);

  const dbExpectsNumeric = allActiveExercises?.filter(ex => {
    const filename = ex.gif_url?.split('/').pop();
    return filename && /^\d+\.gif$/.test(filename);
  }).length || 0;

  const dbExpectsText = allActiveExercises?.filter(ex => {
    const filename = ex.gif_url?.split('/').pop();
    return filename && !/^\d+\.gif$/.test(filename);
  }).length || 0;

  console.log(`\nDatabase gif_url patterns:`);
  console.log(`  Numeric (e.g., 0123.gif): ${dbExpectsNumeric}`);
  console.log(`  Text (e.g., bench-press.gif): ${dbExpectsText}`);
  
  console.log(`\nStorage file patterns:`);
  console.log(`  Numeric: ${numericFiles.length}`);
  console.log(`  Text: ${textFiles.length}`);
  
  console.log(`\n❗ MISMATCH:`);
  if (dbExpectsNumeric > numericFiles.length) {
    console.log(`  Database expects ${dbExpectsNumeric} numeric files`);
    console.log(`  But storage only has ${numericFiles.length} numeric files`);
    console.log(`  Missing: ${dbExpectsNumeric - numericFiles.length} numeric files`);
  }
  
  console.log('\n✅ Analysis complete!\n');
}

analyzeGifMismatch();
