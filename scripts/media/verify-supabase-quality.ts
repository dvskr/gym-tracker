import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as https from 'https';
import * as fs from 'fs';
import sharp from 'sharp';

dotenv.config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function downloadFile(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      const chunks: Buffer[] = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    }).on('error', reject);
  });
}

async function verifySupabaseQuality() {
  console.log('= Verifying Supabase asset quality...\n');
  
  // Get all files from exercise-gifs bucket
  const { data: gifFiles, error: gifError } = await supabase
    .storage
    .from('exercise-gifs')
    .list('', { limit: 1000 });
  
  // Get all files from exercise-thumbnails bucket
  const { data: thumbnailFiles, error: thumbError } = await supabase
    .storage
    .from('exercise-thumbnails')
    .list('', { limit: 1000 });
  
  if (gifError || thumbError) {
    console.error('Error listing files:', gifError || thumbError);
    return;
  }
  
  console.log(`Found ${gifFiles?.length || 0} GIFs in Supabase`);
  console.log(`Found ${thumbnailFiles?.length || 0} thumbnails in Supabase\n`);
  
  // Check sample GIFs
  console.log('= Checking GIF Quality (sample of 10)...\n');
  const sampleGifs = gifFiles?.slice(0, 10) || [];
  
  const gifResults = {
    hd: 0,
    sd: 0,
    totalSize: 0
  };
  
  for (const file of sampleGifs) {
    try {
      const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/exercise-gifs/${file.name}`;
      
      // Fetch file
      const buffer = await downloadFile(url);
      
      // Get dimensions
      const metadata = await sharp(buffer).metadata();
      const width = metadata.width || 0;
      const sizeMB = buffer.length / 1024 / 1024;
      
      const quality = width >= 1000 ? 'HD (1080px)' : 'SD (360px)';
      
      if (width >= 1000) {
        gifResults.hd++;
      } else {
        gifResults.sd++;
      }
      
      gifResults.totalSize += sizeMB;
      
      console.log(`  ${file.name.substring(0, 30)}... → ${width}px | ${sizeMB.toFixed(2)} MB | ${quality}`);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (err: any) {
      console.error(`  ❌ ${file.name}: ${err.message}`);
    }
  }
  
  console.log('\n= Checking Thumbnail Quality (sample of 10)...\n');
  const sampleThumbs = thumbnailFiles?.slice(0, 10) || [];
  
  const thumbResults = {
    sizes: [] as number[],
    totalSize: 0
  };
  
  for (const file of sampleThumbs) {
    try {
      const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/exercise-thumbnails/${file.name}`;
      
      const buffer = await downloadFile(url);
      
      const metadata = await sharp(buffer).metadata();
      const width = metadata.width || 0;
      const sizeKB = buffer.length / 1024;
      
      thumbResults.sizes.push(width);
      thumbResults.totalSize += sizeKB;
      
      let quality = '';
      if (width >= 200) quality = '4x retina ✨';
      else if (width >= 150) quality = '3x retina ✨';
      else if (width >= 100) quality = '2x retina ✅';
      else quality = 'Standard ';
      
      console.log(`  ${file.name.substring(0, 30)}... → ${width}x${width}px | ${sizeKB.toFixed(2)} KB | ${quality}`);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (err: any) {
      console.error(`  ❌ ${file.name}: ${err.message}`);
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('= VERIFICATION SUMMARY');
  console.log('='.repeat(70));
  
  console.log('\n GIF Quality:');
  console.log(`  Total files in bucket: ${gifFiles?.length || 0}`);
  console.log(`  Sampled: ${sampleGifs.length}`);
  console.log(`  HD (1080px): ${gifResults.hd}/${sampleGifs.length}`);
  console.log(`  SD (360px): ${gifResults.sd}/${sampleGifs.length}`);
  console.log(`  Average size: ${(gifResults.totalSize / sampleGifs.length).toFixed(2)} MB`);
  
  if (gifResults.hd === sampleGifs.length) {
    console.log('  ✅ ALL SAMPLED GIFS ARE HD QUALITY!');
  } else {
    console.log(`    ${gifResults.sd} GIFs are not HD quality`);
  }
  
  console.log('\n=�  Thumbnail Quality:');
  console.log(`  Total files in bucket: ${thumbnailFiles?.length || 0}`);
  console.log(`  Sampled: ${sampleThumbs.length}`);
  
  if (thumbResults.sizes.length > 0) {
    const minSize = Math.min(...thumbResults.sizes);
    const maxSize = Math.max(...thumbResults.sizes);
    const avgSize = thumbResults.sizes.reduce((a, b) => a + b, 0) / thumbResults.sizes.length;
    
    console.log(`  Size range: ${minSize}px - ${maxSize}px`);
    console.log(`  Average size: ${avgSize.toFixed(0)}px`);
    console.log(`  Average file size: ${(thumbResults.totalSize / sampleThumbs.length).toFixed(2)} KB`);
    
    if (minSize >= 200) {
      console.log('  ✅ ALL SAMPLED THUMBNAILS ARE 4x RETINA QUALITY!');
    } else if (minSize >= 150) {
      console.log('  ✅ ALL SAMPLED THUMBNAILS ARE 3x RETINA QUALITY!');
    } else if (minSize >= 100) {
      console.log('  ✅ ALL SAMPLED THUMBNAILS ARE 2x RETINA QUALITY!');
    } else {
      console.log('  �  Some thumbnails are lower quality');
    }
  }
  
  console.log('\n= Storage Usage:');
  const gifStorage = (gifFiles?.length || 0) * (gifResults.totalSize / sampleGifs.length);
  const thumbStorage = (thumbnailFiles?.length || 0) * (thumbResults.totalSize / sampleThumbs.length / 1024);
  console.log(`  GIFs: ~${gifStorage.toFixed(0)} MB (${gifFiles?.length || 0} files)`);
  console.log(`  Thumbnails: ~${thumbStorage.toFixed(2)} MB (${thumbnailFiles?.length || 0} files)`);
  console.log(`  Total: ~${(gifStorage + thumbStorage).toFixed(2)} MB\n`);
}

verifySupabaseQuality();
