import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as dotenv from 'dotenv';
import sharp from 'sharp';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const GIF_DIR = path.join(process.cwd(), 'exercise-gifs');
const THUMBNAIL_DIR = path.join(process.cwd(), 'exercise-thumbnails');

const LOG_ENDPOINT = 'http://127.0.0.1:7242/ingest/068831e1-39c2-46d3-afd8-7578e38ed77a';

// #region agent log
function debugLog(location: string, message: string, data: any, hypothesisId: string) {
  const payload = JSON.stringify({
    location,
    message,
    data,
    timestamp: Date.now(),
    sessionId: 'debug-session',
    runId: 'verify-finalize',
    hypothesisId
  });
  const req = http.request(LOG_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
  });
  req.on('error', () => {});
  req.write(payload);
  req.end();
}
// #endregion

async function verifyGIFQuality(): Promise<{ checked: number; lowQuality: number }> {
  console.log('\n= STEP 1: Verifying GIF quality...');
  
  // #region agent log
  debugLog('verify.ts:quality:start', 'Starting quality check', {}, 'H1');
  // #endregion

  const gifs = fs.existsSync(GIF_DIR)
    ? fs.readdirSync(GIF_DIR).filter(f => f.endsWith('.gif'))
    : [];

  let checked = 0;
  let lowQuality = 0;
  const samples: Array<{ name: string; size: number; dimensions?: string }> = [];

  for (let i = 0; i < Math.min(gifs.length, 10); i++) {
    const gif = gifs[i];
    const gifPath = path.join(GIF_DIR, gif);
    const stats = fs.statSync(gifPath);
    
    try {
      const metadata = await sharp(gifPath).metadata();
      const dimensions = `${metadata.width}x${metadata.height}`;
      samples.push({ name: gif, size: stats.size, dimensions });
      
      // Flag if dimensions are less than 1080p
      if (metadata.width && metadata.width < 1080 && metadata.height && metadata.height < 1080) {
        lowQuality++;
      }
    } catch (err) {
      samples.push({ name: gif, size: stats.size });
    }
    
    checked++;
  }

  // #region agent log
  debugLog('verify.ts:quality:complete', 'Quality check complete', {
    totalGifs: gifs.length,
    checked,
    lowQuality,
    samples
  }, 'H1');
  // #endregion

  console.log(`  Total GIFs: ${gifs.length}`);
  console.log(`  Sampled: ${checked}`);
  console.log(`  Sample quality:`);
  samples.forEach(s => {
    const sizeMB = (s.size / 1024 / 1024).toFixed(2);
    console.log(`    ${s.name}: ${sizeMB} MB ${s.dimensions ? `(${s.dimensions})` : ''}`);
  });

  return { checked, lowQuality };
}

async function verifyThumbnailQuality(): Promise<{ checked: number; wrongSize: number }> {
  console.log('\n=�  STEP 2: Verifying thumbnail quality...');
  
  const thumbs = fs.existsSync(THUMBNAIL_DIR)
    ? fs.readdirSync(THUMBNAIL_DIR).filter(f => f.endsWith('.jpg'))
    : [];

  let checked = 0;
  let wrongSize = 0;
  const samples: Array<{ name: string; size: number; dimensions: string }> = [];

  for (let i = 0; i < Math.min(thumbs.length, 10); i++) {
    const thumb = thumbs[i];
    const thumbPath = path.join(THUMBNAIL_DIR, thumb);
    const stats = fs.statSync(thumbPath);
    
    try {
      const metadata = await sharp(thumbPath).metadata();
      const dimensions = `${metadata.width}x${metadata.height}`;
      samples.push({ name: thumb, size: stats.size, dimensions });
      
      // Check if it's 216x216
      if (metadata.width !== 216 || metadata.height !== 216) {
        wrongSize++;
      }
    } catch (err) {
      // Ignore
    }
    
    checked++;
  }

  console.log(`  Total thumbnails: ${thumbs.length}`);
  console.log(`  Sampled: ${checked}`);
  console.log(`  Sample quality:`);
  samples.forEach(s => {
    const sizeKB = (s.size / 1024).toFixed(1);
    console.log(`    ${s.name}: ${sizeKB} KB (${s.dimensions})`);
  });

  return { checked, wrongSize };
}

