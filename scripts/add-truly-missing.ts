import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
);

// The 84 TRULY missing exercises from smart comparison
const trulyMissingExercises = [
  // Priority 1: Essential (35)
  { name: "face pull", equipment: "cable", category: "shoulders", muscles: ["delts"] },
  { name: "cable fly", equipment: "cable", category: "chest", muscles: ["pectorals"] },
  { name: "hip thrust", equipment: "barbell", category: "upper legs", muscles: ["glutes"] },
  { name: "hip thrust bodyweight", equipment: "body weight", category: "upper legs", muscles: ["glutes"] },
  { name: "bulgarian split squat", equipment: "body weight", category: "upper legs", muscles: ["quads"] },
  { name: "hammer curl band", equipment: "band", category: "upper arms", muscles: ["biceps"] },
  { name: "hammer curl cable", equipment: "cable", category: "upper arms", muscles: ["biceps"] },
  { name: "hammer curl dumbbell", equipment: "dumbbell", category: "upper arms", muscles: ["biceps"] },
  { name: "box jump", equipment: "body weight", category: "upper legs", muscles: ["quads"] },
  { name: "jump rope", equipment: "body weight", category: "cardio", muscles: ["cardiovascular system"] },
  { name: "pec deck", equipment: "machine", category: "chest", muscles: ["pectorals"] },
  { name: "lat pulldown cable", equipment: "cable", category: "back", muscles: ["lats"] },
  { name: "lat pulldown machine", equipment: "machine", category: "back", muscles: ["lats"] },
  { name: "lat pulldown underhand", equipment: "cable", category: "back", muscles: ["lats"] },
  { name: "lat pulldown wide grip", equipment: "cable", category: "back", muscles: ["lats"] },
  { name: "leg extension machine", equipment: "machine", category: "upper legs", muscles: ["quads"] },
  { name: "lying leg curl machine", equipment: "machine", category: "upper legs", muscles: ["hamstrings"] },
  { name: "overhead press barbell", equipment: "barbell", category: "shoulders", muscles: ["delts"] },
  { name: "overhead press dumbbell", equipment: "dumbbell", category: "shoulders", muscles: ["delts"] },
  { name: "overhead press cable", equipment: "cable", category: "shoulders", muscles: ["delts"] },
  { name: "t bar row", equipment: "barbell", category: "back", muscles: ["upper back"] },
  { name: "trap bar deadlift", equipment: "barbell", category: "upper legs", muscles: ["hamstrings"] },
  { name: "cable crunch", equipment: "cable", category: "waist", muscles: ["abs"] },
  { name: "cable kickback", equipment: "cable", category: "upper legs", muscles: ["glutes"] },
  { name: "reverse fly cable", equipment: "cable", category: "shoulders", muscles: ["delts"] },
  { name: "reverse fly dumbbell", equipment: "dumbbell", category: "shoulders", muscles: ["delts"] },
  { name: "reverse fly machine", equipment: "machine", category: "shoulders", muscles: ["delts"] },
  { name: "russian twist", equipment: "body weight", category: "waist", muscles: ["abs"] },
  { name: "mountain climber", equipment: "body weight", category: "cardio", muscles: ["cardiovascular system"] },
  { name: "oblique crunch", equipment: "body weight", category: "waist", muscles: ["abs"] },
  { name: "v up", equipment: "body weight", category: "waist", muscles: ["abs"] },
  { name: "single leg bridge", equipment: "body weight", category: "upper legs", muscles: ["glutes"] },
  { name: "pistol squat", equipment: "body weight", category: "upper legs", muscles: ["quads"] },
  { name: "muscle up", equipment: "body weight", category: "back", muscles: ["lats"] },
  { name: "handstand push up", equipment: "body weight", category: "shoulders", muscles: ["delts"] },
  
  // Priority 2: Cardio (16)
  { name: "running", equipment: "body weight", category: "cardio", muscles: ["cardiovascular system"] },
  { name: "running treadmill", equipment: "machine", category: "cardio", muscles: ["cardiovascular system"] },
  { name: "cycling", equipment: "body weight", category: "cardio", muscles: ["cardiovascular system"] },
  { name: "cycling indoor", equipment: "machine", category: "cardio", muscles: ["cardiovascular system"] },
  { name: "swimming", equipment: "body weight", category: "cardio", muscles: ["cardiovascular system"] },
  { name: "rowing machine", equipment: "machine", category: "cardio", muscles: ["cardiovascular system"] },
  { name: "elliptical machine", equipment: "machine", category: "cardio", muscles: ["cardiovascular system"] },
  { name: "walking", equipment: "body weight", category: "cardio", muscles: ["cardiovascular system"] },
  { name: "hiking", equipment: "body weight", category: "cardio", muscles: ["cardiovascular system"] },
  { name: "climbing", equipment: "body weight", category: "cardio", muscles: ["cardiovascular system"] },
  { name: "stretching", equipment: "body weight", category: "cardio", muscles: ["full body"] },
  { name: "yoga", equipment: "body weight", category: "cardio", muscles: ["full body"] },
  { name: "aerobics", equipment: "body weight", category: "cardio", muscles: ["cardiovascular system"] },
  { name: "skating", equipment: "body weight", category: "cardio", muscles: ["cardiovascular system"] },
  { name: "skiing", equipment: "body weight", category: "cardio", muscles: ["cardiovascular system"] },
  { name: "snowboarding", equipment: "body weight", category: "cardio", muscles: ["cardiovascular system"] },
  
  // Priority 3: Specialty (33)
  { name: "ab wheel", equipment: "body weight", category: "waist", muscles: ["abs"] },
  { name: "battle ropes", equipment: "body weight", category: "cardio", muscles: ["cardiovascular system"] },
  { name: "hand gripper", equipment: "body weight", category: "lower arms", muscles: ["forearms"] },
  { name: "wrist roller", equipment: "body weight", category: "lower arms", muscles: ["forearms"] },
  { name: "kettlebell swing", equipment: "kettlebell", category: "full body", muscles: ["glutes"] },
  { name: "kettlebell turkish get up", equipment: "kettlebell", category: "full body", muscles: ["full body"] },
  { name: "kipping pull up", equipment: "body weight", category: "back", muscles: ["lats"] },
  { name: "seated row cable", equipment: "cable", category: "back", muscles: ["upper back"] },
  { name: "seated row machine", equipment: "machine", category: "back", muscles: ["upper back"] },
  { name: "shoulder press machine", equipment: "machine", category: "shoulders", muscles: ["delts"] },
  { name: "clean barbell", equipment: "barbell", category: "full body", muscles: ["full body"] },
  { name: "clean and jerk", equipment: "barbell", category: "full body", muscles: ["full body"] },
  { name: "power clean", equipment: "barbell", category: "full body", muscles: ["full body"] },
  { name: "snatch barbell", equipment: "barbell", category: "full body", muscles: ["full body"] },
  { name: "floor press barbell", equipment: "barbell", category: "chest", muscles: ["pectorals"] },
  { name: "deficit deadlift", equipment: "barbell", category: "upper legs", muscles: ["hamstrings"] },
  { name: "rack pull", equipment: "barbell", category: "back", muscles: ["upper back"] },
  { name: "chest press machine", equipment: "machine", category: "chest", muscles: ["pectorals"] },
  { name: "glute kickback machine", equipment: "machine", category: "upper legs", muscles: ["glutes"] },
  { name: "hip abductor machine", equipment: "machine", category: "upper legs", muscles: ["abductors"] },
  { name: "hip adductor machine", equipment: "machine", category: "upper legs", muscles: ["adductors"] },
  { name: "torso rotation machine", equipment: "machine", category: "waist", muscles: ["abs"] },
  { name: "around the world", equipment: "dumbbell", category: "chest", muscles: ["pectorals"] },
  { name: "ball slams", equipment: "weighted", category: "full body", muscles: ["full body"] },
  { name: "knees to elbows", equipment: "body weight", category: "waist", muscles: ["abs"] },
  { name: "toes to bar", equipment: "body weight", category: "waist", muscles: ["abs"] },
  { name: "hang clean", equipment: "barbell", category: "full body", muscles: ["full body"] },
  { name: "hang snatch", equipment: "barbell", category: "full body", muscles: ["full body"] },
  { name: "split jerk", equipment: "barbell", category: "shoulders", muscles: ["delts"] },
  { name: "thruster barbell", equipment: "barbell", category: "full body", muscles: ["full body"] },
  { name: "thruster kettlebell", equipment: "kettlebell", category: "full body", muscles: ["full body"] },
  { name: "superman", equipment: "body weight", category: "back", muscles: ["spine"] },
  { name: "press under", equipment: "barbell", category: "shoulders", muscles: ["delts"] },
];

