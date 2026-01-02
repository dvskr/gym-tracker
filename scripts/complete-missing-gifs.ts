import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as https from 'https';
import * as dotenv from 'dotenv';
import sharp from 'sharp';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;
const exerciseDbApiKey = process.env.EXPO_PUBLIC_EXERCISEDB_API_KEY!;
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
    runId: 'complete-missing',
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

// Ensure directories exist
[GIF_DIR, THUMBNAIL_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

interface Exercise {
  id: string;
  name: string;
  external_id: string | null;
  gif_url: string | null;
}

function downloadFileWithHeaders(url: string, outputPath: string, headers: Record<string, string>): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    try {
      const protocol = url.startsWith('https') ? https : http;
      
      const makeRequest = (requestUrl: string, redirectCount = 0) => {
        if (redirectCount > 5) {
          resolve({ success: false, error: 'Too many redirects' });
          return;
        }
        
        const options = {
          headers: headers
        };
        
        protocol.get(requestUrl, options, (res) => {
          // Handle redirects
          if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
            const redirectUrl = res.headers.location;
            if (redirectUrl) {
              makeRequest(redirectUrl, redirectCount + 1);
              return;
            }
          }
          
          if (res.statusCode !== 200) {
            resolve({ success: false, error: `HTTP ${res.statusCode}` });
            return;
          }
          
          const chunks: Buffer[] = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => {
            try {
              const buffer = Buffer.concat(chunks);
              if (buffer.length < 1000) {
                resolve({ success: false, error: 'File too small' });
                return;
              }
              fs.writeFileSync(outputPath, buffer);
              resolve({ success: true });
            } catch (err: any) {
              resolve({ success: false, error: err.message });
            }
          });
          res.on('error', (err) => resolve({ success: false, error: err.message }));
        }).on('error', (err) => resolve({ success: false, error: err.message }));
      };
      
      makeRequest(url);
    } catch (err: any) {
      resolve({ success: false, error: err.message });
    }
  });
}

async function findMissingExercises(): Promise<Exercise[]> {
  console.log('\n= STEP 1: Finding exercises without GIFs...');
  
  // #region agent log
  debugLog('complete-missing.ts:findMissing:start', 'Finding missing exercises', {}, 'H1');
  // #endregion

  // Get existing local GIFs
  const existingGifs = new Set(
    fs.existsSync(GIF_DIR)
      ? fs.readdirSync(GIF_DIR).filter(f => f.endsWith('.gif')).map(f => f.toLowerCase())
      : []
  );

  // Get all active exercises
  const { data: allExercises, error } = await supabase
    .from('exercises')
    .select('id, name, external_id, gif_url')
    .eq('is_active', true);

  if (error) {
    console.error('Failed to fetch exercises:', error.message);
    return [];
  }

  const missingGifs: Exercise[] = [];
  const noExternalId: Exercise[] = [];

  for (const ex of allExercises || []) {
    const filename = `${ex.id}.gif`.toLowerCase();
    
    if (!existingGifs.has(filename)) {
      if (ex.external_id) {
        missingGifs.push(ex as Exercise);
      } else {
        noExternalId.push(ex as Exercise);
      }
    }
  }

  // #region agent log
  debugLog('complete-missing.ts:findMissing:complete', 'Missing exercises found', { 
    total: allExercises?.length || 0,
    existing: existingGifs.size,
    missingWithExternalId: missingGifs.length,
    missingNoExternalId: noExternalId.length,
    sampleMissing: missingGifs.slice(0, 5).map(e => ({ name: e.name, externalId: e.external_id })),
    sampleNoExternal: noExternalId.slice(0, 5).map(e => ({ name: e.name }))
  }, 'H1');
  // #endregion

  console.log(`  Total active exercises: ${allExercises?.length || 0}`);
  console.log(`  Existing local GIFs: ${existingGifs.size}`);
  console.log(`  Missing (with external_id): ${missingGifs.length}`);
  console.log(`  Missing (no external_id): ${noExternalId.length}`);

  if (noExternalId.length > 0) {
    console.log(`\n  �  Warning: ${noExternalId.length} exercises have no external_id`);
    console.log(`     First 5: ${noExternalId.slice(0, 5).map(e => e.name).join(', ')}`);
  }

  return missingGifs;
}

