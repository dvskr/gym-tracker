import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const GIF_DIR = path.join(process.cwd(), 'exercise-gifs');
const THUMBNAIL_DIR = path.join(process.cwd(), 'exercise-thumbnails');

// ============================================
// THUMBNAIL SETTINGS - DO NOT CHANGE
// ============================================
const THUMBNAIL_SIZE = 216;  // 216px as required
const JPEG_QUALITY = 1;      // 1 = MAXIMUM quality (scale 1-31, lower = better)
// ============================================

// Ensure thumbnail directory exists
if (!fs.existsSync(THUMBNAIL_DIR)) {
  fs.mkdirSync(THUMBNAIL_DIR, { recursive: true });
}

function generateThumbnail(gifPath: string, outputPath: string): boolean {
  try {
    // HIGHEST QUALITY thumbnail generation:
    // -q:v 1 = maximum JPEG quality
    // -qmin 1 -qmax 1 = force maximum quality
    // flags=lanczos = best scaling algorithm
    const cmd = `ffmpeg -y -i "${gifPath}" -vframes 1 -vf "scale=${THUMBNAIL_SIZE}:${THUMBNAIL_SIZE}:force_original_aspect_ratio=decrease:flags=lanczos,pad=${THUMBNAIL_SIZE}:${THUMBNAIL_SIZE}:(ow-iw)/2:(oh-ih)/2:white" -q:v ${JPEG_QUALITY} -qmin 1 -qmax 1 "${outputPath}" 2>/dev/null`;
    execSync(cmd, { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Alternative: Generate PNG thumbnails for LOSSLESS quality
 * Use this if JPG quality is not sufficient
 */
function generateThumbnailPNG(gifPath: string, outputPath: string): boolean {
  try {
    const pngPath = outputPath.replace('.jpg', '.png');
    const cmd = `ffmpeg -y -i "${gifPath}" -vframes 1 -vf "scale=${THUMBNAIL_SIZE}:${THUMBNAIL_SIZE}:force_original_aspect_ratio=decrease:flags=lanczos,pad=${THUMBNAIL_SIZE}:${THUMBNAIL_SIZE}:(ow-iw)/2:(oh-ih)/2:white" -compression_level 0 "${pngPath}" 2>/dev/null`;
    execSync(cmd, { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

async function generateAllThumbnails() {
  console.log('=  Generating 216px HIGHEST QUALITY thumbnails...\n');
  console.log('=' .repeat(50));
  console.log('THUMBNAIL SETTINGS');
  console.log('='.repeat(50));
  console.log(`=� Size: ${THUMBNAIL_SIZE}x${THUMBNAIL_SIZE}px (216px)`);
  console.log(` Quality: -q:v ${JPEG_QUALITY} (MAXIMUM)`);
  console.log(`=' Scaling: lanczos (best algorithm)`);
  console.log('='.repeat(50) + '\n');
  
  // Check if ffmpeg is available
  try {
    execSync('ffmpeg -version', { stdio: 'pipe' });
  } catch {
    console.error('❌ ffmpeg not found. Install with:');
    console.error('   macOS: brew install ffmpeg');
    console.error('   Ubuntu: sudo apt-get install ffmpeg');
    return;
  }
  
  // Use 1080p GIFs if available, otherwise original
  const GIF_1080P_DIR = path.join(process.cwd(), 'exercise-gifs-1080p');
  const sourceDir = fs.existsSync(GIF_1080P_DIR) && 
    fs.readdirSync(GIF_1080P_DIR).filter(f => f.endsWith('.gif')).length > 0
    ? GIF_1080P_DIR 
    : GIF_DIR;
  
  console.log(`= Source GIFs: ${sourceDir}`);
  console.log(`= Output Thumbnails: ${THUMBNAIL_DIR}\n`);
  
  const gifFiles = fs.readdirSync(sourceDir)
    .filter(f => f.toLowerCase().endsWith('.gif'));
  
  console.log(`= Found ${gifFiles.length} GIF files to process\n`);
  
  let generated = 0;
  let skipped = 0;
  let failed = 0;
  
  for (let i = 0; i < gifFiles.length; i++) {
    const gifFile = gifFiles[i];
    const thumbnailFile = gifFile.replace('.gif', '.jpg');
    const gifPath = path.join(sourceDir, gifFile);
    const thumbnailPath = path.join(THUMBNAIL_DIR, thumbnailFile);
    
    // Skip if exists and has good size (quality thumbnails are larger)
    if (fs.existsSync(thumbnailPath)) {
      const stats = fs.statSync(thumbnailPath);
      if (stats.size > 10000) { // At least 10KB for high quality 216px thumbnail
        skipped++;
        continue;
      }
    }
    
    process.stdout.write(`\r[${i + 1}/${gifFiles.length}] Generating 216px thumbnails...`);
    
    if (generateThumbnail(gifPath, thumbnailPath)) {
      generated++;
    } else {
      failed++;
    }
  }
  
  console.log('\n\n' + '='.repeat(50));
  console.log('= THUMBNAIL GENERATION COMPLETE');
  console.log('='.repeat(50));
  console.log(`✅ Generated: ${generated}`);
  console.log(`  Skipped (already exist): ${skipped}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`= Size: ${THUMBNAIL_SIZE}x${THUMBNAIL_SIZE}px (216px)`);
  console.log(` Quality: MAXIMUM (-q:v 1)`);
  console.log(`= Saved to: ${THUMBNAIL_DIR}`);
}

generateAllThumbnails().catch(console.error);
