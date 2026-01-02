import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

config();

// ============================================
// CONFIGURATION
// ============================================
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;

const GIF_BUCKET = 'exercise-gifs';
const LOCAL_GIF_FOLDER = path.join(__dirname, '..', 'exercise-gifs');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============================================
// DEBUG HELPER
// ============================================
function debugLog(hypothesisId: string, location: string, message: string, data: any) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/068831e1-39c2-46d3-afd8-7578e38ed77a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location,message,data,timestamp:Date.now(),sessionId:'debug-session',runId:'upload-fix',hypothesisId})}).catch(()=>{});
  // #endregion
}

// ============================================
// THE 23 BROKEN EXERCISES
// ============================================
const brokenExercises = [
  { exerciseId: '784203d7-39aa-49a6-9ecb-7dfb807556e5', externalId: '0056', name: 'barbell lying close-grip triceps extension' },
  { exerciseId: 'b15e8c0a-e46d-4390-8473-680da25348fc', externalId: '0107', name: 'barbell standing front raise over head' },
  { exerciseId: 'ed048afd-e7de-4b97-afb9-af64cd1703ad', externalId: '0154', name: 'cable cross-over reverse fly' },
  { exerciseId: 'a0846abc-cc96-44f1-8398-086766dc5236', externalId: '0175', name: 'cable kneeling crunch' },
  { exerciseId: 'b57ff319-a22d-47aa-b851-46eab7bb6df3', externalId: '0577', name: 'chest press machine' },
  { exerciseId: '5199d2cf-e5bb-4080-9919-5a97e66bf0c3', externalId: '0443', name: 'elbow-to-knee' },
  { exerciseId: 'c187352d-a24f-434d-be1e-45840ef4ea0e', externalId: '0471', name: 'handstand push-up' },
  { exerciseId: 'dd8da03a-ae4a-48b3-8200-a75d54818e3c', externalId: '0544', name: 'kettlebell pistol squat' },
  { exerciseId: 'f661eaa7-9a80-466c-8a84-96b84674c846', externalId: '0570', name: 'leg pull in flat bench' },
  { exerciseId: 'd214a875-97d4-454f-a05c-785766afaf48', externalId: '0583', name: 'lever kneeling twist' },
  { exerciseId: 'b1f1ef30-ced6-4593-a5b9-18560c0a6932', externalId: '0601', name: 'lever seated reverse fly (parallel grip)' },
  { exerciseId: 'd1ef1788-53f5-4588-9911-a5c1c3185cf7', externalId: '0631', name: 'muscle up' },
  { exerciseId: '269bce14-4bc2-4174-9273-f327303d1bd3', externalId: '1495', name: 'oblique crunch' },
  { exerciseId: '81039cde-72d7-4d3e-a769-66bde1517a77', externalId: '0596', name: 'pec deck machine' },
  { exerciseId: 'b3507db3-5ca4-4304-b8ab-2795e7192b45', externalId: '0668', name: 'rear decline bridge' },
  { exerciseId: 'd3780f65-24bf-4155-8c17-421f7be05115', externalId: '3236', name: 'resistance band hip thrusts on knees' },
  { exerciseId: 'a90954ce-b4d3-479b-bcc3-3d6db3db080f', externalId: '0602', name: 'reverse fly machine' },
  { exerciseId: 'cf2516d4-fa2b-4e81-a602-7faf787a1a66', externalId: '0593', name: 'reverse hyperextension machine' },
  { exerciseId: 'bbd45ce1-df7b-4cab-8242-0d375f298de7', externalId: '1350', name: 'seated row machine' },
  { exerciseId: '7660dce3-d4ea-4964-a811-b4d27e706974', externalId: '0697', name: 'self assisted inverse leg curl' },
  { exerciseId: 'ae958d76-ed0d-44fa-b345-401880ebcd3a', externalId: '0603', name: 'shoulder press machine' },
  { exerciseId: '551825b9-a0b6-4b23-8eba-3003f7a1dee2', externalId: '0803', name: 'superman push-up' },
  { exerciseId: '96aa6645-52f5-4e01-80b5-a7df71031119', externalId: '1349', name: 't-bar row machine' }
];

