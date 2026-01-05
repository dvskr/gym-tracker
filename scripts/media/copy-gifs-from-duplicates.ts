import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import sharp from 'sharp';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const GIF_DIR = path.join(process.cwd(), 'exercise-gifs');
const THUMBNAIL_DIR = path.join(process.cwd(), 'exercise-thumbnails');

// Manual mapping for the 39 matched duplicates (from previous script output)
const duplicateMappings = [
  { name: 'cable fly', matchedExternalId: '0158' },
  { name: 'hammer curl band', matchedExternalId: '0313' },
  { name: 'hammer curl cable', matchedExternalId: '0195' },
  { name: 'hammer curl dumbbell', matchedExternalId: '0313' },
  { name: 'jump rope', matchedExternalId: '2612' },
  { name: 'lat pulldown cable', matchedExternalId: '0198' },
  { name: 'lat pulldown machine', matchedExternalId: '0673' },
  { name: 'lat pulldown wide grip', matchedExternalId: '0673' },
  { name: 'leg extension machine', matchedExternalId: '0585' },
  { name: 'lying leg curl machine', matchedExternalId: '0586' },
  { name: 'overhead press barbell', matchedExternalId: '0090' },
  { name: 'overhead press dumbbell', matchedExternalId: '0401' },
  { name: 'overhead press cable', matchedExternalId: '0140' },
  { name: 't bar row', matchedExternalId: '0610' },
  { name: 'trap bar deadlift', matchedExternalId: '0811' },
  { name: 'cable crunch', matchedExternalId: '0166' },
  { name: 'cable kickback', matchedExternalId: '0180' },
  { name: 'reverse fly cable', matchedExternalId: '0213' },
  { name: 'reverse fly dumbbell', matchedExternalId: '0342' },
  { name: 'reverse fly machine', matchedExternalId: '0342' },
  { name: 'russian twist', matchedExternalId: '0916' },
  { name: 'bulgarian split squat', matchedExternalId: '1140' },
  { name: 'oblique crunch', matchedExternalId: '0859' },
  { name: 'muscle up', matchedExternalId: '0696' },
  { name: 'handstand push up', matchedExternalId: '1455' },
  { name: 'kettlebell swing', matchedExternalId: '1419' },
  { name: 'kettlebell turkish get up', matchedExternalId: '0577' },
  { name: 'seated row cable', matchedExternalId: '0193' },
  { name: 'seated row machine', matchedExternalId: '0193' },
  { name: 'shoulder press machine', matchedExternalId: '0148' },
  { name: 'power clean', matchedExternalId: '2380' },
  { name: 'floor press barbell', matchedExternalId: '0068' },
  { name: 'thruster barbell', matchedExternalId: '0101' },
  { name: 'kipping pull up', matchedExternalId: '1458' },
  { name: 'thruster kettlebell', matchedExternalId: '0550' },
  { name: 'lat pulldown underhand', matchedExternalId: '0213' },
  { name: 'wrist roller', matchedExternalId: '3643' },
  { name: 'chest press machine', matchedExternalId: '0623' },
  { name: 'mountain climber', matchedExternalId: '0697' }
];

