import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkDatabase() {
  console.log('=� Checking Database Exercises...\n');
  
  // Count active exercises
  const { count: activeCount } = await supabase
    .from('exercises')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);
  
  // Count with gif_url
  const { count: hasGifUrl } = await supabase
    .from('exercises')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .not('gif_url', 'is', null);
  
  // Get sample gif_urls
  const { data: samples } = await supabase
    .from('exercises')
    .select('name, external_id, gif_url')
    .eq('is_active', true)
    .not('gif_url', 'is', null)
    .order('name')
    .limit(10);
  
  console.log('=� DATABASE STATISTICS');
  console.log('======================');
  console.log('Active exercises:', activeCount);
  console.log('Has gif_url:', hasGifUrl);
  console.log('Missing gif_url:', (activeCount || 0) - (hasGifUrl || 0));
  
  console.log('\n=� Sample gif_url values:');
  samples?.forEach(ex => {
    const filename = ex.gif_url?.split('/').pop() || 'N/A';
    console.log(`  ${ex.name} (${ex.external_id}): ${filename}`);
  });
  
  // Check for empty gif_url
  const { data: emptyGifs } = await supabase
    .from('exercises')
    .select('name, external_id, gif_url')
    .eq('is_active', true)
    .eq('gif_url', '');
  
  if (emptyGifs && emptyGifs.length > 0) {
    console.log('\n Exercises with EMPTY gif_url:', emptyGifs.length);
    emptyGifs.slice(0, 5).forEach(ex => {
      console.log(`  - ${ex.name} (${ex.external_id})`);
    });
  }
}

checkDatabase();
