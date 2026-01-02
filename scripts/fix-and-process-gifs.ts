import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import { execSync } from 'child_process';
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
    runId: 'fix-and-process',
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
  equipment: string;
  gif_url: string | null;
  thumbnail_url: string | null;
}

async function fixMalformedUrls(): Promise<number> {
  console.log('\n=' STEP 1: Fixing malformed URLs in database...');
  
  // #region agent log
  debugLog('fix-and-process.ts:fixUrls:start', 'Starting URL fix', {}, 'H2');
  // #endregion

  // Get all exercises with malformed URLs (ending with just ID, no .gif extension)
  const { data: exercises, error } = await supabase
    .from('exercises')
    .select('id, name, gif_url, thumbnail_url')
    .eq('is_active', true)
    .not('gif_url', 'is', null);

  if (error) {
    console.error('Failed to fetch exercises:', error.message);
    return 0;
  }

  let fixed = 0;
  const malformedUrls: { id: string; name: string; oldUrl: string; newUrl: string }[] = [];

  for (const ex of exercises || []) {
    if (!ex.gif_url) continue;

    // Check if URL is malformed (ends with ID number, not .gif)
    const url = ex.gif_url;
    if (url.includes('supabase.co/storage') && !url.endsWith('.gif')) {
      // Extract the ID from the URL and add .gif extension
      const newGifUrl = url + '.gif';
      const newThumbUrl = url.replace('/exercise-gifs/', '/exercise-thumbnails/') + '.jpg';
      
      malformedUrls.push({ id: ex.id, name: ex.name, oldUrl: url, newUrl: newGifUrl });
      
      // Update the database
      const { error: updateError } = await supabase
        .from('exercises')
        .update({ 
          gif_url: newGifUrl,
          thumbnail_url: newThumbUrl
        })
        .eq('id', ex.id);

      if (!updateError) {
        fixed++;
        process.stdout.write(`\r  Fixed ${fixed} URLs...`);
      }
    }
  }

  // #region agent log
  debugLog('fix-and-process.ts:fixUrls:complete', 'URL fix complete', { 
    fixed,
    sample: malformedUrls.slice(0, 5)
  }, 'H2');
  // #endregion

  console.log(`\n  ✅ Fixed ${fixed} malformed URLs`);
  return fixed;
}

function downloadFile(url: string, outputPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const protocol = url.startsWith('https') ? https : http;
      
      const makeRequest = (requestUrl: string, redirectCount = 0) => {
        if (redirectCount > 5) {
          resolve(false);
          return;
        }
        
        protocol.get(requestUrl, (res) => {
          // Handle redirects
          if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
            const redirectUrl = res.headers.location;
            if (redirectUrl) {
              makeRequest(redirectUrl, redirectCount + 1);
              return;
            }
          }
          
          if (res.statusCode !== 200) {
            resolve(false);
            return;
          }
          
          const chunks: Buffer[] = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => {
            try {
              fs.writeFileSync(outputPath, Buffer.concat(chunks));
              resolve(true);
            } catch {
              resolve(false);
            }
          });
          res.on('error', () => resolve(false));
        }).on('error', () => resolve(false));
      };
      
      makeRequest(url);
    } catch {
      resolve(false);
    }
  });
}

async function downloadMissingGifs(): Promise<{ downloaded: number; failed: number }> {
  console.log('\n  STEP 2: Downloading missing GIFs...');
  
  // #region agent log
  debugLog('fix-and-process.ts:download:start', 'Starting GIF downloads', {}, 'H2');
  // #endregion

  // Get existing GIFs
  const existingGifs = new Set(
    fs.existsSync(GIF_DIR)
      ? fs.readdirSync(GIF_DIR).filter(f => f.endsWith('.gif')).map(f => f.toLowerCase())
      : []
  );

  // Fetch exercises with URLs but no local GIF
  const { data: exercises, error } = await supabase
    .from('exercises')
    .select('id, name, gif_url')
    .eq('is_active', true)
    .not('gif_url', 'is', null);

  if (error) {
    console.error('Failed to fetch exercises:', error.message);
    return { downloaded: 0, failed: 0 };
  }

  const needDownload: Exercise[] = [];
  for (const ex of exercises || []) {
    const filename = `${ex.id}.gif`.toLowerCase();
    if (!existingGifs.has(filename) && ex.gif_url) {
      needDownload.push(ex as Exercise);
    }
  }

  console.log(`  Found ${needDownload.length} exercises needing GIF download`);

  let downloaded = 0;
  let failed = 0;
  const failures: { name: string; url: string }[] = [];

  for (let i = 0; i < needDownload.length; i++) {
    const ex = needDownload[i];
    const outputPath = path.join(GIF_DIR, `${ex.id}.gif`);
    
    process.stdout.write(`\r  [${i + 1}/${needDownload.length}] Downloading ${ex.name.substring(0, 30)}...`);
    
    const success = await downloadFile(ex.gif_url!, outputPath);
    
    if (success && fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) {
      downloaded++;
    } else {
      failed++;
      failures.push({ name: ex.name, url: ex.gif_url! });
      // Clean up partial file
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
    }
    
    // Rate limiting
    await new Promise(r => setTimeout(r, 100));
  }

  // #region agent log
  debugLog('fix-and-process.ts:download:complete', 'Download complete', { 
    downloaded,
    failed,
    sampleFailures: failures.slice(0, 10)
  }, 'H2');
  // #endregion

  console.log(`\n  ✅ Downloaded: ${downloaded}`);
  console.log(`  ❌ Failed: ${failed}`);
  
  if (failures.length > 0) {
    console.log(`\n  First 10 failures:`);
    failures.slice(0, 10).forEach(f => console.log(`    - ${f.name}`));
  }

  return { downloaded, failed };
}