async function downloadFromExerciseDB(exercises: Exercise[]): Promise<{ downloaded: number; failed: number }> {
  console.log('\n  STEP 2: Downloading from ExerciseDB API...');
  
  if (!exerciseDbApiKey) {
    console.error('  ❌ Missing EXPO_PUBLIC_EXERCISEDB_API_KEY in .env file');
    return { downloaded: 0, failed: exercises.length };
  }

  // #region agent log
  debugLog('complete-missing.ts:download:start', 'Starting ExerciseDB downloads', { 
    count: exercises.length,
    apiKeyPresent: !!exerciseDbApiKey
  }, 'H2');
  // #endregion

  const headers = {
    'X-RapidAPI-Key': exerciseDbApiKey,
    'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com'
  };

  let downloaded = 0;
  let failed = 0;
  const failures: { name: string; externalId: string; error: string }[] = [];

  for (let i = 0; i < exercises.length; i++) {
    const ex = exercises[i];
    const outputPath = path.join(GIF_DIR, `${ex.id}.gif`);
    
    // Build ExerciseDB API URL
    const apiUrl = `https://exercisedb.p.rapidapi.com/image?exerciseId=${ex.external_id}&resolution=1080`;
    
    process.stdout.write(`\r  [${i + 1}/${exercises.length}] Downloading ${ex.name.substring(0, 40).padEnd(40)}...`);
    
    const result = await downloadFileWithHeaders(apiUrl, outputPath, headers);
    
    if (result.success && fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) {
      downloaded++;
    } else {
      failed++;
      failures.push({ 
        name: ex.name, 
        externalId: ex.external_id!, 
        error: result.error || 'Unknown error'
      });
      // Clean up partial file
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
    }
    
    // Rate limiting - be nice to the API
    await new Promise(r => setTimeout(r, 150));
  }

  // #region agent log
  debugLog('complete-missing.ts:download:complete', 'Download complete', { 
    downloaded,
    failed,
    sampleFailures: failures.slice(0, 10)
  }, 'H2');
  // #endregion

  console.log(`\n  ✅ Downloaded: ${downloaded}`);
  console.log(`  ❌ Failed: ${failed}`);
  
  if (failures.length > 0) {
    console.log(`\n  First 10 failures:`);
    failures.slice(0, 10).forEach(f => console.log(`    - ${f.name} (ID: ${f.externalId}) - ${f.error}`));
  }

  return { downloaded, failed };
}

async function generateThumbnails(): Promise<{ generated: number; skipped: number; failed: number }> {
  console.log('\n=�  STEP 3: Generating 216px thumbnails with Sharp...');
  
  // #region agent log
  debugLog('complete-missing.ts:thumbnails:start', 'Starting thumbnail generation', {}, 'H3');
  // #endregion

  const gifs = fs.existsSync(GIF_DIR)
    ? fs.readdirSync(GIF_DIR).filter(f => f.endsWith('.gif'))
    : [];

  const existingThumbs = new Set(
    fs.existsSync(THUMBNAIL_DIR)
      ? fs.readdirSync(THUMBNAIL_DIR).filter(f => f.endsWith('.jpg')).map(f => f.toLowerCase())
      : []
  );

  console.log(`  Found ${gifs.length} GIFs, ${existingThumbs.size} existing thumbnails`);

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < gifs.length; i++) {
    const gif = gifs[i];
    const thumbName = gif.replace('.gif', '.jpg').toLowerCase();
    const inputPath = path.join(GIF_DIR, gif);
    const outputPath = path.join(THUMBNAIL_DIR, thumbName);

    process.stdout.write(`\r  [${i + 1}/${gifs.length}] Processing ${gif.substring(0, 30).padEnd(30)}...`);

    if (existingThumbs.has(thumbName)) {
      skipped++;
      continue;
    }

    try {
      await sharp(inputPath, { pages: 1, animated: false })
        .resize(216, 216, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 },
          kernel: sharp.kernel.lanczos3
        })
        .jpeg({
          quality: 100,
          chromaSubsampling: '4:4:4',
          mozjpeg: true
        })
        .toFile(outputPath);
      
      generated++;
    } catch (err) {
      failed++;
    }
  }

  // #region agent log
  debugLog('complete-missing.ts:thumbnails:complete', 'Thumbnail generation complete', { 
    generated,
    skipped,
    failed
  }, 'H3');
  // #endregion

  console.log(`\n  ✅ Generated: ${generated}`);
  console.log(`  �  Skipped (exists): ${skipped}`);
  console.log(`  ❌ Failed: ${failed}`);

  return { generated, skipped, failed };
}

