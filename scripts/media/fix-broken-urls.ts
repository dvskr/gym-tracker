import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY!);

async function fixBrokenGifUrls() {
  console.log('');
  console.log('🔧 ATTEMPTING TO FIX BROKEN GIF URLS');
  console.log('═'.repeat(70));
  console.log('');

  // Get exercises with broken URLs (no .gif extension)
  const { data: brokenExercises } = await supabase
    .from('exercises')
    .select('id, name, external_id, gif_url')
    .eq('is_active', true)
    .not('gif_url', 'is', null)
    .not('gif_url', 'like', '%.gif');

  console.log(`📊 Found ${brokenExercises?.length || 0} exercises with broken gif_url`);

  // Get all files in storage
  const { data: files } = await supabase.storage
    .from('exercise-gifs')
    .list('', { limit: 1000 });

  const storageFilenames = new Set(files?.filter(f => f.name.endsWith('.gif')).map(f => f.name) || []);
  
  console.log(`📁 Found ${storageFilenames.size} GIF files in storage`);
  console.log('');

  let fixable = 0;
  let unfixable = 0;
  const fixableExercises: any[] = [];
  const unfixableExercises: any[] = [];

  console.log('🔍 Checking if files exist with .gif extension added...');
  console.log('');

  for (const exercise of brokenExercises || []) {
    const currentFilename = exercise.gif_url.split('/').pop(); // e.g., "0056"
    const expectedFilename = currentFilename + '.gif'; // e.g., "0056.gif"

    if (storageFilenames.has(expectedFilename)) {
      fixable++;
      fixableExercises.push({
        ...exercise,
        currentFilename,
        expectedFilename
      });
      console.log(`✅ ${exercise.name}`);
      console.log(`   Current: ${currentFilename}`);
      console.log(`   Fixed:   ${expectedFilename} (EXISTS in storage)`);
      console.log('');
    } else {
      unfixable++;
      unfixableExercises.push({
        ...exercise,
        currentFilename,
        expectedFilename
      });
    }
  }

  console.log('═'.repeat(70));
  console.log('📊 ANALYSIS RESULTS');
  console.log('═'.repeat(70));
  console.log(`✅ Fixable (file exists with .gif):     ${fixable}`);
  console.log(`❌ Unfixable (file doesn't exist):       ${unfixable}`);
  console.log('');

  if (fixable === 0) {
    console.log('❌ NO FIXABLE EXERCISES');
    console.log('   All 23 files genuinely do not exist in storage.');
    console.log('   They need to be manually sourced (see MISSING_GIFS_GUIDE.md)');
    console.log('');
    return;
  }

  // Show what will be fixed
  console.log('📋 EXERCISES THAT CAN BE AUTO-FIXED:');
  console.log('═'.repeat(70));
  fixableExercises.forEach(ex => {
    const newUrl = ex.gif_url + '.gif';
    console.log(`${ex.name}`);
    console.log(`  Old: ${ex.gif_url}`);
    console.log(`  New: ${newUrl}`);
    console.log('');
  });

  // Prompt for confirmation
  console.log('═'.repeat(70));
  console.log(`Ready to update ${fixable} exercises in database.`);
  console.log('Run this script with --execute flag to apply fixes.');
  console.log('');
  console.log('Command: npx tsx scripts/fix-broken-urls.ts --execute');
  console.log('═'.repeat(70));
  console.log('');

  // Check for --execute flag
  if (process.argv.includes('--execute')) {
    console.log('🔧 APPLYING FIXES...');
    console.log('');

    let updated = 0;
    let failed = 0;

    for (const exercise of fixableExercises) {
      const newUrl = exercise.gif_url + '.gif';

      const { error } = await supabase
        .from('exercises')
        .update({ gif_url: newUrl })
        .eq('id', exercise.id);

      if (error) {
        console.log(`❌ Failed: ${exercise.name} - ${error.message}`);
        failed++;
      } else {
        console.log(`✅ Updated: ${exercise.name}`);
        updated++;
      }
    }

    console.log('');
    console.log('═'.repeat(70));
    console.log('📊 UPDATE RESULTS');
    console.log('═'.repeat(70));
    console.log(`✅ Successfully updated: ${updated}`);
    console.log(`❌ Failed: ${failed}`);
    console.log('');

    if (unfixable > 0) {
      console.log(`⚠️ ${unfixable} exercises still need manual GIF sourcing`);
      console.log('   See MISSING_GIFS_GUIDE.md for instructions');
    }
  }
}

fixBrokenGifUrls();
