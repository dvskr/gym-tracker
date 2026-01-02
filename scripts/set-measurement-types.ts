import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Equipment that uses weight + reps
const WEIGHT_REPS_EQUIPMENT = [
  'barbell',
  'dumbbell',
  'cable',
  'smith machine',
  'leverage machine',
  'sled machine',
  'kettlebell',
  'ez barbell',
  'trap bar',
  'olympic barbell',
  'weighted',
  'medicine ball',
  'resistance band',
];

// Equipment that uses reps only
const REPS_ONLY_EQUIPMENT = [
  'body weight',
  'assisted',
  'stability ball',
  'bosu ball',
  'roller',
];

// Categories that are time-based
const TIME_BASED_CATEGORIES = [
  'cardiovascular system',
  'stretching',
];

// Specific exercises with special measurement types
const SPECIAL_MEASUREMENT_TYPES: Record<string, string> = {
  // Time-based exercises
  'plank': 'time',
  'front plank': 'time',
  'side plank': 'time',
  'wall sit': 'time',
  'dead hang': 'time',
  'l-sit': 'time',
  'stretching': 'time',
  'yoga': 'time',
  
  // Distance-based
  'running': 'distance',
  'walking': 'distance',
  'running treadmill': 'distance',
  'cycling': 'distance',
  'cycling indoor': 'distance',
  'rowing machine': 'distance',
  'swimming': 'distance',
  'hiking': 'distance',
  
  // Weight + Time (loaded carries)
  'farmers walk': 'weight_time',
  'suitcase carry': 'weight_time',
  
  // Calories (cardio machines)
  'elliptical machine': 'calories',
  'stair climber': 'calories',
  'stepmill machine': 'calories',
  'stationary bike': 'calories',
  'upper body ergometer': 'calories',
  'skierg machine': 'calories',
};

async function setMeasurementTypes() {
  console.log('=� Setting measurement types for exercises...\n');
  
  const forceUpdate = process.argv.includes('--force');
  
  // Fetch ALL exercises (handle pagination)
  let allExercises: any[] = [];
  let page = 0;
  const pageSize = 1000;
  
  while (true) {
    const { data, error } = await supabase
      .from('exercises')
      .select('id, name, equipment, category, measurement_type')
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    if (error) {
      throw new Error(`Failed to fetch exercises: ${error.message}`);
    }
    
    if (!data || data.length === 0) break;
    
    allExercises = allExercises.concat(data);
    console.log(`  Fetched ${allExercises.length} exercises...`);
    
    if (data.length < pageSize) break;
    page++;
  }
  
  console.log(`\n✅ Found ${allExercises.length} total exercises\n`);
  
  let updated = 0;
  let skipped = 0;
  
  const typeBreakdown: Record<string, number> = {
    weight_reps: 0,
    reps_only: 0,
    time: 0,
    distance: 0,
    weight_time: 0,
    calories: 0,
  };
  
  for (const exercise of allExercises) {
    // Skip if already has correct measurement type (unless force update)
    if (exercise.measurement_type && !forceUpdate) {
      skipped++;
      continue;
    }
    
    let measurementType = 'weight_reps'; // Default
    
    // Check special exercises first
    const exerciseNameLower = exercise.name.toLowerCase();
    for (const [name, type] of Object.entries(SPECIAL_MEASUREMENT_TYPES)) {
      if (exerciseNameLower.includes(name.toLowerCase())) {
        measurementType = type;
        break;
      }
    }
    
    // Check time-based categories
    if (measurementType === 'weight_reps') {
      for (const category of TIME_BASED_CATEGORIES) {
        if (exercise.category?.toLowerCase().includes(category)) {
          measurementType = 'time';
          break;
        }
      }
    }
    
    // Check equipment
    if (measurementType === 'weight_reps') {
      const equipmentLower = exercise.equipment?.toLowerCase() || '';
      
      if (REPS_ONLY_EQUIPMENT.some(e => equipmentLower.includes(e))) {
        // Check if it's a weighted bodyweight exercise
        if (!exerciseNameLower.includes('weighted')) {
          measurementType = 'reps_only';
        }
      }
    }
    
    // Update exercise
    const { error: updateError } = await supabase
      .from('exercises')
      .update({ measurement_type: measurementType })
      .eq('id', exercise.id);
    
    if (updateError) {
      console.log(`❌ Failed to update ${exercise.name}: ${updateError.message}`);
    } else {
      updated++;
      typeBreakdown[measurementType]++;
    }
  }
  
  console.log(`\n✅ Updated ${updated} exercises`);
  console.log(`  Skipped ${skipped} (already had measurement type)`);
  
  console.log('\n=� Type Breakdown:');
  Object.entries(typeBreakdown).forEach(([type, count]) => {
    if (count > 0) {
      console.log(`   ${type}: ${count}`);
    }
  });
  
  if (!forceUpdate && skipped > 0) {
    console.log('\n=� Use --force to update all exercises (overwrite existing types)');
  }
}

setMeasurementTypes().catch(console.error);
