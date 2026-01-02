import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
);

async function updateGifUrls() {
  console.log('= Updating GIF URLs in database...\n');
  
  // Load the mapping file
  const mapping = JSON.parse(
    fs.readFileSync('scripts/exercise-id-mapping.json', 'utf-8')
  );
  
  // Filter only exercises with external_id
  const toUpdate = mapping.filter((ex: any) => ex.external_id && ex.gif_url);
  
  console.log(`Found ${toUpdate.length} exercises to update\n`);
  
  let updated = 0;
  let failed = 0;
  
  for (const exercise of toUpdate) {
    try {
      const { error } = await supabase
        .from('exercises')
        .update({ 
          external_id: exercise.external_id.toString(),
          gif_url: exercise.gif_url
        })
        .eq('id', exercise.id);
      
      if (error) {
        console.error(`❌ ${exercise.name}: ${error.message}`);
        failed++;
      } else {
        updated++;
        console.log(`✅ ${exercise.name}`);
      }
      
    } catch (err: any) {
      console.error(`❌ ${exercise.name}: ${err.message}`);
      failed++;
    }
  }
  
  // Verify
  const { count } = await supabase
    .from('exercises')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .not('gif_url', 'is', null);
  
  console.log('\n' + '='.repeat(60));
  console.log('UPDATE COMPLETE');
  console.log('='.repeat(60));
  console.log(`Updated: ${updated}`);
  console.log(`Failed: ${failed}`);
  console.log(`\n= Total exercises with GIFs: ${count}\n`);
}

updateGifUrls();
