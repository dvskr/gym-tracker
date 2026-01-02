import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function listStorageGifs() {
  const { data: files, error } = await supabase.storage
    .from('exercise-gifs')
    .list('', { limit: 1000 });

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  const gifFiles = files?.filter(f => f.name.endsWith('.gif')) || [];
  
  console.log('=== ALL GIF FILES IN STORAGE ===');
  console.log(`Total: ${gifFiles.length}\n`);
  
  // Separate by naming pattern
  const numericFiles = gifFiles.filter(f => /^\d+\.gif$/.test(f.name));
  const uuidFiles = gifFiles.filter(f => !(/^\d+\.gif$/.test(f.name)));
  
  console.log(`Numeric pattern (0001.gif): ${numericFiles.length}`);
  console.log(`UUID/Other pattern: ${uuidFiles.length}\n`);
  
  console.log('=== NUMERIC FILES ===');
  numericFiles.forEach(f => console.log(f.name));
  
  console.log('\n=== UUID FILES (first 20) ===');
  uuidFiles.slice(0, 20).forEach(f => console.log(f.name));
  
  // Save full list to JSON
  const fs = require('fs');
  fs.writeFileSync(
    'scripts/storage-gif-list.json', 
    JSON.stringify(gifFiles.map(f => f.name), null, 2)
  );
  console.log('\n✅ Full list saved to scripts/storage-gif-list.json');
}

listStorageGifs();
