import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const GIF_DIR = path.join(process.cwd(), 'exercise-gifs');
const THUMBNAIL_DIR = path.join(process.cwd(), 'exercise-thumbnails');

async function main() {
  console.log('= DETAILED DIAGNOSTIC\n');
  console.log('='.repeat(60));

  // Get all local GIF files
  const localGifFiles = fs.existsSync(GIF_DIR)
    ? fs.readdirSync(GIF_DIR).filter(f => f.endsWith('.gif'))
    : [];
  
  const localGifs = new Set(localGifFiles.map(f => f.toLowerCase()));

  // Extract exercise IDs from filenames
  const localGifIds = new Set(
    localGifFiles.map(f => f.replace('.gif', '').toLowerCase())
  );

  console.log(`\n=� Local GIF files: ${localGifs.size}`);

  // Get ALL exercises (both active and inactive)
  const { data: allExercises } = await supabase
    .from('exercises')
    .select('id, name, is_active, gif_url, thumbnail_url, external_id');

  const activeExercises = allExercises?.filter(e => e.is_active) || [];
  const inactiveExercises = allExercises?.filter(e => !e.is_active) || [];

  console.log(`\n=� Database:`);
  console.log(`   Total exercises: ${allExercises?.length || 0}`);
  console.log(`   Active: ${activeExercises.length}`);
  console.log(`   Inactive: ${inactiveExercises.length}`);

  // Analyze active exercises
  const activeWithLocalGif: typeof activeExercises = [];
  const activeWithoutLocalGif: typeof activeExercises = [];
  const activeWithUrl: typeof activeExercises = [];
  const activeWithoutUrl: typeof activeExercises = [];
  const activeHasGifNoUrl: typeof activeExercises = [];

  for (const ex of activeExercises) {
    const hasLocalGif = localGifIds.has(ex.id.toLowerCase());
    const hasUrl = !!ex.gif_url;

    if (hasLocalGif) {
      activeWithLocalGif.push(ex);
    } else {
      activeWithoutLocalGif.push(ex);
    }

    if (hasUrl) {
      activeWithUrl.push(ex);
    } else {
      activeWithoutUrl.push(ex);
    }

    if (hasLocalGif && !hasUrl) {
      activeHasGifNoUrl.push(ex);
    }
  }

  console.log(`\n✅ Active exercises:`);
  console.log(`   With local GIF: ${activeWithLocalGif.length}`);
  console.log(`   Without local GIF: ${activeWithoutLocalGif.length}`);
  console.log(`   With URL in database: ${activeWithUrl.length}`);
  console.log(`   Without URL in database: ${activeWithoutUrl.length}`);
  console.log(`   Has local GIF but NO URL: ${activeHasGifNoUrl.length}`);

  if (activeHasGifNoUrl.length > 0) {
    console.log(`\n   =� Exercises with local GIF but no URL (first 10):`);
    activeHasGifNoUrl.slice(0, 10).forEach(ex => {
      console.log(`      - ${ex.name} (${ex.id})`);
    });
  }

  // Analyze inactive exercises with GIFs
  const inactiveWithLocalGif = inactiveExercises.filter(ex => 
    localGifIds.has(ex.id.toLowerCase())
  );

  console.log(`\n❌ Inactive exercises:`);
  console.log(`   With local GIF: ${inactiveWithLocalGif.length}`);

  if (inactiveWithLocalGif.length > 0) {
    console.log(`\n   =� First 10 inactive exercises with GIFs:`);
    inactiveWithLocalGif.slice(0, 10).forEach(ex => {
      console.log(`      - ${ex.name} (${ex.id})`);
    });
  }

  // Find orphaned GIFs (GIFs without corresponding exercises)
  const allExerciseIds = new Set(
    allExercises?.map(e => e.id.toLowerCase()) || []
  );

  const orphanedGifs = localGifFiles.filter(f => {
    const id = f.replace('.gif', '').toLowerCase();
    return !allExerciseIds.has(id);
  });

  if (orphanedGifs.length > 0) {
    console.log(`\n=�  Orphaned GIFs (no corresponding exercise):`);
    console.log(`   Count: ${orphanedGifs.length}`);
    console.log(`   Files: ${orphanedGifs.slice(0, 10).join(', ')}`);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('=� SUMMARY');
  console.log('='.repeat(60));
  console.log(`\nLocal GIFs: ${localGifs.size}`);
  console.log(`  - Active exercises: ${activeWithLocalGif.length}`);
  console.log(`  - Inactive exercises: ${inactiveWithLocalGif.length}`);
  console.log(`  - Orphaned (no exercise): ${orphanedGifs.length}`);
  console.log(`\nActive exercises: ${activeExercises.length}`);
  console.log(`  - With local GIF: ${activeWithLocalGif.length}`);
  console.log(`  - With URL: ${activeWithUrl.length}`);
  console.log(`  - Missing GIF: ${activeWithoutLocalGif.length}`);
  console.log(`\nCompletion: ${activeWithUrl.length}/${activeExercises.length} (${((activeWithUrl.length / activeExercises.length) * 100).toFixed(1)}%)`);

  // Gap analysis
  const discrepancy = localGifs.size - activeWithUrl.length;
  console.log(`\n= Discrepancy analysis:`);
  console.log(`   Local GIFs (${localGifs.size}) - URLs (${activeWithUrl.length}) = ${discrepancy}`);
  console.log(`   Explained by:`);
  console.log(`     - Inactive with GIFs: ${inactiveWithLocalGif.length}`);
  console.log(`     - Active with GIF but no URL: ${activeHasGifNoUrl.length}`);
  console.log(`     - Orphaned GIFs: ${orphanedGifs.length}`);
  console.log(`   Total explained: ${inactiveWithLocalGif.length + activeHasGifNoUrl.length + orphanedGifs.length}`);
}

main().catch(console.error);

