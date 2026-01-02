import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyExerciseLibrary() {
  console.log('= Verifying Exercise Library...\n');
  
  // Total counts
  const { count: totalCount } = await supabase
    .from('exercises')
    .select('*', { count: 'exact', head: true });
  
  const { count: activeCount } = await supabase
    .from('exercises')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);
  
  const { count: withGifCount } = await supabase
    .from('exercises')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .not('gif_url', 'is', null);
  
  const { count: withThumbnailCount } = await supabase
    .from('exercises')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .not('thumbnail_url', 'is', null);
  
  const { count: withMeasurementCount } = await supabase
    .from('exercises')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .not('measurement_type', 'is', null);
  
  console.log('=� EXERCISE LIBRARY SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total Exercises:        ${totalCount}`);
  console.log(`Active Exercises:       ${activeCount} (${((activeCount || 0) / (totalCount || 1) * 100).toFixed(1)}%)`);
  console.log(`With GIF:               ${withGifCount}`);
  console.log(`With Thumbnail:         ${withThumbnailCount}`);
  console.log(`With Measurement Type:  ${withMeasurementCount}`);
  
  // By equipment
  const { data: byEquipment } = await supabase
    .from('exercises')
    .select('equipment')
    .eq('is_active', true);
  
  const equipmentCounts: Record<string, number> = {};
  byEquipment?.forEach(e => {
    const eq = e.equipment || 'unknown';
    equipmentCounts[eq] = (equipmentCounts[eq] || 0) + 1;
  });
  
  console.log('\n=� ACTIVE BY EQUIPMENT');
  console.log('='.repeat(50));
  Object.entries(equipmentCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([eq, count]) => {
      console.log(`${eq.padEnd(25)} ${count}`);
    });
  
  // Check for issues
  console.log('\n�  POTENTIAL ISSUES');
  console.log('='.repeat(50));
  
  // Active without GIF
  const { count: noGifCount } = await supabase
    .from('exercises')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .is('gif_url', null);
    
  const { data: noGif } = await supabase
    .from('exercises')
    .select('name, equipment')
    .eq('is_active', true)
    .is('gif_url', null)
    .limit(10);
  
  if (noGif && noGif.length > 0) {
    console.log(`\n❌ Active exercises without GIF (${noGifCount} total, showing 10):`);
    noGif.forEach(e => console.log(`   - ${e.name} (${e.equipment})`));
  } else {
    console.log('\n✅ All active exercises have GIF URLs');
  }
  
  // Active without measurement type
  const { count: noMeasurementCount } = await supabase
    .from('exercises')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .is('measurement_type', null);
    
  const { data: noMeasurement } = await supabase
    .from('exercises')
    .select('name, equipment')
    .eq('is_active', true)
    .is('measurement_type', null)
    .limit(10);
  
  if (noMeasurement && noMeasurement.length > 0) {
    console.log(`\n❌ Active exercises without measurement type (${noMeasurementCount} total, showing 10):`);
    noMeasurement.forEach(e => console.log(`   - ${e.name} (${e.equipment})`));
  } else {
    console.log('✅ All active exercises have measurement types');
  }
  
  // Verify key exercises exist
  console.log('\n✅ KEY EXERCISE VERIFICATION');
  console.log('='.repeat(50));
  
  const keyExercises = [
    'barbell bench press',
    'barbell full squat',
    'barbell deadlift',
    'smith bench press',
    'smith squat',
    'sled 45° leg press',
    'cable pushdown',
    'push-up',
    'pull-up',
  ];
  
  for (const name of keyExercises) {
    const { data } = await supabase
      .from('exercises')
      .select('name, is_active, gif_url, measurement_type')
      .eq('name', name)
      .single();
    
    if (data) {
      const status = data.is_active ? '✅' : '❌';
      const gif = data.gif_url ? '' : '⚪';
      const mt = data.measurement_type ? '=�' : '⚪';
      console.log(`${status} ${gif} ${mt} ${name}`);
    } else {
      console.log(`❓ ⚪ ⚪ ${name} (not found)`);
    }
  }
  
  console.log('\nLegend: ✅=Active ❌=Inactive =Has GIF =�=Has Measurement Type');
  console.log('\n✅ Verification complete!');
}

verifyExerciseLibrary().catch(console.error);

