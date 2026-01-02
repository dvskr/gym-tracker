import { createClient } from '@supabase/supabase-js';
import * as https from 'https';
import * as http from 'http';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });

// ============================================
// CONFIGURATION (using YOUR variable names)
// ============================================
const EXERCISEDB_API_KEY = process.env.EXPO_PUBLIC_EXERCISEDB_API_KEY!;
const RAPIDAPI_HOST = 'exercisedb.p.rapidapi.com';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;

const GIF_BUCKET = 'exercise-gifs';

// ============================================
// VALIDATION
// ============================================
console.log('= Checking environment variables...');

if (!EXERCISEDB_API_KEY) {
  console.error('❌ Missing EXPO_PUBLIC_EXERCISEDB_API_KEY');
  process.exit(1);
}
console.log('✅ EXPO_PUBLIC_EXERCISEDB_API_KEY found');

if (!SUPABASE_URL) {
  console.error('❌ Missing EXPO_PUBLIC_SUPABASE_URL');
  process.exit(1);
}
console.log('✅ EXPO_PUBLIC_SUPABASE_URL found');

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
console.log('✅ EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY found');
console.log('');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============================================
// 23 EXERCISES TO DOWNLOAD
// UUIDs filled in from database query
// ============================================
const exercisesToDownload = [
  { uuid: '784203d7-39aa-49a6-9ecb-7dfb807556e5', externalId: '0056', name: 'barbell lying close-grip triceps extension' },
  { uuid: 'b15e8c0a-e46d-4390-8473-680da25348fc', externalId: '0107', name: 'barbell standing front raise over head' },
  { uuid: 'ed048afd-e7de-4b97-afb9-af64cd1703ad', externalId: '0154', name: 'cable cross-over reverse fly' },
  { uuid: 'a0846abc-cc96-44f1-8398-086766dc5236', externalId: '0175', name: 'cable kneeling crunch' },
  { uuid: '5199d2cf-e5bb-4080-9919-5a97e66bf0c3', externalId: '0443', name: 'elbow-to-knee' },
  { uuid: 'c187352d-a24f-434d-be1e-45840ef4ea0e', externalId: '0471', name: 'handstand push-up' },
  { uuid: 'dd8da03a-ae4a-48b3-8200-a75d54818e3c', externalId: '0544', name: 'kettlebell pistol squat' },
  { uuid: 'f661eaa7-9a80-466c-8a84-96b84674c846', externalId: '0570', name: 'leg pull in flat bench' },
  { uuid: 'b57ff319-a22d-47aa-b851-46eab7bb6df3', externalId: '0577', name: 'chest press machine' },
  { uuid: 'd214a875-97d4-454f-a05c-785766afaf48', externalId: '0583', name: 'lever kneeling twist' },
  { uuid: 'cf2516d4-fa2b-4e81-a602-7faf787a1a66', externalId: '0593', name: 'reverse hyperextension machine' },
  { uuid: '81039cde-72d7-4d3e-a769-66bde1517a77', externalId: '0596', name: 'pec deck machine' },
  { uuid: 'b1f1ef30-ced6-4593-a5b9-18560c0a6932', externalId: '0601', name: 'lever seated reverse fly (parallel grip)' },
  { uuid: 'a90954ce-b4d3-479b-bcc3-3d6db3db080f', externalId: '0602', name: 'reverse fly machine' },
  { uuid: 'ae958d76-ed0d-44fa-b345-401880ebcd3a', externalId: '0603', name: 'shoulder press machine' },
  { uuid: 'd1ef1788-53f5-4588-9911-a5c1c3185cf7', externalId: '0631', name: 'muscle up' },
  { uuid: 'b3507db3-5ca4-4304-b8ab-2795e7192b45', externalId: '0668', name: 'rear decline bridge' },
  { uuid: '7660dce3-d4ea-4964-a811-b4d27e706974', externalId: '0697', name: 'self assisted inverse leg curl' },
  { uuid: '551825b9-a0b6-4b23-8eba-3003f7a1dee2', externalId: '0803', name: 'superman push-up' },
  { uuid: '96aa6645-52f5-4e01-80b5-a7df71031119', externalId: '1349', name: 't-bar row machine' },
  { uuid: 'bbd45ce1-df7b-4cab-8242-0d375f298de7', externalId: '1350', name: 'seated row machine' },
  { uuid: '269bce14-4bc2-4174-9273-f327303d1bd3', externalId: '1495', name: 'oblique crunch' },
  { uuid: 'd3780f65-24bf-4155-8c17-421f7be05115', externalId: '3236', name: 'resistance band hip thrusts on knees' },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

async function downloadGifFromExerciseDB(externalId: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // Use the image endpoint directly
    const options = {
      method: 'GET',
      hostname: RAPIDAPI_HOST,
      path: `/image?exerciseId=${externalId}&resolution=1080`,
      headers: {
        'X-RapidAPI-Key': EXERCISEDB_API_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
      },
    };

    const req = https.request(options, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        const redirectUrl = res.headers.location;
        if (redirectUrl) {
          downloadFile(redirectUrl).then(resolve).catch(reject);
          return;
        }
      }

      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }

      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });

    req.on('error', reject);
    req.setTimeout(60000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
    req.end();
  });
}