async function generateThumbnails(): Promise<{ generated: number; skipped: number; failed: number }> {
  console.log('\n=�  STEP 3: Generating 216px thumbnails with Sharp...');
  
  // #region agent log
  debugLog('fix-and-process.ts:thumbnails:start', 'Starting thumbnail generation', {}, 'H4');
  // #endregion

  // Get all GIFs
  const gifs = fs.existsSync(GIF_DIR)
    ? fs.readdirSync(GIF_DIR).filter(f => f.endsWith('.gif'))
    : [];

  // Get existing thumbnails
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

    process.stdout.write(`\r  [${i + 1}/${gifs.length}] Processing ${gif.substring(0, 20)}...`);

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
  debugLog('fix-and-process.ts:thumbnails:complete', 'Thumbnail generation complete', { 
    generated,
    skipped,
    failed
  }, 'H4');
  // #endregion

  console.log(`\n  ✅ Generated: ${generated}`);
  console.log(`  �  Skipped (exists): ${skipped}`);
  console.log(`  ❌ Failed: ${failed}`);

  return { generated, skipped, failed };
}

async function uploadToSupabase(): Promise<{ gifs: number; thumbnails: number }> {
  console.log('\n  STEP 4: Uploading to Supabase Storage...');
  
  // #region agent log
  debugLog('fix-and-process.ts:upload:start', 'Starting Supabase upload', {}, 'H5');
  // #endregion

  const GIF_BUCKET = 'exercise-gifs';
  const THUMBNAIL_BUCKET = 'exercise-thumbnails';

  // Ensure buckets exist
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketNames = buckets?.map(b => b.name) || [];

  for (const bucketName of [GIF_BUCKET, THUMBNAIL_BUCKET]) {
    if (!bucketNames.includes(bucketName)) {
      await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 20971520
      });
      console.log(`  Created bucket: ${bucketName}`);
    }
  }

  // Upload GIFs
  const gifs = fs.existsSync(GIF_DIR)
    ? fs.readdirSync(GIF_DIR).filter(f => f.endsWith('.gif'))
    : [];
  
  let uploadedGifs = 0;
  for (let i = 0; i < gifs.length; i++) {
    const gif = gifs[i];
    const filePath = path.join(GIF_DIR, gif);
    const fileBuffer = fs.readFileSync(filePath);
    
    process.stdout.write(`\r  [${i + 1}/${gifs.length}] Uploading GIF ${gif.substring(0, 20)}...`);
    
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
    
    process.stdout.write(`\r  [${i + 1}/${thumbs.length}] Uploading thumbnail ${thumb.substring(0, 20)}...`);
    
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
  debugLog('fix-and-process.ts:upload:complete', 'Upload complete', { 
    gifs: uploadedGifs,
    thumbnails: uploadedThumbs
  }, 'H5');
  // #endregion

  return { gifs: uploadedGifs, thumbnails: uploadedThumbs };
}

async function updateDatabaseUrls(): Promise<number> {
  console.log('\n=� STEP 5: Updating database URLs...');
  
  // #region agent log
  debugLog('fix-and-process.ts:updateUrls:start', 'Starting database URL update', {}, 'H5');
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
  debugLog('fix-and-process.ts:updateUrls:complete', 'Database URL update complete', { updated }, 'H5');
  // #endregion

  console.log(`\n  ✅ Updated ${updated} exercise URLs`);
  return updated;
}

async function main() {
  console.log('=� GIF PIPELINE: Fix, Download, Process & Upload\n');
  console.log('='.repeat(60));

  // #region agent log
  debugLog('fix-and-process.ts:main:start', 'Pipeline started', {}, 'H1');
  // #endregion

  // Step 1: Fix malformed URLs
  const fixedUrls = await fixMalformedUrls();

  // Step 2: Download missing GIFs
  const { downloaded, failed: downloadFailed } = await downloadMissingGifs();

  // Step 3: Generate thumbnails using Sharp
  const { generated: thumbsGenerated, skipped: thumbsSkipped, failed: thumbsFailed } = await generateThumbnails();

  // Step 4: Upload to Supabase
  const { gifs: uploadedGifs, thumbnails: uploadedThumbs } = await uploadToSupabase();

  // Step 5: Update database URLs
  const updatedUrls = await updateDatabaseUrls();

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('=� FINAL SUMMARY');
  console.log('='.repeat(60));
  console.log(`\n=' Fixed malformed URLs: ${fixedUrls}`);
  console.log(`  Downloaded GIFs: ${downloaded} (failed: ${downloadFailed})`);
  console.log(`=�  Generated thumbnails: ${thumbsGenerated} (skipped: ${thumbsSkipped}, failed: ${thumbsFailed})`);
  console.log(`  Uploaded to Supabase: ${uploadedGifs} GIFs, ${uploadedThumbs} thumbnails`);
  console.log(`=� Updated database URLs: ${updatedUrls}`);

  // #region agent log
  debugLog('fix-and-process.ts:main:complete', 'Pipeline complete', {
    fixedUrls,
    downloaded,
    downloadFailed,
    thumbsGenerated,
    thumbsSkipped,
    thumbsFailed,
    uploadedGifs,
    uploadedThumbs,
    updatedUrls
  }, 'H1');
  // #endregion
}

main().catch(console.error);

