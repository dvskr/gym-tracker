import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

// ============================================
// CONFIGURATION
// ============================================
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables!');
  console.error('Required: EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============================================
// MAIN CLEANUP FUNCTION
// ============================================

async function cleanupStorage() {
  console.log('');
  console.log('🧹 STORAGE CLEANUP');
  console.log('═'.repeat(50));
  console.log('');

  // ========================================
  // Step 1: Get active exercise gif_urls from database
  // ========================================
  console.log('📂 Step 1: Fetching active exercises from database...');
  
  const { data: activeExercises, error: dbError } = await supabase
    .from('exercises')
    .select('id, name, gif_url')
    .eq('is_active', true);

  if (dbError) {
    console.error('❌ Database error:', dbError.message);
    process.exit(1);
  }

  // Extract filenames from gif_urls
  const activeGifFilenames = new Set<string>();
  activeExercises?.forEach(ex => {
    if (ex.gif_url) {
      const filename = ex.gif_url.split('/').pop();
      if (filename) {
        activeGifFilenames.add(filename);
      }
    }
  });

  console.log(`✅ Found ${activeExercises?.length} active exercises`);
  console.log(`✅ ${activeGifFilenames.size} have GIF URLs`);
  console.log('');

  // ========================================
  // Step 2: List all files in exercise-gifs bucket
  // ========================================
  console.log('📂 Step 2: Listing files in exercise-gifs bucket...');
  
  const { data: gifFiles, error: gifListError } = await supabase.storage
    .from('exercise-gifs')
    .list('', { limit: 1000 });

  if (gifListError) {
    console.error('❌ Error listing GIFs:', gifListError.message);
    process.exit(1);
  }

  const allGifFilenames = gifFiles?.filter(f => f.name.endsWith('.gif')) || [];
  console.log(`✅ Found ${allGifFilenames.length} GIF files in storage`);

  // Find GIFs to delete (not in active set)
  const gifsToDelete = allGifFilenames
    .filter(f => !activeGifFilenames.has(f.name))
    .map(f => f.name);

  console.log(`🗑️  GIFs to delete: ${gifsToDelete.length}`);
  console.log('');

  // ========================================
  // Step 3: List all files in exercise-thumbnails bucket
  // ========================================
  console.log('📂 Step 3: Listing files in exercise-thumbnails bucket...');
  
  const { data: thumbFiles, error: thumbListError } = await supabase.storage
    .from('exercise-thumbnails')
    .list('', { limit: 2000 });

  if (thumbListError) {
    console.error('❌ Error listing thumbnails:', thumbListError.message);
    process.exit(1);
  }

  // Separate PNG and JPG files
  const pngFiles = thumbFiles?.filter(f => f.name.endsWith('.png')) || [];
  const jpgFiles = thumbFiles?.filter(f => f.name.endsWith('.jpg')) || [];

  console.log(`✅ Found ${pngFiles.length} PNG thumbnails`);
  console.log(`✅ Found ${jpgFiles.length} JPG thumbnails (old format)`);

  // Build set of active PNG names (from gif filenames)
  const activePngFilenames = new Set<string>();
  activeGifFilenames.forEach(gifName => {
    const pngName = gifName.replace('.gif', '.png');
    activePngFilenames.add(pngName);
  });

  // Find PNGs to delete (not matching active GIFs)
  const pngsToDelete = pngFiles
    .filter(f => !activePngFilenames.has(f.name))
    .map(f => f.name);

  // All JPGs should be deleted (old format)
  const jpgsToDelete = jpgFiles.map(f => f.name);

  console.log(`🗑️  PNGs to delete: ${pngsToDelete.length}`);
  console.log(`🗑️  JPGs to delete: ${jpgsToDelete.length} (all old format)`);
  console.log('');

  // ========================================
  // Step 4: Summary before deletion
  // ========================================
  console.log('═'.repeat(50));
  console.log('📊 DELETION SUMMARY');
  console.log('═'.repeat(50));
  console.log(`🗑️  GIFs to delete:     ${gifsToDelete.length}`);
  console.log(`🗑️  PNGs to delete:     ${pngsToDelete.length}`);
  console.log(`🗑️  JPGs to delete:     ${jpgsToDelete.length}`);
  console.log(`📦 Total to delete:    ${gifsToDelete.length + pngsToDelete.length + jpgsToDelete.length}`);
  console.log('');
  console.log('📦 Files to KEEP:');
  console.log(`   GIFs:      ${allGifFilenames.length - gifsToDelete.length}`);
  console.log(`   PNGs:      ${pngFiles.length - pngsToDelete.length}`);
  console.log('═'.repeat(50));
  console.log('');

  // ========================================
  // Step 5: Show what will be deleted
  // ========================================
  
  if (gifsToDelete.length > 0 && gifsToDelete.length <= 20) {
    console.log('GIFs to delete:');
    gifsToDelete.forEach(f => console.log(`  - ${f}`));
    console.log('');
  }

  if (pngsToDelete.length > 0 && pngsToDelete.length <= 20) {
    console.log('PNGs to delete:');
    pngsToDelete.forEach(f => console.log(`  - ${f}`));
    console.log('');
  }

  // ========================================
  // Step 6: Perform deletion
  // ========================================
  
  console.log('🚀 Starting deletion...\n');

  let deletedCount = 0;
  let errorCount = 0;

  // Delete GIFs
  if (gifsToDelete.length > 0) {
    console.log(`Deleting ${gifsToDelete.length} GIFs...`);
    const { error: gifDeleteError } = await supabase.storage
      .from('exercise-gifs')
      .remove(gifsToDelete);
    
    if (gifDeleteError) {
      console.error('❌ Error deleting GIFs:', gifDeleteError.message);
      errorCount += gifsToDelete.length;
    } else {
      console.log(`✅ Deleted ${gifsToDelete.length} GIFs`);
      deletedCount += gifsToDelete.length;
    }
  }

  // Delete PNGs
  if (pngsToDelete.length > 0) {
    console.log(`Deleting ${pngsToDelete.length} PNGs...`);
    const { error: pngDeleteError } = await supabase.storage
      .from('exercise-thumbnails')
      .remove(pngsToDelete);
    
    if (pngDeleteError) {
      console.error('❌ Error deleting PNGs:', pngDeleteError.message);
      errorCount += pngsToDelete.length;
    } else {
      console.log(`✅ Deleted ${pngsToDelete.length} PNGs`);
      deletedCount += pngsToDelete.length;
    }
  }

  // Delete JPGs (old format) in batches
  if (jpgsToDelete.length > 0) {
    console.log(`Deleting ${jpgsToDelete.length} JPGs (old format)...`);
    
    // Delete in batches of 100 to avoid API limits
    for (let i = 0; i < jpgsToDelete.length; i += 100) {
      const batch = jpgsToDelete.slice(i, i + 100);
      const { error: jpgDeleteError } = await supabase.storage
        .from('exercise-thumbnails')
        .remove(batch);
      
      if (jpgDeleteError) {
        console.error(`❌ Error deleting JPG batch ${i}-${i + batch.length}:`, jpgDeleteError.message);
        errorCount += batch.length;
      } else {
        deletedCount += batch.length;
        process.stdout.write(`\r  Progress: ${Math.min(i + 100, jpgsToDelete.length)}/${jpgsToDelete.length} JPGs`);
      }
    }
    console.log(`\n✅ Deleted ${jpgsToDelete.length} JPGs`);
  }

  // ========================================
  // Step 7: Final report
  // ========================================
  console.log('');
  console.log('═'.repeat(50));
  console.log('📊 FINAL RESULTS');
  console.log('═'.repeat(50));
  console.log(`✅ Deleted: ${deletedCount} files`);
  console.log(`❌ Errors:  ${errorCount} files`);
  console.log('');
  console.log('📦 Remaining in storage:');
  console.log(`   exercise-gifs:       ${activeGifFilenames.size} GIFs`);
  console.log(`   exercise-thumbnails: ${activePngFilenames.size} PNGs`);
  console.log('═'.repeat(50));
  console.log('');
  console.log('🎉 Cleanup complete!');
}

// Run
cleanupStorage().catch(console.error);