async function main() {
  console.log('📁 COPYING GIFS FROM ORIGINAL EXERCISES TO DUPLICATES\n');
  console.log('='.repeat(60));

  // Step 1: Get all active exercises
  const { data: allExercises, error } = await supabase
    .from('exercises')
    .select('id, name, external_id')
    .eq('is_active', true);

  if (error) {
    console.error('Failed to fetch exercises:', error.message);
    return;
  }

  console.log(`Found ${allExercises?.length || 0} active exercises\n`);

  let copied = 0;
  let failed = 0;
  let skipped = 0;

  for (const mapping of duplicateMappings) {
    // Find the duplicate exercise (without external_id)
    const duplicate = allExercises?.find(e => 
      e.name.toLowerCase() === mapping.name.toLowerCase() && !e.external_id
    );

    if (!duplicate) {
      console.log(`  ⏭️ ${mapping.name.padEnd(40)} - Not found or already has external_id`);
      skipped++;
      continue;
    }

    // Find the original exercise (with this external_id)
    const original = allExercises?.find(e => 
      e.external_id === mapping.matchedExternalId
    );

    if (!original) {
      console.log(`  ❌ ${mapping.name.padEnd(40)} - Original not found (external_id: ${mapping.matchedExternalId})`);
      failed++;
      continue;
    }

    // Check if original has a local GIF
    const originalGifPath = path.join(GIF_DIR, `${original.id}.gif`);
    const originalThumbPath = path.join(THUMBNAIL_DIR, `${original.id}.jpg`);

    if (!fs.existsSync(originalGifPath)) {
      console.log(`  ❌ ${mapping.name.padEnd(40)} - Original GIF not found`);
      failed++;
      continue;
    }

    // Copy GIF and thumbnail
    const duplicateGifPath = path.join(GIF_DIR, `${duplicate.id}.gif`);
    const duplicateThumbPath = path.join(THUMBNAIL_DIR, `${duplicate.id}.jpg`);

    try {
      // Copy GIF
      fs.copyFileSync(originalGifPath, duplicateGifPath);

      // Copy or generate thumbnail
      if (fs.existsSync(originalThumbPath)) {
        fs.copyFileSync(originalThumbPath, duplicateThumbPath);
      } else {
        // Generate thumbnail if original doesn't have one
        await sharp(duplicateGifPath, { pages: 1, animated: false })
          .resize(216, 216, {
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 1 },
            kernel: sharp.kernel.lanczos3
          })
          .jpeg({
            quality: 100,
            chromaSubsampling: '4:4:4',
            mozjpeg: true
          })
          .toFile(duplicateThumbPath);
      }

      console.log(`  ✅ ${mapping.name.padEnd(40)} ← ${original.name}`);
      copied++;

    } catch (err: any) {
      console.log(`  ❌ ${mapping.name.padEnd(40)} - Copy failed: ${err.message}`);
      failed++;
    }
  }

  // Step 2: Upload to Supabase
  if (copied > 0) {
    console.log(`\n☁️ Uploading ${copied} new GIFs and thumbnails to Supabase...\n`);

    const GIF_BUCKET = 'exercise-gifs';
    const THUMBNAIL_BUCKET = 'exercise-thumbnails';

    let uploadedGifs = 0;
    let uploadedThumbs = 0;

    for (const mapping of duplicateMappings) {
      const duplicate = allExercises?.find(e => 
        e.name.toLowerCase() === mapping.name.toLowerCase() && !e.external_id
      );

      if (!duplicate) continue;

      const gifPath = path.join(GIF_DIR, `${duplicate.id}.gif`);
      const thumbPath = path.join(THUMBNAIL_DIR, `${duplicate.id}.jpg`);

      if (!fs.existsSync(gifPath)) continue;

      // Upload GIF
      try {
        const gifBuffer = fs.readFileSync(gifPath);
        const { error: gifError } = await supabase.storage
          .from(GIF_BUCKET)
          .upload(`${duplicate.id}.gif`, gifBuffer, {
            contentType: 'image/gif',
            upsert: true,
            cacheControl: '31536000'
          });

        if (!gifError) uploadedGifs++;
      } catch (err) {
        // Continue on error
      }

      // Upload thumbnail
      if (fs.existsSync(thumbPath)) {
        try {
          const thumbBuffer = fs.readFileSync(thumbPath);
          const { error: thumbError } = await supabase.storage
            .from(THUMBNAIL_BUCKET)
            .upload(`${duplicate.id}.jpg`, thumbBuffer, {
              contentType: 'image/jpeg',
              upsert: true,
              cacheControl: '31536000'
            });

          if (!thumbError) uploadedThumbs++;
        } catch (err) {
          // Continue on error
        }
      }

      process.stdout.write(`\r  Uploaded ${uploadedGifs} GIFs, ${uploadedThumbs} thumbnails...`);
    }

    console.log(`\n  ✅ Uploaded ${uploadedGifs} GIFs, ${uploadedThumbs} thumbnails`);

    // Step 3: Update database URLs
    console.log(`\n📊 Updating database URLs...\n`);

    let updated = 0;
    for (const mapping of duplicateMappings) {
      const duplicate = allExercises?.find(e => 
        e.name.toLowerCase() === mapping.name.toLowerCase() && !e.external_id
      );

      if (!duplicate) continue;

      const gifPath = path.join(GIF_DIR, `${duplicate.id}.gif`);
      if (!fs.existsSync(gifPath)) continue;

      const { data: gifData } = supabase.storage.from(GIF_BUCKET).getPublicUrl(`${duplicate.id}.gif`);
      const { data: thumbData } = supabase.storage.from(THUMBNAIL_BUCKET).getPublicUrl(`${duplicate.id}.jpg`);

      const { error: updateError } = await supabase
        .from('exercises')
        .update({
          gif_url: gifData.publicUrl,
          thumbnail_url: thumbData.publicUrl
        })
        .eq('id', duplicate.id);

      if (!updateError) {
        updated++;
        process.stdout.write(`\r  Updated ${updated} exercise URLs...`);
      }
    }

    console.log(`\n  ✅ Updated ${updated} exercise URLs`);
  }

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
  console.log(`\n✅ Copied: ${copied}`);
  console.log(`⏭️ Skipped: ${skipped}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`\n🎯 COMPLETION: ${withBoth}/${total} exercises (${((withBoth / total) * 100).toFixed(1)}%)`);
}

main().catch(console.error);
