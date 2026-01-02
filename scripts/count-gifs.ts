import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function countGifs() {
  const { data: files } = await supabase.storage
    .from('exercise-gifs')
    .list('', { limit: 1000 });
  
  const gifs = files?.filter(f => f.name.endsWith('.gif')) || [];
  
  console.log('');
  console.log('=� SUPABASE STORAGE: exercise-gifs bucket');
  console.log('═'.repeat(50));
  console.log('Total GIF files:', gifs.length);
  console.log('');
  
  // Show file type breakdown
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.gif$/i;
  const numericPattern = /^\d+\.gif$/;
  
  const uuidFiles = gifs.filter(f => uuidPattern.test(f.name));
  const numericFiles = gifs.filter(f => numericPattern.test(f.name));
  const otherFiles = gifs.filter(f => !uuidPattern.test(f.name) && !numericPattern.test(f.name));
  
  console.log('File naming breakdown:');
  console.log('  UUID format (abc-123.gif):', uuidFiles.length);
  console.log('  Numeric format (0001.gif):', numericFiles.length);
  console.log('  Other format:', otherFiles.length);
  console.log('');
  
  console.log('Sample UUID files:');
  uuidFiles.slice(0, 5).forEach(f => console.log('  -', f.name));
  
  console.log('');
  console.log('Sample numeric files:');
  numericFiles.slice(0, 5).forEach(f => console.log('  -', f.name));
  
  console.log('');
}

countGifs();
