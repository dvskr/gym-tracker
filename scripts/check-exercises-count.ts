import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkCount() {
  const { count, error } = await supabase
    .from('exercises')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  console.log('📊 Total exercises in database:', count);
  process.exit(0);
}

checkCount();

