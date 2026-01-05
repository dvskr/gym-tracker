import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

const DOWNLOAD_DIR = path.join(__dirname, '../exercise-gifs');
const BUCKET_NAME = 'exercise-gifs';

async function uploadGif(exerciseId: string): Promise<string | null> {
  const filename = `${exerciseId}.gif`;
  const filepath = path.join(DOWNLOAD_DIR, filename);

  if (!fs.existsSync(filepath)) {
    console.log(`  Skip: ${filename} (not downloaded yet)`);
    return null;
  }

  try {
    const fileBuffer = fs.readFileSync(filepath);

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filename, fileBuffer, {
        contentType: 'image/gif',
        upsert: true
      });

    if (error) {
      console.error(`❌ ${filename}: ${error.message}`);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filename);

    console.log(`✅ ${filename}`);
    return publicUrl;

  } catch (err: any) {
    console.error(`❌ ${filename}: ${err.message}`);
    return null;
  }
}

async function uploadAll() {
  console.log('  Uploading GIFs to Supabase Storage...\n');

  const selected = JSON.parse(
    fs.readFileSync('scripts/selected-400-exercises.json', 'utf-8')
  );

  console.log(`= Uploading ${selected.exercises.length} GIFs...\n`);

  let completed = 0;
  let skipped = 0;
  let failed = 0;
  const urlMappings: any[] = [];

  for (const exercise of selected.exercises) {
    const publicUrl = await uploadGif(exercise.id);

    if (publicUrl) {
      completed++;
      urlMappings.push({
        id: exercise.id,
        name: exercise.name,
        url: publicUrl
      });
    } else if (!fs.existsSync(path.join(DOWNLOAD_DIR, `${exercise.id}.gif`))) {
      skipped++;
    } else {
      failed++;
    }

    if ((completed + skipped + failed) % 20 === 0) {
      console.log(`\n= Progress: ${completed + skipped + failed}/${selected.exercises.length}\n`);
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  fs.writeFileSync(
    'scripts/supabase-urls.json',
    JSON.stringify(urlMappings, null, 2)
  );

  console.log('\n' + '='.repeat(60));
  console.log('=� UPLOAD COMPLETE');
  console.log('='.repeat(60));
  console.log(`✅ Uploaded: ${completed}`);
  console.log(`  Skipped (not downloaded): ${skipped}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`\n= URL mappings saved to: scripts/supabase-urls.json\n`);
}

uploadAll();
