import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function diagnoseAndFix() {
  console.log('= DIAGNOSING GIF URL ISSUE...\n');

  // Step 1: Check database state
  const { data: exercises, error } = await supabase
    .from('exercises')
    .select('id, name, external_id, gif_url')
    .eq('is_active', true)
    .order('name');

  if (error || !exercises) {
    console.error('Error fetching exercises:', error);
    return;
  }

  const withGif = exercises.filter(ex => ex.gif_url);
  const withoutGif = exercises.filter(ex => !ex.gif_url);

  console.log('=� DATABASE STATE:');
  console.log(`Total active exercises: ${exercises.length}`);
  console.log(`With gif_url: ${withGif.length}`);
  console.log(`Without gif_url: ${withoutGif.length}\n`);

  // Step 2: Check Supabase storage
  const { data: storageFiles, error: storageError } = await supabase
    .storage
    .from('exercise-gifs')
    .list();

  if (storageError || !storageFiles) {
    console.error('Error fetching storage files:', storageError);
    return;
  }

  console.log(`= SUPABASE STORAGE:`);
  console.log(`GIF files in storage: ${storageFiles.length}\n`);

  // Step 3: Show sample exercises without GIFs
  console.log('❌ SAMPLE EXERCISES WITHOUT GIFs (first 20):');
  withoutGif.slice(0, 20).forEach((ex, i) => {
    console.log(`${i + 1}. ${ex.name} (external_id: ${ex.external_id || 'none'})`);
  });

  // Step 4: Show sample exercises WITH GIFs
  console.log('\n✅ SAMPLE EXERCISES WITH GIFs (first 10):');
  withGif.slice(0, 10).forEach((ex, i) => {
    const filename = ex.gif_url?.split('/').pop();
    console.log(`${i + 1}. ${ex.name} → ${filename}`);
  });

  console.log('\n' + '='.repeat(60));
  console.log('PROBLEM IDENTIFIED:');
  console.log('='.repeat(60));
  console.log(`${withoutGif.length} exercises need gif_url populated`);
  console.log(`But we have ${storageFiles.length} GIF files in storage`);
  console.log('\nMismatch suggests exercises and GIF files are not properly linked.\n');

  // Step 5: Attempt to fix by matching external_id
  console.log('=' ATTEMPTING TO FIX...\n');

  // For exercises with external_id, try to find a matching GIF in storage
  // The GIF files should be named after external_id or be in a mapping
  
  let fixed = 0;
  for (const ex of withoutGif) {
    if (!ex.external_id) continue;

    // Try to find a GIF that might belong to this exercise
    // Option 1: Check if there's a mapping in our storage metadata
    // Option 2: Use external_id to construct expected GIF name
    
    // For now, we can't automatically fix this without knowing the naming convention
    // The issue is that GIF files are named with UUIDs, not external_ids
  }

  console.log(`Fixed: ${fixed} exercises`);
  console.log('\n' + '='.repeat(60));
  console.log('RECOMMENDATION:');
  console.log('='.repeat(60));
  console.log('The GIF files in storage use UUID names, making it impossible to');
  console.log('automatically match them to exercises without a mapping file.');
  console.log('\nOptions:');
  console.log('1. Download fresh GIFs from ExerciseDB for the 84 missing exercises');
  console.log('2. Use the original upload script that should have created the mapping');
  console.log('3. Manually create a mapping between exercise external_ids and GIF filenames\n');
}

diagnoseAndFix();
