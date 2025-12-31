import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import { execSync } from 'child_process';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const GIF_DIR = path.join(process.cwd(), 'exercise-gifs');
const GIF_1080P_DIR = path.join(process.cwd(), 'exercise-gifs-1080p');
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
    runId: 'gif-pipeline-debug',
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
[GIF_DIR, GIF_1080P_DIR, THUMBNAIL_DIR].forEach(dir => {
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

async function checkFfmpeg(): Promise<boolean> {
  try {
    execSync('ffmpeg -version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function testDownload(url: string): Promise<{ success: boolean; status?: number; error?: string }> {
  return new Promise((resolve) => {
    try {
      const protocol = url.startsWith('https') ? https : http;
      const req = protocol.request(url, { method: 'HEAD' }, (res) => {
        resolve({ success: res.statusCode === 200, status: res.statusCode });
      });
      req.on('error', (err) => resolve({ success: false, error: err.message }));
      req.end();
    } catch (error: any) {
      resolve({ success: false, error: error.message });
    }
  });
}

function downloadGif(exercise: Exercise): Promise<{ success: boolean; error?: string; path?: string }> {
  return new Promise((resolve) => {
    if (!exercise.gif_url) {
      return resolve({ success: false, error: 'No gif_url' });
    }

    const filename = `${exercise.id}.gif`;
    const outputPath = path.join(GIF_DIR, filename);

    if (fs.existsSync(outputPath)) {
      return resolve({ success: true, path: outputPath });
    }

    try {
      const protocol = exercise.gif_url.startsWith('https') ? https : http;
      const req = protocol.get(exercise.gif_url, (res) => {
        if (res.statusCode !== 200) {
          // Handle redirects
          if (res.statusCode === 301 || res.statusCode === 302) {
            const redirectUrl = res.headers.location;
            if (redirectUrl) {
              const redirectProtocol = redirectUrl.startsWith('https') ? https : http;
              redirectProtocol.get(redirectUrl, (redirectRes) => {
                if (redirectRes.statusCode !== 200) {
                  return resolve({ success: false, error: `HTTP ${redirectRes.statusCode}` });
                }
                const chunks: Buffer[] = [];
                redirectRes.on('data', (chunk) => chunks.push(chunk));
                redirectRes.on('end', () => {
                  fs.writeFileSync(outputPath, Buffer.concat(chunks));
                  resolve({ success: true, path: outputPath });
                });
              }).on('error', (err) => resolve({ success: false, error: err.message }));
              return;
            }
          }
          return resolve({ success: false, error: `HTTP ${res.statusCode}` });
        }
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          fs.writeFileSync(outputPath, Buffer.concat(chunks));
          resolve({ success: true, path: outputPath });
        });
      });
      req.on('error', (err) => resolve({ success: false, error: err.message }));
    } catch (error: any) {
      resolve({ success: false, error: error.message });
    }
  });
}

async function upscaleGif(inputPath: string, outputPath: string): Promise<boolean> {
  try {
    const cmd = `ffmpeg -y -i "${inputPath}" -vf "scale=1080:1080:force_original_aspect_ratio=decrease:flags=lanczos,pad=1080:1080:(ow-iw)/2:(oh-ih)/2:white,split[s0][s1];[s0]palettegen=max_colors=256:stats_mode=single[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5" "${outputPath}"`;
    execSync(cmd, { stdio: 'pipe', timeout: 120000 });
    return true;
  } catch {
    return false;
  }
}

async function generateThumbnail(inputPath: string, outputPath: string): Promise<boolean> {
  try {
    const cmd = `ffmpeg -y -i "${inputPath}" -vframes 1 -vf "scale=216:216:force_original_aspect_ratio=decrease:flags=lanczos,pad=216:216:(ow-iw)/2:(oh-ih)/2:white" -q:v 1 -qmin 1 -qmax 1 "${outputPath}"`;
    execSync(cmd, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log('🔍 DEBUG: GIF Pipeline Diagnostic\n');

  // #region agent log
  debugLog('debug-gif-pipeline.ts:main:start', 'Pipeline diagnostic started', { 
    GIF_DIR, GIF_1080P_DIR, THUMBNAIL_DIR 
  }, 'H1');
  // #endregion

  // Check ffmpeg
  const hasFfmpeg = await checkFfmpeg();
  // #region agent log
  debugLog('debug-gif-pipeline.ts:ffmpeg-check', 'ffmpeg availability check', { 
    hasFfmpeg 
  }, 'H4');
  // #endregion
  console.log(`ffmpeg available: ${hasFfmpeg ? '✅' : '❌'}`);

  if (!hasFfmpeg) {
    console.log('⚠️  ffmpeg not found. Upscaling/thumbnails will be skipped.');
    console.log('   Install ffmpeg: https://ffmpeg.org/download.html');
  }

  // Fetch all active exercises
  const { data: exercises, error } = await supabase
    .from('exercises')
    .select('id, name, equipment, gif_url, thumbnail_url')
    .eq('is_active', true);

  if (error) {
    // #region agent log
    debugLog('debug-gif-pipeline.ts:fetch-error', 'Failed to fetch exercises', { 
      error: error.message 
    }, 'H1');
    // #endregion
    console.error('Failed to fetch exercises:', error.message);
    return;
  }

  // #region agent log
  debugLog('debug-gif-pipeline.ts:exercises-fetched', 'Fetched active exercises', { 
    total: exercises?.length || 0 
  }, 'H1');
  // #endregion

  console.log(`\nTotal active exercises: ${exercises?.length || 0}`);

  // Check existing local GIFs
  const existingGifs = new Set(
    fs.existsSync(GIF_DIR) 
      ? fs.readdirSync(GIF_DIR).filter(f => f.endsWith('.gif')).map(f => f.toLowerCase())
      : []
  );
  const existing1080pGifs = new Set(
    fs.existsSync(GIF_1080P_DIR)
      ? fs.readdirSync(GIF_1080P_DIR).filter(f => f.endsWith('.gif')).map(f => f.toLowerCase())
      : []
  );
  const existingThumbnails = new Set(
    fs.existsSync(THUMBNAIL_DIR)
      ? fs.readdirSync(THUMBNAIL_DIR).filter(f => f.endsWith('.jpg')).map(f => f.toLowerCase())
      : []
  );

  console.log(`\nLocal files:`);
  console.log(`  GIFs: ${existingGifs.size}`);
  console.log(`  1080p GIFs: ${existing1080pGifs.size}`);
  console.log(`  Thumbnails: ${existingThumbnails.size}`);

  // Categorize exercises
  const noUrl: Exercise[] = [];
  const hasUrlNoLocal: Exercise[] = [];
  const hasLocal: Exercise[] = [];
  const has1080p: Exercise[] = [];
  const hasThumbnail: Exercise[] = [];

  for (const ex of exercises || []) {
    const idGif = `${ex.id}.gif`.toLowerCase();
    const idJpg = `${ex.id}.jpg`.toLowerCase();

    if (!ex.gif_url) {
      noUrl.push(ex);
    } else if (existingGifs.has(idGif)) {
      hasLocal.push(ex);
      if (existing1080pGifs.has(idGif)) {
        has1080p.push(ex);
      }
      if (existingThumbnails.has(idJpg)) {
        hasThumbnail.push(ex);
      }
    } else {
      // Check if GIF exists with original filename
      const originalFilename = ex.gif_url.split('/').pop()?.toLowerCase();
      if (originalFilename && existingGifs.has(originalFilename)) {
        hasLocal.push(ex);
      } else {
        hasUrlNoLocal.push(ex);
      }
    }
  }

  // #region agent log
  debugLog('debug-gif-pipeline.ts:categorization', 'Exercise categorization', { 
    noUrl: noUrl.length,
    hasUrlNoLocal: hasUrlNoLocal.length,
    hasLocal: hasLocal.length,
    has1080p: has1080p.length,
    hasThumbnail: hasThumbnail.length
  }, 'H1');
  // #endregion

  console.log(`\nCategorization:`);
  console.log(`  ❌ No gif_url in DB: ${noUrl.length}`);
  console.log(`  ⚠️  Has URL but no local file: ${hasUrlNoLocal.length}`);
  console.log(`  ✅ Has local GIF: ${hasLocal.length}`);
  console.log(`  📐 Has 1080p version: ${has1080p.length}`);
  console.log(`  🖼️  Has thumbnail: ${hasThumbnail.length}`);

  // Test URL validity for a sample of exercises missing local GIFs
  console.log(`\n🔗 Testing URL validity (first 10 exercises missing local GIFs)...`);
  const urlTestResults: { exercise: string; url: string; result: any }[] = [];
  
  for (const ex of hasUrlNoLocal.slice(0, 10)) {
    if (ex.gif_url) {
      const result = await testDownload(ex.gif_url);
      urlTestResults.push({ exercise: ex.name, url: ex.gif_url, result });
      console.log(`  ${result.success ? '✅' : '❌'} ${ex.name}: ${result.success ? 'OK' : result.status || result.error}`);
    }
  }

  // #region agent log
  debugLog('debug-gif-pipeline.ts:url-test', 'URL validity test results', { 
    tested: urlTestResults.length,
    results: urlTestResults
  }, 'H2');
  // #endregion

  // Try downloading a few exercises
  console.log(`\n⬇️  Testing downloads (first 5 exercises)...`);
  const downloadResults: { exercise: string; result: any }[] = [];
  
  for (const ex of hasUrlNoLocal.slice(0, 5)) {
    const result = await downloadGif(ex);
    downloadResults.push({ exercise: ex.name, result });
    console.log(`  ${result.success ? '✅' : '❌'} ${ex.name}: ${result.success ? 'Downloaded' : result.error}`);
  }

  // #region agent log
  debugLog('debug-gif-pipeline.ts:download-test', 'Download test results', { 
    tested: downloadResults.length,
    results: downloadResults
  }, 'H2');
  // #endregion

  // Test upscaling on an existing GIF
  if (existingGifs.size > 0 && hasFfmpeg) {
    const testGif = Array.from(existingGifs)[0];
    const inputPath = path.join(GIF_DIR, testGif);
    const outputPath = path.join(GIF_1080P_DIR, testGif);
    
    console.log(`\n📐 Testing upscaling on: ${testGif}`);
    const upscaleResult = await upscaleGif(inputPath, outputPath);
    console.log(`  Upscale: ${upscaleResult ? '✅' : '❌'}`);

    // #region agent log
    debugLog('debug-gif-pipeline.ts:upscale-test', 'Upscale test result', { 
      file: testGif,
      success: upscaleResult
    }, 'H4');
    // #endregion

    // Test thumbnail generation
    const thumbOutputPath = path.join(THUMBNAIL_DIR, testGif.replace('.gif', '.jpg'));
    console.log(`\n🖼️  Testing thumbnail generation on: ${testGif}`);
    const thumbResult = await generateThumbnail(inputPath, thumbOutputPath);
    console.log(`  Thumbnail: ${thumbResult ? '✅' : '❌'}`);

    // #region agent log
    debugLog('debug-gif-pipeline.ts:thumbnail-test', 'Thumbnail test result', { 
      file: testGif,
      success: thumbResult
    }, 'H4');
    // #endregion
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('DIAGNOSTIC SUMMARY');
  console.log('='.repeat(60));
  console.log(`\nTotal Active Exercises: ${exercises?.length || 0}`);
  console.log(`\n📊 GIF Coverage:`);
  console.log(`   ✅ Have local GIF: ${hasLocal.length} (${((hasLocal.length / (exercises?.length || 1)) * 100).toFixed(1)}%)`);
  console.log(`   ⚠️  Need download (have URL): ${hasUrlNoLocal.length}`);
  console.log(`   ❌ No URL in database: ${noUrl.length}`);
  console.log(`\n📐 1080p Upscaled: ${has1080p.length}`);
  console.log(`🖼️  Thumbnails: ${hasThumbnail.length}`);
  console.log(`\n🔧 ffmpeg: ${hasFfmpeg ? 'Available' : 'NOT FOUND'}`);

  // #region agent log
  debugLog('debug-gif-pipeline.ts:summary', 'Final diagnostic summary', { 
    totalActive: exercises?.length || 0,
    hasLocal: hasLocal.length,
    needDownload: hasUrlNoLocal.length,
    noUrl: noUrl.length,
    has1080p: has1080p.length,
    hasThumbnail: hasThumbnail.length,
    hasFfmpeg
  }, 'H1');
  // #endregion

  // List exercises without URLs
  if (noUrl.length > 0) {
    console.log(`\n❌ Exercises WITHOUT gif_url (first 20):`);
    noUrl.slice(0, 20).forEach(ex => {
      console.log(`   - ${ex.name} (${ex.equipment})`);
    });
    if (noUrl.length > 20) {
      console.log(`   ... and ${noUrl.length - 20} more`);
    }
  }
}

main().catch(console.error);

