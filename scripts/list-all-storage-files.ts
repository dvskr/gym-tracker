import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function listAllStorageFiles() {
  console.log('📂 LISTING ALL STORAGE FILES');
  console.log('═'.repeat(80));
  console.log('');

  const { data: files, error } = await supabase.storage
    .from('exercise-gifs')
    .list('', { limit: 1000 });

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  const gifFiles = files?.filter(f => f.name.endsWith('.gif')) || [];
  
  console.log(`Total GIF files in storage: ${gifFiles.length}\n`);

  // Separate by pattern
  const numericFiles = gifFiles.filter(f => /^\d+\.gif$/.test(f.name));
  const uuidFiles = gifFiles.filter(f => /^[a-f0-9-]{36}\.gif$/.test(f.name));
  const otherFiles = gifFiles.filter(f => 
    !/^\d+\.gif$/.test(f.name) && 
    !/^[a-f0-9-]{36}\.gif$/.test(f.name)
  );

  console.log('FILE PATTERNS:');
  console.log('─'.repeat(80));
  console.log(`Numeric (0001.gif): ${numericFiles.length}`);
  console.log(`UUID (abc-123.gif): ${uuidFiles.length}`);
  console.log(`Other patterns: ${otherFiles.length}`);
  console.log('');

  if (otherFiles.length > 0) {
    console.log('OTHER PATTERN FILES (might be original names):');
    console.log('─'.repeat(80));
    otherFiles.sort().forEach(f => console.log(`  ${f.name}`));
    console.log('');
  }

  // Save all filenames
  const allFilenames = gifFiles.map(f => f.name).sort();
  fs.writeFileSync(
    path.join(__dirname, 'storage-files.txt'),
    allFilenames.join('\n')
  );

  fs.writeFileSync(
    path.join(__dirname, 'storage-files.json'),
    JSON.stringify({
      total: gifFiles.length,
      numeric: numericFiles.map(f => f.name).sort(),
      uuid: uuidFiles.map(f => f.name).sort(),
      other: otherFiles.map(f => f.name).sort()
    }, null, 2)
  );

  console.log('✅ Files saved:');
  console.log('   - scripts/storage-files.txt (line-by-line list)');
  console.log('   - scripts/storage-files.json (categorized)');
  console.log('');
}

listAllStorageFiles();

