import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Use 1080p GIFs if available
const GIF_DIR_ORIGINAL = path.join(process.cwd(), 'exercise-gifs');
const GIF_DIR_1080P = path.join(process.cwd(), 'exercise-gifs-1080p');
const THUMBNAIL_DIR = path.join(process.cwd(), 'exercise-thumbnails');

const GIF_BUCKET = 'exercise-gifs';
const THUMBNAIL_BUCKET = 'exercise-thumbnails';

// Determine which GIF directory to use (prefer 1080p)
function getGifDirectory(): string {
  if (fs.existsSync(GIF_DIR_1080P)) {
    const files = fs.readdirSync(GIF_DIR_1080P).filter(f => f.endsWith('.gif'));
    if (files.length > 0) {
      console.log('✅ Using 1080p GIFs from exercise-gifs-1080p/');
      return GIF_DIR_1080P;
    }
  }
  console.log('9  Using original GIFs from exercise-gifs/');
  return GIF_DIR_ORIGINAL;
}

async function ensureBucketExists(bucketName: string) {
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some(b => b.name === bucketName);
  
  if (!exists) {
    const { error } = await supabase.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: 20971520, // 20MB for 1080p GIFs
    });
    if (error && !error.message.includes('already exists')) {
      throw new Error(`Failed to create bucket: ${error.message}`);
    }
    console.log(`✅ Created bucket: ${bucketName}`);
  }
}

async function uploadFile(
  bucketName: string,
  localPath: string,
  remotePath: string
): Promise<{ success: boolean; url?: string; size?: number }> {
  try {
    const fileBuffer = fs.readFileSync(localPath);
    const contentType = localPath.endsWith('.gif') ? 'image/gif' : 'image/jpeg';
    
    const { error } = await supabase.storage
      .from(bucketName)
      .upload(remotePath, fileBuffer, {
        contentType,
        upsert: true,
        cacheControl: '31536000', // 1 year cache for static assets
      });
    
    if (error) {
      return { success: false };
    }
    
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(remotePath);
    
    return { success: true, url: urlData.publicUrl, size: fileBuffer.length };
  } catch {
    return { success: false };
  }
}

async function uploadDirectory(
  sourceDir: string,
  bucketName: string,
  extension: string
): Promise<{ uploaded: number; failed: number; totalSize: number; urlMap: Map<string, string> }> {
  const result = { uploaded: 0, failed: 0, totalSize: 0, urlMap: new Map<string, string>() };
  
  if (!fs.existsSync(sourceDir)) {
    console.log(`  Directory not found: ${sourceDir}`);
    return result;
  }
  
  const files = fs.readdirSync(sourceDir)
    .filter(f => f.toLowerCase().endsWith(extension));
  
  console.log(`= Uploading ${files.length} ${extension} files to ${bucketName}...\n`);
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const localPath = path.join(sourceDir, file);
    
    process.stdout.write(`\r[${i + 1}/${files.length}] Uploading...`);
    
    const { success, url, size } = await uploadFile(bucketName, localPath, file);
    
    if (success && url) {
      result.uploaded++;
      result.totalSize += size || 0;
      // Map filename (without extension) to URL for database updates
      const exerciseId = path.parse(file).name;
      result.urlMap.set(exerciseId, url);
    } else {
      result.failed++;
    }
  }
  
  console.log('');
  return result;
}

async function updateDatabaseUrls(gifUrlMap: Map<string, string>, thumbnailUrlMap: Map<string, string>) {
  console.log('\n= Updating database URLs...\n');
  
  let gifUpdated = 0;
  let thumbnailUpdated = 0;
  let failed = 0;
  
  // Update GIF URLs
  for (const [exerciseId, url] of gifUrlMap) {
    const { error } = await supabase
      .from('exercises')
      .update({ gif_url: url })
      .eq('id', exerciseId);
    
    if (error) {
      failed++;
    } else {
      gifUpdated++;
    }
  }
  
  // Update Thumbnail URLs
  for (const [exerciseId, url] of thumbnailUrlMap) {
    const { error } = await supabase
      .from('exercises')
      .update({ thumbnail_url: url })
      .eq('id', exerciseId);
    
    if (error) {
      failed++;
    } else {
      thumbnailUpdated++;
    }
  }
  
  console.log(`✅ Updated ${gifUpdated} GIF URLs`);
  console.log(`✅ Updated ${thumbnailUpdated} thumbnail URLs`);
  if (failed > 0) {
    console.log(`❌ Failed to update ${failed} URLs`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const shouldUpdateUrls = args.includes('--update-urls');
  
  console.log('  Uploading to Supabase Storage...\n');
  
  const gifDir = getGifDirectory();
  console.log(`= Thumbnail Source: ${THUMBNAIL_DIR}\n`);
  
  // Ensure buckets exist
  await ensureBucketExists(GIF_BUCKET);
  await ensureBucketExists(THUMBNAIL_BUCKET);
  
  // Upload GIFs (1080p if available)
  console.log('\n=� Uploading GIFs...');
  const gifResult = await uploadDirectory(gifDir, GIF_BUCKET, '.gif');
  
  // Upload Thumbnails (216px highest quality)
  console.log('\n=� Uploading 216px Thumbnails...');
  const thumbResult = await uploadDirectory(THUMBNAIL_DIR, THUMBNAIL_BUCKET, '.jpg');
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('=� UPLOAD SUMMARY');
  console.log('='.repeat(50));
  console.log(`GIFs: ${gifResult.uploaded} uploaded, ${gifResult.failed} failed`);
  console.log(`   Total Size: ${(gifResult.totalSize / 1024 / 1024).toFixed(1)} MB`);
  console.log(`Thumbnails: ${thumbResult.uploaded} uploaded, ${thumbResult.failed} failed`);
  console.log(`   Total Size: ${(thumbResult.totalSize / 1024 / 1024).toFixed(1)} MB`);
  
  // Update database URLs if flag is present
  if (shouldUpdateUrls) {
    await updateDatabaseUrls(gifResult.urlMap, thumbResult.urlMap);
  } else {
    console.log('\n9  Use --update-urls flag to update database with new URLs');
  }
}

main().catch(console.error);