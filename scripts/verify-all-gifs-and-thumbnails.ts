import { createClient } from '@supabase/supabase-js';
import * as https from 'https';
import * as http from 'http';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface Exercise {
  id: string;
  name: string;
  gif_url: string | null;
  thumbnail_url: string | null;
}

async function checkUrlExists(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const request = protocol.get(url, { method: 'HEAD' }, (response) => {
      resolve(response.statusCode === 200);
    });
    
    request.on('error', () => resolve(false));
    request.setTimeout(10000, () => {
      request.destroy();
      resolve(false);
    });
  });
}

async function main() {
  console.log('🔍 COMPREHENSIVE GIF & THUMBNAIL VERIFICATION');
  console.log('═'.repeat(60));
  console.log('');

  // Step 1: Get all exercises with GIFs
  console.log('📊 Step 1: Fetching exercises from database...');
  const { data: exercises, error } = await supabase
    .from('exercises')
    .select('id, name, gif_url, thumbnail_url')
    .eq('is_active', true)
    .not('gif_url', 'is', null)
    .order('name');

  if (error || !exercises) {
    console.error('❌ Error fetching exercises:', error);
    return;
  }

  console.log(`✅ Found ${exercises.length} exercises with GIF URLs\n`);

  // Step 2: Check Supabase storage for actual files
  console.log('📦 Step 2: Checking Supabase storage...');
  
  const { data: gifFiles } = await supabase.storage
    .from('exercise-gifs')
    .list('', { limit: 1000 });
  
  const { data: thumbnailFiles } = await supabase.storage
    .from('exercise-thumbnails')
    .list('', { limit: 1000 });

  const gifSet = new Set(gifFiles?.map(f => f.name) || []);
  const thumbnailSet = new Set(thumbnailFiles?.map(f => f.name) || []);

  console.log(`   GIFs in storage: ${gifSet.size}`);
  console.log(`   Thumbnails in storage: ${thumbnailSet.size}\n`);

  // Step 3: Verify each exercise
  console.log('🔎 Step 3: Verifying each exercise...\n');

  const issues: string[] = [];
  const missingThumbnails: Exercise[] = [];
  const brokenGifs: Exercise[] = [];
  const brokenThumbnails: Exercise[] = [];
  const missingThumbnailUrls: Exercise[] = [];

  let verified = 0;
  let checked = 0;

  for (const exercise of exercises) {
    checked++;
    
    if (checked % 50 === 0) {
      console.log(`   Progress: ${checked}/${exercises.length}...`);
    }

    // Extract filenames from URLs
    const gifFilename = exercise.gif_url?.split('/').pop();
    const thumbnailFilename = exercise.thumbnail_url?.split('/').pop();

    let hasIssue = false;

    // Check 1: GIF exists in storage
    if (!gifFilename || !gifSet.has(gifFilename)) {
      issues.push(`${exercise.name}: GIF file missing in storage (${gifFilename})`);
      brokenGifs.push(exercise);
      hasIssue = true;
    }

    // Check 2: Thumbnail URL exists in database
    if (!exercise.thumbnail_url) {
      issues.push(`${exercise.name}: Missing thumbnail_url in database`);
      missingThumbnailUrls.push(exercise);
      hasIssue = true;
    } else {
      // Check 3: Thumbnail exists in storage
      if (!thumbnailFilename || !thumbnailSet.has(thumbnailFilename)) {
        issues.push(`${exercise.name}: Thumbnail file missing in storage (${thumbnailFilename})`);
        missingThumbnails.push(exercise);
        hasIssue = true;
      }
    }

    if (!hasIssue) {
      verified++;
    }
  }

  // Step 4: Report results
  console.log('\n' + '═'.repeat(60));
  console.log('📊 VERIFICATION RESULTS');
  console.log('═'.repeat(60));
  console.log(`✅ Perfectly verified: ${verified}/${exercises.length}`);
  console.log(`❌ Issues found: ${issues.length}`);
  console.log('');

  if (issues.length > 0) {
    console.log('⚠️  ISSUES DETECTED:\n');
    
    if (brokenGifs.length > 0) {
      console.log(`❌ Missing GIF files in storage: ${brokenGifs.length}`);
      brokenGifs.slice(0, 10).forEach(ex => {
        console.log(`   - ${ex.name}`);
      });
      if (brokenGifs.length > 10) {
        console.log(`   ... and ${brokenGifs.length - 10} more`);
      }
      console.log('');
    }

    if (missingThumbnailUrls.length > 0) {
      console.log(`❌ Missing thumbnail_url in database: ${missingThumbnailUrls.length}`);
      missingThumbnailUrls.slice(0, 10).forEach(ex => {
        console.log(`   - ${ex.name} (ID: ${ex.id})`);
      });
      if (missingThumbnailUrls.length > 10) {
        console.log(`   ... and ${missingThumbnailUrls.length - 10} more`);
      }
      console.log('');
    }

    if (missingThumbnails.length > 0) {
      console.log(`❌ Missing thumbnail files in storage: ${missingThumbnails.length}`);
      missingThumbnails.slice(0, 10).forEach(ex => {
        const filename = ex.thumbnail_url?.split('/').pop();
        console.log(`   - ${ex.name} (${filename})`);
      });
      if (missingThumbnails.length > 10) {
        console.log(`   ... and ${missingThumbnails.length - 10} more`);
      }
      console.log('');
    }
  } else {
    console.log('🎉 PERFECT! All exercises have working GIFs and thumbnails!');
  }

  // Step 5: Check for orphaned files
  console.log('═'.repeat(60));
  console.log('🔍 Checking for orphaned files...\n');

  const exerciseIds = new Set(exercises.map(ex => ex.id));
  const orphanedGifs = Array.from(gifSet).filter(filename => {
    const id = filename.replace('.gif', '');
    return !exerciseIds.has(id);
  });

  const orphanedThumbnails = Array.from(thumbnailSet).filter(filename => {
    const id = filename.replace('.png', '');
    return !exerciseIds.has(id);
  });

  console.log(`📦 Orphaned GIF files: ${orphanedGifs.length}`);
  if (orphanedGifs.length > 0 && orphanedGifs.length <= 20) {
    orphanedGifs.forEach(f => console.log(`   - ${f}`));
  }

  console.log(`📦 Orphaned thumbnail files: ${orphanedThumbnails.length}`);
  if (orphanedThumbnails.length > 0 && orphanedThumbnails.length <= 20) {
    orphanedThumbnails.forEach(f => console.log(`   - ${f}`));
  }

  // Step 6: Recommendations
  console.log('\n' + '═'.repeat(60));
  console.log('📋 RECOMMENDATIONS');
  console.log('═'.repeat(60));

  if (missingThumbnailUrls.length > 0 || missingThumbnails.length > 0) {
    console.log('🔧 Fix missing thumbnails:');
    console.log('   npm run thumbnails:generate');
    console.log('');
  }

  if (brokenGifs.length > 0) {
    console.log('🔧 Re-download broken GIFs:');
    console.log('   (Manual investigation required)');
    console.log('');
  }

  if (orphanedGifs.length > 0 || orphanedThumbnails.length > 0) {
    console.log('🧹 Clean up orphaned files:');
    console.log('   npm run storage:cleanup');
    console.log('');
  }

  // Final summary
  console.log('═'.repeat(60));
  console.log('📈 FINAL STATUS');
  console.log('═'.repeat(60));
  console.log(`Total exercises checked: ${exercises.length}`);
  console.log(`Fully working: ${verified} (${((verified / exercises.length) * 100).toFixed(1)}%)`);
  console.log(`Need attention: ${issues.length}`);
  console.log('');

  if (verified === exercises.length) {
    console.log('🎉🎉🎉 PERFECT SCORE! Everything is working! 🎉🎉🎉');
  } else {
    console.log('⚠️  Some issues need to be fixed.');
  }
}

main().catch(console.error);