async function ensureAllUploaded(): Promise<{ uploaded: number; skipped: number }> {
  console.log('\n  STEP 3: Ensuring all files are uploaded to Supabase...');
  
  // #region agent log
  debugLog('verify.ts:upload:start', 'Starting upload verification', {}, 'H2');
  // #endregion

  const GIF_BUCKET = 'exercise-gifs';
  const THUMBNAIL_BUCKET = 'exercise-thumbnails';

  const gifs = fs.existsSync(GIF_DIR)
    ? fs.readdirSync(GIF_DIR).filter(f => f.endsWith('.gif'))
    : [];
  
  const thumbs = fs.existsSync(THUMBNAIL_DIR)
    ? fs.readdirSync(THUMBNAIL_DIR).filter(f => f.endsWith('.jpg'))
    : [];

  let uploadedGifs = 0;
  let uploadedThumbs = 0;
  let skippedGifs = 0;
  let skippedThumbs = 0;

  // Upload GIFs with upsert (will replace if exists)
  for (let i = 0; i < gifs.length; i++) {
    const gif = gifs[i];
    const filePath = path.join(GIF_DIR, gif);
    const fileBuffer = fs.readFileSync(filePath);
    
    if (i % 50 === 0) {
      process.stdout.write(`\r  GIFs: ${i}/${gifs.length}...`);
    }
    
    const { error } = await supabase.storage
      .from(GIF_BUCKET)
      .upload(gif, fileBuffer, {
        contentType: 'image/gif',
        upsert: true,
        cacheControl: '31536000'
      });
    
    if (error) {
      skippedGifs++;
    } else {
      uploadedGifs++;
    }
  }
  
  console.log(`\r  ✅ GIFs: ${uploadedGifs} uploaded/verified`);

  // Upload Thumbnails with upsert
  for (let i = 0; i < thumbs.length; i++) {
    const thumb = thumbs[i];
    const filePath = path.join(THUMBNAIL_DIR, thumb);
    const fileBuffer = fs.readFileSync(filePath);
    
    if (i % 50 === 0) {
      process.stdout.write(`\r  Thumbnails: ${i}/${thumbs.length}...`);
    }
    
    const { error } = await supabase.storage
      .from(THUMBNAIL_BUCKET)
      .upload(thumb, fileBuffer, {
        contentType: 'image/jpeg',
        upsert: true,
        cacheControl: '31536000'
      });
    
    if (error) {
      skippedThumbs++;
    } else {
      uploadedThumbs++;
    }
  }
  
  console.log(`\r  ✅ Thumbnails: ${uploadedThumbs} uploaded/verified`);

  // #region agent log
  debugLog('verify.ts:upload:complete', 'Upload verification complete', {
    uploadedGifs,
    uploadedThumbs,
    skippedGifs,
    skippedThumbs
  }, 'H2');
  // #endregion

  return { uploaded: uploadedGifs + uploadedThumbs, skipped: skippedGifs + skippedThumbs };
}

async function updateAllDatabaseURLs(): Promise<{ updated: number; errors: number }> {
  console.log('\n=� STEP 4: Updating ALL database URLs...');
  
  // #region agent log
  debugLog('verify.ts:dbupdate:start', 'Starting database update', {}, 'H3');
  // #endregion

  const GIF_BUCKET = 'exercise-gifs';
  const THUMBNAIL_BUCKET = 'exercise-thumbnails';

  // Get all local files
  const localGifs = new Set(
    fs.existsSync(GIF_DIR)
      ? fs.readdirSync(GIF_DIR).filter(f => f.endsWith('.gif')).map(f => f.toLowerCase())
      : []
  );
  const localThumbs = new Set(
    fs.existsSync(THUMBNAIL_DIR)
      ? fs.readdirSync(THUMBNAIL_DIR).filter(f => f.endsWith('.jpg')).map(f => f.toLowerCase())
      : []
  );

  // Fetch ALL active exercises
  const { data: exercises, error } = await supabase
    .from('exercises')
    .select('id, name, gif_url, thumbnail_url')
    .eq('is_active', true);

  if (error) {
    console.error('Failed to fetch exercises:', error.message);
    return { updated: 0, errors: 1 };
  }

  let updated = 0;
  let errors = 0;

  for (const ex of exercises || []) {
    const gifFile = `${ex.id}.gif`.toLowerCase();
    const thumbFile = `${ex.id}.jpg`.toLowerCase();
    
    const hasGif = localGifs.has(gifFile);
    const hasThumb = localThumbs.has(thumbFile);

    if (hasGif || hasThumb) {
      const updates: any = {};
      
      if (hasGif) {
        const { data } = supabase.storage.from(GIF_BUCKET).getPublicUrl(gifFile);
        updates.gif_url = data.publicUrl;
      }
      
      if (hasThumb) {
        const { data } = supabase.storage.from(THUMBNAIL_BUCKET).getPublicUrl(thumbFile);
        updates.thumbnail_url = data.publicUrl;
      }

      const { error: updateError } = await supabase
        .from('exercises')
        .update(updates)
        .eq('id', ex.id);

      if (updateError) {
        errors++;
      } else {
        updated++;
        if (updated % 50 === 0) {
          process.stdout.write(`\r  Updated ${updated}/${exercises.length}...`);
        }
      }
    }
  }

  console.log(`\r  ✅ Updated ${updated} exercise URLs`);

  // #region agent log
  debugLog('verify.ts:dbupdate:complete', 'Database update complete', {
    updated,
    errors
  }, 'H3');
  // #endregion

  return { updated, errors };
}

