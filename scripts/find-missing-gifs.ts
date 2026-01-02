import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface Exercise {
  id: string;
  name: string;
  equipment: string;
  category: string;
  gif_url: string | null;
  is_active?: boolean;
}

const GIF_DIR = path.join(process.cwd(), 'exercise-gifs');

async function findExercisesMissingGifs() {
  console.log('= Finding active exercises missing GIFs...\n');
  
  // Get list of downloaded GIF filenames
  const downloadedGifs = new Set<string>();
  if (fs.existsSync(GIF_DIR)) {
    fs.readdirSync(GIF_DIR)
      .filter(f => f.endsWith('.gif'))
      .forEach(f => downloadedGifs.add(f.toLowerCase()));
  }
  
  console.log(`=� Found ${downloadedGifs.size} downloaded GIFs in ${GIF_DIR}\n`);
  
  // Fetch all active exercises
  const { data: exercises, error } = await supabase
    .from('exercises')
    .select('id, name, equipment, category, gif_url')
    .eq('is_active', true)
    .order('equipment', { ascending: true });
  
  if (error) {
    throw new Error(`Failed to fetch exercises: ${error.message}`);
  }
  
  // Categorize by whether GIF is downloaded
  const missingGifs: Exercise[] = [];
  const hasGifs: Exercise[] = [];
  
  for (const exercise of exercises || []) {
    // Check if GIF exists locally
    let hasLocalGif = false;
    
    if (exercise.gif_url) {
      const filename = exercise.gif_url.split('/').pop()?.toLowerCase();
      if (filename && downloadedGifs.has(filename)) {
        hasLocalGif = true;
      }
    }
    
    // Also check by exercise ID
    if (downloadedGifs.has(`${exercise.id}.gif`)) {
      hasLocalGif = true;
    }
    
    if (hasLocalGif) {
      hasGifs.push(exercise);
    } else {
      missingGifs.push(exercise);
    }
  }
  
  // Group missing by equipment
  const byEquipment: Record<string, Exercise[]> = {};
  missingGifs.forEach(ex => {
    const eq = ex.equipment || 'unknown';
    if (!byEquipment[eq]) byEquipment[eq] = [];
    byEquipment[eq].push(ex);
  });
  
  // Print summary
  console.log('=' .repeat(60));
  console.log('ACTIVE EXERCISES MISSING GIFS');
  console.log('='.repeat(60));
  console.log(`\n=� SUMMARY`);
  console.log(`   Total Active: ${exercises?.length || 0}`);
  console.log(`   With Downloaded GIF: ${hasGifs.length}`);
  console.log(`   �  Missing GIF: ${missingGifs.length}`);
  
  console.log(`\n=� MISSING BY EQUIPMENT:`);
  Object.entries(byEquipment)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([eq, exs]) => {
      const withUrl = exs.filter(e => e.gif_url).length;
      console.log(`   ${eq}: ${exs.length} missing (${withUrl} have source URL)`);
    });
  
  // Save outputs
  const outputDir = path.join(process.cwd(), 'scripts', 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // All missing exercises
  fs.writeFileSync(
    path.join(outputDir, 'active-missing-gifs.json'),
    JSON.stringify(missingGifs, null, 2)
  );
  
  // Exercises with source URLs (can download)
  const canDownload = missingGifs.filter(e => e.gif_url);
  fs.writeFileSync(
    path.join(outputDir, 'can-download-gifs.json'),
    JSON.stringify(canDownload, null, 2)
  );
  
  // Exercises without source URLs (need manual sourcing)
  const needsManualSource = missingGifs.filter(e => !e.gif_url);
  fs.writeFileSync(
    path.join(outputDir, 'needs-manual-gif-source.json'),
    JSON.stringify(needsManualSource, null, 2)
  );
  
  // By equipment
  fs.writeFileSync(
    path.join(outputDir, 'missing-gifs-by-equipment.json'),
    JSON.stringify(byEquipment, null, 2)
  );
  
  console.log(`\n✅ Reports saved to scripts/output/`);
  console.log(`   - active-missing-gifs.json (${missingGifs.length} total)`);
  console.log(`   - can-download-gifs.json (${canDownload.length} have URLs)`);
  console.log(`   - needs-manual-gif-source.json (${needsManualSource.length} no URL)`);
  console.log(`   - missing-gifs-by-equipment.json`);
  
  // Print exercises that can be downloaded
  console.log(`\n EXERCISES WITH DOWNLOADABLE GIFS (${canDownload.length}):`);
  Object.entries(byEquipment).forEach(([eq, exs]) => {
    const withUrl = exs.filter(e => e.gif_url);
    if (withUrl.length > 0) {
      console.log(`\n   ${eq.toUpperCase()} (${withUrl.length}):`);
      withUrl.slice(0, 3).forEach(ex => {
        console.log(`      - ${ex.name}`);
      });
      if (withUrl.length > 3) {
        console.log(`      ... and ${withUrl.length - 3} more`);
      }
    }
  });
  
  return { missingGifs, canDownload, needsManualSource, byEquipment };
}

findExercisesMissingGifs().catch(console.error);

