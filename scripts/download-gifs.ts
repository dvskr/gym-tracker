import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import https from 'https';
import http from 'http';

dotenv.config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

const EXERCISEDB_API_KEY = process.env.EXPO_PUBLIC_EXERCISEDB_API_KEY!;
const DOWNLOAD_DIR = path.join(__dirname, '../exercise-gifs');

// Create directory
if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

// Download from any URL (http or https)
function downloadFromUrl(url: string, filepath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    const protocol = url.startsWith('https') ? https : http;

    protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          file.close();
          fs.unlink(filepath, () => {});
          downloadFromUrl(redirectUrl, filepath).then(resolve).catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlink(filepath, () => {});
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve();
      });

      file.on('error', (err) => {
        file.close();
        fs.unlink(filepath, () => {});
        reject(err);
      });
    }).on('error', (err) => {
      file.close();
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

function downloadGif(gifUrl: string, filename: string, exerciseName: string): Promise<void> {
  return new Promise(async (resolve, reject) => {
    const filepath = path.join(DOWNLOAD_DIR, filename);

    // Skip if already exists
    if (fs.existsSync(filepath)) {
      console.log(`⏭️  Skip: ${filename} (already exists)`);
      resolve();
      return;
    }

    try {
      // Download the GIF
      await downloadFromUrl(gifUrl, filepath);
      
      const stats = fs.statSync(filepath);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
      console.log(`✅ ${filename} (${sizeMB} MB)`);
      resolve();
    } catch (err: any) {
      reject(new Error(`${err.message} for ${exerciseName} (${gifUrl})`));
    }
  });
}

async function downloadAllGifs() {
  console.log('📥 Downloading GIFs for 400 selected exercises...\n');

  // Check for API key
  if (!EXERCISEDB_API_KEY) {
    console.error('❌ Missing EXPO_PUBLIC_EXERCISEDB_API_KEY in .env file');
    console.error('   This is required to download GIFs from ExerciseDB API');
    return;
  }

  // Load selected exercises from JSON file
  const selected = JSON.parse(
    fs.readFileSync('scripts/selected-400-exercises.json', 'utf-8')
  );

  const selectedIds = selected.exercises.map((ex: any) => ex.id);

  // Get exercises with GIF URLs OR external_id from database
  const { data: exercises, error } = await supabase
    .from('exercises')
    .select('id, name, gif_url, external_id')
    .in('id', selectedIds);

  if (error || !exercises) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${exercises.length} exercises\n`);

  // Use ExerciseDB API image endpoint to get GIFs
  // API format: https://exercisedb.p.rapidapi.com/image?exerciseId={id}&resolution=360
  
  const exercisesWithGifs = exercises.map(ex => {
    let gifUrl = null;
    
    // Extract exercise ID from existing URL or use external_id
    let exerciseId = ex.external_id;
    if (ex.gif_url && ex.gif_url.includes('/')) {
      const urlParts = ex.gif_url.split('/');
      exerciseId = urlParts[urlParts.length - 1];
    }
    
    if (exerciseId) {
      // Use ExerciseDB RapidAPI image endpoint (360p resolution for reasonable file sizes)
      gifUrl = `https://exercisedb.p.rapidapi.com/image?exerciseId=${exerciseId}&resolution=360&rapidapi-key=${EXERCISEDB_API_KEY}`;
    }
    
    return {
      ...ex,
      gif_url: gifUrl,
      exercise_id: exerciseId
    };
  }).filter(ex => ex.gif_url);

  console.log(`Found ${exercisesWithGifs.length} exercises with GIF URLs\n`);

  // Log first few URLs for debugging
  console.log('Sample GIF URLs (RapidAPI format):');
  exercisesWithGifs.slice(0, 3).forEach(ex => {
    const safeUrl = ex.gif_url.replace(EXERCISEDB_API_KEY, '***');
    console.log(`  ${ex.name} [${ex.exercise_id}]: ${safeUrl}`);
  });
  console.log();

  let completed = 0;
  let failed = 0;
  const failedList: any[] = [];

  // Download in batches of 5 (be nice to the API)
  const BATCH_SIZE = 5;

  for (let i = 0; i < exercisesWithGifs.length; i += BATCH_SIZE) {
    const batch = exercisesWithGifs.slice(i, i + BATCH_SIZE);

    await Promise.allSettled(
      batch.map(ex => {
        const filename = `${ex.id}.gif`;
        return downloadGif(ex.gif_url, filename, ex.name);
      })
    ).then(results => {
      results.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          completed++;
        } else {
          failed++;
          failedList.push({
            id: batch[idx].id,
            name: batch[idx].name,
            url: batch[idx].gif_url,
            error: result.reason?.message
          });
        }
      });
    });

    // Progress
    console.log(`\n📊 Progress: ${completed + failed}/${exercisesWithGifs.length}\n`);

    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 DOWNLOAD COMPLETE');
  console.log('='.repeat(60));
  console.log(`✅ Success: ${completed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📁 Location: ${DOWNLOAD_DIR}\n`);

  if (failed > 0) {
    fs.writeFileSync(
      'scripts/failed-downloads.json',
      JSON.stringify(failedList, null, 2)
    );
    console.log('⚠️  Failed downloads saved to: scripts/failed-downloads.json');
  }
}

downloadAllGifs();

