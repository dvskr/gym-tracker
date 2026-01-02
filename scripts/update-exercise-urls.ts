import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const GIF_BUCKET = 'exercise-gifs';
const THUMBNAIL_BUCKET = 'exercise-thumbnails';
const GIF_DIR = path.join(process.cwd(), 'exercise-gifs');
const THUMBNAIL_DIR = path.join(process.cwd(), 'exercise-thumbnails');

async function updateExerciseUrls() {
  console.log('=� Updating exercise GIF and thumbnail URLs in database...\n');
  
  // Get list of uploaded GIFs and thumbnails
  const uploadedGifs = new Set<string>();
  const uploadedThumbnails = new Set<string>();
  
  if (fs.existsSync(GIF_DIR)) {
    fs.readdirSync(GIF_DIR)
      .filter(f => f.endsWith('.gif'))
      .forEach(f => uploadedGifs.add(f.toLowerCase()));
  }
  
  if (fs.existsSync(THUMBNAIL_DIR)) {
    fs.readdirSync(THUMBNAIL_DIR)
      .filter(f => f.endsWith('.jpg'))
      .forEach(f => uploadedThumbnails.add(f.toLowerCase()));
  }
  
  console.log(`= Found ${uploadedGifs.size} GIFs and ${uploadedThumbnails.size} thumbnails locally\n`);
  
  // Fetch all exercises
  const { data: exercises, error } = await supabase
    .from('exercises')
    .select('id, name, gif_url')
    .eq('is_active', true);
  
  if (error) {
    throw new Error(`Failed to fetch exercises: ${error.message}`);
  }
  
  console.log(`= Processing ${exercises?.length || 0} active exercises...\n`);
  
  let updated = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const exercise of exercises || []) {
    try {
      // Determine GIF filename (prefer ID-based, fallback to original URL filename)
      let gifFilename = `${exercise.id}.gif`;
      
      if (!uploadedGifs.has(gifFilename.toLowerCase())) {
        // Try original filename from gif_url
        if (exercise.gif_url) {
          const originalFilename = exercise.gif_url.split('/').pop();
          if (originalFilename && uploadedGifs.has(originalFilename.toLowerCase())) {
            gifFilename = originalFilename;
          } else {
            skipped++;
            continue;
          }
        } else {
          skipped++;
          continue;
        }
      }
      
      // Check if thumbnail exists
      const thumbnailFilename = gifFilename.replace('.gif', '.jpg');
      const hasThumbnail = uploadedThumbnails.has(thumbnailFilename.toLowerCase());
      
      // Construct Supabase Storage URLs
      const { data: gifUrlData } = supabase.storage
        .from(GIF_BUCKET)
        .getPublicUrl(gifFilename);
      
      const { data: thumbUrlData } = supabase.storage
        .from(THUMBNAIL_BUCKET)
        .getPublicUrl(thumbnailFilename);
      
      // Update exercise
      const updateData: any = {
        gif_url: gifUrlData.publicUrl,
      };
      
      if (hasThumbnail) {
        updateData.thumbnail_url = thumbUrlData.publicUrl;
      }
      
      const { error: updateError } = await supabase
        .from('exercises')
        .update(updateData)
        .eq('id', exercise.id);
      
      if (updateError) {
        console.error(`\n❌ Error updating ${exercise.name}: ${updateError.message}`);
        errors++;
      } else {
        updated++;
      }
      
      process.stdout.write(`\r[${updated + skipped + errors}/${exercises.length}] Processing...`);
    } catch (err) {
      console.error(`\n❌ Error processing ${exercise.name}:`, err);
      errors++;
    }
  }
  
  console.log('\n\n' + '='.repeat(60));
  console.log('= URL UPDATE SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Updated: ${updated} exercises`);
  console.log(`  Skipped (no local GIF): ${skipped} exercises`);
  console.log(`❌ Errors: ${errors} exercises`);
  console.log('='.repeat(60));
  
  if (updated > 0) {
    console.log('\n✅ Database URLs successfully updated!');
    console.log(`\n= GIF URL format: ${supabaseUrl}/storage/v1/object/public/${GIF_BUCKET}/[filename]`);
    console.log(`= Thumbnail URL format: ${supabaseUrl}/storage/v1/object/public/${THUMBNAIL_BUCKET}/[filename]`);
  }
}

updateExerciseUrls().catch(console.error);
