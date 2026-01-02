import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkUuidFilesExist() {
  console.log('= CHECKING UUID FILES FOR BROKEN EXERCISES');
  console.log('═'.repeat(80));
  console.log('');

  // ============================================
  // STEP 1: Get exercises with broken gif_url (no .gif extension)
  // ============================================
  console.log('=� STEP 1: Getting exercises with broken gif_url (no .gif extension)');
  console.log('─'.repeat(80));

  const { data: brokenExercises, error: dbError } = await supabase
    .from('exercises')
    .select('id, name, gif_url, external_id')
    .eq('is_active', true)
    .not('gif_url', 'is', null)
    .not('gif_url', 'like', '%.gif')
    .order('name');

  if (dbError) {
    console.error('❌ Database error:', dbError.message);
    return;
  }

  console.log(`Found ${brokenExercises?.length} exercises with broken gif_url\n`);

  if (!brokenExercises || brokenExercises.length === 0) {
    console.log('✅ No broken exercises found!');
    return;
  }

  // Display them
  brokenExercises.forEach((ex, i) => {
    console.log(`${i + 1}. ${ex.name}`);
    console.log(`   ID: ${ex.id}`);
    console.log(`   Current gif_url: ${ex.gif_url}`);
    console.log(`   External ID: ${ex.external_id || 'NULL'}`);
    console.log('');
  });

  // ============================================
  // STEP 2: Get all files in storage
  // ============================================
  console.log('= STEP 2: Listing all files in exercise-gifs storage');
  console.log('─'.repeat(80));

  const { data: files, error: storageError } = await supabase.storage
    .from('exercise-gifs')
    .list('', { limit: 1000 });

  if (storageError) {
    console.error('❌ Storage error:', storageError.message);
    return;
  }

  const storageFilenames = new Set(files?.map(f => f.name) || []);
  console.log(`Total files in storage: ${storageFilenames.size}\n`);

  // ============================================
  // STEP 3: Check if UUID files exist
  // ============================================
  console.log('= STEP 3: Checking if UUID files exist for broken exercises');
  console.log('─'.repeat(80));
  console.log('');

  const existingFiles: any[] = [];
  const missingFiles: any[] = [];

  for (const ex of brokenExercises) {
    const expectedFilename = `${ex.id}.gif`;
    const fileExists = storageFilenames.has(expectedFilename);
    
    const status = fileExists ? '✅' : '❌';
    console.log(`${status} ${ex.name}`);
    console.log(`   Expected file: ${expectedFilename}`);
    console.log(`   Exists: ${fileExists ? 'YES' : 'NO'}`);
    console.log('');

    if (fileExists) {
      existingFiles.push({
        ...ex,
        expectedFilename,
        newGifUrl: `${SUPABASE_URL}/storage/v1/object/public/exercise-gifs/${expectedFilename}`
      });
    } else {
      missingFiles.push({
        ...ex,
        expectedFilename
      });
    }
  }

  // ============================================
  // STEP 4: Summary
  // ============================================
  console.log('═'.repeat(80));
  console.log('= SUMMARY');
  console.log('═'.repeat(80));
  console.log(`Total broken exercises: ${brokenExercises.length}`);
  console.log(`✅ UUID files exist in storage: ${existingFiles.length}`);
  console.log(`❌ UUID files missing from storage: ${missingFiles.length}`);
  console.log('');

  if (existingFiles.length > 0) {
    console.log('✅ EXERCISES READY TO FIX (UUID file exists):');
    console.log('─'.repeat(80));
    existingFiles.forEach(ex => {
      console.log(`• ${ex.name}`);
      console.log(`  Current: ${ex.gif_url}`);
      console.log(`  Fix to:  ${ex.newGifUrl}`);
      console.log('');
    });
  }

  if (missingFiles.length > 0) {
    console.log('❌ EXERCISES WITH MISSING FILES (need upload or deactivate):');
    console.log('─'.repeat(80));
    missingFiles.forEach(ex => {
      console.log(`• ${ex.name} (${ex.id})`);
      console.log(`  Missing file: ${ex.expectedFilename}`);
      console.log(`  External ID: ${ex.external_id || 'NULL'}`);
      console.log('');
    });
  }

  // Save results
  const fs = require('fs');
  fs.writeFileSync(
    'scripts/uuid-files-check-result.json',
    JSON.stringify({ existingFiles, missingFiles }, null, 2)
  );
  console.log('✅ Results saved to scripts/uuid-files-check-result.json\n');

  // ============================================
  // STEP 5: Recommendation
  // ============================================
  console.log('═'.repeat(80));
  console.log('=� RECOMMENDATION');
  console.log('═'.repeat(80));

  if (missingFiles.length === 0) {
    console.log(' ALL UUID FILES EXIST!');
    console.log('');
    console.log('✅ Safe to update database gif_url to use UUID pattern.');
    console.log('');
    console.log('Next step: Run fix script to update all 23 exercises.');
  } else if (existingFiles.length > 0) {
    console.log('  MIXED RESULTS');
    console.log('');
    console.log(`✅ ${existingFiles.length} exercises can be fixed immediately`);
    console.log(`❌ ${missingFiles.length} exercises need files uploaded or deactivation`);
    console.log('');
    console.log('Options:');
    console.log('1. Fix the working ones first');
    console.log('2. Upload missing GIF files');
    console.log('3. Deactivate exercises with missing files');
  } else {
    console.log('❌ NO UUID FILES EXIST');
    console.log('');
    console.log('All 23 exercises need:');
    console.log('- GIF files uploaded with UUID names, OR');
    console.log('- To be marked as inactive');
  }

  console.log('');
  console.log('═'.repeat(80));
}

checkUuidFilesExist();
