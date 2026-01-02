import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
);

interface Exercise {
  id: string;
  name: string;
  category: string;
  equipment: string;
  measurement_type: string;
}

async function verifyMeasurementTypes() {
  console.log('= Verifying measurement types for all exercises...\n');
  
  // Get all active exercises
  const { data: exercises, error } = await supabase
    .from('exercises')
    .select('id, name, category, equipment, measurement_type')
    .eq('is_active', true)
    .order('name');
  
  if (error || !exercises) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`Found ${exercises.length} active exercises\n`);
  
  // Group by measurement type
  const grouped: Record<string, Exercise[]> = {
    reps_weight: [],
    time: [],
    time_distance: [],
    time_weight: [],
    reps_only: [],
    assisted: [],
    null: [] // Exercises without measurement type
  };
  
  exercises.forEach(ex => {
    const type = ex.measurement_type || 'null';
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push(ex);
  });
  
  // Display statistics
  console.log('='.repeat(70));
  console.log('= MEASUREMENT TYPE DISTRIBUTION');
  console.log('='.repeat(70));
  console.log('');
  
  console.log(`  Reps + Weight: ${grouped.reps_weight.length} exercises`);
  console.log(`  Time Only: ${grouped.time.length} exercises`);
  console.log(`  Time + Distance: ${grouped.time_distance.length} exercises`);
  console.log(`=  Time + Weight: ${grouped.time_weight.length} exercises`);
  console.log(`=  Reps Only: ${grouped.reps_only.length} exercises`);
  console.log(`>  Assisted: ${grouped.assisted.length} exercises`);
  if (grouped.null.length > 0) {
    console.log(`❌  No Type Assigned: ${grouped.null.length} exercises`);
  }
  console.log('');
  
  // Show examples from each category
  console.log('='.repeat(70));
  console.log('= EXAMPLES BY TYPE');
  console.log('='.repeat(70));
  console.log('');
  
  // Time Only Examples
  if (grouped.time.length > 0) {
    console.log(`�  TIME ONLY (${grouped.time.length} total):`);
    grouped.time.slice(0, 15).forEach(ex => {
      console.log(`   • ${ex.name} (${ex.equipment})`);
    });
    if (grouped.time.length > 15) {
      console.log(`   ... and ${grouped.time.length - 15} more`);
    }
    console.log('');
  }
  
  // Time + Distance Examples
  if (grouped.time_distance.length > 0) {
    console.log(`  TIME + DISTANCE (${grouped.time_distance.length} total):`);
    grouped.time_distance.forEach(ex => {
      console.log(`   • ${ex.name} (${ex.equipment})`);
    });
    console.log('');
  }
  
  // Time + Weight Examples
  if (grouped.time_weight.length > 0) {
    console.log(`=  TIME + WEIGHT (${grouped.time_weight.length} total):`);
    grouped.time_weight.forEach(ex => {
      console.log(`   • ${ex.name} (${ex.equipment})`);
    });
    console.log('');
  }
  
  // Reps Only Examples
  if (grouped.reps_only.length > 0) {
    console.log(`=  REPS ONLY (${grouped.reps_only.length} total):`);
    grouped.reps_only.slice(0, 15).forEach(ex => {
      console.log(`   • ${ex.name} (${ex.equipment})`);
    });
    if (grouped.reps_only.length > 15) {
      console.log(`   ... and ${grouped.reps_only.length - 15} more`);
    }
    console.log('');
  }
  
  // Assisted Examples
  if (grouped.assisted.length > 0) {
    console.log(`>  ASSISTED (${grouped.assisted.length} total):`);
    grouped.assisted.forEach(ex => {
      console.log(`   • ${ex.name} (${ex.equipment})`);
    });
    console.log('');
  }
  
  // Potential Issues Detection
  console.log('='.repeat(70));
  console.log('  POTENTIAL ISSUES TO REVIEW');
  console.log('='.repeat(70));
  console.log('');
  
  const issues: string[] = [];
  
  // Check for stretches with wrong type
  const stretchesWrongType = exercises.filter(ex => 
    (ex.name.toLowerCase().includes('stretch') || 
     ex.category?.toLowerCase().includes('stretch')) &&
    ex.measurement_type !== 'time'
  );
  
  if (stretchesWrongType.length > 0) {
    console.log(`❌  Stretches not set to TIME (${stretchesWrongType.length}):`);
    stretchesWrongType.forEach(ex => {
      console.log(`   • ${ex.name} → Currently: ${ex.measurement_type}`);
      issues.push(`UPDATE exercises SET measurement_type = 'time' WHERE id = '${ex.id}'; -- ${ex.name}`);
    });
    console.log('');
  }
  
  // Check for planks with wrong type
  const planksWrongType = exercises.filter(ex =>
    ex.name.toLowerCase().includes('plank') &&
    ex.measurement_type !== 'time'
  );
  
  if (planksWrongType.length > 0) {
    console.log(`❌  Planks not set to TIME (${planksWrongType.length}):`);
    planksWrongType.forEach(ex => {
      console.log(`   • ${ex.name} → Currently: ${ex.measurement_type}`);
      issues.push(`UPDATE exercises SET measurement_type = 'time' WHERE id = '${ex.id}'; -- ${ex.name}`);
    });
    console.log('');
  }
  
  // Check for cardio with wrong type
  const cardioWrongType = exercises.filter(ex =>
    ex.category?.toLowerCase() === 'cardio' &&
    ex.measurement_type !== 'time_distance' &&
    !ex.name.toLowerCase().includes('stretching') &&
    !ex.name.toLowerCase().includes('yoga')
  );
  
  if (cardioWrongType.length > 0) {
    console.log(`❌  Cardio not set to TIME+DISTANCE (${cardioWrongType.length}):`);
    cardioWrongType.forEach(ex => {
      console.log(`   • ${ex.name} → Currently: ${ex.measurement_type}`);
      issues.push(`UPDATE exercises SET measurement_type = 'time_distance' WHERE id = '${ex.id}'; -- ${ex.name}`);
    });
    console.log('');
  }
  
  // Check for bodyweight exercises with weight
  const bodyweightWithWeight = exercises.filter(ex =>
    ex.equipment?.toLowerCase() === 'body weight' &&
    ex.measurement_type === 'reps_weight' &&
    !ex.name.toLowerCase().includes('weighted')
  );
  
  if (bodyweightWithWeight.length > 0) {
    console.log(`  Bodyweight exercises using REPS+WEIGHT (${bodyweightWithWeight.length}):`);
    console.log(`   (These might be correct if user can add weight, review manually):`);
    bodyweightWithWeight.slice(0, 10).forEach(ex => {
      console.log(`   • ${ex.name}`);
    });
    if (bodyweightWithWeight.length > 10) {
      console.log(`   ... and ${bodyweightWithWeight.length - 10} more`);
    }
    console.log('');
  }
  
  // Check for exercises with no type
  if (grouped.null.length > 0) {
    console.log(`❌  Exercises with NO measurement type (${grouped.null.length}):`);
    grouped.null.forEach(ex => {
      console.log(`   • ${ex.name} (${ex.category}, ${ex.equipment})`);
      issues.push(`UPDATE exercises SET measurement_type = 'reps_weight' WHERE id = '${ex.id}'; -- ${ex.name}`);
    });
    console.log('');
  }
  
  // Summary
  console.log('='.repeat(70));
  console.log('✅  VERIFICATION SUMMARY');
  console.log('='.repeat(70));
  console.log('');
  
  if (issues.length === 0) {
    console.log('✅  All exercises have appropriate measurement types!');
    console.log('✅  No issues found - ready to implement UI!');
  } else {
    console.log(`  Found ${issues.length} potential issues`);
    console.log('');
    console.log('=�  SQL Fix Script:');
    console.log('');
    console.log('-- Copy and run this in Supabase SQL Editor:');
    console.log('');
    issues.forEach(sql => console.log(sql));
  }
  console.log('');
  
  // Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    total_exercises: exercises.length,
    distribution: {
      reps_weight: grouped.reps_weight.length,
      time: grouped.time.length,
      time_distance: grouped.time_distance.length,
      time_weight: grouped.time_weight.length,
      reps_only: grouped.reps_only.length,
      assisted: grouped.assisted.length,
      null: grouped.null.length
    },
    issues_found: issues.length,
    all_exercises: exercises,
    grouped_exercises: grouped,
    fix_queries: issues
  };
  
  fs.writeFileSync(
    'scripts/measurement-verification-report.json',
    JSON.stringify(report, null, 2)
  );
  
  console.log('=�  Detailed report saved to: scripts/measurement-verification-report.json\n');
}

verifyMeasurementTypes();
