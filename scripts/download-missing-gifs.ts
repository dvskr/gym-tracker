import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';
import { execSync } from 'child_process';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const GIF_DIR = path.join(process.cwd(), 'exercise-gifs');
const GIF_1080P_DIR = path.join(process.cwd(), 'exercise-gifs-1080p');
const DOWNLOAD_DELAY_MS = 300;
const MAX_RETRIES = 3;
const CONCURRENT_DOWNLOADS = 5;

// ============================================
// GIF QUALITY SETTINGS
// ============================================
const TARGET_RESOLUTION = 1080;       // 1080p MANDATORY
const MIN_FILE_SIZE = 100 * 1024;     // 100KB minimum
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB maximum
// ============================================

// Priority order for equipment (most common gym equipment first)
const EQUIPMENT_PRIORITY: Record<string, number> = {
  'barbell': 1,
  'dumbbell': 2,
  'body weight': 3,
  'cable': 4,
  'smith machine': 5,
  'sled machine': 6,
  'leverage machine': 7,
  'machine': 8,
  'kettlebell': 9,
  'ez barbell': 10,
  'resistance band': 11,
  'band': 12,
  'stability ball': 13,
  'medicine ball': 14,
};

interface Exercise {
  id: string;
  name: string;
  equipment: string;
  category: string;
  gif_url: string | null;
}

interface DownloadResult {
  success: Exercise[];
  failed: Exercise[];
  skipped: Exercise[];
}

