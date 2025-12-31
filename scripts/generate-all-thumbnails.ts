import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import sharp from 'sharp';

const GIF_DIR = path.join(process.cwd(), 'exercise-gifs');
const THUMBNAIL_DIR = path.join(process.cwd(), 'exercise-thumbnails');

// ============================================
// THUMBNAIL SETTINGS - HIGHEST QUALITY
// ============================================
const THUMBNAIL_SIZE = 216;    // 216px as required
const THUMBNAIL_QUALITY = 100; // 100 = MAXIMUM quality for Sharp
// ============================================

// Ensure thumbnail directory exists
if (!fs.existsSync(THUMBNAIL_DIR)) {
  fs.mkdirSync(THUMBNAIL_DIR, { recursive: true });
}

interface ThumbnailResult {
  success: string[];
  failed: string[];
  skipped: string[];
}

/**
 * Generate thumbnail from GIF using ffmpeg
 * Extracts the first frame and resizes it
 */
function generateThumbnail(gifPath: string, outputPath: string): boolean {
  try {
    // HIGHEST QUALITY thumbnail generation:
    // -q:v 1 = maximum JPEG quality (scale 1-31, lower = better)
    // -qmin 1 -qmax 1 = force maximum quality
    // flags=lanczos = best scaling algorithm
    const command = `ffmpeg -y -i "${gifPath}" -vframes 1 -vf "scale=${THUMBNAIL_SIZE}:${THUMBNAIL_SIZE}:force_original_aspect_ratio=decrease:flags=lanczos,pad=${THUMBNAIL_SIZE}:${THUMBNAIL_SIZE}:(ow-iw)/2:(oh-ih)/2:white" -q:v 1 -qmin 1 -qmax 1 "${outputPath}"`;
    
    execSync(command, { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Alternative: Generate thumbnail using sharp (if ffmpeg not available)
 */
async function generateThumbnailSharp(gifPath: string, outputPath: string): Promise<boolean> {
  try {
    await sharp(gifPath, { pages: 1, animated: false }) // First frame only
      .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 },
        kernel: sharp.kernel.lanczos3 // Best quality scaling
      })
      .jpeg({ 
        quality: THUMBNAIL_QUALITY,
        chromaSubsampling: '4:4:4', // No chroma subsampling for highest quality
        mozjpeg: true // Use mozjpeg for better quality
      })
      .toFile(outputPath);
    
    return true;
  } catch (error) {
    // Silent fail for cleaner output
    return false;
  }
}

async function generateAllThumbnails(): Promise<ThumbnailResult> {
  console.log('🖼️  Starting thumbnail generation...\n');
  
  const result: ThumbnailResult = {
    success: [],
    failed: [],
    skipped: [],
  };
  
  // Get all GIF files
  const gifFiles = fs.readdirSync(GIF_DIR)
    .filter(f => f.toLowerCase().endsWith('.gif'));
  
  console.log(`📋 Found ${gifFiles.length} GIF files\n`);
  
  // Check if ffmpeg is available
  let useFfmpeg = true;
  try {
    execSync('ffmpeg -version', { stdio: 'pipe' });
    console.log('✅ Using ffmpeg for thumbnail generation\n');
  } catch {
    console.log('⚠️  ffmpeg not found, using sharp instead\n');
    useFfmpeg = false;
  }
  
  for (let i = 0; i < gifFiles.length; i++) {
    const gifFile = gifFiles[i];
    const gifPath = path.join(GIF_DIR, gifFile);
    const thumbnailFile = gifFile.replace('.gif', '.jpg');
    const thumbnailPath = path.join(THUMBNAIL_DIR, thumbnailFile);
    
    // Force regenerate if using --force flag, otherwise skip existing
    const forceRegenerate = process.argv.includes('--force');
    if (fs.existsSync(thumbnailPath) && !forceRegenerate) {
      result.skipped.push(gifFile);
      continue;
    }
    
    process.stdout.write(`[${i + 1}/${gifFiles.length}] ${gifFile}... `);
    
    let success: boolean;
    if (useFfmpeg) {
      success = generateThumbnail(gifPath, thumbnailPath);
    } else {
      success = await generateThumbnailSharp(gifPath, thumbnailPath);
    }
    
    if (success) {
      result.success.push(gifFile);
      console.log('✅');
    } else {
      result.failed.push(gifFile);
      console.log('❌');
    }
  }
  
  return result;
}

async function main() {
  const result = await generateAllThumbnails();
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 THUMBNAIL GENERATION SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Generated: ${result.success.length}`);
  console.log(`⏭️  Skipped (already exist): ${result.skipped.length}`);
  console.log(`❌ Failed: ${result.failed.length}`);
  console.log(`📁 Thumbnails saved to: ${THUMBNAIL_DIR}`);
  
  if (result.failed.length > 0) {
    console.log('\n❌ Failed files:');
    result.failed.forEach(f => console.log(`   - ${f}`));
  }
}

main().catch(console.error);

