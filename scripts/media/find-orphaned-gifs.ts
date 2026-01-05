import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function findOrphanedGifs() {
  console.log('');
  console.log('= CHECKING FOR ORPHANED/UNUSED GIFS');
  console.log('═'.repeat(70));
  console.log('');

  // Step 1: Get all active exercises and their gif_urls
  console.log('=� Fetching active exercises from database...');
  const { data: exercises } = await supabase
    .from('exercises')
    .select('id, name, gif_url')
    .eq('is_active', true);

  console.log(`✅ Found ${exercises?.length || 0} active exercises`);

  // Extract filenames from gif_urls
  const usedFilenames = new Set<string>();
  exercises?.forEach(ex => {
    if (ex.gif_url) {
      const filename = ex.gif_url.split('/').pop();
      if (filename) {
        usedFilenames.add(filename);
      }
    }
  });

  console.log(`✅ ${usedFilenames.size} exercises have gif_url pointing to files`);
  console.log('');

  // Step 2: Get all GIF files from storage
  console.log('= Fetching GIF files from storage...');
  const { data: files } = await supabase.storage
    .from('exercise-gifs')
    .list('', { limit: 1000 });

  const allGifs = files?.filter(f => f.name.endsWith('.gif')) || [];
  console.log(`✅ Found ${allGifs.length} GIF files in storage`);
  console.log('');

  // Step 3: Find orphaned files
  const orphanedFiles = allGifs.filter(f => !usedFilenames.has(f.name));
  const usedFiles = allGifs.filter(f => usedFilenames.has(f.name));

  console.log('═'.repeat(70));
  console.log('=� RESULTS');
  console.log('═'.repeat(70));
  console.log('');
  console.log('✅ Used GIFs (referenced by active exercises):', usedFiles.length);
  console.log('�  Orphaned GIFs (not used by any active exercise):', orphanedFiles.length);
  console.log('');

  if (orphanedFiles.length > 0) {
    console.log('=  ORPHANED FILES (these can be deleted):');
    console.log('═'.repeat(70));
    
    // Calculate total size
    const totalSize = orphanedFiles.reduce((sum, f) => sum + (f.metadata?.size || 0), 0);
    const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2);
    
    console.log(`Total orphaned files: ${orphanedFiles.length}`);
    console.log(`Total size: ${totalSizeMB} MB`);
    console.log('');

    if (orphanedFiles.length <= 50) {
      console.log('Files:');
      orphanedFiles.forEach(f => {
        const sizeMB = ((f.metadata?.size || 0) / 1024 / 1024).toFixed(2);
        console.log(`  - ${f.name} (${sizeMB} MB)`);
      });
    } else {
      console.log(`First 20 files:`);
      orphanedFiles.slice(0, 20).forEach(f => {
        const sizeMB = ((f.metadata?.size || 0) / 1024 / 1024).toFixed(2);
        console.log(`  - ${f.name} (${sizeMB} MB)`);
      });
      console.log(`  ... and ${orphanedFiles.length - 20} more`);
    }
  } else {
    console.log('✅ No orphaned files found! All GIFs in storage are being used.');
  }

  console.log('');
  console.log('═'.repeat(70));
  console.log('= SUMMARY');
  console.log('═'.repeat(70));
  console.log(`Total GIFs in storage:              ${allGifs.length}`);
  console.log(`Used by active exercises:           ${usedFiles.length}`);
  console.log(`Orphaned (can be deleted):          ${orphanedFiles.length}`);
  console.log(`Active exercises without GIFs:      ${exercises!.length - usedFilenames.size}`);
  console.log('');
}

findOrphanedGifs();
