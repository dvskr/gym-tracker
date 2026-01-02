import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const GIF_DIR = path.join(process.cwd(), 'exercise-gifs');

async function verifyGifCoverage() {
  console.log('= Verifying GIF coverage...\n');
  
  // Get downloaded GIFs
  const downloadedGifs = new Set<string>();
  if (fs.existsSync(GIF_DIR)) {
    fs.readdirSync(GIF_DIR)
      .filter(f => f.endsWith('.gif'))
      .forEach(f => downloadedGifs.add(f.toLowerCase()));
  }
  
  // Fetch all active exercises
  const { data: exercises, error } = await supabase
    .from('exercises')
    .select('id, name, equipment, gif_url, thumbnail_url')
    .eq('is_active', true);
  
  if (error) throw new Error(error.message);
  
  // Categorize
  const withGif: any[] = [];
  const withoutGif: any[] = [];
  
  for (const ex of exercises || []) {
    const filename = ex.gif_url?.split('/').pop()?.toLowerCase();
    if (filename && downloadedGifs.has(filename)) {
      withGif.push(ex);
    } else {
      withoutGif.push(ex);
    }
  }
  
  // Summary
  console.log('='.repeat(60));
  console.log('GIF COVERAGE VERIFICATION');
  console.log('='.repeat(60));
  console.log(`\n=� SUMMARY`);
  console.log(`   Total Active: ${exercises?.length || 0}`);
  console.log(`   ✅ With Downloaded GIF: ${withGif.length} (${((withGif.length / (exercises?.length || 1)) * 100).toFixed(1)}%)`);
  console.log(`   �  Missing GIF: ${withoutGif.length}`);
  
  // Group missing by equipment
  const missingByEquipment: Record<string, any[]> = {};
  withoutGif.forEach(ex => {
    const eq = ex.equipment || 'unknown';
    if (!missingByEquipment[eq]) missingByEquipment[eq] = [];
    missingByEquipment[eq].push(ex);
  });
  
  if (withoutGif.length > 0) {
    console.log(`\n�  STILL MISSING BY EQUIPMENT:`);
    Object.entries(missingByEquipment)
      .sort((a, b) => b[1].length - a[1].length)
      .forEach(([eq, exs]) => {
        console.log(`   ${eq}: ${exs.length}`);
      });
  }
  
  // Key exercises check
  const keyExercises = [
    'smith bench press',
    'smith squat',
    'sled 45° leg press',
    'cable pushdown',
    'push-up',
    'pull-up',
    'kettlebell swing',
    'trap bar deadlift',
  ];
  
  console.log(`\n KEY EXERCISE STATUS:`);
  for (const name of keyExercises) {
    const ex = exercises?.find(e => e.name.toLowerCase() === name.toLowerCase());
    if (ex) {
      const hasGif = withGif.some(g => g.id === ex.id);
      const status = hasGif ? '✅' : '�';
      console.log(`   ${status} ${name}`);
    } else {
      console.log(`   ❓ ${name} (not found)`);
    }
  }
}

verifyGifCoverage().catch(console.error);

