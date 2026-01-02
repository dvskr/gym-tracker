import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkBuckets() {
  console.log('🪣 Checking Storage Buckets...\n');
  
  // List all buckets
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  
  if (bucketsError) {
    console.error('Error listing buckets:', bucketsError.message);
    return;
  }
  
  console.log('Available buckets:');
  buckets?.forEach(b => {
    console.log(`  - ${b.name} (${b.public ? 'public' : 'private'})`);
  });
  
  console.log('\n📊 Detailed Bucket Analysis:\n');
  
  // Check exercise-gifs
  console.log('1️⃣ exercise-gifs bucket:');
  const { data: gifs, error: gifsError } = await supabase.storage
    .from('exercise-gifs')
    .list('', { limit: 1000 });
  
  if (gifsError) {
    console.error('   Error:', gifsError.message);
  } else {
    const gifFiles = gifs?.filter(f => f.name.endsWith('.gif')) || [];
    console.log(`   Total files: ${gifs?.length || 0}`);
    console.log(`   GIF files: ${gifFiles.length}`);
  }
  
  // Check exercise-thumbnails
  console.log('\n2️⃣ exercise-thumbnails bucket:');
  const { data: thumbs, error: thumbsError } = await supabase.storage
    .from('exercise-thumbnails')
    .list('', { limit: 1000 });
  
  if (thumbsError) {
    console.error('   Error:', thumbsError.message);
    console.error('   Full error:', JSON.stringify(thumbsError, null, 2));
  } else {
    const pngFiles = thumbs?.filter(f => f.name.endsWith('.png')) || [];
    const jpgFiles = thumbs?.filter(f => f.name.endsWith('.jpg')) || [];
    console.log(`   Total files: ${thumbs?.length || 0}`);
    console.log(`   PNG files: ${pngFiles.length}`);
    console.log(`   JPG files: ${jpgFiles.length}`);
  }
  
  // Try to upload a test file
  console.log('\n🧪 Testing Upload to exercise-thumbnails...');
  const testData = Buffer.from('test');
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('exercise-thumbnails')
    .upload('test-upload.txt', testData, { upsert: true });
  
  if (uploadError) {
    console.error('   ❌ Upload FAILED:', uploadError.message);
  } else {
    console.log('   ✅ Upload successful');
    // Clean up
    await supabase.storage.from('exercise-thumbnails').remove(['test-upload.txt']);
  }
}

checkBuckets();

