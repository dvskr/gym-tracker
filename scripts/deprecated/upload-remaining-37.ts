import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

const DOWNLOAD_DIR = path.join(__dirname, '../exercise-gifs');
const BUCKET_NAME = 'exercise-gifs';

// The 37 exercises that failed to upload
const remainingIds = [
  '1a89f96f-cbf8-4524-84ef-cfd9caba290d',
  '07af85f7-d184-4897-a1d9-ec0acef62deb',
  '3c3ce9ff-a4dd-484c-ad0a-31a0d8c19ab7',
  '612e6bb6-9f0d-4829-b7f2-991420bc1930',
  'eeee9400-fb28-4eb9-b333-4b99dcba56af',
  '6edda779-773c-4dbc-9eff-9224f96ea275',
  'c99e142c-dae1-40df-aa10-f012a881e517',
  '88154744-e25d-489f-a16b-7f4966d4e715',
  'e680e2de-1648-4143-8688-964b817159d8',
  'e7c9bf82-4187-440e-9179-61b58d85626a',
  '586bbf42-1a51-4262-8cb2-f26e691af17f',
  '8fc01d04-4997-4a6f-abfb-e6d4c311f57e',
  'e362b57b-fe40-4d39-b061-6b3c0d3c31a9',
  '3f021d8d-ea4f-4d04-90fa-2e56399a7f40',
  '856aa69b-dd3c-43d0-baf7-01f8f58bfc70',
  '1cfea776-c464-418a-84dd-c68bf0c2f35b',
  'e745c2de-b835-4c9f-bb64-ee0db9cead87',
  '09f9cedf-3a20-46d9-b282-51c5c12ffee0',
  '288f49fd-5056-41c9-b6d3-f41f46ccaf48',
  '49a79ac1-2224-43ac-84b3-e7e5df86d87b',
  '342037be-2fbb-40a5-8dc1-1665eea37e59',
  '28bee6b8-95da-4e1f-95c9-dd71bc4909c9',
  '55a13df9-4cff-446c-9b8a-c7de2ebb7371',
  '572883b4-9ddf-4ee0-90da-51fa60cba8dc',
  '228571ed-f178-4d4e-afbc-a696f6e90745',
  '64c23694-f5e4-4567-b14b-d90f883717ef',
  '13c34d5f-6cf0-4bb8-81a3-d3cad94e8f14',
  '7284e525-b186-421d-9271-6d7a71c0c1c4',
  '138d0530-3603-48bb-99c5-e5d49277d1f6',
  '95985af5-dc04-4d71-a329-3eedaa3ab56a',
  '19de968d-2a21-4152-aaea-573e1b74b40c',
  '1b6ed88a-b521-470e-bb79-f586187abb43',
  '7d2de010-5a09-49f1-8253-d142c02aa81d',
  '5e26d998-0f2a-42a8-9933-3740c0753868',
  '8df94312-feaf-4356-84d7-e536b3cd922a',
  '62e94432-d415-48d1-9a65-32aa020e6aea',
  'b63136b7-627d-4d78-9107-1cd7a16d58a4',
];

async function uploadGif(exerciseId: string): Promise<string | null> {
  const filename = `${exerciseId}.gif`;
  const filepath = path.join(DOWNLOAD_DIR, filename);

  if (!fs.existsSync(filepath)) {
    console.log(`  Skip: ${filename} (file not found)`);
    return null;
  }

  try {
    const fileBuffer = fs.readFileSync(filepath);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filename, fileBuffer, {
        contentType: 'image/gif',
        upsert: true // Overwrite if exists
      });

    if (error) {
      console.error(`❌ ${filename}: ${error.message}`);
      return null;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filename);

    console.log(`✅ ${filename}`);
    return publicUrl;

  } catch (err: any) {
    console.error(`❌ ${filename}: ${err.message}`);
    return null;
  }
}

async function uploadRemaining() {
  console.log('  Uploading remaining 37 GIFs to Supabase Storage...\n');

  let completed = 0;
  let failed = 0;
  const urlMappings: any[] = [];

  // Get exercise names
  const { data: exercises } = await supabase
    .from('exercises')
    .select('id, name')
    .in('id', remainingIds);

  const exerciseMap = new Map(exercises?.map(ex => [ex.id, ex.name]) || []);

  // Upload one at a time
  for (const id of remainingIds) {
    const publicUrl = await uploadGif(id);

    if (publicUrl) {
      completed++;
      urlMappings.push({
        id,
        name: exerciseMap.get(id) || 'Unknown',
        url: publicUrl
      });
    } else {
      failed++;
    }

    // Small delay (respect rate limits)
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Save URL mappings
  const existingMappings = JSON.parse(
    fs.readFileSync('scripts/supabase-urls.json', 'utf-8')
  );

  const allMappings = [...existingMappings, ...urlMappings];

  fs.writeFileSync(
    'scripts/supabase-urls.json',
    JSON.stringify(allMappings, null, 2)
  );

  console.log('\n' + '='.repeat(60));
  console.log('= UPLOAD COMPLETE');
  console.log('='.repeat(60));
  console.log(`✅ Success: ${completed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`\n= Updated URL mappings: scripts/supabase-urls.json\n`);

  if (completed > 0) {
    console.log('= Next: Update database URLs');
    console.log('   Run: npm run update:remaining-urls\n');
  }
}

uploadRemaining();