// Ensure directories exist
[GIF_DIR, GIF_1080P_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get GIF dimensions using ffprobe
 */
function getGifInfo(filepath: string): { width: number; height: number } | null {
  try {
    const result = execSync(
      `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${filepath}"`,
      { encoding: 'utf-8' }
    ).trim();
    
    const [width, height] = result.split(',').map(Number);
    return { width, height };
  } catch {
    return null;
  }
}

/**
 * Upscale GIF to 1080p using ffmpeg with HIGHEST quality settings
 * Uses lanczos scaling for best quality upscale
 */
function upscaleGifTo1080p(inputPath: string, outputPath: string): boolean {
  try {
    console.log(`   ↳ Upscaling to ${TARGET_RESOLUTION}x${TARGET_RESOLUTION}p...`);
    
    // HIGHEST QUALITY upscale command:
    // - lanczos: best scaling algorithm
    // - palettegen/paletteuse: preserve GIF colors
    // - max_colors=256: full color palette
    const cmd = `ffmpeg -y -i "${inputPath}" -vf "scale=${TARGET_RESOLUTION}:${TARGET_RESOLUTION}:force_original_aspect_ratio=decrease:flags=lanczos,pad=${TARGET_RESOLUTION}:${TARGET_RESOLUTION}:(ow-iw)/2:(oh-ih)/2:white,split[s0][s1];[s0]palettegen=max_colors=256:stats_mode=single[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5" "${outputPath}" 2>/dev/null`;
    
    execSync(cmd, { stdio: 'pipe', timeout: 120000 }); // 2 minute timeout
    return true;
  } catch (error) {
    console.error(`   ↳ Upscale failed: ${error}`);
    return false;
  }
}

/**
 * Verify GIF is 1080p
 */
function verify1080p(filepath: string): boolean {
  const info = getGifInfo(filepath);
  if (!info) return false;
  
  return info.width === TARGET_RESOLUTION || info.height === TARGET_RESOLUTION;
}

/**
 * Download a single GIF with retry logic
 */
async function downloadGif(
  exercise: Exercise,
  shouldUpscale: boolean,
  retries = 0
): Promise<boolean> {
  if (!exercise.gif_url) {
    console.log(`⚠️  ${exercise.name}: No GIF URL`);
    return false;
  }

  const gifPath = path.join(GIF_DIR, `${exercise.id}.gif`);
  const gif1080pPath = path.join(GIF_1080P_DIR, `${exercise.id}.gif`);

  try {
    console.log(`\n📥 Downloading: ${exercise.name}`);
    console.log(`   Equipment: ${exercise.equipment}`);
    console.log(`   URL: ${exercise.gif_url}`);

    const response = await fetch(exercise.gif_url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const buffer = await response.buffer();
    const fileSize = buffer.length;

    // Validate file size
    if (fileSize < MIN_FILE_SIZE) {
      throw new Error(`File too small: ${(fileSize / 1024).toFixed(2)}KB`);
    }

    if (fileSize > MAX_FILE_SIZE) {
      throw new Error(`File too large: ${(fileSize / 1024 / 1024).toFixed(2)}MB`);
    }

    // Save original GIF
    fs.writeFileSync(gifPath, buffer);
    console.log(`   ✅ Downloaded: ${(fileSize / 1024).toFixed(2)}KB`);

    // Upscale if requested
    if (shouldUpscale) {
      const info = getGifInfo(gifPath);
      if (info) {
        console.log(`   📐 Original: ${info.width}x${info.height}`);
        
        if (info.width < TARGET_RESOLUTION && info.height < TARGET_RESOLUTION) {
          const upscaled = upscaleGifTo1080p(gifPath, gif1080pPath);
          
          if (upscaled && verify1080p(gif1080pPath)) {
            const upscaledSize = fs.statSync(gif1080pPath).size;
            console.log(`   ✅ Upscaled: ${TARGET_RESOLUTION}x${TARGET_RESOLUTION} (${(upscaledSize / 1024).toFixed(2)}KB)`);
          } else {
            console.log(`   ⚠️  Upscale failed, keeping original`);
          }
        } else {
          console.log(`   ℹ️  Already high resolution, no upscale needed`);
          // Copy to 1080p folder
          fs.copyFileSync(gifPath, gif1080pPath);
        }
      }
    }

    return true;
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);

    // Retry logic
    if (retries < MAX_RETRIES) {
      console.log(`   🔄 Retry ${retries + 1}/${MAX_RETRIES}...`);
      await sleep(DOWNLOAD_DELAY_MS * (retries + 1));
      return downloadGif(exercise, shouldUpscale, retries + 1);
    }

    return false;
  }
}

/**
 * Download exercises in batches
 */
async function downloadBatch(
  exercises: Exercise[],
  shouldUpscale: boolean
): Promise<DownloadResult> {
  const result: DownloadResult = {
    success: [],
    failed: [],
    skipped: [],
  };

  for (let i = 0; i < exercises.length; i += CONCURRENT_DOWNLOADS) {
    const batch = exercises.slice(i, i + CONCURRENT_DOWNLOADS);
    
    const promises = batch.map(async (exercise) => {
      const gifPath = path.join(GIF_DIR, `${exercise.id}.gif`);
      
      // Skip if already exists
      if (fs.existsSync(gifPath)) {
        console.log(`⏭️  Skipping: ${exercise.name} (already exists)`);
        result.skipped.push(exercise);
        return;
      }

      const success = await downloadGif(exercise, shouldUpscale);
      
      if (success) {
        result.success.push(exercise);
      } else {
        result.failed.push(exercise);
      }

      // Rate limiting
      await sleep(DOWNLOAD_DELAY_MS);
    });

    await Promise.all(promises);
  }

  return result;
}

async function main() {
  console.log('🔍 Finding active exercises missing GIFs...\n');

  const args = process.argv.slice(2);
  const shouldUpscale = !args.includes('--no-upscale');
  const isPriority = args.includes('--priority');
  const equipmentFilter = args.find(arg => arg.startsWith('--equipment'))?.split('=')[1];

  // Get list of downloaded GIF filenames
  const downloadedGifs = new Set<string>();
  if (fs.existsSync(GIF_DIR)) {
    fs.readdirSync(GIF_DIR)
      .filter(f => f.endsWith('.gif'))
      .forEach(f => {
        const id = f.replace('.gif', '');
        downloadedGifs.add(id);
      });
  }

  console.log(`📁 Found ${downloadedGifs.size} downloaded GIFs\n`);

  // Fetch all active exercises
  const { data: exercises, error } = await supabase
    .from('exercises')
    .select('id, name, equipment, category, gif_url')
    .eq('is_active', true)
    .not('gif_url', 'is', null)
    .order('equipment', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch exercises: ${error.message}`);
  }

  // Filter exercises missing GIFs
  let missingGifs = (exercises || []).filter(ex => !downloadedGifs.has(ex.id));

  // Apply equipment filter if specified
  if (equipmentFilter) {
    const filterLower = equipmentFilter.toLowerCase();
    missingGifs = missingGifs.filter(ex => 
      ex.equipment?.toLowerCase().includes(filterLower)
    );
    console.log(`🎯 Filtering by equipment: "${equipmentFilter}"`);
  }

  // Sort by priority if requested
  if (isPriority) {
    missingGifs.sort((a, b) => {
      const aPriority = EQUIPMENT_PRIORITY[a.equipment?.toLowerCase()] || 999;
      const bPriority = EQUIPMENT_PRIORITY[b.equipment?.toLowerCase()] || 999;
      return aPriority - bPriority;
    });
    console.log(`📊 Sorting by equipment priority\n`);
  }

  // Summary
  console.log('=' .repeat(60));
  console.log('DOWNLOAD SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Active Exercises: ${exercises?.length || 0}`);
  console.log(`Already Downloaded: ${downloadedGifs.size}`);
  console.log(`Missing GIFs: ${missingGifs.length}`);
  console.log(`Upscaling: ${shouldUpscale ? 'ENABLED' : 'DISABLED'}`);
  console.log(`Equipment Filter: ${equipmentFilter || 'None'}`);
  console.log('='.repeat(60));

  if (missingGifs.length === 0) {
    console.log('\n✅ All GIFs already downloaded!');
    return;
  }

  // Group by equipment for display
  const byEquipment: Record<string, Exercise[]> = {};
  missingGifs.forEach(ex => {
    const eq = ex.equipment || 'unknown';
    if (!byEquipment[eq]) byEquipment[eq] = [];
    byEquipment[eq].push(ex);
  });

  console.log(`\n📦 Missing by Equipment:`);
  Object.entries(byEquipment)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 10)
    .forEach(([eq, exs]) => {
      const withUrl = exs.filter(e => e.gif_url).length;
      console.log(`   ${eq}: ${exs.length} (${withUrl} have URLs)`);
    });

  console.log(`\n🚀 Starting download of ${missingGifs.length} exercises...\n`);

  const result = await downloadBatch(missingGifs, shouldUpscale);

  // Final Summary
  console.log('\n' + '='.repeat(60));
  console.log('DOWNLOAD COMPLETE');
  console.log('='.repeat(60));
  console.log(`✅ Success: ${result.success.length}`);
  console.log(`⏭️  Skipped: ${result.skipped.length}`);
  console.log(`❌ Failed: ${result.failed.length}`);
  console.log('='.repeat(60));

  if (result.failed.length > 0) {
    console.log(`\n⚠️  Failed Exercises:`);
    result.failed.forEach(ex => {
      console.log(`   - ${ex.name} (${ex.equipment})`);
    });
  }

  // Save failed list for retry
  if (result.failed.length > 0) {
    const outputDir = path.join(process.cwd(), 'scripts', 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const failedPath = path.join(outputDir, 'failed-downloads.json');
    fs.writeFileSync(failedPath, JSON.stringify(result.failed, null, 2));
    console.log(`\n📄 Failed downloads saved to: ${failedPath}`);
  }

  console.log(`\n✅ Done!`);
  
  if (shouldUpscale) {
    console.log(`\n📁 Original GIFs: ${GIF_DIR}`);
    console.log(`📁 1080p GIFs: ${GIF_1080P_DIR}`);
  } else {
    console.log(`\n📁 GIFs saved to: ${GIF_DIR}`);
  }
}

main().catch(console.error);

