import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface Exercise {
  id: string;
  name: string;
  gif_url: string | null;
}

const GIF_DIR = path.join(process.cwd(), 'exercise-gifs');
const DOWNLOAD_DELAY_MS = 500; // Delay between downloads to avoid rate limiting
const MAX_RETRIES = 3;

// Ensure GIF directory exists
if (!fs.existsSync(GIF_DIR)) {
  fs.mkdirSync(GIF_DIR, { recursive: true });
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function downloadGif(
  url: string, 
  filename: string, 
  retries = MAX_RETRIES
): Promise<boolean> {
  const filepath = path.join(GIF_DIR, filename);
  
  // Skip if already exists
  if (fs.existsSync(filepath)) {
    console.log(`    Already exists: ${filename}`);
    return true;
  }
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(filepath, buffer);
    
    console.log(`  ✅ Downloaded: ${filename} (${(buffer.length / 1024).toFixed(1)} KB)`);
    return true;
    
  } catch (error) {
    if (retries > 0) {
      console.log(`    Retry ${MAX_RETRIES - retries + 1}/${MAX_RETRIES} for ${filename}`);
      await sleep(1000);
      return downloadGif(url, filename, retries - 1);
    }
    
    console.error(`  ❌ Failed: ${filename} - ${error}`);
    return false;
  }
}

async function downloadExerciseGifs(exerciseIds?: string[]) {
  console.log(' Starting GIF download process...\n');
  
  // Build query
  let query = supabase
    .from('exercises')
    .select('id, name, gif_url')
    .not('gif_url', 'is', null);
  
  if (exerciseIds && exerciseIds.length > 0) {
    query = query.in('id', exerciseIds);
  }
  
  const { data: exercises, error } = await query;
  
  if (error) {
    throw new Error(`Failed to fetch exercises: ${error.message}`);
  }
  
  console.log(`= Found ${exercises?.length || 0} exercises with GIF URLs\n`);
  
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;
  
  for (let i = 0; i < (exercises?.length || 0); i++) {
    const exercise = exercises![i];
    
    if (!exercise.gif_url) continue;
    
    // Extract filename from URL or use ID
    let filename = exercise.gif_url.split('/').pop() || `${exercise.id}.gif`;
    if (!filename.endsWith('.gif')) {
      filename = `${exercise.id}.gif`;
    }
    
    console.log(`[${i + 1}/${exercises!.length}] ${exercise.name}`);
    
    const success = await downloadGif(exercise.gif_url, filename);
    
    if (success) {
      if (fs.existsSync(path.join(GIF_DIR, filename))) {
        const stats = fs.statSync(path.join(GIF_DIR, filename));
        if (stats.size > 0) {
          downloaded++;
        } else {
          skipped++;
        }
      }
    } else {
      failed++;
    }
    
    // Rate limiting
    await sleep(DOWNLOAD_DELAY_MS);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('= DOWNLOAD SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Successfully downloaded: ${downloaded}`);
  console.log(`  Already existed/skipped: ${skipped}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`= GIFs saved to: ${GIF_DIR}`);
}

// Load priority exercises from analysis output
async function downloadPriorityGifs() {
  const priorityFile = path.join(process.cwd(), 'scripts', 'output', 'exercises-need-gif-download.json');
  
  if (!fs.existsSync(priorityFile)) {
    console.log('�  Run analyze-inactive-exercises.ts first');
    return;
  }
  
  const exercises = JSON.parse(fs.readFileSync(priorityFile, 'utf-8')) as Exercise[];
  const exerciseIds = exercises.map(e => e.id);
  
  console.log(`= Downloading GIFs for ${exerciseIds.length} priority exercises\n`);
  
  await downloadExerciseGifs(exerciseIds);
}

// Run based on command line argument
const args = process.argv.slice(2);
if (args.includes('--priority')) {
  downloadPriorityGifs().catch(console.error);
} else if (args.includes('--all')) {
  downloadExerciseGifs().catch(console.error);
} else {
  console.log('Usage:');
  console.log('  npx ts-node scripts/download-exercise-gifs.ts --priority  # Download priority exercises');
  console.log('  npx ts-node scripts/download-exercise-gifs.ts --all       # Download all exercises');
}