async function getFinalStatistics() {
  console.log('\n=� STEP 5: Gathering final statistics...');
  
  const { data: allExercises } = await supabase
    .from('exercises')
    .select('id, name, gif_url, thumbnail_url, is_active')
    .eq('is_active', true);

  const localGifs = fs.existsSync(GIF_DIR)
    ? fs.readdirSync(GIF_DIR).filter(f => f.endsWith('.gif')).length
    : 0;
  
  const localThumbs = fs.existsSync(THUMBNAIL_DIR)
    ? fs.readdirSync(THUMBNAIL_DIR).filter(f => f.endsWith('.jpg')).length
    : 0;

  const totalActive = allExercises?.length || 0;
  const withGif = allExercises?.filter(e => e.gif_url).length || 0;
  const withThumb = allExercises?.filter(e => e.thumbnail_url).length || 0;
  const withBoth = allExercises?.filter(e => e.gif_url && e.thumbnail_url).length || 0;
  const withNeither = allExercises?.filter(e => !e.gif_url && !e.thumbnail_url).length || 0;

  const completion = ((withBoth / totalActive) * 100).toFixed(1);

  console.log(`\n  =� Local Files:`);
  console.log(`     GIFs: ${localGifs}`);
  console.log(`     Thumbnails: ${localThumbs}`);
  
  console.log(`\n  =� Database (Active Exercises):`);
  console.log(`     Total: ${totalActive}`);
  console.log(`     With GIF URL: ${withGif}`);
  console.log(`     With Thumbnail URL: ${withThumb}`);
  console.log(`     With Both: ${withBoth}`);
  console.log(`     With Neither: ${withNeither}`);
  
  console.log(`\n   Completion: ${completion}%`);

  // #region agent log
  debugLog('verify.ts:stats:complete', 'Final statistics', {
    localGifs,
    localThumbs,
    totalActive,
    withGif,
    withThumb,
    withBoth,
    withNeither,
    completion
  }, 'H4');
  // #endregion

  return {
    localGifs,
    localThumbs,
    totalActive,
    withGif,
    withThumb,
    withBoth,
    withNeither,
    completion
  };
}

async function main() {
  console.log('✅ VERIFICATION & FINALIZATION\n');
  console.log('='.repeat(60));

  // #region agent log
  debugLog('verify.ts:main:start', 'Starting verification', {}, 'H1');
  // #endregion

  // Step 1: Verify GIF quality
  const gifQuality = await verifyGIFQuality();

  // Step 2: Verify thumbnail quality
  const thumbQuality = await verifyThumbnailQuality();

  // Step 3: Ensure all files are uploaded
  const uploadResults = await ensureAllUploaded();

  // Step 4: Update database URLs
  const dbResults = await updateAllDatabaseURLs();

  // Step 5: Final statistics
  const finalStats = await getFinalStatistics();

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(' VERIFICATION COMPLETE');
  console.log('='.repeat(60));
  
  console.log(`\n✅ Quality Check:`);
  console.log(`   GIFs sampled: ${gifQuality.checked}`);
  console.log(`   Thumbnails sampled: ${thumbQuality.checked}`);
  
  console.log(`\n  Supabase Upload:`);
  console.log(`   Files verified/uploaded: ${uploadResults.uploaded}`);
  console.log(`   Errors: ${uploadResults.skipped}`);
  
  console.log(`\n=� Database:`);
  console.log(`   URLs updated: ${dbResults.updated}`);
  console.log(`   Errors: ${dbResults.errors}`);
  
  console.log(`\n FINAL STATUS:`);
  console.log(`   ${finalStats.withBoth}/${finalStats.totalActive} exercises complete (${finalStats.completion}%)`);
  console.log(`   ${finalStats.localGifs} GIF files`);
  console.log(`   ${finalStats.localThumbs} thumbnail files`);

  if (finalStats.withNeither > 0) {
    console.log(`\n   �  ${finalStats.withNeither} exercises still without GIFs`);
  }

  // #region agent log
  debugLog('verify.ts:main:complete', 'Verification complete', {
    gifQuality,
    thumbQuality,
    uploadResults,
    dbResults,
    finalStats
  }, 'H1');
  // #endregion
}

main().catch(console.error);

