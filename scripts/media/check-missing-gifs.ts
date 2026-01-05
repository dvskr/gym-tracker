import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const LOCAL_GIFS_DIR = path.join(__dirname, '..', 'exercise-gifs');

async function checkMissingGifs() {
  console.log('= Checking if Missing GIFs Exist Locally\n');
  console.log('═'.repeat(80));

  // Load the broken exercises data
  const brokenExercises = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'broken-exercises.json'), 'utf8')
  );

  // Filter to only those with external_id (should exist as numeric files)
  const withExternalId = brokenExercises.filter((ex: any) => ex.external_id);

  console.log(`Checking ${withExternalId.length} exercises with external_id\n`);

  const found: any[] = [];
  const missing: any[] = [];

  for (const ex of withExternalId) {
    const expectedFilename = `${ex.external_id}.gif`;
    const localPath = path.join(LOCAL_GIFS_DIR, expectedFilename);

    if (fs.existsSync(localPath)) {
      const stats = fs.statSync(localPath);
      found.push({
        ...ex,
        expectedFilename,
        fileSize: stats.size,
        exists: true
      });
    } else {
      missing.push({
        ...ex,
        expectedFilename,
        exists: false
      });
    }
  }

  console.log('= RESULTS:');
  console.log('═'.repeat(80));
  console.log(`✅ Found locally: ${found.length}`);
  console.log(`❌ Missing locally: ${missing.length}`);
  console.log('');

  if (found.length > 0) {
    console.log('✅ GIFs FOUND LOCALLY (ready to upload):');
    console.log('═'.repeat(80));
    found.forEach(ex => {
      console.log(`${ex.expectedFilename} → ${ex.name}`);
      console.log(`   Size: ${(ex.fileSize / 1024).toFixed(1)} KB`);
    });
    console.log('');
  }

  if (missing.length > 0) {
    console.log('❌ GIFs MISSING LOCALLY:');
    console.log('═'.repeat(80));
    missing.forEach(ex => {
      console.log(`${ex.expectedFilename} → ${ex.name}`);
      console.log(`   External ID: ${ex.external_id}`);
    });
    console.log('');
  }

  // Check exercises with NULL external_id
  const withoutExternalId = brokenExercises.filter((ex: any) => !ex.external_id);
  if (withoutExternalId.length > 0) {
    console.log('  EXERCISES WITHOUT external_id (need manual GIF sourcing):');
    console.log('═'.repeat(80));
    withoutExternalId.forEach((ex: any) => {
      console.log(`${ex.name}`);
      console.log(`   Equipment: ${ex.equipment}`);
      console.log(`   Category: ${ex.category}`);
    });
    console.log('');
  }

  // Save results
  fs.writeFileSync(
    path.join(__dirname, 'gifs-to-upload.json'),
    JSON.stringify(found, null, 2)
  );
  console.log('✅ Upload list saved to scripts/gifs-to-upload.json\n');

  // Summary
  console.log('= SUMMARY:');
  console.log('═'.repeat(80));
  console.log(`Total broken exercises: ${brokenExercises.length}`);
  console.log(`  - Have external_id: ${withExternalId.length}`);
  console.log(`    • Found locally: ${found.length} (ready to upload)`);
  console.log(`    • Missing locally: ${missing.length}`);
  console.log(`  - No external_id: ${withoutExternalId.length} (need sourcing)`);
  console.log('');
}

checkMissingGifs();
