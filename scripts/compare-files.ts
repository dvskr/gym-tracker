import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function compare() {
  console.log('= Comparing GIFs and Thumbnails...\n');
  
  // Get GIFs
  const { data: gifs } = await supabase.storage
    .from('exercise-gifs')
    .list('', { limit: 1000 });
  
  // Get thumbnails
  const { data: thumbnails } = await supabase.storage
    .from('exercise-thumbnails')
    .list('', { limit: 1000 });
  
  const gifNames = new Set(
    gifs?.filter(f => f.name.endsWith('.gif'))
        .map(f => f.name.replace('.gif', '')) || []
  );
  
  const thumbNames = new Set(
    thumbnails?.filter(f => f.name.endsWith('.png'))
              .map(f => f.name.replace('.png', '')) || []
  );
  
  console.log('=� FILE COMPARISON');
  console.log('==================');
  console.log('GIF files:', gifNames.size);
  console.log('Thumbnail files (PNG):', thumbNames.size);
  
  // GIFs without thumbnails
  const gifsWithoutThumbs = [...gifNames].filter(n => !thumbNames.has(n));
  console.log('\n❌ GIFs WITHOUT thumbnails:', gifsWithoutThumbs.length);
  if (gifsWithoutThumbs.length > 0 && gifsWithoutThumbs.length <= 20) {
    gifsWithoutThumbs.forEach(n => console.log('  -', n));
  }
  
  // Thumbnails without GIFs (orphaned)
  const thumbsWithoutGifs = [...thumbNames].filter(n => !gifNames.has(n));
  console.log('\n� Thumbnails WITHOUT GIFs (orphaned):', thumbsWithoutGifs.length);
  if (thumbsWithoutGifs.length > 0 && thumbsWithoutGifs.length <= 20) {
    thumbsWithoutGifs.forEach(n => console.log('  -', n));
  }
  
  // Matching pairs
  const matching = [...gifNames].filter(n => thumbNames.has(n));
  console.log('\n✅ Matching GIF-Thumbnail pairs:', matching.length);
}

compare();

