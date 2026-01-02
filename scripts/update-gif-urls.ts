import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

async function updateUrls() {
  console.log('=� Updating database with Supabase GIF URLs...\n');

  // Check if URL mappings file exists
  if (!fs.existsSync('scripts/supabase-urls.json')) {
    console.error('❌ Error: supabase-urls.json not found');
    console.error('   Run "npm run upload:gifs" first to generate this file\n');
    return;
  }

  // Load URL mappings
  const mappings = JSON.parse(
    fs.readFileSync('scripts/supabase-urls.json', 'utf-8')
  );

  console.log(`Updating ${mappings.length} exercise URLs...\n`);

  let updated = 0;
  let failed = 0;
  const failedUpdates: any[] = [];

  // Update in batches to avoid overwhelming the connection
  const BATCH_SIZE = 10;

  for (let i = 0; i < mappings.length; i += BATCH_SIZE) {
    const batch = mappings.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (mapping: any) => {
        const { error } = await supabase
          .from('exercises')
          .update({ gif_url: mapping.url })
          .eq('id', mapping.id);

        if (error) {
          console.error(`❌ ${mapping.name}: ${error.message}`);
          failed++;
          failedUpdates.push({
            id: mapping.id,
            name: mapping.name,
            error: error.message
          });
        } else {
          updated++;
        }
      })
    );

    // Progress indicator
    if ((i + BATCH_SIZE) % 50 === 0 || i + BATCH_SIZE >= mappings.length) {
      console.log(`✅ ${Math.min(i + BATCH_SIZE, mappings.length)}/${mappings.length} processed...`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ DATABASE URLS UPDATED');
  console.log('='.repeat(60));
  console.log(`Success: ${updated}`);
  console.log(`Failed: ${failed}\n`);

  if (failed > 0) {
    fs.writeFileSync(
      'scripts/failed-url-updates.json',
      JSON.stringify(failedUpdates, null, 2)
    );
    console.log('�  Failed updates saved to: scripts/failed-url-updates.json\n');
  }

  // Verify
  console.log('Verifying update...');
  const { count } = await supabase
    .from('exercises')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .like('gif_url', '%supabase%');

  console.log(`\n✅ ${count} active exercises now have Supabase GIF URLs`);
}

updateUrls();

