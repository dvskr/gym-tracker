import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkThumbnails() {
  console.log('=� Checking exercise-thumbnails bucket...\n');
  
  const { data: thumbnails, error } = await supabase.storage
    .from('exercise-thumbnails')
    .list('', { limit: 1000 });
  
  if (error) {
    console.error('Error:', error.message);
    return;
  }
  
  const pngFiles = thumbnails?.filter(f => f.name.endsWith('.png')) || [];
  const jpgFiles = thumbnails?.filter(f => f.name.endsWith('.jpg')) || [];
  const otherFiles = thumbnails?.filter(f => !f.name.endsWith('.png') && !f.name.endsWith('.jpg')) || [];
  
  console.log('Total files:', thumbnails?.length);
  console.log('PNG files:', pngFiles.length);
  console.log('JPG files:', jpgFiles.length);
  console.log('Other files:', otherFiles.length);
  
  if (otherFiles.length > 0) {
    console.log('\nOther file types:');
    otherFiles.slice(0, 10).forEach(f => console.log('  -', f.name));
  }
  
  console.log('\nSample PNG files:');
  pngFiles.slice(0, 10).forEach(f => console.log('  -', f.name));
  
  if (jpgFiles.length > 0) {
    console.log('\nSample JPG files:');
    jpgFiles.slice(0, 10).forEach(f => console.log('  -', f.name));
  }
  
  // Check for duplicates or weird naming
  const names = pngFiles.map(f => f.name);
  const uniqueNames = new Set(names);
  if (names.length !== uniqueNames.size) {
    console.log('\n� DUPLICATE FILES DETECTED!');
  }
}

checkThumbnails();
