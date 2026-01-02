import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function getBrokenExercises() {
  console.log('🔍 Getting 26 Broken Exercises from Database\n');
  console.log('═'.repeat(80));

  const brokenNames = [
    'cable cross-over reverse fly',
    't-bar row machine',
    'superman push-up',
    'pec deck machine',
    'reverse hyperextension machine',
    'barbell lying close-grip triceps extension',
    'cable kneeling crunch',
    'seated row machine',
    'barbell standing front raise over head',
    'elbow-to-knee',
    'reverse fly machine',
    'lever seated reverse fly (parallel grip)',
    'handstand push-up',
    'leg pull in flat bench',
    'chest press machine',
    'lever kneeling twist',
    'shoulder press machine',
    'muscle up',
    'rear decline bridge',
    'kettlebell pistol squat',
    'self assisted inverse leg curl',
    'resistance band hip thrusts on knees',
    'oblique crunch',
    'rowing machine',
    'air bike',
    'belt squat'
  ];

  const { data: exercises, error } = await supabase
    .from('exercises')
    .select('id, name, external_id, gif_url, equipment, category')
    .eq('is_active', true)
    .in('name', brokenNames)
    .order('name');

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log(`Found ${exercises?.length} exercises\n`);

  // Display in table format
  exercises?.forEach((ex, i) => {
    console.log(`${i + 1}. ${ex.name}`);
    console.log(`   ID: ${ex.id}`);
    console.log(`   External ID: ${ex.external_id || 'NULL'}`);
    console.log(`   Equipment: ${ex.equipment || 'NULL'}`);
    console.log(`   Category: ${ex.category || 'NULL'}`);
    console.log(`   Current gif_url: ${ex.gif_url || 'NULL'}`);
    const expectedFilename = ex.gif_url?.split('/').pop() || 'NULL';
    console.log(`   Expected filename: ${expectedFilename}`);
    console.log('');
  });

  // Save to JSON for scripting
  const fs = require('fs');
  fs.writeFileSync(
    'scripts/broken-exercises.json',
    JSON.stringify(exercises, null, 2)
  );
  console.log('✅ Data saved to scripts/broken-exercises.json\n');

  // Create SQL for reference
  const sqlUpdate = `-- SQL to mark these as inactive (if no GIFs can be found)\n/*\nUPDATE exercises SET is_active = false WHERE id IN (\n${exercises?.map(ex => `  '${ex.id}'`).join(',\n')}\n);\n*/\n`;
  
  fs.writeFileSync('scripts/broken-exercises.sql', sqlUpdate);
  console.log('✅ SQL saved to scripts/broken-exercises.sql\n');
}

getBrokenExercises();

