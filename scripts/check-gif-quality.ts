import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
);

const GIF_DIR = 'exercise-gifs';

async function checkGifQuality() {
  console.log('= Checking GIF quality...\n');
  
  const gifFiles = fs.readdirSync(GIF_DIR).filter(f => f.endsWith('.gif'));
  console.log(`Found ${gifFiles.length} GIF files\n`);
  
  const results = {
    hd: [] as any[],
    sd: [] as any[],
    errors: [] as string[]
  };
  
  for (const file of gifFiles) {
    try {
      const filepath = path.join(GIF_DIR, file);
      const metadata = await sharp(filepath).metadata();
      
      const width = metadata.width || 0;
      const height = metadata.height || 0;
      const sizeMB = fs.statSync(filepath).size / 1024 / 1024;
      
      const quality = width >= 1000 ? 'HD (1080px)' : 'SD (360px)';
      const entry = {
        filename: file,
        width,
        height,
        sizeMB: Number(sizeMB.toFixed(2)),
        quality
      };
      
      if (width >= 1000) {
        results.hd.push(entry);
      } else {
        results.sd.push(entry);
      }
      
    } catch (err: any) {
      results.errors.push(file);
    }
  }
  
  console.log('='.repeat(60));
  console.log('=� GIF QUALITY REPORT');
  console.log('='.repeat(60));
  console.log(`\n✅ HD Quality (1080px): ${results.hd.length} GIFs`);
  console.log(`❌ SD Quality (360px): ${results.sd.length} GIFs`);
  console.log(`�  Errors: ${results.errors.length} files\n`);
  
  if (results.sd.length > 0) {
    console.log('Sample SD GIFs (need upgrading):');
    results.sd.slice(0, 10).forEach(gif => {
      console.log(`  ${gif.filename}: ${gif.width}x${gif.height} (${gif.sizeMB} MB)`);
    });
    if (results.sd.length > 10) {
      console.log(`  ... and ${results.sd.length - 10} more`);
    }
  }
  
  // Get external IDs for SD GIFs
  console.log('\n= Finding external IDs for SD GIFs...\n');
  
  const sdFilenames = results.sd.map(gif => gif.filename);
  
  // Query database for exercises with these GIF filenames
  const { data: exercises } = await supabase
    .from('exercises')
    .select('id, name, external_id, gif_url')
    .eq('is_active', true)
    .not('gif_url', 'is', null);
  
  const needsUpgrade = exercises?.filter(ex => {
    const filename = ex.gif_url?.split('/').pop();
    return filename && sdFilenames.includes(filename);
  }) || [];
  
  const withExternalId = needsUpgrade.filter(ex => ex.external_id);
  const withoutExternalId = needsUpgrade.filter(ex => !ex.external_id);
  
  console.log(`=� SD GIFs to upgrade: ${needsUpgrade.length}`);
  console.log(`✅ With external_id (can upgrade): ${withExternalId.length}`);
  console.log(`❌ Without external_id (need manual): ${withoutExternalId.length}\n`);
  
  // Save list of exercises to upgrade
  fs.writeFileSync(
    'scripts/gifs-to-upgrade.json',
    JSON.stringify({
      summary: {
        total: results.sd.length,
        canUpgrade: withExternalId.length,
        needManual: withoutExternalId.length
      },
      toUpgrade: withExternalId,
      needManual: withoutExternalId
    }, null, 2)
  );
  
  console.log('=� Saved upgrade list to: scripts/gifs-to-upgrade.json\n');
  
  return {
    totalSD: results.sd.length,
    canUpgrade: withExternalId.length
  };
}

checkGifQuality();

