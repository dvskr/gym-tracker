import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

const GIF_DIR = 'exercise-gifs';
const THUMBNAIL_DIR = 'exercise-thumbnails';
const THUMBNAIL_SIZE = 224; // 4x retina (56px display × 4 = 224px) - ULTRA PREMIUM

async function regenerateThumbnails() {
  console.log(`=�  Regenerating thumbnails at ${THUMBNAIL_SIZE}x${THUMBNAIL_SIZE}px for ultra-sharp display...\n`);
  
  // Delete old thumbnails
  if (fs.existsSync(THUMBNAIL_DIR)) {
    console.log('=�  Removing old thumbnails...');
    fs.rmSync(THUMBNAIL_DIR, { recursive: true });
  }
  
  fs.mkdirSync(THUMBNAIL_DIR, { recursive: true });
  
  const gifFiles = fs.readdirSync(GIF_DIR).filter(file => file.endsWith('.gif'));
  console.log(`Found ${gifFiles.length} GIF files\n`);
  
  let generated = 0;
  let failed = 0;
  
  for (const gifFile of gifFiles) {
    try {
      const thumbnailFile = gifFile.replace('.gif', '.png');
      const thumbnailPath = path.join(THUMBNAIL_DIR, thumbnailFile);
      const gifPath = path.join(GIF_DIR, gifFile);
      
      // Extract first frame and resize with high quality
      await sharp(gifPath, { animated: true, pages: 1 })
        .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
          fit: 'cover',
          position: 'center',
          kernel: 'lanczos3' // Best quality scaling
        })
        .png({ 
          quality: 95,        // Higher quality
          compressionLevel: 6  // Good compression
        })
        .toFile(thumbnailPath);
      
      generated++;
      if (generated % 20 === 0) {
        console.log(`✅ Generated ${generated}/${gifFiles.length} thumbnails...`);
      }
      
    } catch (err: any) {
      console.error(`❌ ${gifFile}: ${err.message}`);
      failed++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('ULTRA-SHARP THUMBNAIL GENERATION COMPLETE');
  console.log('='.repeat(60));
  console.log(`Generated: ${generated}`);
  console.log(`Failed: ${failed}`);
  
  // Calculate size
  const thumbnailFiles = fs.readdirSync(THUMBNAIL_DIR);
  const totalSize = thumbnailFiles.reduce((sum, file) => {
    const stats = fs.statSync(path.join(THUMBNAIL_DIR, file));
    return sum + stats.size;
  }, 0);
  
  console.log(`\n=� Total thumbnail size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`=� Average size: ${(totalSize / thumbnailFiles.length / 1024).toFixed(2)} KB per thumbnail`);
  console.log(`=� Size: ${THUMBNAIL_SIZE}x${THUMBNAIL_SIZE}px (${THUMBNAIL_SIZE/56}x retina quality)`);
  console.log(`✨ Display: 56x56px with ultra-sharp clarity!\n`);
}

regenerateThumbnails();
