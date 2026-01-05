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

async function uploadNewGifs() {
  console.log('=� Uploading 29 new GIFs to Supabase...\n');
  
  // Get all GIF files
  const allGifs = fs.readdirSync(GIF_DIR).filter(f => f.endsWith('.gif'));
  console.log(`Total local GIFs: ${allGifs.length}`);
  
  // Get the 29 newest files (last 29 added)
  const gifStats = allGifs.map(filename => ({
    filename,
    mtime: fs.statSync(path.join(GIF_DIR, filename)).mtime
  }));
  
  // Sort by modification time and get the 29 newest
  gifStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
  const newGifs = gifStats.slice(0, 29).map(g => g.filename);
  
  console.log(`Uploading ${newGifs.length} newest GIF files\n`);
  
  let uploaded = 0;
  let skipped = 0;
  let failed = 0;
  
  for (const filename of newGifs) {
    try {
      const filepath = path.join(GIF_DIR, filename);
      
      // Check if already uploaded to Supabase
      const { data: existingFile } = await supabase
        .storage
        .from(BUCKET_NAME)
        .list('', { search: filename });
      
      if (existingFile && existingFile.length > 0) {
        console.log(`  ${filename} - Already uploaded`);
        skipped++;
        continue;
      }
      
      // Upload to Supabase
      const fileBuffer = fs.readFileSync(filepath);
      const { data, error: uploadError } = await supabase
        .storage
        .from(BUCKET_NAME)
        .upload(filename, fileBuffer, {
          contentType: 'image/gif',
          upsert: true
        });
      
      if (uploadError) {
        console.error(`❌ ${filename} - Upload failed: ${uploadError.message}`);
        failed++;
        continue;
      }
      
      uploaded++;
      const sizeMB = (fileBuffer.length / 1024 / 1024).toFixed(2);
      console.log(`✅ ${filename} - Uploaded (${sizeMB} MB)`);
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (err: any) {
      console.error(`❌ ${filename} - Error: ${err.message}`);
      failed++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('UPLOAD COMPLETE');
  console.log('='.repeat(60));
  console.log(`Uploaded: ${uploaded}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);
  console.log(`\n= Total in Supabase: ${344 + uploaded} GIFs\n`);
}

uploadNewGifs();
