import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const GIF_DIR = 'exercise-gifs';
const BUCKET_NAME = 'exercise-gifs';

async function fixGifUrls() {
  console.log('=' Fixing gif_url fields in database...\n');

  // Get all GIF files from local directory
  const gifFiles = fs.readdirSync(GIF_DIR).filter(f => f.endsWith('.gif'));
  console.log(`Found ${gifFiles.length} GIF files locally\n`);

  // Get all exercises from database
  const { data: exercises, error: fetchError } = await supabase
    .from('exercises')
    .select('id, name, external_id, gif_url')
    .eq('is_active', true);

  if (fetchError || !exercises) {
    console.error('Error fetching exercises:', fetchError);
    return;
  }

  console.log(`Found ${exercises.length} active exercises in database\n`);

  // Get list of files in Supabase storage
  const { data: storageFiles, error: storageError } = await supabase
    .storage
    .from(BUCKET_NAME)
    .list();

  if (storageError || !storageFiles) {
    console.error('Error fetching storage files:', storageError);
    return;
  }

  console.log(`Found ${storageFiles.length} GIF files in Supabase storage\n`);

  // Build a map of external_id to filename from local files
  // We need to match exercises to GIF files somehow
  // The safest approach is to update exercises that have external_id set

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  // Strategy: For each storage file, find the exercise by checking the mapping
  // Load the exercise-id-mapping.json if it exists
  let mapping: any[] = [];
  const mappingPath = 'scripts/exercise-id-mapping.json';
  if (fs.existsSync(mappingPath)) {
    mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf-8'));
    console.log(`Loaded ${mapping.length} exercises from mapping file\n`);
  }

  // For exercises with external_id that have GIFs in storage, update gif_url
  for (const exercise of exercises) {
    if (!exercise.external_id) {
      skipped++;
      continue;
    }

    // Find matching GIF file in storage
    // GIF files are named with UUIDs, so we need to check the mapping
    const mappingEntry = mapping.find((m: any) => m.id === exercise.id);
    
    if (!mappingEntry || !mappingEntry.gif_url) {
      skipped++;
      continue;
    }

    // Extract filename from the original gif_url in mapping
    const filename = mappingEntry.gif_url.split('/').pop();
    if (!filename) {
      skipped++;
      continue;
    }

    // Check if this file exists in storage
    const fileExists = storageFiles.some(f => f.name === filename);
    if (!fileExists) {
      console.log(` ${exercise.name}: GIF file not found in storage (${filename})`);
      skipped++;
      continue;
    }

    // Build the public URL
    const publicUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${filename}`;

    // Update the exercise
    const { error: updateError } = await supabase
      .from('exercises')
      .update({ gif_url: publicUrl })
      .eq('id', exercise.id);

    if (updateError) {
      console.error(`❌ ${exercise.name}: ${updateError.message}`);
      failed++;
    } else {
      updated++;
      if (updated % 10 === 0) {
        console.log(`✅ Updated ${updated} exercises...`);
      }
    }

    // Small delay
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  console.log('\n' + '='.repeat(60));
  console.log('FIX COMPLETE');
  console.log('='.repeat(60));
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped} (no external_id or no mapping)`);
  console.log(`Failed: ${failed}`);
  console.log(`\n= Exercises with GIFs: ${updated}/${exercises.length}\n`);

  // Verify the fix
  const { count } = await supabase
    .from('exercises')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .not('gif_url', 'is', null);

  console.log(`✅ Database verification: ${count} exercises now have gif_url\n`);
}

fixGifUrls();
