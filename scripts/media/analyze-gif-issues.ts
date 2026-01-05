import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function analyzeGifIssues() {
  console.log('');
  console.log('= DETAILED GIF ANALYSIS');
  console.log('═'.repeat(70));
  console.log('');

  // Get all active exercises
  const { data: exercises } = await supabase
    .from('exercises')
    .select('id, name, external_id, gif_url')
    .eq('is_active', true)
    .order('name');

  // Get all storage files
  const { data: files } = await supabase.storage
    .from('exercise-gifs')
    .list('', { limit: 1000 });

  const storageFilenames = new Set(files?.filter(f => f.name.endsWith('.gif')).map(f => f.name) || []);

  // Categorize exercises
  const withNull = exercises?.filter(e => !e.gif_url) || [];
  const withGifUrl = exercises?.filter(e => e.gif_url) || [];
  
  // Of those with gif_url, check if file exists
  const withWorkingGif: any[] = [];
  const withBrokenGif: any[] = [];

  withGifUrl.forEach(ex => {
    const filename = ex.gif_url.split('/').pop();
    if (filename && storageFilenames.has(filename)) {
      withWorkingGif.push(ex);
    } else {
      withBrokenGif.push(ex);
    }
  });

  console.log('=� EXERCISE BREAKDOWN');
  console.log('═'.repeat(70));
  console.log(`Total active exercises:                 ${exercises?.length}`);
  console.log(`  ✅ With working GIF:                  ${withWorkingGif.length}`);
  console.log(`  ❌ With broken gif_url:                ${withBrokenGif.length}`);
  console.log(`    With NULL gif_url:                 ${withNull.length}`);
  console.log('');

  if (withNull.length > 0) {
    console.log('�  EXERCISES WITH NULL GIF_URL:');
    console.log('═'.repeat(70));
    withNull.forEach(ex => {
      console.log(`  - ${ex.name}`);
      console.log(`    ID: ${ex.id}`);
      console.log(`    External ID: ${ex.external_id || 'N/A'}`);
      console.log('');
    });
  }

  if (withBrokenGif.length > 0) {
    console.log('❌ EXERCISES WITH BROKEN GIF_URL (file missing in storage):');
    console.log('═'.repeat(70));
    withBrokenGif.forEach(ex => {
      const filename = ex.gif_url.split('/').pop();
      console.log(`  - ${ex.name}`);
      console.log(`    Expected file: ${filename}`);
      console.log(`    External ID: ${ex.external_id || 'N/A'}`);
      console.log('');
    });
  }

  console.log('═'.repeat(70));
  console.log(' TOTAL ISSUES: ' + (withNull.length + withBrokenGif.length));
  console.log('═'.repeat(70));
  console.log('');
}

analyzeGifIssues();