async function uploadToSupabase(): Promise<{ gifs: number; thumbnails: number }> {
  console.log('\n  STEP 4: Uploading to Supabase Storage...');
  
  // #region agent log
  debugLog('complete-missing.ts:upload:start', 'Starting Supabase upload', {}, 'H4');
  // #endregion

  const GIF_BUCKET = 'exercise-gifs';
  const THUMBNAIL_BUCKET = 'exercise-thumbnails';

  // Upload GIFs
  const gifs = fs.existsSync(GIF_DIR)
    ? fs.readdirSync(GIF_DIR).filter(f => f.endsWith('.gif'))
    : [];
  
  let uploadedGifs = 0;
  for (let i = 0; i < gifs.length; i++) {
    const gif = gifs[i];
    const filePath = path.join(GIF_DIR, gif);
    const fileBuffer = fs.readFileSync(filePath);
    
    process.stdout.write(`\r  [${i + 1}/${gifs.length}] Uploading GIF ${gif.substring(0, 30).padEnd(30)}...`);
    
    const { error } = await supabase.storage
      .from(GIF_BUCKET)
      .upload(gif, fileBuffer, {
        contentType: 'image/gif',
        upsert: true,
        cacheControl: '31536000'
      });
    
    if (!error) uploadedGifs++;
  }
  console.log(`\n  ✅ GIFs uploaded: ${uploadedGifs}`);

  // Upload Thumbnails
  const thumbs = fs.existsSync(THUMBNAIL_DIR)
    ? fs.readdirSync(THUMBNAIL_DIR).filter(f => f.endsWith('.jpg'))
    : [];
  
  let uploadedThumbs = 0;
  for (let i = 0; i < thumbs.length; i++) {
    const thumb = thumbs[i];
    const filePath = path.join(THUMBNAIL_DIR, thumb);
    const fileBuffer = fs.readFileSync(filePath);
    
    process.stdout.write(`\r  [${i + 1}/${thumbs.length}] Uploading thumbnail ${thumb.substring(0, 30).padEnd(30)}...`);
    
    const { error } = await supabase.storage
      .from(THUMBNAIL_BUCKET)
      .upload(thumb, fileBuffer, {
        contentType: 'image/jpeg',
        upsert: true,
        cacheControl: '31536000'
      });
    
    if (!error) uploadedThumbs++;
  }
  console.log(`\n  ✅ Thumbnails uploaded: ${uploadedThumbs}`);

  // #region agent log
  debugLog('complete-missing.ts:upload:complete', 'Upload complete', { 
    gifs: uploadedGifs,
    thumbnails: uploadedThumbs
  }, 'H4');
  // #endregion

  return { gifs: uploadedGifs, thumbnails: uploadedThumbs };
}

async function updateDatabaseUrls(): Promise<number> {
  console.log('\n=� STEP 5: Updating database URLs...');
  
  // #region agent log
  debugLog('complete-missing.ts:updateUrls:start', 'Starting database URL update', {}, 'H5');
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

  // Fetch all active exercises
  const { data: exercises, error } = await supabase
    .from('exercises')
    .select('id, name')
    .eq('is_active', true);

  if (error) {
    console.error('Failed to fetch exercises:', error.message);
    return 0;
  }

  let updated = 0;
  for (const ex of exercises || []) {
    const gifFile = `${ex.id}.gif`;
    const thumbFile = `${ex.id}.jpg`;

    if (localGifs.has(gifFile) || localThumbs.has(thumbFile)) {
      const updates: any = {};
      
      if (localGifs.has(gifFile)) {
        const { data } = supabase.storage.from(GIF_BUCKET).getPublicUrl(gifFile);
        updates.gif_url = data.publicUrl;
      }
      
      if (localThumbs.has(thumbFile)) {
        const { data } = supabase.storage.from(THUMBNAIL_BUCKET).getPublicUrl(thumbFile);
        updates.thumbnail_url = data.publicUrl;
      }

      const { error: updateError } = await supabase
        .from('exercises')
        .update(updates)
        .eq('id', ex.id);

      if (!updateError) {
        updated++;
        process.stdout.write(`\r  Updated ${updated} exercise URLs...`);
      }
    }
  }

  // #region agent log
  debugLog('complete-missing.ts:updateUrls:complete', 'Database URL update complete', { updated }, 'H5');
  // #endregion

  console.log(`\n  ✅ Updated ${updated} exercise URLs`);
  return updated;
}

