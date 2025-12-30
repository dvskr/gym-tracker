import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

// Try service role key first, fall back to anon key
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ Missing Supabase key in .env file');
  console.error('   Need either EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY or EXPO_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  supabaseKey
);

async function updateDatabase() {
  console.log('📝 Marking 344 exercises as active...\n');

  // Load selected exercises
  const selected = JSON.parse(
    fs.readFileSync('scripts/selected-400-exercises.json', 'utf-8')
  );

  const selectedIds = selected.exercises.map((ex: any) => ex.id);
  console.log(`Found ${selectedIds.length} exercises to activate\n`);

  // Mark selected as active (in batches of 100)
  const batchSize = 100;
  let totalUpdated = 0;

  for (let i = 0; i < selectedIds.length; i += batchSize) {
    const batch = selectedIds.slice(i, i + batchSize);
    
    const { error, count } = await supabase
      .from('exercises')
      .update({ is_active: true })
      .in('id', batch)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error(`❌ Error on batch ${Math.floor(i / batchSize) + 1}:`, error);
    } else {
      totalUpdated += count || batch.length;
      console.log(`✅ Batch ${Math.floor(i / batchSize) + 1}: ${batch.length} exercises`);
    }
  }

  // Verify
  console.log('\n' + '='.repeat(60));
  
  const { count: activeCount } = await supabase
    .from('exercises')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  console.log('✅ DATABASE UPDATED');
  console.log('='.repeat(60));
  console.log(`Expected: ${selectedIds.length} active`);
  console.log(`Actual:   ${activeCount} active`);
  
  if (activeCount === selectedIds.length) {
    console.log('✅ Perfect match!\n');
  } else {
    console.log(`⚠️  Mismatch of ${Math.abs(activeCount! - selectedIds.length)} exercises\n`);
  }
}

updateDatabase();

