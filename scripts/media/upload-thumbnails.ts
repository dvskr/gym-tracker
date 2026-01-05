import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const THUMBNAIL_DIR = 'exercise-thumbnails';
const BUCKET_NAME = 'exercise-thumbnails';

async function uploadThumbnails() {
  console.log('=� Uploading 373 thumbnails to Supabase (replacing old ones)...\n');
  
  // Check if bucket exists, create if not
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);
  
  if (!bucketExists) {
    console.log('Creating exercise-thumbnails bucket...');
    const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 1024 * 1024, // 1MB limit
    });
    
    if (createError) {
      console.error('Error creating bucket:', createError);
      return;
    }
    console.log('✅ Bucket created\n');
  } else {
    console.log('✅ Bucket already exists\n');
  }
  
  // Get all thumbnail files
  const thumbnailFiles = fs.readdirSync(THUMBNAIL_DIR)
    .filter(file => file.endsWith('.png'));
  
  console.log(`Found ${thumbnailFiles.length} thumbnail files\n`);
  
  let uploaded = 0;
  let failed = 0;
  
  for (const filename of thumbnailFiles) {
    try {
      const filepath = path.join(THUMBNAIL_DIR, filename);
      
      // Upload thumbnail (upsert will replace existing files)
      const fileBuffer = fs.readFileSync(filepath);
      const { error: uploadError } = await supabase
        .storage
        .from(BUCKET_NAME)
        .upload(filename, fileBuffer, {
          contentType: 'image/png',
          upsert: true // Replace existing files
        });
      
      if (uploadError) {
        console.error(`❌ ${filename}: ${uploadError.message}`);
        failed++;
        continue;
      }
      
      uploaded++;
      if (uploaded % 25 === 0) {
        console.log(`✅ Uploaded ${uploaded}/${thumbnailFiles.length} thumbnails...`);
      }
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 50));
      
    } catch (err: any) {
      console.error(`❌ ${filename}: ${err.message}`);
      failed++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('UPLOAD COMPLETE');
  console.log('='.repeat(60));
  console.log(`Uploaded: ${uploaded}`);
  console.log(`Failed: ${failed}`);
  console.log(`\n= Total in Supabase: ${uploaded} thumbnails`);
  
  // Calculate actual size based on new thumbnail size
  const totalSize = thumbnailFiles.reduce((sum, file) => {
    const stats = fs.statSync(path.join(THUMBNAIL_DIR, file));
    return sum + stats.size;
  }, 0);
  
  console.log(`= Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`= Average size: ${(totalSize / thumbnailFiles.length / 1024).toFixed(2)} KB per thumbnail\n`);
  
  // Show sample URLs
  if (uploaded > 0) {
    const sampleFile = thumbnailFiles[0];
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!.replace('https://', '');
    console.log('=� Sample thumbnail URL:');
    console.log(`https://${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${sampleFile}\n`);
  }
}

uploadThumbnails();