async function downloadFile(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    const request = protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          downloadFile(redirectUrl).then(resolve).catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      const chunks: Buffer[] = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    });

    request.on('error', reject);
    request.setTimeout(60000, () => {
      request.destroy();
      reject(new Error('Download timeout'));
    });
  });
}

async function uploadToSupabase(filename: string, buffer: Buffer): Promise<boolean> {
  const { error } = await supabase.storage
    .from(GIF_BUCKET)
    .upload(filename, buffer, {
      contentType: 'image/gif',
      upsert: true,
    });

  if (error) {
    console.error(`    ❌ Upload error: ${error.message}`);
    return false;
  }
  return true;
}

async function updateDatabase(exerciseUuid: string, filename: string): Promise<boolean> {
  const gifUrl = `${SUPABASE_URL}/storage/v1/object/public/${GIF_BUCKET}/${filename}`;

  const { error } = await supabase
    .from('exercises')
    .update({ gif_url: gifUrl })
    .eq('id', exerciseUuid);

  if (error) {
    console.error(`    ❌ DB error: ${error.message}`);
    return false;
  }
  return true;
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('== DOWNLOAD MISSING GIFS FROM EXERCISEDB');
  console.log('═'.repeat(50));
  console.log(`=� Exercises to download: ${exercisesToDownload.length}`);
  console.log('');

  // Check if UUIDs are filled in
  const missingUuids = exercisesToDownload.filter((e) => !e.uuid);
  if (missingUuids.length > 0) {
    console.error('❌ Missing UUIDs in exercisesToDownload array!');
    console.error('');
    console.error('Run this SQL and add the UUIDs to the script:');
    console.error('');
    console.error(`SELECT id, name, external_id FROM exercises`);
    console.error(`WHERE external_id IN ('0056', '0107', '0154', ...)`);
    console.error('');
    console.error('Then update the uuid field for each exercise in the script.');
    process.exit(1);
  }

  let success = 0;
  let failed = 0;
  const failures: string[] = [];

  for (let i = 0; i < exercisesToDownload.length; i++) {
    const exercise = exercisesToDownload[i];
    const progress = `[${String(i + 1).padStart(2)}/${exercisesToDownload.length}]`;

    console.log(`${progress} ${exercise.name}`);
    console.log(`    External ID: ${exercise.externalId}`);

    try {
      // Step 1: Download GIF directly from ExerciseDB image endpoint
      console.log('    =� Downloading from ExerciseDB...');
      const gifBuffer = await downloadGifFromExerciseDB(exercise.externalId);
      const sizeMB = (gifBuffer.length / 1024 / 1024).toFixed(2);
      console.log(`    =� Size: ${sizeMB} MB`);

      // Step 2: Upload to Supabase with UUID filename
      const filename = `${exercise.uuid}.gif`;
      console.log(`      Uploading: ${filename}`);
      const uploaded = await uploadToSupabase(filename, gifBuffer);
      if (!uploaded) throw new Error('Upload failed');

      // Step 3: Update database gif_url
      console.log('    =� Updating database...');
      const updated = await updateDatabase(exercise.uuid, filename);
      if (!updated) throw new Error('DB update failed');

      console.log('    ✅ SUCCESS\n');
      success++;

      // Rate limit: wait between requests
      await new Promise((r) => setTimeout(r, 1000));
    } catch (error: any) {
      console.log(`    ❌ FAILED: ${error.message}\n`);
      failed++;
      failures.push(`${exercise.name}: ${error.message}`);
    }
  }

  // Summary
  console.log('═'.repeat(50));
  console.log('=� RESULTS');
  console.log('═'.repeat(50));
  console.log(`✅ Success: ${success}`);
  console.log(`❌ Failed: ${failed}`);

  if (failures.length > 0) {
    console.log('\n❌ Failed exercises:');
    failures.forEach((f) => console.log(`   - ${f}`));
  }

  console.log('\n Done!');
  console.log('\n=� Next step: Generate thumbnails');
  console.log('   npm run thumbnails:generate');
}

main().catch(console.error);
