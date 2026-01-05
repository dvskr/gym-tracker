import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const EXERCISEDB_API_KEY = process.env.EXPO_PUBLIC_EXERCISEDB_API_KEY!;
const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Common exercise name mappings to ExerciseDB format
const nameMapping: Record<string, string> = {
  "face pull": "cable face pull",
  "cable fly": "cable chest fly",
  "hip thrust": "barbell hip thrust",
  "bulgarian split squat": "bulgarian split squat",
  "hammer curl dumbbell": "dumbbell hammer curl",
  "hammer curl cable": "cable hammer curl",
  "hammer curl band": "band hammer curl",
  "box jump": "box jump",
  "jump rope": "jump rope",
  "pec deck": "pec deck machine",
  "lat pulldown cable": "cable lat pulldown",
  "lat pulldown machine": "lever lat pulldown",
  "lat pulldown underhand": "cable underhand lat pulldown",
  "lat pulldown wide grip": "cable wide grip lat pulldown",
  "leg extension machine": "lever leg extension",
  "lying leg curl machine": "lever lying leg curl",
  "overhead press barbell": "barbell overhead press",
  "overhead press dumbbell": "dumbbell overhead press",
  "overhead press cable": "cable overhead press",
  "t bar row": "barbell t bar row",
  "trap bar deadlift": "trap bar deadlift",
  "cable crunch": "cable kneeling crunch",
  "cable kickback": "cable glute kickback",
  "reverse fly cable": "cable reverse fly",
  "reverse fly dumbbell": "dumbbell reverse fly",
  "reverse fly machine": "lever reverse fly",
  "russian twist": "russian twist",
  "mountain climber": "mountain climber",
  "oblique crunch": "oblique crunch",
  "v up": "v up",
  "single leg bridge": "single leg bridge",
  "pistol squat": "pistol squat",
  "muscle up": "muscle up",
  "handstand push up": "handstand push up",
  "ab wheel": "ab wheel rollout",
  "battle ropes": "battle rope",
  "hand gripper": "hand gripper",
  "wrist roller": "wrist roller",
  "kettlebell swing": "kettlebell swing",
  "kettlebell turkish get up": "kettlebell turkish get up",
  "kipping pull up": "kipping pull up",
  "seated row cable": "cable seated row",
  "seated row machine": "lever seated row",
  "shoulder press machine": "lever shoulder press",
  "clean barbell": "barbell clean",
  "clean and jerk": "barbell clean and jerk",
  "power clean": "barbell power clean",
  "snatch barbell": "barbell snatch",
  "floor press barbell": "barbell floor press",
  "deficit deadlift": "barbell deficit deadlift",
  "rack pull": "barbell rack pull",
  "chest press machine": "lever chest press",
  "glute kickback machine": "lever glute kickback",
  "hip abductor machine": "lever hip abductor",
  "hip adductor machine": "lever hip adductor",
  "torso rotation machine": "lever torso rotation",
  "around the world": "dumbbell around the world",
  "ball slams": "medicine ball slam",
  "knees to elbows": "hanging knees to elbows",
  "toes to bar": "hanging toes to bar",
  "hang clean": "barbell hang clean",
  "hang snatch": "barbell hang snatch",
  "split jerk": "barbell split jerk",
  "thruster barbell": "barbell thruster",
  "thruster kettlebell": "kettlebell thruster",
  "superman": "superman exercise",
  "press under": "barbell press under",
  // Cardio exercises likely won't have GIFs in ExerciseDB
  // We may need placeholder images for these
};

async function findExerciseIds() {
  console.log('= Finding ExerciseDB IDs for new exercises...\n');
  
  // Get exercises without GIFs
  const { data: exercises, error } = await supabase
    .from('exercises')
    .select('id, name, equipment')
    .eq('is_active', true)
    .is('gif_url', null);
  
  if (error || !exercises) {
    console.error('Error fetching exercises:', error);
    return;
  }
  
  console.log(`Found ${exercises.length} exercises without GIFs\n`);
  
  const results: any[] = [];
  let found = 0;
  let notFound = 0;
  
  for (const exercise of exercises) {
    const searchName = nameMapping[exercise.name] || exercise.name;
    
    try {
      // Search ExerciseDB for this exercise
      const response = await fetch(
        `https://exercisedb.p.rapidapi.com/exercises/name/${encodeURIComponent(searchName)}`,
        {
          headers: {
            'X-RapidAPI-Key': EXERCISEDB_API_KEY,
            'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com'
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const match = data[0];
          results.push({
            id: exercise.id,
            name: exercise.name,
            external_id: match.id,
            gif_url: match.gifUrl
          });
          found++;
          console.log(`✅ ${exercise.name} → ${match.id}`);
        } else {
          results.push({
            id: exercise.id,
            name: exercise.name,
            external_id: null,
            gif_url: null
          });
          notFound++;
          console.log(`❌ ${exercise.name} → Not found`);
        }
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (err: any) {
      console.error(`Error for ${exercise.name}:`, err.message);
      notFound++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('RESULTS:');
  console.log('='.repeat(60));
  console.log(`Found: ${found}`);
  console.log(`Not Found: ${notFound}`);
  console.log(`\nExercises not found in ExerciseDB will need placeholder images.\n`);
  
  // Save results
  fs.writeFileSync(
    'scripts/exercise-id-mapping.json',
    JSON.stringify(results, null, 2)
  );
  
  console.log('=� Saved to: scripts/exercise-id-mapping.json\n');
}

findExerciseIds();
