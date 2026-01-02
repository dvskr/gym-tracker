import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config();

const EXERCISEDB_API_KEY = process.env.EXPO_PUBLIC_EXERCISEDB_API_KEY!;
const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
);

const OUTPUT_DIR = 'exercise-gifs';

async function downloadNewGifs() {
  console.log('=� Downloading GIFs for 29 new exercises...\n');
  
  // Load the mapping file
  const mapping = JSON.parse(
    fs.readFileSync('scripts/exercise-id-mapping.json', 'utf-8')
  );
  
  // Filter only exercises with external_id and clean the IDs
  const toDownload = mapping
    .filter((ex: any) => ex.external_id)
    .map((ex: any) => ({
      ...ex,
      id: ex.id.trim(),
      name: ex.name.trim(),
      external_id: ex.external_id.trim()
    }));
  
  console.log(`Found ${toDownload.length} exercises with IDs\n`);
  
  let downloaded = 0;
  let failed = 0;
  let skipped = 0;
  
  for (const exercise of toDownload) {
    try {
      // Generate UUID filename (consistent with existing GIFs)
      const uuid = randomUUID();
      const filename = `${uuid}.gif`;
      const filepath = path.join(OUTPUT_DIR, filename);
      
      // Check if already exists
      if (fs.existsSync(filepath)) {
        console.log(`�  ${exercise.name} - already exists`);
        skipped++;
        continue;
      }
      
      // Download from ExerciseDB (1080px)
      const gifUrl = `https://exercisedb.p.rapidapi.com/image?exerciseId=${exercise.external_id}&resolution=1080&rapidapi-key=${EXERCISEDB_API_KEY}`;
      
      const response = await fetch(gifUrl);
      
      if (!response.ok) {
        console.error(`❌ ${exercise.name} - Download failed: ${response.status}`);
        failed++;
        continue;
      }
      
      const buffer = Buffer.from(await response.arrayBuffer());
      fs.writeFileSync(filepath, buffer);
      
      // Update database with external_id and Supabase URL (we'll upload later)
      const supabaseUrl = `https://${process.env.EXPO_PUBLIC_SUPABASE_URL!.split('//')[1]}/storage/v1/object/public/exercise-gifs/${filename}`;
      
      await supabase
        .from('exercises')
        .update({ 
          external_id: exercise.external_id,
          gif_url: supabaseUrl 
        })
        .eq('id', exercise.id);
      
      downloaded++;
      console.log(`✅ ${exercise.name} - Downloaded (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (err: any) {
      console.error(`❌ ${exercise.name} - Error: ${err.message}`);
      failed++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('DOWNLOAD COMPLETE');
  console.log('='.repeat(60));
  console.log(`Downloaded: ${downloaded}`);
  console.log(`Failed: ${failed}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`\n=� Local GIFs: ${downloaded + skipped} new + 344 existing = ${344 + downloaded + skipped} total\n`);
}

downloadNewGifs();