async function getFinalStats() {
  console.log('\n=� STEP 6: Calculating final statistics...');
  
  // #region agent log
  debugLog('complete-missing.ts:stats:start', 'Calculating final stats', {}, 'H6');
  // #endregion

  const { data: allExercises } = await supabase
    .from('exercises')
    .select('id, name, gif_url, thumbnail_url')
    .eq('is_active', true);

  const withGif = allExercises?.filter(e => e.gif_url) || [];
  const withThumb = allExercises?.filter(e => e.thumbnail_url) || [];
  const withBoth = allExercises?.filter(e => e.gif_url && e.thumbnail_url) || [];
  const withNeither = allExercises?.filter(e => !e.gif_url && !e.thumbnail_url) || [];

  const localGifs = fs.existsSync(GIF_DIR)
    ? fs.readdirSync(GIF_DIR).filter(f => f.endsWith('.gif')).length
    : 0;
  const localThumbs = fs.existsSync(THUMBNAIL_DIR)
    ? fs.readdirSync(THUMBNAIL_DIR).filter(f => f.endsWith('.jpg')).length
    : 0;

  // #region agent log
  debugLog('complete-missing.ts:stats:complete', 'Final statistics', {
    totalActive: allExercises?.length || 0,
    withGif: withGif.length,
    withThumb: withThumb.length,
    withBoth: withBoth.length,
    withNeither: withNeither.length,
    localGifs,
    localThumbs,
    completionPercent: ((withBoth.length / (allExercises?.length || 1)) * 100).toFixed(1)
  }, 'H6');
  // #endregion

  console.log(`  Total active exercises: ${allExercises?.length || 0}`);
  console.log(`  With GIF URL: ${withGif.length}`);
  console.log(`  With Thumbnail URL: ${withThumb.length}`);
  console.log(`  With Both: ${withBoth.length}`);
  console.log(`  With Neither: ${withNeither.length}`);
  console.log(`  Local GIF files: ${localGifs}`);
  console.log(`  Local Thumbnail files: ${localThumbs}`);
  console.log(`  Completion: ${((withBoth.length / (allExercises?.length || 1)) * 100).toFixed(1)}%`);

  if (withNeither.length > 0) {
    console.log(`\n  �  Still missing: ${withNeither.length} exercises`);
    console.log(`     First 10: ${withNeither.slice(0, 10).map(e => e.name).join(', ')}`);
  }

  return { withBoth: withBoth.length, total: allExercises?.length || 0, withNeither };
}

async function main() {
  console.log(' COMPLETE MISSION: Get to 100% GIF Coverage\n');
  console.log('='.repeat(60));

  // #region agent log
  debugLog('complete-missing.ts:main:start', 'Pipeline started', {}, 'H1');
  // #endregion

  // Step 1: Find missing exercises
  const missingExercises = await findMissingExercises();

  if (missingExercises.length === 0) {
    console.log('\n All exercises already have GIFs!');
    await getFinalStats();
    return;
  }

  // Step 2: Download from ExerciseDB
  const { downloaded, failed: downloadFailed } = await downloadFromExerciseDB(missingExercises);

  // Step 3: Generate thumbnails
  const { generated: thumbsGenerated, skipped: thumbsSkipped, failed: thumbsFailed } = await generateThumbnails();

  // Step 4: Upload to Supabase
  const { gifs: uploadedGifs, thumbnails: uploadedThumbs } = await uploadToSupabase();

  // Step 5: Update database URLs
  const updatedUrls = await updateDatabaseUrls();

  // Step 6: Final statistics
  const finalStats = await getFinalStats();

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log(' MISSION COMPLETE');
  console.log('='.repeat(60));
  console.log(`\n  Downloaded from ExerciseDB: ${downloaded} (failed: ${downloadFailed})`);
  console.log(`=�  Generated thumbnails: ${thumbsGenerated} (skipped: ${thumbsSkipped}, failed: ${thumbsFailed})`);
  console.log(`  Uploaded to Supabase: ${uploadedGifs} GIFs, ${uploadedThumbs} thumbnails`);
  console.log(`=� Updated database URLs: ${updatedUrls}`);
  console.log(`\n FINAL RESULT: ${finalStats.withBoth}/${finalStats.total} exercises complete (${((finalStats.withBoth / finalStats.total) * 100).toFixed(1)}%)`);

  if (finalStats.withNeither.length > 0) {
    console.log(`\n�  Note: ${finalStats.withNeither.length} exercises still missing (likely no external_id in database)`);
  }

  // #region agent log
  debugLog('complete-missing.ts:main:complete', 'Pipeline complete', {
    downloaded,
    downloadFailed,
    thumbsGenerated,
    thumbsSkipped,
    thumbsFailed,
    uploadedGifs,
    uploadedThumbs,
    updatedUrls,
    finalCompletion: ((finalStats.withBoth / finalStats.total) * 100).toFixed(1)
  }, 'H1');
  // #endregion
}

main().catch(console.error);

