import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';
import { execSync } from 'child_process';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const GIF_DIR = path.join(process.cwd(), 'exercise-gifs');
const GIF_1080P_DIR = path.join(process.cwd(), 'exercise-gifs-1080p');
const DOWNLOAD_DELAY_MS = 300;
const MAX_RETRIES = 3;
const CONCURRENT_DOWNLOADS = 5;

// ============================================
// GIF QUALITY SETTINGS - DO NOT CHANGE
// ============================================
const TARGET_RESOLUTION = 1080;       // 1080p MANDATORY
const MIN_FILE_SIZE = 100 * 1024;     // 100KB minimum
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB maximum
// ============================================

// Ensure directories exist
[GIF_DIR, GIF_1080P_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

interface Exercise {
  id: string;
  name: string;
  equipment: string;
  gif_url: string | null;
}

interface GifInfo {
  width: number;
  height: number;
  frames: number;
  size: number;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get GIF dimensions using ffprobe
 */
function getGifInfo(filepath: string): GifInfo | null {
  try {
    const result = execSync(
      `ffprobe -v error -select_streams v:0 -count_frames -show_entries stream=width,height,nb_read_frames -of csv=p=0 "${filepath}"`,
      { encoding: 'utf-8' }
    ).trim();
    
    const [width, height, frames] = result.split(',').map(Number);
    const stats = fs.statSync(filepath);
    
    return { width, height, frames, size: stats.size };
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
    console.log(`\n   ↳ Upscaling to ${TARGET_RESOLUTION}x${TARGET_RESOLUTION}p...`);
    
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
  return info.width >= TARGET_RESOLUTION || info.height >= TARGET_RESOLUTION;
}

async function downloadGif(
  exercise: Exercise,
  retries = MAX_RETRIES
): Promise<{ success: boolean; filename?: string; error?: string; info?: GifInfo }> {
  if (!exercise.gif_url) {
    return { success: false, error: 'No GIF URL' };
  }
  
  // Extract filename from URL
  let filename = exercise.gif_url.split('/').pop() || `${exercise.id}.gif`;
  if (!filename.endsWith('.gif')) {
    filename = `${exercise.id}.gif`;
  }
  
  const filepath = path.join(GIF_DIR, filename);
  const filepath1080p = path.join(GIF_1080P_DIR, filename);
  
  // Skip if 1080p version already exists
  if (fs.existsSync(filepath1080p)) {
    const info = getGifInfo(filepath1080p);
    if (info && info.width >= TARGET_RESOLUTION) {
      return { success: true, filename, info };
    }
  }
  
  // Skip download if original already exists and is valid
  let needsDownload = true;
  if (fs.existsSync(filepath)) {
    const stats = fs.statSync(filepath);
    if (stats.size >= MIN_FILE_SIZE && stats.size <= MAX_FILE_SIZE) {
      needsDownload = false;
    }
  }
  
  if (needsDownload) {
    try {
      const response = await fetch(exercise.gif_url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'image/gif,image/*,*/*;q=0.8',
        },
        timeout: 30000,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const buffer = await response.buffer();
      
      // Validate file size
      if (buffer.length < MIN_FILE_SIZE) {
        throw new Error(`File too small: ${buffer.length} bytes`);
      }
      if (buffer.length > MAX_FILE_SIZE) {
        throw new Error(`File too large: ${buffer.length} bytes`);
      }
      
      fs.writeFileSync(filepath, buffer);
      
    } catch (error) {
      if (retries > 0) {
        await sleep(1000);
        return downloadGif(exercise, retries - 1);
      }
      return { success: false, error: String(error) };
    }
  }
  
  // Get original info
  const originalInfo = getGifInfo(filepath);
  
  // Check if upscaling needed
  if (originalInfo && originalInfo.width < TARGET_RESOLUTION) {
    // Upscale to 1080p
    const upscaled = upscaleGifTo1080p(filepath, filepath1080p);
    if (upscaled) {
      const info1080p = getGifInfo(filepath1080p);
      return { success: true, filename, info: info1080p || originalInfo };
    }
  } else if (originalInfo) {
    // Already high quality, just copy
    fs.copyFileSync(filepath, filepath1080p);
  }
  
  return { success: true, filename, info: originalInfo || undefined };
}

async function downloadBatch(exercises: Exercise[], upscale: boolean = true): Promise<{
  downloaded: number;
  failed: number;
  skipped: number;
  upscaled: number;
  errors: Array<{ name: string; error: string }>;
}> {
  const result = {
    downloaded: 0,
    failed: 0,
    skipped: 0,
    upscaled: 0,
    errors: [] as Array<{ name: string; error: string }>,
  };
  
  for (let i = 0; i < exercises.length; i += CONCURRENT_DOWNLOADS) {
    const batch = exercises.slice(i, i + CONCURRENT_DOWNLOADS);
    
    const downloads = batch.map(async (exercise, idx) => {
      const globalIdx = i + idx + 1;
      process.stdout.write(`\r[${globalIdx}/${exercises.length}] Downloading & processing...`);
      
      const { success, filename, error, info } = await downloadGif(exercise);
      
      if (success) {
        if (info && info.width >= TARGET_RESOLUTION) {
          result.upscaled++;
        }
        result.downloaded++;
      } else {
        result.failed++;
        result.errors.push({ name: exercise.name, error: error || 'Unknown error' });
      }
      
      return { exercise, success };
    });
    
    await Promise.all(downloads);
    await sleep(DOWNLOAD_DELAY_MS);
  }
  
  console.log('');
  return result;
}

async function main() {
  console.log(' Starting GIF download for active exercises...\n');
  console.log(`= Target Resolution: ${TARGET_RESOLUTION}x${TARGET_RESOLUTION}p`);
  console.log(`= Original GIFs: ${GIF_DIR}`);
  console.log(`= 1080p GIFs: ${GIF_1080P_DIR}\n`);
  
  // Check ffmpeg/ffprobe availability
  try {
    execSync('ffmpeg -version', { stdio: 'pipe' });
    execSync('ffprobe -version', { stdio: 'pipe' });
  } catch {
    console.error('❌ ffmpeg/ffprobe not found. Install with:');
    console.error('   macOS: brew install ffmpeg');
    console.error('   Windows: choco install ffmpeg');
    console.error('   Ubuntu: sudo apt-get install ffmpeg');
    return;
  }
  
  // Load exercises to download
  const inputFile = path.join(process.cwd(), 'scripts', 'output', 'can-download-gifs.json');
  
  if (!fs.existsSync(inputFile)) {
    console.log('�  Run find-missing-gifs.ts first');
    return;
  }
  
  const exercises: Exercise[] = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
  
  // Parse arguments
  const args = process.argv.slice(2);
  let filteredExercises = exercises;
  
  // Filter by equipment
  if (args.includes('--equipment')) {
    const eqIndex = args.indexOf('--equipment');
    const equipment = args[eqIndex + 1]?.toLowerCase();
    if (equipment) {
      filteredExercises = exercises.filter(e => 
        e.equipment?.toLowerCase().includes(equipment)
      );
      console.log(`= Filtered to ${equipment}: ${filteredExercises.length} exercises\n`);
    }
  }
  
  // Priority order
  const priorityOrder = [
    'smith machine',
    'machine',
    'sled machine',
    'body weight',
    'cable',
    'barbell',
    'kettlebell',
    'dumbbell',
    'resistance band',
    'medicine ball',
    'trap bar',
  ];
  
  if (args.includes('--priority')) {
    filteredExercises.sort((a, b) => {
      const aIdx = priorityOrder.findIndex(p => a.equipment?.toLowerCase().includes(p));
      const bIdx = priorityOrder.findIndex(p => b.equipment?.toLowerCase().includes(p));
      return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
    });
  }
  
  // Skip upscaling option
  const skipUpscale = args.includes('--no-upscale');
  
  console.log(`= ${filteredExercises.length} exercises to process`);
  console.log(`= Upscaling: ${skipUpscale ? 'DISABLED' : 'ENABLED (to 1080p)'}\n`);
  
  // Download
  const result = await downloadBatch(filteredExercises, !skipUpscale);
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('= DOWNLOAD SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Downloaded/Processed: ${result.downloaded}`);
  console.log(`= At 1080p: ${result.upscaled}`);
  console.log(`  Skipped: ${result.skipped}`);
  console.log(`❌ Failed: ${result.failed}`);
  console.log(`= Original GIFs: ${GIF_DIR}`);
  console.log(`= 1080p GIFs: ${GIF_1080P_DIR}`);
  
  if (result.errors.length > 0) {
    console.log('\n❌ Failed downloads:');
    result.errors.slice(0, 10).forEach(e => {
      console.log(`   - ${e.name}: ${e.error}`);
    });
    if (result.errors.length > 10) {
      console.log(`   ... and ${result.errors.length - 10} more`);
    }
    
    const outputDir = path.join(process.cwd(), 'scripts', 'output');
    fs.writeFileSync(
      path.join(outputDir, 'download-errors.json'),
      JSON.stringify(result.errors, null, 2)
    );
  }
}

main().catch(console.error);
