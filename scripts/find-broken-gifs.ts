import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function findBrokenGifs() {
  console.log('= Finding exercises with broken GIF URLs...\n');

  // Get all active exercises with gif_url
  const { data: exercises } = await supabase
    .from('exercises')
    .select('id, name, equipment, category, gif_url')
    .eq('is_active', true)
    .not('gif_url', 'is', null);

  // Get all GIF files in storage
  const { data: gifFiles } = await supabase.storage
    .from('exercise-gifs')
    .list('', { limit: 1000 });

  const existingGifFilenames = new Set(
    gifFiles?.filter(f => f.name.endsWith('.gif')).map(f => f.name) || []
  );

  // Find exercises with gif_url that don't match any existing file
  const broken: any[] = [];
  const working: any[] = [];

  exercises?.forEach(ex => {
    const filename = ex.gif_url?.split('/').pop();
    if (filename && !existingGifFilenames.has(filename)) {
      broken.push({ ...ex, filename });
    } else if (filename) {
      working.push({ ...ex, filename });
    }
  });

  console.log('=� RESULTS:');
  console.log('═'.repeat(60));
  console.log(`✅ Working GIFs:     ${working.length}`);
  console.log(`❌ Broken GIF URLs:  ${broken.length}`);
  console.log('═'.repeat(60));
  console.log('');

  if (broken.length > 0) {
    console.log('❌ Exercises with BROKEN GIF URLs:\n');
    broken.forEach((ex, i) => {
      console.log(`${i + 1}. ${ex.name}`);
      console.log(`   Equipment: ${ex.equipment || 'N/A'}`);
      console.log(`   Category: ${ex.category || 'N/A'}`);
      console.log(`   Missing file: ${ex.filename}`);
      console.log(`   ID: ${ex.id}`);
      console.log('');
    });
  }
}

findBrokenGifs();
