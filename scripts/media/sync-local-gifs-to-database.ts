import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const GIF_DIR = path.join(process.cwd(), 'exercise-gifs');
const THUMBNAIL_DIR = path.join(process.cwd(), 'exercise-thumbnails');

async function main() {
  console.log('📊 SYNCING LOCAL GIFS TO DATABASE\n');
  console.log('='.repeat(60));

  // Step 1: Get all local GIF files
  const localGifs = new Set(
    fs.existsSync(GIF_DIR)
      ? fs.readdirSync(GIF_DIR).filter(f => f.endsWith('.gif')).map(f => f.toLowerCase())
      : []
  );

  const localThumbs = new Set(
    fs.existsSync(THUMBNAIL_DIR)
      ? fs.readdirSync(THUMBNAIL_DIR).filter(f => f.endsWith('.jpg')).map(f => f.toLowerCase())
      : []
  );

  console.log(`\n📁 Local files:`);
  console.log(`   GIFs: ${localGifs.size}`);
  console.log(`   Thumbnails: ${localThumbs.size}`);

  // Step 2: Get all active exercises
  const { data: allExercises, error } = await supabase
    .from('exercises')
    .select('id, name, gif_url, thumbnail_url')
    .eq('is_active', true);

  if (error) {
    console.error('Failed to fetch exercises:', error.message);
    return;
  }

  console.log(`\n📊 Database:`);
  console.log(`   Total active: ${allExercises?.length || 0}`);
  console.log(`   With GIF URL: ${allExercises?.filter(e => e.gif_url).length || 0}`);
  console.log(`   With Thumbnail URL: ${allExercises?.filter(e => e.thumbnail_url).length || 0}`);

  // Step 3: Find mismatches
  const needsUpload: string[] = [];
  const needsUrlUpdate: Array<{ id: string; name: string; hasGif: boolean; hasThumb: boolean }> = [];

  for (const ex of allExercises || []) {
    const gifFile = `${ex.id}.gif`.toLowerCase();
    const thumbFile = `${ex.id}.jpg`.toLowerCase();
    
    const hasLocalGif = localGifs.has(gifFile);
    const hasLocalThumb = localThumbs.has(thumbFile);
    
    if (hasLocalGif || hasLocalThumb) {
      // Check if URLs are missing or incorrect
      const gifUrlMissing = hasLocalGif && !ex.gif_url;
      const thumbUrlMissing = hasLocalThumb && !ex.thumbnail_url;
      
      if (gifUrlMissing || thumbUrlMissing) {
        needsUrlUpdate.push({
          id: ex.id,
          name: ex.name,
          hasGif: hasLocalGif,
          hasThumb: hasLocalThumb
        });
      }
    }
  }

  console.log(`\n🔍 Analysis:`);
  console.log(`   Exercises needing URL update: ${needsUrlUpdate.length}`);

  if (needsUrlUpdate.length === 0) {
    console.log(`\n✅ Everything is already in sync!`);
    return;
  }

  // Step 4: Upload missing files to Supabase
  console.log(`\n☁️ STEP 1: Uploading files to Supabase...\n`);

  const GIF_BUCKET = 'exercise-gifs';
  const THUMBNAIL_BUCKET = 'exercise-thumbnails';

  let uploadedGifs = 0;
  let uploadedThumbs = 0;

  for (let i = 0; i < needsUrlUpdate.length; i++) {
    const ex = needsUrlUpdate[i];
    
    process.stdout.write(`\r  [${i + 1}/${needsUrlUpdate.length}] ${ex.name.substring(0, 30).padEnd(30)}...`);

    // Upload GIF
    if (ex.hasGif) {
      const gifPath = path.join(GIF_DIR, `${ex.id}.gif`);
      try {
        const gifBuffer = fs.readFileSync(gifPath);
        const { error: gifError } = await supabase.storage
          .from(GIF_BUCKET)
          .upload(`${ex.id}.gif`, gifBuffer, {
            contentType: 'image/gif',
            upsert: true,
            cacheControl: '31536000'
          });

        if (!gifError) uploadedGifs++;
      } catch (err) {
        // Continue on error
      }
    }

    // Upload thumbnail
    if (ex.hasThumb) {
      const thumbPath = path.join(THUMBNAIL_DIR, `${ex.id}.jpg`);
      try {
        const thumbBuffer = fs.readFileSync(thumbPath);
        const { error: thumbError } = await supabase.storage
          .from(THUMBNAIL_BUCKET)
          .upload(`${ex.id}.jpg`, thumbBuffer, {
            contentType: 'image/jpeg',
            upsert: true,
            cacheControl: '31536000'
          });

        if (!thumbError) uploadedThumbs++;
      } catch (err) {
        // Continue on error
      }
    }
  }

  console.log(`\n  ✅ Uploaded ${uploadedGifs} GIFs, ${uploadedThumbs} thumbnails`);

  // Step 5: Update database URLs
  console.log(`\n📊 STEP 2: Updating database URLs...\n`);

  let updated = 0;

  for (let i = 0; i < needsUrlUpdate.length; i++) {
    const ex = needsUrlUpdate[i];
    
    const updates: any = {};
    
    if (ex.hasGif) {
      const { data } = supabase.storage.from(GIF_BUCKET).getPublicUrl(`${ex.id}.gif`);
      updates.gif_url = data.publicUrl;
    }
    
    if (ex.hasThumb) {
      const { data } = supabase.storage.from(THUMBNAIL_BUCKET).getPublicUrl(`${ex.id}.jpg`);
      updates.thumbnail_url = data.publicUrl;
    }

    const { error: updateError } = await supabase
      .from('exercises')
      .update(updates)
      .eq('id', ex.id);

    if (!updateError) {
      updated++;
      process.stdout.write(`\r  Updated ${updated}/${needsUrlUpdate.length}...`);
    }
  }

  console.log(`\n  ✅ Updated ${updated} exercise URLs`);

  // Final stats
  const { data: finalExercises } = await supabase
    .from('exercises')
    .select('id, gif_url, thumbnail_url')
    .eq('is_active', true);

  const withBoth = finalExercises?.filter(e => e.gif_url && e.thumbnail_url).length || 0;
  const total = finalExercises?.length || 0;

  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL SUMMARY');
  console.log('='.repeat(60));
  console.log(`\n☁️ Uploaded: ${uploadedGifs} GIFs, ${uploadedThumbs} thumbnails`);
  console.log(`📊 Updated URLs: ${updated}`);
  console.log(`\n🎯 COMPLETION: ${withBoth}/${total} exercises (${((withBoth / total) * 100).toFixed(1)}%)`);
}

main().catch(console.error);
