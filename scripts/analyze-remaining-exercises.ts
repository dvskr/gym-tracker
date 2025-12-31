import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const GIF_DIR = path.join(process.cwd(), 'exercise-gifs');

async function main() {
  console.log('🔍 ANALYZING REMAINING EXERCISES WITHOUT GIFS\n');
  console.log('='.repeat(60));

  // Get existing local GIFs
  const existingGifs = new Set(
    fs.existsSync(GIF_DIR)
      ? fs.readdirSync(GIF_DIR).filter(f => f.endsWith('.gif')).map(f => f.toLowerCase())
      : []
  );

  // Get all active exercises
  const { data: allExercises, error } = await supabase
    .from('exercises')
    .select('id, name, equipment, primary_muscles, gif_url, external_id')
    .eq('is_active', true);

  if (error) {
    console.error('Failed to fetch exercises:', error.message);
    return;
  }

  const missing: Array<{
    id: string;
    name: string;
    equipment: string;
    primaryMuscles: string[];
    hasGifUrl: boolean;
    hasExternalId: boolean;
  }> = [];

  for (const ex of allExercises || []) {
    const filename = `${ex.id}.gif`.toLowerCase();
    
    if (!existingGifs.has(filename)) {
      missing.push({
        id: ex.id,
        name: ex.name,
        equipment: ex.equipment,
        primaryMuscles: ex.primary_muscles || [],
        hasGifUrl: !!ex.gif_url,
        hasExternalId: !!ex.external_id
      });
    }
  }

  console.log(`Total active exercises: ${allExercises?.length || 0}`);
  console.log(`With local GIFs: ${existingGifs.size}`);
  console.log(`Missing GIFs: ${missing.length}\n`);

  // Categorize missing exercises
  const byEquipment: Record<string, typeof missing> = {};
  const byMuscle: Record<string, typeof missing> = {};

  for (const ex of missing) {
    // By equipment
    if (!byEquipment[ex.equipment]) {
      byEquipment[ex.equipment] = [];
    }
    byEquipment[ex.equipment].push(ex);

    // By primary muscle
    for (const muscle of ex.primaryMuscles) {
      if (!byMuscle[muscle]) {
        byMuscle[muscle] = [];
      }
      byMuscle[muscle].push(ex);
    }
  }

  console.log('📊 MISSING BY EQUIPMENT:\n');
  const sortedEquipment = Object.entries(byEquipment).sort((a, b) => b[1].length - a[1].length);
  
  for (const [equipment, exercises] of sortedEquipment) {
    console.log(`  ${equipment.padEnd(20)} : ${exercises.length} exercises`);
    if (exercises.length <= 5) {
      exercises.forEach(ex => {
        console.log(`    - ${ex.name}${ex.hasExternalId ? ' (has external_id)' : ''}${ex.hasGifUrl ? ' (has gif_url)' : ''}`);
      });
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📋 FULL LIST OF MISSING EXERCISES:\n');

  const withExternalId = missing.filter(ex => ex.hasExternalId);
  const withoutExternalId = missing.filter(ex => !ex.hasExternalId);

  console.log(`\n🔗 WITH external_id (${withExternalId.length}):`);
  console.log('   (These should be downloadable from ExerciseDB)\n');
  withExternalId.forEach(ex => {
    console.log(`   - ${ex.name.padEnd(40)} (${ex.equipment})`);
  });

  console.log(`\n⚠️  WITHOUT external_id (${withoutExternalId.length}):`);
  console.log('   (These need alternative sourcing or should be marked inactive)\n');
  
  // Common vs niche
  const commonExercises = [
    'cable fly', 'hip thrust', 'pec deck', 'box jump', 'pistol squat',
    'face pull', 'ab wheel', 'battle ropes', 'russian twist', 'v up',
    'overhead press', 'lat pulldown', 'leg extension', 'leg curl',
    'seated row', 'shoulder press', 'chest press', 'muscle up'
  ];

  const common = withoutExternalId.filter(ex => 
    commonExercises.some(ce => ex.name.toLowerCase().includes(ce))
  );
  
  const cardio = withoutExternalId.filter(ex =>
    ['cycling', 'running', 'walking', 'swimming', 'rowing', 'hiking', 'elliptical', 
     'climbing', 'skating', 'skiing', 'snowboarding', 'aerobics', 'yoga', 'stretching'].some(
      cardio => ex.name.toLowerCase().includes(cardio)
    )
  );

  const olympic = withoutExternalId.filter(ex =>
    ['clean', 'snatch', 'jerk'].some(ol => ex.name.toLowerCase().includes(ol))
  );

  const other = withoutExternalId.filter(ex => 
    !common.includes(ex) && !cardio.includes(ex) && !olympic.includes(ex)
  );

  console.log(`   ✨ Common/Important (${common.length}):`);
  common.forEach(ex => console.log(`      - ${ex.name} (${ex.equipment})`));

  console.log(`\n   🏃 Cardio/Conditioning (${cardio.length}):`);
  cardio.forEach(ex => console.log(`      - ${ex.name} (${ex.equipment})`));

  console.log(`\n   🏋️  Olympic Lifts (${olympic.length}):`);
  olympic.forEach(ex => console.log(`      - ${ex.name} (${ex.equipment})`));

  console.log(`\n   🔧 Other (${other.length}):`);
  other.forEach(ex => console.log(`      - ${ex.name} (${ex.equipment})`));

  // Recommendations
  console.log('\n' + '='.repeat(60));
  console.log('💡 RECOMMENDATIONS:\n');
  
  if (withExternalId.length > 0) {
    console.log(`1. ✅ Run complete-missing-gifs.ts again to download ${withExternalId.length} exercises with external_id`);
  }
  
  if (common.length > 0) {
    console.log(`2. 🔍 ${common.length} common exercises need manual GIF sourcing or external_id mapping`);
  }
  
  if (cardio.length > 0) {
    console.log(`3. 🏃 ${cardio.length} cardio exercises - consider marking as inactive or finding generic cardio GIFs`);
  }
  
  if (olympic.length > 0) {
    console.log(`4. 🏋️  ${olympic.length} Olympic lifts - specialized, may need manual sourcing`);
  }

  const currentCompletion = ((existingGifs.size / (allExercises?.length || 1)) * 100).toFixed(1);
  const potentialCompletion = (((existingGifs.size + withExternalId.length) / (allExercises?.length || 1)) * 100).toFixed(1);

  console.log(`\n📈 Current completion: ${currentCompletion}%`);
  console.log(`📈 Potential with external_id downloads: ${potentialCompletion}%`);
  console.log(`📈 To reach 100%: Need ${missing.length} more exercises`);
}

main().catch(console.error);

