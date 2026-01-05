import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type MeasurementType = 
  | 'reps_weight'    // Standard: Bench Press, Squat
  | 'time'           // Plank, Wall Sit, Dead Hang
  | 'time_distance'  // Running, Cycling, Swimming
  | 'time_weight'    // Farmer's Walk, Weighted Carries
  | 'reps_only'      // Push-ups, Pull-ups, Sit-ups
  | 'assisted';      // Assisted Pull-ups

const detectMeasurementType = (exercise: any): MeasurementType => {
  const name = exercise.name.toLowerCase();
  const category = exercise.category?.toLowerCase() || '';
  const equipment = exercise.equipment?.toLowerCase() || '';
  
  // CARDIO - time + distance
  if (
    category === 'cardio' ||
    name.includes('running') ||
    name.includes('cycling') ||
    name.includes('rowing') ||
    name.includes('swimming') ||
    name.includes('elliptical') ||
    name.includes('treadmill') ||
    name.includes('stair') && category === 'cardio'
  ) {
    return 'time_distance';
  }
  
  // TIMED HOLDS - time only
  if (
    name.includes('plank') ||
    name.includes('hold') ||
    name.includes('wall sit') ||
    name.includes('dead hang') ||
    name.includes('l-sit') ||
    name.includes('hollow body') ||
    name.includes('hanging') && name.includes('knee')
  ) {
    return 'time';
  }
  
  // WEIGHTED CARRIES - time + weight
  if (
    name.includes('carry') ||
    name.includes('farmer') ||
    name.includes('waiter walk') ||
    name.includes('suitcase')
  ) {
    return 'time_weight';
  }
  
  // ASSISTED EXERCISES - reps + assistance
  if (name.includes('assisted')) {
    return 'assisted';
  }
  
  // BODYWEIGHT ONLY - reps only (no weight)
  if (equipment === 'body weight') {
    // Check if it's a strength exercise (not stretching/yoga)
    if (
      name.includes('push up') ||
      name.includes('pull up') ||
      name.includes('chin up') ||
      name.includes('dip') ||
      name.includes('sit up') ||
      name.includes('crunch') ||
      name.includes('burpee') ||
      name.includes('jump') ||
      name.includes('squat') && !name.includes('barbell') && !name.includes('dumbbell') ||
      name.includes('lunge') && !name.includes('barbell') && !name.includes('dumbbell') ||
      name.includes('mountain climber') ||
      name.includes('pistol') ||
      name.includes('muscle up') ||
      name.includes('handstand')
    ) {
      return 'reps_only';
    }
  }
  
  // STRETCHES/YOGA - time only
  if (
    category === 'stretching' ||
    name.includes('stretch') ||
    name.includes('yoga')
  ) {
    return 'time';
  }
  
  // DEFAULT - standard reps + weight
  return 'reps_weight';
};

async function assignMeasurementTypes() {
  console.log('= Assigning measurement types to all exercises...\n');
  
  const { data: exercises, error } = await supabase
    .from('exercises')
    .select('id, name, category, equipment')
    .eq('is_active', true);
  
  if (error || !exercises) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`Found ${exercises.length} active exercises\n`);
  
  const stats = {
    reps_weight: [] as string[],
    time: [] as string[],
    time_distance: [] as string[],
    time_weight: [] as string[],
    reps_only: [] as string[],
    assisted: [] as string[]
  };
  
  let updated = 0;
  
  for (const exercise of exercises) {
    const type = detectMeasurementType(exercise);
    
    const { error: updateError } = await supabase
      .from('exercises')
      .update({ measurement_type: type })
      .eq('id', exercise.id);
    
    if (!updateError) {
      stats[type].push(exercise.name);
      updated++;
      
      if (type !== 'reps_weight') {
        console.log(`✅ ${exercise.name} → ${type}`);
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('MEASUREMENT TYPE ASSIGNMENT COMPLETE');
  console.log('='.repeat(70));
  console.log(`\n✅ Updated: ${updated}/${exercises.length} exercises\n`);
  
  console.log('= Breakdown by Type:\n');
  console.log(`    Reps + Weight: ${stats.reps_weight.length} exercises`);
  console.log(`    Time Only: ${stats.time.length} exercises`);
  console.log(`    Time + Distance: ${stats.time_distance.length} exercises`);
  console.log(`  =  Time + Weight: ${stats.time_weight.length} exercises`);
  console.log(`  =  Reps Only: ${stats.reps_only.length} exercises`);
  console.log(`  >  Assisted: ${stats.assisted.length} exercises`);
  
  console.log('\n=� Examples:\n');
  if (stats.time.length > 0) {
    console.log('  Time Only:', stats.time.slice(0, 5).join(', '));
  }
  if (stats.time_distance.length > 0) {
    console.log('  Time + Distance:', stats.time_distance.slice(0, 5).join(', '));
  }
  if (stats.reps_only.length > 0) {
    console.log('  Reps Only:', stats.reps_only.slice(0, 5).join(', '));
  }
  console.log('');
}

assignMeasurementTypes();
