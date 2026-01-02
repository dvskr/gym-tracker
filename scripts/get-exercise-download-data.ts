import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function getExerciseDataForDownload() {
  console.log('=� GETTING EXERCISE DATA FOR DOWNLOAD SCRIPT');
  console.log('═'.repeat(80));
  console.log('');

  // Get the 26 broken exercises
  const { data: exercises, error } = await supabase
    .from('exercises')
    .select('id, name, external_id, gif_url')
    .eq('is_active', true)
    .or('gif_url.is.null,gif_url.not.like.%.gif')
    .order('name');

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  console.log(`Found ${exercises?.length} broken exercises\n`);

  // Separate those with and without external_id
  const withExternalId = exercises?.filter(ex => ex.external_id) || [];
  const withoutExternalId = exercises?.filter(ex => !ex.external_id) || [];

  console.log('✅ EXERCISES WITH external_id (can download from API):');
  console.log('─'.repeat(80));
  console.log(`Count: ${withExternalId.length}\n`);

  // Generate TypeScript array for the script
  console.log('Copy this array into the download script:\n');
  console.log('const brokenExercises = [');
  withExternalId.forEach((ex, i) => {
    const comma = i < withExternalId.length - 1 ? ',' : '';
    console.log(`  { exerciseId: '${ex.id}', externalId: '${ex.external_id}', name: '${ex.name}' }${comma}`);
  });
  console.log('];\n');

  if (withoutExternalId.length > 0) {
    console.log('  EXERCISES WITHOUT external_id (cannot download from API):');
    console.log('─'.repeat(80));
    console.log(`Count: ${withoutExternalId.length}\n`);
    withoutExternalId.forEach(ex => {
      console.log(`  - ${ex.name} (${ex.id})`);
    });
    console.log('');
    console.log('These exercises will need to be:');
    console.log('  1. Downloaded manually, OR');
    console.log('  2. Deactivated');
    console.log('');
  }

  // Save to JSON for easy copy
  fs.writeFileSync(
    path.join(__dirname, 'exercise-download-data.json'),
    JSON.stringify({
      withExternalId: withExternalId.map(ex => ({
        exerciseId: ex.id,
        externalId: ex.external_id,
        name: ex.name
      })),
      withoutExternalId: withoutExternalId.map(ex => ({
        exerciseId: ex.id,
        name: ex.name
      }))
    }, null, 2)
  );

  console.log('✅ Data saved to scripts/exercise-download-data.json');
  console.log('');
  console.log('═'.repeat(80));
  console.log('= SUMMARY');
  console.log('═'.repeat(80));
  console.log(`Total broken exercises: ${exercises?.length}`);
  console.log(`Can download from API: ${withExternalId.length}`);
  console.log(`Need manual handling: ${withoutExternalId.length}`);
  console.log('');
}

getExerciseDataForDownload();
