import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

async function analyzeExercises() {
  console.log('Fetching all exercises...\n');
  
  const { data: exercises, error } = await supabase
    .from('exercises')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`=� TOTAL EXERCISES: ${exercises.length}\n`);
  console.log('='.repeat(60));

  // Analysis 1: By Primary Muscle
  console.log('\n BY PRIMARY MUSCLE GROUP:\n');
  const byMuscle = new Map<string, any[]>();
  
  exercises.forEach(ex => {
    const muscle = ex.primary_muscles?.[0] || 'none';
    if (!byMuscle.has(muscle)) {
      byMuscle.set(muscle, []);
    }
    byMuscle.get(muscle)!.push(ex);
  });

  const sortedMuscles = Array.from(byMuscle.entries())
    .sort((a, b) => b[1].length - a[1].length);

  sortedMuscles.forEach(([muscle, exs]) => {
    console.log(`${muscle.padEnd(25)} ${exs.length.toString().padStart(4)} exercises`);
  });

  // Analysis 2: By Equipment
  console.log('\n\n BY EQUIPMENT TYPE:\n');
  const byEquipment = new Map<string, any[]>();
  
  exercises.forEach(ex => {
    const equip = ex.equipment || 'none';
    if (!byEquipment.has(equip)) {
      byEquipment.set(equip, []);
    }
    byEquipment.get(equip)!.push(ex);
  });

  const sortedEquipment = Array.from(byEquipment.entries())
    .sort((a, b) => b[1].length - a[1].length);

  sortedEquipment.forEach(([equip, exs]) => {
    console.log(`${equip.padEnd(25)} ${exs.length.toString().padStart(4)} exercises`);
  });

  // Analysis 3: By Category (if exists)
  console.log('\n\n=� BY CATEGORY:\n');
  const byCategory = new Map<string, any[]>();
  
  exercises.forEach(ex => {
    const cat = ex.category || 'none';
    if (!byCategory.has(cat)) {
      byCategory.set(cat, []);
    }
    byCategory.get(cat)!.push(ex);
  });

  const sortedCategories = Array.from(byCategory.entries())
    .sort((a, b) => b[1].length - a[1].length);

  sortedCategories.forEach(([cat, exs]) => {
    console.log(`${cat.padEnd(25)} ${exs.length.toString().padStart(4)} exercises`);
  });

  // Analysis 4: Sample exercise names by muscle group (first 5 of each)
  console.log('\n\n=� SAMPLE EXERCISES BY MUSCLE GROUP:\n');
  sortedMuscles.forEach(([muscle, exs]) => {
    console.log(`\n${muscle.toUpperCase()}:`);
    exs.slice(0, 5).forEach((ex: any) => {
      const equip = ex.equipment || 'none';
      console.log(`  - ${ex.name} (${equip})`);
    });
    if (exs.length > 5) {
      console.log(`  ... and ${exs.length - 5} more`);
    }
  });

  // Export full list to file for review
  const exportData = {
    total: exercises.length,
    byMuscle: Object.fromEntries(
      sortedMuscles.map(([muscle, exs]) => [
        muscle,
        {
          count: exs.length,
          exercises: exs.map((ex: any) => ({
            id: ex.id,
            name: ex.name,
            equipment: ex.equipment,
            secondary_muscles: ex.secondary_muscles
          }))
        }
      ])
    ),
    byEquipment: Object.fromEntries(
      sortedEquipment.map(([equip, exs]) => [
        equip,
        {
          count: exs.length,
          exercises: exs.map((ex: any) => ({
            id: ex.id,
            name: ex.name,
            primary_muscles: ex.primary_muscles
          }))
        }
      ])
    )
  };

  fs.writeFileSync(
    'scripts/exercises-analysis.json',
    JSON.stringify(exportData, null, 2)
  );

  console.log('\n\n✅ Full analysis exported to: scripts/exercises-analysis.json');
  console.log('='.repeat(60));
}

analyzeExercises();

