import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function getAccurateCounts() {
  console.log('=� ACCURATE CURRENT STATE - FRESH COUNT');
  console.log('═'.repeat(80));
  console.log('');

  // ============================================
  // STEP 1: Count Supabase Storage Files
  // ============================================
  console.log('=� STEP 1: Supabase Storage Counts');
  console.log('─'.repeat(80));

  // Count exercise-gifs
  const { data: gifFiles, error: gifError } = await supabase.storage
    .from('exercise-gifs')
    .list('', { limit: 1000 });

  if (gifError) {
    console.error('❌ Error listing exercise-gifs:', gifError.message);
  }

  const totalGifs = gifFiles?.length || 0;
  const gifExtensions = gifFiles?.filter(f => f.name.endsWith('.gif')).length || 0;
  const gifNumeric = gifFiles?.filter(f => /^\d+\.gif$/.test(f.name)).length || 0;
  const gifUUID = gifFiles?.filter(f => !(/^\d+\.gif$/.test(f.name)) && f.name.endsWith('.gif')).length || 0;

  console.log(`exercise-gifs bucket:`);
  console.log(`  Total files: ${totalGifs}`);
  console.log(`  .gif files: ${gifExtensions}`);
  console.log(`    • Numeric pattern (0001.gif): ${gifNumeric}`);
  console.log(`    • UUID/Other pattern: ${gifUUID}`);
  console.log('');

  // Count exercise-thumbnails
  const { data: thumbFiles, error: thumbError } = await supabase.storage
    .from('exercise-thumbnails')
    .list('', { limit: 2000 });

  if (thumbError) {
    console.error('❌ Error listing exercise-thumbnails:', thumbError.message);
  }

  const totalThumbs = thumbFiles?.length || 0;
  const pngCount = thumbFiles?.filter(f => f.name.endsWith('.png')).length || 0;
  const jpgCount = thumbFiles?.filter(f => f.name.endsWith('.jpg')).length || 0;

  console.log(`exercise-thumbnails bucket:`);
  console.log(`  Total files: ${totalThumbs}`);
  console.log(`  .png files: ${pngCount}`);
  console.log(`  .jpg files: ${jpgCount}`);
  console.log('');

  // ============================================
  // STEP 2: Count Database Exercises
  // ============================================
  console.log('= STEP 2: Database Exercise Counts');
  console.log('─'.repeat(80));

  // Total exercises
  const { count: totalExercises } = await supabase
    .from('exercises')
    .select('*', { count: 'exact', head: true });

  console.log(`Total exercises: ${totalExercises}`);

  // Active exercises
  const { count: activeExercises } = await supabase
    .from('exercises')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  console.log(`Active exercises: ${activeExercises}`);

  // Active with gif_url
  const { count: activeWithGif } = await supabase
    .from('exercises')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .not('gif_url', 'is', null);

  console.log(`Active with gif_url (not NULL): ${activeWithGif}`);

  // Active without gif_url
  const { count: activeWithoutGif } = await supabase
    .from('exercises')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .is('gif_url', null);

  console.log(`Active without gif_url (NULL): ${activeWithoutGif}`);
  console.log('');

  // ============================================
  // STEP 3: Sample gif_url Format
  // ============================================
  console.log('= STEP 3: Sample gif_url Format (10 examples)');
  console.log('─'.repeat(80));

  const { data: sampleExercises } = await supabase
    .from('exercises')
    .select('name, gif_url, external_id')
    .eq('is_active', true)
    .not('gif_url', 'is', null)
    .limit(10);

  sampleExercises?.forEach((ex, i) => {
    const filename = ex.gif_url?.split('/').pop() || '';
    const pattern = /^\d+$/.test(filename) ? 'NUMERIC (no .gif)' :
                   /^\d+\.gif$/.test(filename) ? 'NUMERIC (.gif)' :
                   /^[a-f0-9-]{36}\.gif$/.test(filename) ? 'UUID' :
                   'OTHER';
    
    console.log(`${i + 1}. ${ex.name}`);
    console.log(`   gif_url: ${ex.gif_url}`);
    console.log(`   filename: ${filename}`);
    console.log(`   pattern: ${pattern}`);
    console.log(`   external_id: ${ex.external_id || 'NULL'}`);
    console.log('');
  });

  // ============================================
  // STEP 4: Analyze gif_url Patterns
  // ============================================
  console.log('= STEP 4: Analyze ALL gif_url Patterns');
  console.log('─'.repeat(80));

  const { data: allActive } = await supabase
    .from('exercises')
    .select('gif_url')
    .eq('is_active', true)
    .not('gif_url', 'is', null);

  let numericNoExt = 0;
  let numericWithExt = 0;
  let uuidPattern = 0;
  let otherPattern = 0;

  allActive?.forEach(ex => {
    const filename = ex.gif_url?.split('/').pop() || '';
    
    if (/^\d+$/.test(filename)) {
      numericNoExt++;
    } else if (/^\d+\.gif$/.test(filename)) {
      numericWithExt++;
    } else if (/^[a-f0-9-]{36}\.gif$/.test(filename)) {
      uuidPattern++;
    } else {
      otherPattern++;
    }
  });

  console.log(`Database gif_url patterns (${allActive?.length} total):`);
  console.log(`  Numeric without .gif (e.g., "0001"): ${numericNoExt}`);
  console.log(`  Numeric with .gif (e.g., "0001.gif"): ${numericWithExt}`);
  console.log(`  UUID pattern (e.g., "abc-123.gif"): ${uuidPattern}`);
  console.log(`  Other patterns: ${otherPattern}`);
  console.log('');

  // ============================================
  // SUMMARY TABLE
  // ============================================
  console.log('═'.repeat(80));
  console.log('= SUMMARY TABLE');
  console.log('═'.repeat(80));
  console.log('');
  console.log('STORAGE:');
  console.log(`  exercise-gifs bucket: ${gifExtensions} GIF files`);
  console.log(`    • Numeric: ${gifNumeric}`);
  console.log(`    • UUID/Other: ${gifUUID}`);
  console.log(`  exercise-thumbnails bucket: ${pngCount} PNG files, ${jpgCount} JPG files`);
  console.log('');
  console.log('DATABASE:');
  console.log(`  Total exercises: ${totalExercises}`);
  console.log(`  Active exercises: ${activeExercises}`);
  console.log(`  Active with gif_url: ${activeWithGif}`);
  console.log(`  Active without gif_url: ${activeWithoutGif}`);
  console.log('');
  console.log('DATABASE gif_url PATTERNS:');
  console.log(`  Numeric (no ext): ${numericNoExt}`);
  console.log(`  Numeric (.gif): ${numericWithExt}`);
  console.log(`  UUID: ${uuidPattern}`);
  console.log(`  Other: ${otherPattern}`);
  console.log('');
  console.log('MISMATCH ANALYSIS:');
  console.log(`  Database expects numeric files: ${numericNoExt + numericWithExt}`);
  console.log(`  Storage has numeric files: ${gifNumeric}`);
  console.log(`  MISSING: ${(numericNoExt + numericWithExt) - gifNumeric} numeric GIFs`);
  console.log('');
  console.log('═'.repeat(80));
}

getAccurateCounts();
