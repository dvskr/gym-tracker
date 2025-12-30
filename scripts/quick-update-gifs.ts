import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
);

// Get all GIF files and match them to exercises
const exercises = [
  { id: "565139de-a8a1-47b2-9bbf-122385a18bff", name: "hammer curl cable", external_id: "0165" },
  { id: "e8bf35be-ab80-435a-a810-3d4c83dca824", name: "hammer curl dumbbell", external_id: "0312" },
  { id: "3aaae27f-1f80-4d6f-a36e-ece2171c0e10", name: "box jump", external_id: "1374" },
  { id: "8a59691d-e878-4b8d-99b0-e5342767e72b", name: "jump rope", external_id: "2612" },
  { id: "75ba71c8-140a-4d8a-89cf-989dca81446a", name: "lat pulldown cable", external_id: "2330" },
  { id: "27ea51dc-14dd-4897-86b7-266be3e4a9c7", name: "leg extension machine", external_id: "0585" },
  { id: "ef1cc00f-59a5-4e64-afc3-de2467ca9d26", name: "lying leg curl machine", external_id: "0586" },
  { id: "e362c78d-7b77-445d-9294-0a21bd703c7e", name: "trap bar deadlift", external_id: "0811" },
  { id: "5204b38b-4f72-4e5b-932b-73484f7bed31", name: "cable crunch", external_id: "0175" },
  { id: "fea7b7f6-7cd1-4b20-a1c6-f17406a34c7d", name: "reverse fly dumbbell", external_id: "0383" },
  { id: "c8f38ac5-4e91-450d-8d4d-1a37e3f64eef", name: "russian twist", external_id: "0014" },
  { id: "f4e30e01-0f76-42de-a5b1-a1d1d8c4a8e6", name: "mountain climber", external_id: "0630" },
  { id: "d5deb1e6-3e81-4d20-8ea2-9654e7cbd9c8", name: "oblique crunch", external_id: "0635" },
  { id: "58e9da13-c857-42ae-9d20-6e26e2b59e72", name: "single leg bridge", external_id: "3645" },
  { id: "5feee8a0-baf2-4d8f-9d24-7f68f87d1456", name: "pistol squat", external_id: "0544" },
  { id: "6caa38c2-609d-4858-b06c-1369fd1f831d", name: "muscle up", external_id: "0558" },
  { id: "080fcc35-542c-4e5b-9a01-adea7a0771c9", name: "walking", external_id: "1460" },
  { id: "4d13d4bf-c8ae-4ca9-955e-e5faed0a9ef7", name: "yoga", external_id: "1494" },
  { id: "31aa8f6d-c2ac-4f82-9f79-4d4a3b24d1e2", name: "wrist roller", external_id: "0859" },
  { id: "49ee1f8a-abdd-4f7a-be04-dc2cf0916681", name: "kettlebell swing", external_id: "0549" },
  { id: "d5b92408-c0ed-41ca-80a8-d84c11dc5ec7", name: "kettlebell turkish get up", external_id: "0551" },
  { id: "80bbfc4c-0906-4a4c-8c06-cae86f99dd1f", name: "seated row cable", external_id: "0861" },
  { id: "f5a8858a-2e65-4d62-9a6c-58e76c6e8a70", name: "seated row machine", external_id: "1350" },
  { id: "c4ed1cd8-c6f3-4f3b-a14c-5b6d7b98b3ba", name: "shoulder press machine", external_id: "0603" },
  { id: "be4c1e3a-bc5e-4c02-8b55-ad7f73d1d48d", name: "clean barbell", external_id: "0028" },
  { id: "d1c79896-7b8f-4f3e-9fe2-7d0cc0ff4c42", name: "rack pull", external_id: "0074" },
  { id: "a305025b-06ef-45c5-ba8c-46772f80cb51", name: "chest press machine", external_id: "0576" },
  { id: "2e0c1088-f85b-411c-b478-37f46c7cc3fd", name: "thruster barbell", external_id: "3305" },
  { id: "bad22c3a-a7b7-4d3a-b0cd-f07a5c4b46da", name: "thruster kettlebell", external_id: "0550" },
];

async function updateDatabase() {
  console.log('🔄 Updating database with GIF info for 29 exercises...\n');
  
  // Get list of newly downloaded GIF files
  const gifDir = 'exercise-gifs';
  const allGifs = fs.readdirSync(gifDir).filter(f => f.endsWith('.gif'));
  const newGifs = allGifs.slice(344); // Get the 29 new ones
  
  console.log(`Found ${newGifs.length} new GIF files\n`);
  
  let updated = 0;
  let failed = 0;
  
  for (let i = 0; i < exercises.length && i < newGifs.length; i++) {
    const exercise = exercises[i];
    const gifFilename = newGifs[i];
    const gifUrl = `https://${process.env.EXPO_PUBLIC_SUPABASE_URL!.split('//')[1]}/storage/v1/object/public/exercise-gifs/${gifFilename}`;
    
    try {
      const { error } = await supabase
        .from('exercises')
        .update({ 
          external_id: exercise.external_id,
          gif_url: gifUrl
        })
        .eq('id', exercise.id);
      
      if (error) {
        console.error(`❌ ${exercise.name}: ${error.message}`);
        failed++;
      } else {
        updated++;
        console.log(`✅ ${exercise.name} → ${gifFilename}`);
      }
      
    } catch (err: any) {
      console.error(`❌ ${exercise.name}: ${err.message}`);
      failed++;
    }
  }
  
  // Verify
  const { count } = await supabase
    .from('exercises')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .not('gif_url', 'is', null);
  
  console.log('\n' + '='.repeat(60));
  console.log('UPDATE COMPLETE');
  console.log('='.repeat(60));
  console.log(`Updated: ${updated}`);
  console.log(`Failed: ${failed}`);
  console.log(`\n📊 Total exercises with GIFs in DB: ${count}`);
  console.log(`Expected: 344 + 29 = 373\n`);
}

updateDatabase();