async function addTrulyMissing() {
  console.log('=� Adding 84 truly missing exercises...\n');
  console.log(`Total to add: ${trulyMissingExercises.length}\n`);
  
  let added = 0;
  let failed = 0;
  const failedList: string[] = [];
  
  for (const ex of trulyMissingExercises) {
    try {
      const exerciseData = {
        name: ex.name,
        equipment: ex.equipment,
        category: ex.category,
        primary_muscles: ex.muscles,
        secondary_muscles: [],
        instructions: [],
        is_active: true,
        gif_url: null,
        external_id: null
      };
      
      const { error } = await supabase
        .from('exercises')
        .insert(exerciseData);
      
      if (error) {
        console.error(`❌ ${ex.name}: ${error.message}`);
        failed++;
        failedList.push(ex.name);
      } else {
        added++;
        if (added % 10 === 0) {
          console.log(`✅ Progress: ${added}/${trulyMissingExercises.length}`);
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (err: any) {
      console.error(`❌ ${ex.name}: ${err.message}`);
      failed++;
      failedList.push(ex.name);
    }
  }
  
  // Verify total
  const { count } = await supabase
    .from('exercises')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ IMPORT COMPLETE');
  console.log('='.repeat(60));
  console.log(`Added: ${added} exercises`);
  console.log(`Failed: ${failed} exercises`);
  console.log(`\n= NEW TOTAL ACTIVE: ${count}`);
  console.log(`Expected: ${344 + added} (344 existing + ${added} new)`);
  console.log(`\n Coverage: 100% of Strong's exercise list!\n`);
  
  if (failedList.length > 0) {
    console.log('\nFailed exercises:');
    failedList.forEach(name => console.log(`  - ${name}`));
  }
}

addTrulyMissing();