// ============================================
// MAIN UPLOAD FUNCTION
// ============================================
async function uploadLocalGifs() {
  console.log('');
  console.log('🔼 UPLOAD LOCAL GIFS TO SUPABASE');
  console.log('═'.repeat(80));
  console.log('');
  console.log(`📂 Local GIF folder: ${LOCAL_GIF_FOLDER}`);
  console.log(`📦 Supabase bucket: ${GIF_BUCKET}`);
  console.log(`📋 Exercises to process: ${brokenExercises.length}`);
  console.log('');
  console.log('═'.repeat(80));
  console.log('');

  // #region agent log
  debugLog('FIX', 'upload-local-gifs.ts:80', 'Starting upload process', {
    totalExercises: brokenExercises.length,
    localFolder: LOCAL_GIF_FOLDER,
    bucket: GIF_BUCKET
  });
  // #endregion

  let success = 0;
  let failed = 0;
  const failures: string[] = [];

  for (let i = 0; i < brokenExercises.length; i++) {
    const exercise = brokenExercises[i];
    const progress = `[${String(i + 1).padStart(2)}/${brokenExercises.length}]`;

    console.log(`${progress} ${exercise.name}`);
    console.log(`      Exercise ID: ${exercise.exerciseId}`);

    try {
      // Check if UUID GIF file exists locally
      const uuidGifPath = path.join(LOCAL_GIF_FOLDER, `${exercise.exerciseId}.gif`);
      
      // #region agent log
      debugLog('FIX', 'upload-local-gifs.ts:105', 'Checking for UUID GIF file', {
        exerciseName: exercise.name,
        exerciseId: exercise.exerciseId,
        uuidGifPath,
        exists: fs.existsSync(uuidGifPath)
      });
      // #endregion

      if (fs.existsSync(uuidGifPath)) {
        console.log(`      ✅ Found UUID GIF file locally`);
        
        // Read file
        const gifBuffer = fs.readFileSync(uuidGifPath);
        console.log(`      📦 Size: ${(gifBuffer.length / 1024).toFixed(1)} KB`);

        // Upload to Supabase
        const filename = `${exercise.exerciseId}.gif`;
        console.log(`      ☁️  Uploading as: ${filename}`);

        const { error: uploadError } = await supabase.storage
          .from(GIF_BUCKET)
          .upload(filename, gifBuffer, {
            contentType: 'image/gif',
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        // #region agent log
        debugLog('FIX', 'upload-local-gifs.ts:136', 'Upload successful', {
          exerciseName: exercise.name,
          filename,
          size: gifBuffer.length
        });
        // #endregion

        // Update database
        const gifUrl = `${SUPABASE_URL}/storage/v1/object/public/${GIF_BUCKET}/${filename}`;
        
        const { error: dbError } = await supabase
          .from('exercises')
          .update({ gif_url: gifUrl, updated_at: new Date().toISOString() })
          .eq('id', exercise.exerciseId);

        if (dbError) {
          throw new Error(`Database update failed: ${dbError.message}`);
        }

        // #region agent log
        debugLog('FIX', 'upload-local-gifs.ts:156', 'Database updated', {
          exerciseName: exercise.name,
          gifUrl
        });
        // #endregion

        console.log(`      ✅ SUCCESS`);
        console.log('');
        success++;
      } else {
        throw new Error(`UUID GIF file not found: ${uuidGifPath}`);
      }

    } catch (error: any) {
      console.log(`      ❌ FAILED: ${error.message}`);
      console.log('');
      failed++;
      failures.push(`${exercise.name}: ${error.message}`);

      // #region agent log
      debugLog('FIX', 'upload-local-gifs.ts:177', 'Upload failed', {
        exerciseName: exercise.name,
        error: error.message
      });
      // #endregion
    }
  }

  // Summary
  console.log('═'.repeat(80));
  console.log('📊 FINAL RESULTS');
  console.log('═'.repeat(80));
  console.log(`✅ Success: ${success}/${brokenExercises.length}`);
  console.log(`❌ Failed: ${failed}/${brokenExercises.length}`);
  console.log('');

  if (failures.length > 0 && failures.length <= 10) {
    console.log('❌ Failed exercises:');
    failures.forEach((f) => console.log(`   • ${f}`));
    console.log('');
  }

  if (success > 0) {
    console.log('✅ Successfully uploaded and updated:');
    console.log(`   • ${success} GIF files`);
    console.log(`   • ${success} database records`);
    console.log('');
  }

  // #region agent log
  debugLog('FIX', 'upload-local-gifs.ts:209', 'Upload process complete', {
    success,
    failed,
    total: brokenExercises.length
  });
  // #endregion

  console.log('🎉 Done!');
  console.log('');
}

// Run
uploadLocalGifs().catch((error) => {
  console.error('');
  console.error('❌ Fatal error:', error.message);
  
  // #region agent log
  debugLog('FIX', 'upload-local-gifs.ts:225', 'Fatal error', { error: error.message, stack: error.stack });
  // #endregion
  
  process.exit(1);
});

